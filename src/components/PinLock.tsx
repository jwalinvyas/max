import { useEffect, useState, type ReactNode } from "react";
import { Delete, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";

const LEN = 4;
const hex = (b: ArrayBuffer | Uint8Array) =>
  Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
const ITER = 210_000;

async function pbkdf2(pin: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iter }, key, 256));
}

/** Salted, slow hash: "pbkdf2$iter$salt$hash". */
export async function hashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${hex(salt)}$${await pbkdf2(pin, salt, ITER)}`;
}

export async function verifyPin(pin: string, stored: string) {
  const parts = stored.split("$");
  if (parts[0] === "pbkdf2" && parts.length === 4) {
    const salt = new Uint8Array((parts[2] ?? "").match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
    return (await pbkdf2(pin, salt, Number(parts[1]))) === parts[3];
  }
  // Legacy unsalted SHA-256 hashes from the first version.
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`max-pin:${pin}`));
  return hex(buf) === stored;
}

// Lockout after repeated wrong PINs, persisted so a reload doesn't reset it.
const FAIL_KEY = "max-pin-fails";
const readFails = (): { n: number; until: number } => {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY) || "") ?? { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; }
};
const writeFails = (v: { n: number; until: number }) => localStorage.setItem(FAIL_KEY, JSON.stringify(v));
const RELOCK_MS = 60_000;

function Keypad({ title, onComplete, lockedFor = 0 }: { title: string; onComplete: (pin: string) => Promise<boolean>; lockedFor?: number }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const press = async (d: string) => {
    if (pin.length >= LEN || lockedFor > 0) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length === LEN) {
      const ok = await onComplete(next);
      if (!ok) { setError(true); navigator.vibrate?.(80); }
      setPin("");
    }
  };
  return (
    <div className="flex flex-col items-center gap-8">
      <Lock className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-sm">{title}</p>
      <div className="flex gap-3" aria-label={`${pin.length} of ${LEN} digits entered`}>
        {Array.from({ length: LEN }, (_, i) => (
          <span key={i} className={`size-3 rounded-full border ${i < pin.length ? "bg-foreground" : ""} ${error ? "border-destructive" : "border-muted-foreground"}`} />
        ))}
      </div>
      <p className="h-4 text-xs text-muted-foreground">{lockedFor > 0 ? `Too many attempts. Wait ${lockedFor}s.` : error ? "Wrong PIN. Try again." : ""}</p>
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <Button key={d} variant="outline" className="size-16 rounded-full text-xl" onClick={() => press(d)}>{d}</Button>
        ))}
        <span />
        <Button variant="outline" className="size-16 rounded-full text-xl" onClick={() => press("0")}>0</Button>
        <Button variant="ghost" className="size-16 rounded-full" aria-label="Delete digit" onClick={() => setPin((p) => p.slice(0, -1))}><Delete /></Button>
      </div>
    </div>
  );
}

/** Blocks the app until the PIN is entered; re-locks after a minute in the background. */
export function PinGate({ children }: { children: ReactNode }) {
  const { settings, ready } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [until, setUntil] = useState(0);

  useEffect(() => setUntil(readFails().until), []);
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [until]);
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RELOCK_MS) setUnlocked(false);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!ready) return <div className="h-dvh-screen bg-background" />;
  if (!settings.pinHash || unlocked) return <>{children}</>;
  const lockedFor = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <main className="h-dvh-screen pt-safe flex items-center justify-center bg-background">
      <Keypad
        title="Enter PIN"
        lockedFor={lockedFor}
        onComplete={async (p) => {
          if (await verifyPin(p, settings.pinHash!)) {
            writeFails({ n: 0, until: 0 });
            setUnlocked(true);
            return true;
          }
          const f = readFails();
          const n = f.n + 1;
          // 5 free tries, then 30s, 60s, 120s... capped at 15 min.
          const wait = n >= 5 ? Math.min(30_000 * 2 ** (n - 5), 900_000) : 0;
          const u = wait ? Date.now() + wait : 0;
          writeFails({ n, until: u });
          setUntil(u);
          setNow(Date.now());
          return false;
        }}
      />
    </main>
  );
}

export function PinSettings() {
  const { settings } = useApp();
  const [mode, setMode] = useState<null | "set" | "confirm" | "remove">(null);
  const [first, setFirst] = useState("");
  return (
    <div className="space-y-2">
      <span className="eyebrow">PIN lock</span>
      {mode ? (
        <div className="rounded-lg border py-6">
          <Keypad
            key={mode}
            title={mode === "set" ? `Choose a ${LEN}-digit PIN` : mode === "confirm" ? "Repeat PIN" : "Enter current PIN"}
            onComplete={async (p) => {
              if (mode === "set") { setFirst(p); setMode("confirm"); return true; }
              if (mode === "confirm") {
                if (p !== first) { setMode("set"); toast("PINs didn't match."); return false; }
                await repo.updateSettings({ pinHash: await hashPin(p) });
                setMode(null); toast("PIN lock on."); return true;
              }
              if (!(await verifyPin(p, settings.pinHash ?? ""))) return false;
              await repo.updateSettings({ pinHash: "" });
              setMode(null); toast("PIN lock off."); return true;
            }}
          />
          <Button variant="ghost" className="tap mx-auto mt-4 flex text-sm" onClick={() => setMode(null)}>Cancel</Button>
        </div>
      ) : settings.pinHash ? (
        <div className="flex gap-2">
          <Button variant="outline" className="tap flex-1 rounded-lg border text-sm" onClick={() => setMode("set")}>Change PIN</Button>
          <Button variant="outline" className="tap flex-1 rounded-lg border text-sm" onClick={() => setMode("remove")}>Turn off</Button>
        </div>
      ) : (
        <Button variant="outline" className="tap w-full rounded-lg border text-sm" onClick={() => setMode("set")}>Set a PIN</Button>
      )}
      <p className="text-xs text-muted-foreground">Asked each time the app opens. Forgetting it means erasing the app's data in your browser.</p>
    </div>
  );
}
