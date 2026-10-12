import { memo } from "react";
import type { DayAgg } from "@/lib/stats";
import { addDays, weekStartOf } from "@/lib/date";

/** Memoized: one cell per day, weeks as columns. */
export const Heatmap = memo(function Heatmap({ days, to, weeks, ws }: { days: Map<string, DayAgg>; to: string; weeks: number; ws: number }) {
  const start = addDays(weekStartOf(to, ws), -7 * (weeks - 1));
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const lvl = (d: string) => {
    const a = days.get(d);
    if (!a || d > to || a.total === 0) return 0;
    const r = a.done / a.total;
    return r === 0 ? 0 : r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4;
  };
  const cls = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
  return (
    <div className="no-scrollbar flex gap-[3px] overflow-x-auto" dir="rtl" role="img" aria-label="Completion heatmap">
      {cols.reverse().map((col) => (
        <div key={col[0]} className="flex flex-col gap-[3px]" dir="ltr">
          {col.map((d) => (
            <div key={d} title={d} className={`size-3 rounded-[2px] ${d > to ? "opacity-0" : cls[lvl(d)]}`} />
          ))}
        </div>
      ))}
    </div>
  );
});
