/**
 * Repository: the ONLY module that reads/writes storage.
 * Swap the implementation for a cloud-backed one later without touching UI.
 */
import { z } from "zod";
import { db } from "./db";
import {
  DEFAULT_PROMPTS,
  type Challenge,
  type Habit,
  type HabitInput,
  type JournalEntry,
  type Log,
  type Settings,
  type Slip,
} from "./types";

const now = () => Date.now();
const base = () => {
  const t = now();
  return { id: crypto.randomUUID(), createdAt: t, updatedAt: t, deleted: 0 as const };
};
const alive = <T extends { deleted: 0 | 1 }>(rows: T[]) => rows.filter((r) => !r.deleted);

export const SETTINGS_ID = "singleton";
export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  createdAt: 0,
  updatedAt: 0,
  deleted: 0,
  why: "",
  rolloverHour: 4,
  weekStart: 1,
  theme: "system",
  accent: "#22c55e",
  prompts: DEFAULT_PROMPTS,
};

export const extractTags = (text: string) =>
  Array.from(new Set((text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((t) => t.slice(1).toLowerCase())));

export const repo = {
  // ---------- habits ----------
  async listHabits() {
    return alive(await db().habits.toArray()).sort((a, b) => a.order - b.order);
  },
  async createHabit(input: HabitInput) {
    const order = await db().habits.count();
    const h: Habit = { ...base(), ...input, archived: false, archivedOn: null, order };
    await db().habits.add(h);
    return h;
  },
  async updateHabit(id: string, patch: Partial<Habit>) {
    await db().habits.update(id, { ...patch, updatedAt: now() });
  },
  async archiveHabit(id: string, on: string, archived: boolean) {
    await db().habits.update(id, { archived, archivedOn: archived ? on : null, updatedAt: now() });
  },
  /** soft delete; history stays */
  async deleteHabit(id: string) {
    await db().habits.update(id, { deleted: 1, updatedAt: now() });
  },

  // ---------- logs ----------
  async listLogs() {
    return alive(await db().logs.toArray());
  },
  async getLog(habitId: string, date: string) {
    return db()
      .logs.where("[habitId+date]")
      .equals([habitId, date])
      .filter((l) => !l.deleted)
      .first();
  },
  async upsertLog(habitId: string, date: string, patch: Partial<Pick<Log, "done" | "value" | "note">>) {
    const ex = await repo.getLog(habitId, date);
    if (ex) {
      await db().logs.update(ex.id, { ...patch, updatedAt: now() });
    } else {
      await db().logs.add({ ...base(), habitId, date, done: false, value: 0, note: "", ...patch });
    }
  },
  async addValue(habitId: string, date: string, delta: number) {
    const ex = await repo.getLog(habitId, date);
    await repo.upsertLog(habitId, date, { value: Math.max(0, (ex?.value ?? 0) + delta) });
  },

  // ---------- slips ----------
  async listSlips() {
    return alive(await db().slips.toArray()).sort((a, b) => b.date.localeCompare(a.date));
  },
  async addSlip(habitId: string, date: string, note: string) {
    await db().slips.add({ ...base(), habitId, date, note });
  },
  async deleteSlip(id: string) {
    await db().slips.update(id, { deleted: 1, updatedAt: now() });
  },

  // ---------- journal ----------
  async listJournal() {
    return alive(await db().journal.toArray()).sort((a, b) => b.date.localeCompare(a.date));
  },
  async saveJournal(date: string, patch: Partial<Pick<JournalEntry, "intention" | "reflection" | "mood" | "energy">>) {
    const ex = await db().journal.where("date").equals(date).filter((j) => !j.deleted).first();
    const merged = { intention: "", reflection: "", mood: null, energy: null, ...(ex ?? {}), ...patch };
    const tags = extractTags(`${merged.intention} ${merged.reflection}`);
    if (ex) await db().journal.update(ex.id, { ...patch, tags, updatedAt: now() });
    else await db().journal.add({ ...base(), date, ...merged, tags } as JournalEntry);
  },

  // ---------- settings ----------
  async getSettings(): Promise<Settings> {
    const s = await db().settings.get(SETTINGS_ID);
    return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
  },
  async updateSettings(patch: Partial<Settings>) {
    const cur = await repo.getSettings();
    await db().settings.put({ ...cur, ...patch, createdAt: cur.createdAt || now(), updatedAt: now() });
  },

  // ---------- challenges ----------
  async listChallenges() {
    return alive(await db().challenges.toArray());
  },
  async startChallenge(c: Pick<Challenge, "length" | "habitIds" | "startDate" | "strict">) {
    await db().challenges.add({ ...base(), ...c, endedOn: null });
  },
  async endChallenge(id: string, on: string) {
    await db().challenges.update(id, { endedOn: on, updatedAt: now() });
  },

  // ---------- export / import ----------
  async exportAll() {
    const d = db();
    return {
      app: "max",
      version: 2,
      exportedAt: new Date().toISOString(),
      habits: await d.habits.toArray(),
      logs: await d.logs.toArray(),
      slips: await d.slips.toArray(),
      journal: await d.journal.toArray(),
      settings: await d.settings.toArray(),
      challenges: await d.challenges.toArray(),
    };
  },
  async importAll(raw: unknown) {
    const parsed = ImportSchema.safeParse(raw);
    if (!parsed.success) throw new Error("This file isn't a valid MAX export.");
    const p = parsed.data;
    const d = db();
    await d.transaction("rw", [d.habits, d.logs, d.slips, d.journal, d.settings, d.challenges], async () => {
      await d.habits.bulkPut(p.habits as Habit[]);
      await d.logs.bulkPut(p.logs as Log[]);
      await d.slips.bulkPut(p.slips as Slip[]);
      await d.journal.bulkPut(p.journal as JournalEntry[]);
      await d.challenges.bulkPut(p.challenges as Challenge[]);
      if (p.settings[0]) await d.settings.put({ ...DEFAULT_SETTINGS, ...(p.settings[0] as Settings), id: SETTINGS_ID });
    });
    return p.habits.length;
  },
  async wipeAll() {
    const d = db();
    await Promise.all([d.habits.clear(), d.logs.clear(), d.slips.clear(), d.journal.clear(), d.settings.clear(), d.challenges.clear()]);
  },
};

const baseZ = {
  id: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
  deleted: z.union([z.literal(0), z.literal(1)]).catch(0),
};
const dateZ = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ImportSchema = z.object({
  app: z.literal("max"),
  habits: z.array(
    z.object({
      ...baseZ,
      name: z.string(),
      type: z.enum(["build", "quit", "count"]),
      target: z.number().nullable().catch(null),
      unit: z.string().catch(""),
      schedule: z.union([
        z.object({ kind: z.literal("daily") }),
        z.object({ kind: z.literal("weekdays"), days: z.array(z.number().int().min(0).max(6)) }),
        z.object({ kind: z.literal("perWeek"), times: z.number().int().min(1).max(7) }),
      ]),
      nonNegotiable: z.boolean().catch(false),
      archived: z.boolean().catch(false),
      archivedOn: dateZ.nullable().catch(null),
      order: z.number().catch(0),
    }),
  ),
  logs: z.array(z.object({ ...baseZ, habitId: z.string(), date: dateZ, done: z.boolean(), value: z.number().catch(0), note: z.string().catch("") })),
  slips: z.array(z.object({ ...baseZ, habitId: z.string(), date: dateZ, note: z.string().catch("") })).catch([]),
  journal: z
    .array(
      z.object({
        ...baseZ,
        date: dateZ,
        intention: z.string().catch(""),
        reflection: z.string().catch(""),
        mood: z.number().min(1).max(5).nullable().catch(null),
        energy: z.number().min(1).max(5).nullable().catch(null),
        tags: z.array(z.string()).catch([]),
      }),
    )
    .catch([]),
  settings: z.array(z.record(z.unknown())).catch([]),
  challenges: z
    .array(z.object({ ...baseZ, length: z.number(), habitIds: z.array(z.string()), startDate: dateZ, strict: z.boolean(), endedOn: dateZ.nullable().catch(null) }))
    .catch([]),
});
