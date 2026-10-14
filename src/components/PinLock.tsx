import { useState, type ReactNode } from "react";
import { Delete, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";

const LEN = 4;
export async function hashPin(pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`max-pin:${pin}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function Keypad({ title, onComplete }: { title: string; onComplete: (pin: string) => Promise<boolean> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const press = async (d: string) => {
    if (pin.length >= LEN) return;
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
      <p className="h-4 text-xs text-muted-foreground">{error ? "Wrong PIN. Try again." : ""}</p>
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

/** Blocks the app until the PIN is entered, once per app open. */
export function PinGate({ children }: { children: ReactNode }) {
  const { settings, ready } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  if (!ready) return <div className="h-dvh-screen bg-background" />;
  if (!settings.pinHash || unlocked) return <>{children}</>;
  return (
    <main className="h-dvh-screen pt-safe flex items-center justify-center bg-background">
      <Keypad
        title="Enter PIN"
        onComplete={async (p) => {
          const ok = (await hashPin(p)) === settings.pinHash;
          if (ok) setUnlocked(true);
          return ok;
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
              if ((await hashPin(p)) !== settings.pinHash) return false;
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
