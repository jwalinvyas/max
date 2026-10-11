/** Central logical-date helpers. All dates are local "YYYY-MM-DD" strings. */
const pad = (n: number) => String(n).padStart(2, "0");

export const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Logical day: before `rolloverHour` local time, it still counts as the previous day. */
export function logicalDate(rolloverHour = 4, now: Date = new Date()): string {
  const d = new Date(now.getTime());
  if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
  return fmt(d);
}

export function logicalDateOf(ts: number, rolloverHour = 4) {
  return logicalDate(rolloverHour, new Date(ts));
}

export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

export const weekday = (s: string) => parse(s).getDay();

/** b - a in days */
export const diffDays = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

export const weekStartOf = (s: string, ws: number) => addDays(s, -((weekday(s) - ws + 7) % 7));

export const isDateStr = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const pretty = (s: string, opts?: Intl.DateTimeFormatOptions) =>
  parse(s).toLocaleDateString(undefined, opts ?? { weekday: "long", month: "long", day: "numeric" });

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function* eachDay(from: string, to: string) {
  let d = from;
  let guard = 0;
  while (d <= to && guard++ < 20000) {
    yield d;
    d = addDays(d, 1);
  }
}
