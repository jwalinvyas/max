import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useApp } from "@/data/AppData";
import { repo } from "@/data/repo";
import { addDays, diffDays, pretty } from "@/lib/date";
import { computeDays, earliestStart, habitConsistency, rate, streaks } from "@/lib/stats";
import { Heatmap } from "@/components/Heatmap";

const TrendChart = lazy(() => import("@/components/TrendChart"));

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — MAX" },
      { name: "description", content: "Heatmap, streaks, consistency and challenges." },
      { property: "og:title", content: "Stats — MAX" },
      { property: "og:description", content: "Heatmap, streaks, consistency and challenges." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { habits, ix, today, settings, slips, challenges } = useApp();
  const ws = settings.weekStart;
  const from = useMemo(() => {
    const e = earliestStart(ix, today);
    const yr = addDays(today, -370);
    return e < yr ? yr : e;
  }, [ix, today]);
  const days = useMemo(() => computeDays(habits, ix, from, today, today, ws), [habits, ix, from, today, ws]);
  const s = useMemo(() => streaks(days, today), [days, today]);
  const r7 = rate(days, addDays(today, -6), today);
  const r30 = rate(days, addDays(today, -29), today);
  const trend = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const end = addDays(today, -7 * (11 - i));
        return { label: end.slice(5), pct: Math.round(rate(days, addDays(end, -6), end) * 100) };
      }),
    [days, today],
  );
  const name = (id: string) => habits.find((h) => h.id === id)?.name ?? "Deleted habit";
  const active = challenges.find((c) => !c.endedOn);
  const [len, setLen] = useState(30);

  const Metric = ({ v, l }: { v: string | number; l: string }) => (
    <div>
      <p className="num text-3xl font-semibold">{v}</p>
      <p className="eyebrow">{l}</p>
    </div>
  );

  return (
    <main className="pt-safe px-safe space-y-10">
      <header className="pt-6">
        <p className="eyebrow">Stats</p>
        <h1 className="text-4xl font-extrabold leading-none">The record</h1>
      </header>
      {habits.length === 0 ? (
        <p className="text-muted-foreground">Nothing to measure yet.</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-6">
            <Metric v={s.current} l="Streak" />
            <Metric v={s.longest} l="Longest" />
            <Metric v={s.won} l="Days won" />
            <Metric v={`${Math.round(r7 * 100)}%`} l="7 days" />
            <Metric v={`${Math.round(r30 * 100)}%`} l="30 days" />
            <Metric v={s.wonLongest} l="Best won" />
          </section>
          <section className="space-y-3">
            <h2 className="eyebrow">Last year</h2>
            <Heatmap days={days} to={today} weeks={53} ws={ws} />
          </section>
          <section className="space-y-3">
            <h2 className="eyebrow">Weekly completion</h2>
            <Suspense fallback={<div className="h-40" />}>
              <TrendChart data={trend} />
            </Suspense>
          </section>
          <section className="space-y-3">
            <h2 className="eyebrow">Consistency</h2>
            <ul className="space-y-3">
              {habits.map((h) => {
                const c = habitConsistency(h, ix, from, today, ws);
                return (
                  <li key={h.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={h.archived ? "text-muted-foreground" : ""}>{h.name}</span>
                      <span className="num">{Math.round(c.pct * 100)}%</span>
                    </div>
                    <div className="h-1 rounded bg-heat-0">
                      <div className="h-1 rounded bg-done" style={{ width: `${c.pct * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="space-y-3">
            <h2 className="eyebrow">Challenge</h2>
            {active ? (
              <div className="space-y-2">
                <p className="num text-3xl font-semibold">
                  Day {Math.min(active.length, diffDays(active.startDate, today) + 1)} / {active.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  {active.strict ? "Strict: any missed non-negotiable resets it." : "Track every non-negotiable."}
                </p>
                {active.strict && [...days].some(([d, a]) => d >= active.startDate && d < today && a.nnTotal > 0 && !a.won) && (
                  <p className="text-sm text-destructive">A day was missed. Restart to stay honest.</p>
                )}
                <button className="tap rounded-full border px-5 text-sm" onClick={() => repo.endChallenge(active.id, today)}>End challenge</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {[30, 75, 100].map((n) => (
                  <button key={n} aria-pressed={len === n} onClick={() => setLen(n)} className={`tap num flex-1 rounded-lg border ${len === n ? "bg-foreground text-background" : ""}`}>{n}</button>
                ))}
                <button
                  className="tap flex-[2] rounded-full bg-foreground text-sm font-semibold text-background"
                  onClick={() => repo.startChallenge({ length: len, startDate: today, strict: true, habitIds: habits.filter((h) => h.nonNegotiable && !h.archived).map((h) => h.id) })}
                >
                  Start
                </button>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="eyebrow">Slips</h2>
            {slips.length === 0 ? (
              <p className="text-muted-foreground">No slips logged.</p>
            ) : (
              <ul className="divide-y border-y">
                {slips.slice(0, 50).map((sl) => (
                  <li key={sl.id} className="flex items-start gap-3 py-3 text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{name(sl.habitId)} <span className="num text-muted-foreground">· {pretty(sl.date, { month: "short", day: "numeric" })}</span></p>
                      {sl.note && <p className="text-muted-foreground">{sl.note}</p>}
                    </div>
                    <button className="text-xs text-muted-foreground" onClick={() => repo.deleteSlip(sl.id)} aria-label="Remove slip">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
