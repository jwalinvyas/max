import { addDays, diffDays, eachDay, fmt, weekday, weekStartOf } from "./date";
import type { Habit, Log, Slip } from "@/data/types";

export type Status = "done" | "missed" | "pending" | "off";

export interface Index {
  logs: Map<string, Log>;
  slips: Map<string, Slip[]>;
  weekDone: Map<string, number>;
  start: Map<string, string>;
  lastSlip: Map<string, string[]>;
}

const key = (h: string, d: string) => `${h}|${d}`;

export const isDoneLog = (h: Habit, l?: Log) =>
  !!l && (h.type === "count" ? l.value >= (h.target || 1) : l.done);

export function buildIndex(habits: Habit[], logs: Log[], slips: Slip[], weekStart: number): Index {
  const byId = new Map(habits.map((h) => [h.id, h]));
  const ix: Index = { logs: new Map(), slips: new Map(), weekDone: new Map(), start: new Map(), lastSlip: new Map() };
  for (const h of habits) ix.start.set(h.id, fmt(new Date(h.createdAt)));
  for (const l of logs) {
    const h = byId.get(l.habitId);
    if (!h) continue;
    ix.logs.set(key(l.habitId, l.date), l);
    if (l.date < ix.start.get(h.id)!) ix.start.set(h.id, l.date);
    if (isDoneLog(h, l)) {
      const wk = key(h.id, weekStartOf(l.date, weekStart));
      ix.weekDone.set(wk, (ix.weekDone.get(wk) ?? 0) + 1);
    }
  }
  for (const s of slips) {
    const k = key(s.habitId, s.date);
    ix.slips.set(k, [...(ix.slips.get(k) ?? []), s]);
    ix.lastSlip.set(s.habitId, [...(ix.lastSlip.get(s.habitId) ?? []), s.date]);
    const st = ix.start.get(s.habitId);
    if (st && s.date < st) ix.start.set(s.habitId, s.date);
  }
  for (const arr of ix.lastSlip.values()) arr.sort();
  return ix;
}

export function isScheduledOn(h: Habit, date: string) {
  if (h.type === "quit") return true;
  if (h.schedule.kind === "weekdays") return h.schedule.days.includes(weekday(date));
  return true;
}

export function statusOf(h: Habit, date: string, today: string, ix: Index, weekStart: number): Status {
  if (date > today) return "off";
  const st = ix.start.get(h.id) ?? today;
  if (date < st) return "off";
  if (h.archivedOn && date >= h.archivedOn) return "off";
  const k = key(h.id, date);
  if (h.type === "quit") return ix.slips.has(k) ? "missed" : "done";
  const done = isDoneLog(h, ix.logs.get(k));
  if (done) return "done";
  const s = h.schedule;
  if (s.kind === "weekdays" && !s.days.includes(weekday(date))) return "off";
  if (s.kind === "perWeek") {
    if (date === today) return "pending";
    const ws = weekStartOf(date, weekStart);
    const we = addDays(ws, 6);
    if (date !== we) return "off";
    return (ix.weekDone.get(key(h.id, ws)) ?? 0) >= s.times ? "off" : "missed";
  }
  return date === today ? "pending" : "missed";
}

export function cleanDays(h: Habit, date: string, ix: Index) {
  const slips = (ix.lastSlip.get(h.id) ?? []).filter((d) => d <= date);
  const from = slips.at(-1) ?? ix.start.get(h.id) ?? date;
  return Math.max(0, diffDays(from, date));
}

export interface DayAgg {
  total: number;
  done: number;
  nnTotal: number;
  nnDone: number;
  won: boolean;
}

export function computeDays(habits: Habit[], ix: Index, from: string, to: string, today: string, ws: number) {
  const out = new Map<string, DayAgg>();
  for (const d of eachDay(from, to)) {
    const a: DayAgg = { total: 0, done: 0, nnTotal: 0, nnDone: 0, won: false };
    for (const h of habits) {
      const s = statusOf(h, d, today, ix, ws);
      if (s === "off") continue;
      a.total++;
      if (s === "done") a.done++;
      if (h.nonNegotiable) {
        a.nnTotal++;
        if (s === "done") a.nnDone++;
      }
    }
    a.won = a.nnTotal > 0 && a.nnDone === a.nnTotal;
    out.set(d, a);
  }
  return out;
}

export function streaks(days: Map<string, DayAgg>, today: string) {
  let run = 0,
    longest = 0,
    wonRun = 0,
    wonLongest = 0;
  for (const [d, a] of days) {
    if (d > today || a.total === 0) continue;
    if (a.done > 0) run++;
    else if (d !== today) run = 0;
    longest = Math.max(longest, run);
    if (a.nnTotal > 0) {
      if (a.won) wonRun++;
      else if (d !== today) wonRun = 0;
      wonLongest = Math.max(wonLongest, wonRun);
    }
  }
  return { current: run, longest, won: wonRun, wonLongest };
}

export function rate(days: Map<string, DayAgg>, from: string, to: string) {
  let t = 0,
    d = 0;
  for (const day of eachDay(from, to)) {
    const a = days.get(day);
    if (!a) continue;
    t += a.total;
    d += a.done;
  }
  return t ? d / t : 0;
}

export function habitConsistency(h: Habit, ix: Index, from: string, today: string, ws: number) {
  let done = 0,
    missed = 0;
  for (const d of eachDay(from, today)) {
    const s = statusOf(h, d, today, ix, ws);
    if (s === "done") done++;
    else if (s === "missed") missed++;
  }
  return { done, missed, pct: done + missed ? done / (done + missed) : 0 };
}

export function earliestStart(ix: Index, today: string) {
  let m = today;
  for (const s of ix.start.values()) if (s < m) m = s;
  return m;
}
