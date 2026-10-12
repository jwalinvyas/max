import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp, useOverallStreak } from "@/data/AppData";
import { repo } from "@/data/repo";
import type { Habit } from "@/data/types";
import { addDays, pretty, WEEKDAYS, weekday, weekStartOf } from "@/lib/date";
import { cleanDays, statusOf } from "@/lib/stats";
import { BottomSheet } from "@/components/BottomSheet";
import { HabitForm } from "@/components/HabitForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — MAX" },
      { name: "description", content: "Check off today's habits and protect your streak." },
      { property: "og:title", content: "Today — MAX" },
      { property: "og:description", content: "Check off today's habits and protect your streak." },
    ],
  }),
  component: Today,
});

const buzz = () => navigator.vibrate?.(10);

function Today() {
  const { ready, today, habits, ix, settings } = useApp();
  const streak = useOverallStreak();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [slipFor, setSlipFor] = useState<Habit | null>(null);
  const [slipNote, setSlipNote] = useState("");
  const d = date > today ? today : date;
  const active = habits.filter((h) => !h.archived);
  const visible = active.filter((h) => statusOf(h, d, today, ix, settings.weekStart) !== "off" || h.type === "quit" || h.schedule.kind === "perWeek");
  const doneCount = visible.filter((h) => statusOf(h, d, today, ix, settings.weekStart) === "done").length;

  if (!ready) return null;

  return (
    <main className="pt-safe px-safe space-y-8">
      <header className="flex items-start justify-between pt-6">
        <div>
          <p className="eyebrow">{d === today ? "Today" : pretty(d, { weekday: "long" })}</p>
          <h1 className="text-4xl font-extrabold leading-none">{pretty(d, { month: "long", day: "numeric" })}</h1>
        </div>
        <Link to="/settings" className="tap px-2 text-sm text-muted-foreground" aria-label="Settings">Settings</Link>
      </header>

      <div className="flex gap-1" role="group" aria-label="Pick day">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((x) => (
          <button
            key={x}
            onClick={() => setDate(x)}
            aria-pressed={x === d}
            className={`tap flex flex-1 flex-col items-center rounded-lg py-1 text-xs ${x === d ? "bg-foreground text-background" : "text-muted-foreground"}`}
          >
            <span>{WEEKDAYS[weekday(x)]?.[0]}</span>
            <span className="num text-sm">{x.slice(8)}</span>
          </button>
        ))}
      </div>

      <section className="flex items-end justify-between">
        <div>
          <p className="num text-6xl font-semibold leading-none">{streak.current}</p>
          <p className="eyebrow mt-1">Day streak</p>
        </div>
        <div className="text-right">
          <p className="num text-2xl">{doneCount}/{visible.length}</p>
          <p className="eyebrow">Done</p>
        </div>
      </section>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">No habits yet. Add the first one.</p>
      ) : (
        <ul className="divide-y border-y">
          {visible.map((h) => {
            const st = statusOf(h, d, today, ix, settings.weekStart);
            const done = st === "done";
            const log = ix.logs.get(`${h.id}|${d}`);
            const sub =
              h.type === "quit"
                ? `${cleanDays(h, d, ix)} days clean`
                : h.type === "count"
                  ? `${log?.value ?? 0} / ${h.target} ${h.unit}`
                  : h.schedule.kind === "perWeek"
                    ? `${ix.weekDone.get(`${h.id}|${weekStartOf(d, settings.weekStart)}`) ?? 0} / ${h.schedule.times} this week`
                    : "";
            return (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => setEditing(h)} aria-label={`Edit ${h.name}`}>
                  <span className={`block truncate text-lg font-medium ${done ? "text-done" : ""}`}>
                    {h.name}
                    {h.nonNegotiable && <span className="ml-2 text-xs text-muted-foreground">NN</span>}
                  </span>
                  {sub && <span className="num text-xs text-muted-foreground">{sub}</span>}
                </button>
                {h.type === "build" && (
                  <button
                    aria-label={done ? `Undo ${h.name}` : `Complete ${h.name}`}
                    aria-pressed={done}
                    onClick={() => { buzz(); repo.upsertLog(h.id, d, { done: !done }); }}
                    className={`tap size-11 rounded-full border-2 ${done ? "border-done bg-done" : ""}`}
                  />
                )}
                {h.type === "count" && (
                  <div className="flex items-center gap-1">
                    <button className="tap size-11 rounded-full border" aria-label="Minus one" onClick={() => repo.addValue(h.id, d, -1)}>−</button>
                    <button className={`tap size-11 rounded-full border-2 ${done ? "border-done bg-done text-done-foreground" : ""}`} aria-label="Plus one" onClick={() => { buzz(); repo.addValue(h.id, d, 1); }}>+</button>
                  </div>
                )}
                {h.type === "quit" && (
                  <button
                    className={`tap rounded-full border px-4 text-sm ${st === "missed" ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => { setSlipNote(""); setSlipFor(h); }}
                  >
                    {st === "missed" ? "Slipped" : "Slip"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button className="tap w-full rounded-full border font-medium" onClick={() => setAdding(true)}>+ Add habit</button>

      <BottomSheet open={adding} onOpenChange={setAdding} title="New habit">
        <HabitForm onSave={(h) => { repo.createHabit(h); setAdding(false); }} />
      </BottomSheet>
      <BottomSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title="Edit habit">
        {editing && (
          <HabitForm
            initial={editing}
            onSave={(p) => { repo.updateHabit(editing.id, p); setEditing(null); }}
            onArchive={() => { repo.archiveHabit(editing.id, today, !editing.archived); setEditing(null); }}
            onDelete={() => { repo.deleteHabit(editing.id); setEditing(null); }}
          />
        )}
      </BottomSheet>
      <BottomSheet open={!!slipFor} onOpenChange={(o) => !o && setSlipFor(null)} title="Log a slip">
        <div className="space-y-4">
          <p className="text-muted-foreground">Honesty keeps the count real. What triggered it?</p>
          <textarea className="min-h-24 w-full rounded-lg border bg-transparent p-3" value={slipNote} onChange={(e) => setSlipNote(e.target.value)} />
          <button
            className="tap w-full rounded-full bg-foreground font-semibold text-background"
            onClick={() => { if (slipFor) repo.addSlip(slipFor.id, d, slipNote.trim()); setSlipFor(null); }}
          >
            Log slip
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}
