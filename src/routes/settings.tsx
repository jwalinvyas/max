import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";
import { ACCENTS, type Theme } from "@/data/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MAX" },
      { name: "description", content: "Your why, day rollover, theme, and data backup." },
      { property: "og:title", content: "Settings — MAX" },
      { property: "og:description", content: "Your why, day rollover, theme, and data backup." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings: s, habits } = useApp();
  const [why, setWhy] = useState(s.why);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => why !== s.why && repo.updateSettings({ why }), 500);
    return () => clearTimeout(t);
  }, [why, s.why]);
  const seg = (on: boolean) => `tap flex-1 rounded-lg border text-sm ${on ? "bg-foreground text-background" : "text-muted-foreground"}`;

  const exportData = async () => {
    const blob = new Blob([JSON.stringify(await repo.exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `max-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="pt-safe px-safe space-y-8">
      <header className="flex items-end justify-between pt-6">
        <h1 className="text-4xl font-extrabold leading-none">Settings</h1>
        <Link to="/" className="tap px-2 text-sm text-muted-foreground">Done</Link>
      </header>
      <label className="block space-y-2">
        <span className="eyebrow">My why</span>
        <textarea className="min-h-24 w-full rounded-lg border bg-transparent p-3" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Shown when a long streak breaks." />
      </label>
      <div className="space-y-2">
        <span className="eyebrow">Day ends at</span>
        <div className="flex gap-1">
          {[0, 2, 4, 6].map((h) => (
            <button key={h} className={seg(s.rolloverHour === h)} onClick={() => repo.updateSettings({ rolloverHour: h })}>{`${h}:00`}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Week starts</span>
        <div className="flex gap-1">
          <button className={seg(s.weekStart === 1)} onClick={() => repo.updateSettings({ weekStart: 1 })}>Monday</button>
          <button className={seg(s.weekStart === 0)} onClick={() => repo.updateSettings({ weekStart: 0 })}>Sunday</button>
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Theme</span>
        <div className="flex gap-1">
          {(["system", "dark", "light"] as Theme[]).map((t) => (
            <button key={t} className={`${seg(s.theme === t)} capitalize`} onClick={() => repo.updateSettings({ theme: t })}>{t}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Accent</span>
        <div className="flex gap-3">
          {ACCENTS.map((c) => (
            <button key={c} aria-label={`Accent ${c}`} aria-pressed={s.accent === c} onClick={() => repo.updateSettings({ accent: c })} className={`size-9 rounded-full ${s.accent === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      {habits.some((h) => h.archived) && (
        <div className="space-y-2">
          <span className="eyebrow">Archived</span>
          <ul className="divide-y border-y">
            {habits.filter((h) => h.archived).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-3">
                <span>{h.name}</span>
                <button className="text-sm text-muted-foreground" onClick={() => repo.archiveHabit(h.id, "", false)}>Restore</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-2">
        <span className="eyebrow">Data</span>
        <div className="flex gap-2">
          <button className="tap flex-1 rounded-full border text-sm" onClick={exportData}>Export</button>
          <button className="tap flex-1 rounded-full border text-sm" onClick={() => file.current?.click()}>Import</button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const n = await repo.importAll(JSON.parse(await f.text()));
              toast(`Imported ${n} habits.`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Import failed.");
            }
            e.target.value = "";
          }}
        />
        <button
          className="tap w-full rounded-full border text-sm text-destructive"
          onClick={async () => {
            if (prompt('Type "DELETE" to erase everything.') === "DELETE") {
              await repo.wipeAll();
              toast("All data erased.");
            }
          }}
        >
          Erase all data
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Everything is stored on this device only.</p>
    </main>
  );
}
