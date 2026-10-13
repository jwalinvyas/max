import { Download, Upload, Trash2, Moon, Sun, Monitor, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";
import { ACCENTS, type Theme } from "@/data/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    <main className="screen pt-safe px-safe space-y-6">
      <PageHeader label="Preferences" title="Settings" back />
      <label className="block space-y-2">
        <span className="eyebrow">My why</span>
        <textarea className="min-h-24 w-full rounded-lg border bg-transparent p-3" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Shown when a long streak breaks." />
      </label>
      <div className="space-y-2">
        <span className="eyebrow">Day ends at</span>
        <div className="flex gap-1">
          {[0, 2, 4, 6].map((h) => (
            <Button variant="outline" key={h} className={seg(s.rolloverHour === h)} onClick={() => repo.updateSettings({ rolloverHour: h })}>{`${h}:00`}</Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Week starts</span>
        <div className="flex gap-1">
          <Button variant="outline" className={seg(s.weekStart === 1)} onClick={() => repo.updateSettings({ weekStart: 1 })}>Monday</Button>
          <Button variant="outline" className={seg(s.weekStart === 0)} onClick={() => repo.updateSettings({ weekStart: 0 })}>Sunday</Button>
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Theme</span>
        <div className="flex gap-1">
          {(["system", "dark", "light"] as Theme[]).map((t) => (
            <Button variant="outline" key={t} className={`${seg(s.theme === t)} capitalize`} onClick={() => repo.updateSettings({ theme: t })}>{t === "dark" ? <Moon /> : t === "light" ? <Sun /> : <Monitor />}{t}</Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="eyebrow">Accent</span>
        <div className="flex gap-3">
          {ACCENTS.map((c) => (
            <Button variant="outline" key={c} aria-label={`Accent ${c}`} aria-pressed={s.accent === c} onClick={() => repo.updateSettings({ accent: c })} className={`size-9 rounded-lg ${s.accent === c ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`} style={{ background: c }} />
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
                <Button variant="outline" className="text-sm text-muted-foreground" onClick={() => repo.archiveHabit(h.id, "", false)}><RotateCcw />Restore</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-2">
        <span className="eyebrow">Data</span>
        <div className="flex gap-2">
          <Button variant="outline" className="tap flex-1 rounded-lg border text-sm" onClick={exportData}><Download />Export</Button>
          <Button variant="outline" className="tap flex-1 rounded-lg border text-sm" onClick={() => file.current?.click()}><Upload />Import</Button>
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
        <Button variant="outline"
          className="tap w-full rounded-lg border text-sm text-destructive"
          onClick={async () => {
            if (prompt('Type "DELETE" to erase everything.') === "DELETE") {
              await repo.wipeAll();
              toast("All data erased.");
            }
          }}
        >
          <Trash2 /> Erase all data
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Everything is stored on this device only.</p>
    </main>
  );
}
