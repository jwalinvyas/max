import Dexie, { type Table } from "dexie";
import { DEFAULT_PROMPTS, type Challenge, type Habit, type JournalEntry, type Log, type Settings, type Slip } from "./types";

export class MaxDB extends Dexie {
  habits!: Table<Habit, string>;
  logs!: Table<Log, string>;
  slips!: Table<Slip, string>;
  journal!: Table<JournalEntry, string>;
  settings!: Table<Settings, string>;
  challenges!: Table<Challenge, string>;

  constructor() {
    super("max");
    this.version(1).stores({
      habits: "id, order, deleted, updatedAt",
      logs: "id, [habitId+date], habitId, date, deleted, updatedAt",
      slips: "id, habitId, date, deleted, updatedAt",
      journal: "id, date, deleted, updatedAt",
      settings: "id",
    });
    // v2: challenges + backfill new settings/habit fields
    this.version(2)
      .stores({ challenges: "id, deleted, updatedAt" })
      .upgrade(async (tx) => {
        await tx.table("settings").toCollection().modify((s: Partial<Settings>) => {
          if (!s.prompts) s.prompts = DEFAULT_PROMPTS;
        });
        await tx.table("habits").toCollection().modify((h: Partial<Habit>) => {
          if (h.archivedOn === undefined) h.archivedOn = null;
        });
      });
  }
}

let instance: MaxDB | null = null;
/** Lazily created so nothing touches IndexedDB during SSR. */
export function db(): MaxDB {
  if (!instance) instance = new MaxDB();
  return instance;
}
