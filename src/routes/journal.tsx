import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";
import { pretty } from "@/lib/date";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal — MAX" },
      { name: "description", content: "Set an intention, reflect honestly, track mood and energy." },
      { property: "og:title", content: "Journal — MAX" },
      { property: "og:description", content: "Set an intention, reflect honestly, track mood and energy." },
    ],
  }),
  component: Journal,
});

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (n: number) => void }) {
  return (
    <div className="space-y-2">
      <span className="eyebrow">{label}</span>
      <div className="flex gap-2" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-pressed={value === n} onClick={() => onChange(n)} className={`tap num flex-1 rounded-lg border ${value === n ? "bg-foreground text-background" : "text-muted-foreground"}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Journal() {
  const { journal, today, settings } = useApp();
  const entry = journal.find((j) => j.date === today);
  const [intention, setIntention] = useState(entry?.intention ?? "");
  const [reflection, setReflection] = useState(entry?.reflection ?? "");
  const [q, setQ] = useState("");

  useEffect(() => {
    setIntention(entry?.intention ?? "");
    setReflection(entry?.reflection ?? "");
    // only on day change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (intention !== (entry?.intention ?? "") || reflection !== (entry?.reflection ?? ""))
        repo.saveJournal(today, { intention, reflection });
    }, 500);
    return () => clearTimeout(t);
  }, [intention, reflection, today, entry?.intention, entry?.reflection]);

  const past = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, "");
    return journal
      .filter((j) => j.date !== today)
      .filter((j) => !s || j.tags.includes(s) || `${j.intention} ${j.reflection}`.toLowerCase().includes(s));
  }, [journal, today, q]);

  const area = "w-full rounded-lg border bg-transparent p-3 text-base";
  return (
    <main className="pt-safe px-safe space-y-8">
      <header className="pt-6">
        <p className="eyebrow">Journal</p>
        <h1 className="text-4xl font-extrabold leading-none">{pretty(today, { month: "long", day: "numeric" })}</h1>
      </header>
      <label className="block space-y-2">
        <span className="eyebrow">Intention</span>
        <input className={`${area} h-11 py-0`} value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="Today I will…" />
      </label>
      <div className="space-y-2">
        <span className="eyebrow">Reflection</span>
        <div className="flex flex-wrap gap-2">
          {settings.prompts.map((p) => (
            <button key={p} className="rounded-full border px-3 py-1 text-xs text-muted-foreground" onClick={() => setReflection((r) => (r ? `${r}\n\n${p}\n` : `${p}\n`))}>
              {p}
            </button>
          ))}
        </div>
        <textarea aria-label="Reflection" className={`${area} min-h-40`} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Use #tags to find it later." />
      </div>
      <Scale label="Mood" value={entry?.mood ?? null} onChange={(mood) => repo.saveJournal(today, { mood })} />
      <Scale label="Energy" value={entry?.energy ?? null} onChange={(energy) => repo.saveJournal(today, { energy })} />

      <section className="space-y-4">
        <input className={`${area} h-11 py-0`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or #tag" aria-label="Search entries" />
        {past.length === 0 ? (
          <p className="text-muted-foreground">No past entries.</p>
        ) : (
          <ul className="divide-y border-y">
            {past.map((j) => (
              <li key={j.id} className="space-y-1 py-4">
                <p className="eyebrow">
                  {pretty(j.date, { month: "short", day: "numeric", year: "numeric" })}
                  {j.mood && ` · mood ${j.mood}`}
                  {j.energy && ` · energy ${j.energy}`}
                </p>
                {j.intention && <p className="font-medium">{j.intention}</p>}
                {j.reflection && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{j.reflection}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
