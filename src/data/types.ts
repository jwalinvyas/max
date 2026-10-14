export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  /** soft delete flag, 0|1 so it is indexable */
  deleted: 0 | 1;
}

export type HabitType = "build" | "quit" | "count";

export type Schedule =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] }
  | { kind: "perWeek"; times: number };

export interface Habit extends BaseRecord {
  name: string;
  type: HabitType;
  target: number | null;
  unit: string;
  schedule: Schedule;
  nonNegotiable: boolean;
  archived: boolean;
  archivedOn: string | null;
  order: number;
}

export interface Log extends BaseRecord {
  habitId: string;
  date: string;
  done: boolean;
  value: number;
  note: string;
}

export interface Slip extends BaseRecord {
  habitId: string;
  date: string;
  note: string;
}

export interface JournalEntry extends BaseRecord {
  date: string;
  intention: string;
  reflection: string;
  mood: number | null;
  energy: number | null;
  tags: string[];
}

export type Theme = "system" | "dark" | "light";

export interface Settings extends BaseRecord {
  why: string;
  rolloverHour: number;
  weekStart: 0 | 1;
  theme: Theme;
  accent: string;
  prompts: string[];
  /** SHA-256 of the app PIN; absent = no lock. */
  pinHash?: string;
}

export interface Challenge extends BaseRecord {
  length: number;
  habitIds: string[];
  startDate: string;
  strict: boolean;
  endedOn: string | null;
}

export type HabitInput = Pick<
  Habit,
  "name" | "type" | "target" | "unit" | "schedule" | "nonNegotiable"
>;

export const DEFAULT_PROMPTS = [
  "What did I avoid today?",
  "One win, one failure",
  "What would the disciplined version of me do tomorrow?",
];

export const ACCENTS = ["#22c55e", "#2dd4bf", "#60a5fa", "#f59e0b", "#f87171", "#d6d3d1"];
