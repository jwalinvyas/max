import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { repo, DEFAULT_SETTINGS } from "./repo";
import type { Challenge, Habit, JournalEntry, Log, Settings, Slip } from "./types";
import { logicalDate } from "@/lib/date";
import { buildIndex, computeDays, earliestStart, statusOf, streaks, type Index } from "@/lib/stats";

interface AppData {
  ready: boolean;
  today: string;
  settings: Settings;
  habits: Habit[]; // non-deleted, incl. archived
  logs: Log[];
  slips: Slip[];
  journal: JournalEntry[];
  challenges: Challenge[];
  ix: Index;
}

const Ctx = createContext<AppData | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}

/** Recomputes the logical date on an interval, focus and visibility (handles rollover + TZ changes). */
function useLogicalToday(rollover: number) {
  const [today, setToday] = useState(() => logicalDate(rollover));
  useEffect(() => {
    const tick = () => setToday(logicalDate(rollover));
    tick();
    const t = setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [rollover]);
  return today;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => repo.getSettings(), []);
  const habits = useLiveQuery(() => repo.listHabits(), []);
  const logs = useLiveQuery(() => repo.listLogs(), []);
  const slips = useLiveQuery(() => repo.listSlips(), []);
  const journal = useLiveQuery(() => repo.listJournal(), []);
  const challenges = useLiveQuery(() => repo.listChallenges(), []);
  const s = settings ?? DEFAULT_SETTINGS;
  const today = useLogicalToday(s.rolloverHour);

  const ix = useMemo(
    () => buildIndex(habits ?? [], logs ?? [], slips ?? [], s.weekStart),
    [habits, logs, slips, s.weekStart],
  );

  const value = useMemo<AppData>(
    () => ({
      ready: !!(settings && habits && logs && slips && journal && challenges),
      today,
      settings: s,
      habits: habits ?? [],
      logs: logs ?? [],
      slips: slips ?? [],
      journal: journal ?? [],
      challenges: challenges ?? [],
      ix,
    }),
    [settings, habits, logs, slips, journal, challenges, today, s, ix],
  );

  // theme + accent
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const light = s.theme === "light" || (s.theme === "system" && mq.matches);
      root.classList.toggle("light", light);
      root.style.colorScheme = light ? "light" : "dark";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#fafafa" : "#0a0a0a");
    };
    apply();
    root.style.setProperty("--done", s.accent);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [s.theme, s.accent]);

  // app icon badge: habits still incomplete today
  useEffect(() => {
    if (!value.ready) return;
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    const n = value.habits.filter(
      (h) => !h.archived && statusOf(h, today, today, ix, s.weekStart) === "pending",
    ).length;
    try {
      if (n > 0) nav.setAppBadge?.(n)?.catch(() => {});
      else nav.clearAppBadge?.()?.catch(() => {});
    } catch {
      /* unsupported */
    }
  }, [value.ready, value.habits, ix, today, s.weekStart]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Overall streak helper shared by Today (break detection) and Stats. */
export function useOverallStreak() {
  const { habits, ix, today, settings } = useApp();
  return useMemo(() => {
    const from = earliestStart(ix, today);
    const days = computeDays(habits, ix, from, today, today, settings.weekStart);
    return streaks(days, today);
  }, [habits, ix, today, settings.weekStart]);
}
