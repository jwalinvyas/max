import { Button } from "@/components/ui/button";
import { Check, Plus, Archive, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Habit, HabitInput, HabitType, Schedule } from "@/data/types";
import { WEEKDAYS } from "@/lib/date";

const field = "w-full rounded-lg border bg-transparent px-3 h-11 text-sm";

export function HabitForm({
  initial,
  onSave,
  onArchive,
  onDelete,
}: {
  initial?: Habit;
  onSave: (h: HabitInput) => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<HabitType>(initial?.type ?? "build");
  const [target, setTarget] = useState(String(initial?.target ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [schedule, setSchedule] = useState<Schedule>(initial?.schedule ?? { kind: "daily" });
  const [nn, setNn] = useState(initial?.nonNegotiable ?? false);

  const seg = (active: boolean) =>
    `tap flex-1 rounded-lg border px-2 text-sm ${active ? "bg-foreground text-background" : "text-muted-foreground"}`;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({
          name: name.trim(),
          type,
          target: type === "count" ? Math.max(1, Number(target) || 1) : null,
          unit: type === "count" ? unit.trim() : "",
          schedule: type === "quit" ? { kind: "daily" } : schedule,
          nonNegotiable: nn,
        });
      }}
    >
      <label className="block space-y-2">
        <span className="eyebrow">Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Cold shower" />
      </label>
      <div className="space-y-2">
        <span className="eyebrow">Type</span>
        <div className="flex gap-2">
          {(["build", "quit", "count"] as const).map((t) => (
            <Button variant="outline" type="button" key={t} className={seg(type === t)} onClick={() => setType(t)}>
              {t === "build" ? "Do" : t === "quit" ? "Quit" : "Count"}
            </Button>
          ))}
        </div>
      </div>
      {type === "count" && (
        <div className="flex gap-2">
          <label className="flex-1 space-y-2">
            <span className="eyebrow">Target</span>
            <input className={field} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="flex-1 space-y-2">
            <span className="eyebrow">Unit</span>
            <input className={field} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="pages" />
          </label>
        </div>
      )}
      {type !== "quit" && (
        <div className="space-y-2">
          <span className="eyebrow">Schedule</span>
          <div className="flex gap-2">
            <Button variant="outline" type="button" className={seg(schedule.kind === "daily")} onClick={() => setSchedule({ kind: "daily" })}>Daily</Button>
            <Button variant="outline" type="button" className={seg(schedule.kind === "weekdays")} onClick={() => setSchedule({ kind: "weekdays", days: [1, 2, 3, 4, 5] })}>Days</Button>
            <Button variant="outline" type="button" className={seg(schedule.kind === "perWeek")} onClick={() => setSchedule({ kind: "perWeek", times: 3 })}>Per week</Button>
          </div>
          {schedule.kind === "weekdays" && (
            <div className="flex gap-1">
              {WEEKDAYS.map((d, i) => {
                const on = schedule.days.includes(i);
                return (
                  <Button variant="outline"
                    type="button"
                    key={d}
                    aria-pressed={on}
                    className={seg(on)}
                    onClick={() => setSchedule({ kind: "weekdays", days: on ? schedule.days.filter((x) => x !== i) : [...schedule.days, i] })}
                  >
                    {d[0]}
                  </Button>
                );
              })}
            </div>
          )}
          {schedule.kind === "perWeek" && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Button variant="outline" type="button" key={n} className={seg(schedule.times === n)} onClick={() => setSchedule({ kind: "perWeek", times: n })}>
                  {n}×
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
      <label className="flex items-center justify-between gap-4">
        <span>
          <span className="block font-medium">Non-negotiable</span>
          <span className="text-sm text-muted-foreground">All of these done = day won.</span>
        </span>
        <input type="checkbox" className="size-5 accent-foreground" checked={nn} onChange={(e) => setNn(e.target.checked)} />
      </label>
      <Button variant="outline" className="tap w-full rounded-lg bg-foreground font-semibold text-background">{initial ? <Check /> : <Plus />}{initial ? "Save" : "Add habit"}</Button>
      {initial && (
        <div className="flex gap-2">
          <Button variant="outline" type="button" className="tap flex-1 rounded-lg border text-sm" onClick={onArchive}>
            <Archive />{initial.archived ? "Unarchive" : "Archive"}
          </Button>
          <Button variant="outline"
            type="button"
            className="tap flex-1 rounded-lg border text-sm text-destructive"
            onClick={() => confirm("Delete this habit? History is kept in your stats.") && onDelete?.()}
          >
            <Trash2 /> Delete
          </Button>
        </div>
      )}
    </form>
  );
}
