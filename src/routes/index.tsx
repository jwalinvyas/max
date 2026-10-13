import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp, useOverallStreak } from "@/data/AppData";
import { repo } from "@/data/repo";
import type { Habit } from "@/data/types";
import { addDays, pretty, WEEKDAYS, weekday, weekStartOf } from "@/lib/date";
import { cleanDays, statusOf } from "@/lib/stats";
import { BottomSheet } from "@/components/BottomSheet";
import { HabitForm } from "@/components/HabitForm";
import { Check, Plus, Minus, Flame, Shield, Hash, LockKeyhole, Circle, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — MAX" },
      { name: "description", content: "Check off today's habits and protect your streak." },
      { property: "og:title", content: "Today — MAX" },
      { property: "og:description", content: "Check off today's habits and protect your streak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
    <main className="screen pt-safe px-safe space-y-6">
      <PageHeader label={d === today ? "Today" : pretty(d, { weekday: "long" })} title={pretty(d, { month: "long", day: "numeric" })} settings />

      <div className="day-picker flex gap-1" role="group" aria-label="Pick day">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((x) => (
          <Button variant="ghost"
            key={x}
            onClick={() => setDate(x)}
            aria-pressed={x === d}
            aria-label={pretty(x, { weekday: "long", month: "long", day: "numeric" })}
            className={`flex min-w-0 flex-1 flex-col items-center rounded-md text-[10px] ${x === d ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "text-muted-foreground"}`}
          >
            <span>{WEEKDAYS[weekday(x)]?.slice(0, 3)}</span>
            <span className="num text-sm">{x.slice(8)}</span>
          </Button>
        ))}
      </div>

      <section className="grid grid-cols-2 border-y py-5">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Flame size={13} /> Day streak</p>
          <p className="num text-3xl font-semibold leading-none">{streak.current}<span className="ml-2 font-sans text-xs font-normal text-muted-foreground">days</span></p>
        </div>
        <div className="border-l pl-6">
          <p className="eyebrow mb-2 flex items-center gap-1.5"><Check size={13} /> Completed</p>
          <p className="num text-3xl font-semibold leading-none">{doneCount}<span className="text-lg font-normal text-muted-foreground"> / {visible.length}</span></p>
        </div>
      </section>

      <div className="flex items-center justify-between"><h2 className="eyebrow">Your habits</h2><span className="num text-[10px] text-muted-foreground">{visible.length.toString().padStart(2, "0")}</span></div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">No habits yet. Add the first one.</p>
      ) : (
        <ul className="divide-y border-b">
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
              <li key={h.id} className="habit-row flex items-center gap-3 py-3">
                <span className={`habit-symbol ${done ? "is-done" : ""}`} aria-hidden="true">{h.type === "quit" ? <Shield size={17} strokeWidth={1.5} /> : h.type === "count" ? <Hash size={17} strokeWidth={1.5} /> : <Circle size={17} strokeWidth={1.5} />}</span>
                <Button variant="ghost" className="h-auto min-w-0 flex-1 flex-col items-start gap-1 whitespace-normal p-0 text-left hover:bg-transparent" onClick={() => setEditing(h)} aria-label={`Edit ${h.name}`}>
                  <span className={`flex max-w-full items-center gap-1.5 text-sm font-medium ${done ? "text-done" : ""}`}>
                    <span className="break-words">
                    {h.name}
                    </span>{h.nonNegotiable && <LockKeyhole size={11} className="shrink-0 text-muted-foreground" aria-label="Non-negotiable" />}
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">{sub || "Daily"}</span>
                </Button>
                {h.type === "build" && (
                  <Button variant="outline" size="icon"
                    aria-label={done ? `Undo ${h.name}` : `Complete ${h.name}`}
                    aria-pressed={done}
                    onClick={() => { buzz(); repo.upsertLog(h.id, d, { done: !done }); }}
                    className={`tap size-11 rounded-full ${done ? "border-done bg-done text-done-foreground hover:bg-done/90 hover:text-done-foreground" : ""}`}
                  >{done && <Check size={18} />}</Button>
                )}
                {h.type === "count" && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="tap" aria-label={`Minus one ${h.name}`} title="Minus one" onClick={() => repo.addValue(h.id, d, -1)}><Minus /></Button>
                    <Button variant="outline" size="icon" className={`tap rounded-full ${done ? "border-done bg-done text-done-foreground hover:bg-done/90 hover:text-done-foreground" : ""}`} aria-label={`Plus one ${h.name}`} title="Plus one" onClick={() => { buzz(); repo.addValue(h.id, d, 1); }}><Plus /></Button>
                  </div>
                )}
                {h.type === "quit" && (
                  <Button variant="outline"
                    className={`tap rounded-lg px-3 text-xs ${st === "missed" ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={() => { setSlipNote(""); setSlipFor(h); }}
                  >
                    {st === "missed" ? "Slipped" : "Slip"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" className="tap w-full justify-between rounded-lg px-4 text-xs" onClick={() => setAdding(true)}><span className="flex items-center gap-2"><Plus size={16} />Add habit</span><ArrowUpRight size={14} className="text-muted-foreground" /></Button>

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
          <Button
            className="tap w-full rounded-lg font-semibold"
            onClick={() => { if (slipFor) repo.addSlip(slipFor.id, d, slipNote.trim()); setSlipFor(null); }}
          >
            Log slip
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}
