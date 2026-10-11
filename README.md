# MAX

Build a minimalist, intense discipline tracking app called "MAX". Stack: React, Vite, TypeScript, Tailwind, shadcn/ui, Recharts, Dexie (IndexedDB). Mobile-first, installable PWA, fully offline-first, no backend yet.

=== DESIGN SYSTEM ===
- Monochrome (near-black #0a0a0a / off-white #fafafa) plus ONE accent color (#22c55e) used only for completed states and heatmap intensity.
- Dark mode default, light mode follows system setting. Large type, generous whitespace, almost no icons, no gradients, no confetti, no XP or badges, neutral non-shaming copy.
- Bottom tab bar: Today, Journal, Stats. Settings via a small gear on Today.
- Respect iOS safe areas (env(safe-area-inset-*)), use 100dvh, minimum 44px tap targets, support prefers-reduced-motion.

=== DATA LAYER ===
- Local-first with Dexie. Put all reads/writes behind a repository module so a cloud backend can be swapped in later.
- Every record has id, createdAt, updatedAt, deleted (soft delete flag) to make future sync easy.
- Tables: habits (name, type: build|quit|count, target, unit, schedule, nonNegotiable, archived, order), logs (habitId, date YYYY-MM-DD, done, value, note), slips (habitId, date, trigger note), journal (date, intention, reflection, mood 1-5, energy 1-5, tags), settings (singleton: why, rolloverHour default 4, weekStart, theme, accent, prompts list).
- Use proper Dexie versioning/migrations.
- A central "logical date" helper that applies the rollover hour (default 4:00 AM) so late-night logging counts toward the previous day. Use it everywhere.

=== TODAY TAB ===
- Header: logical date (tap to open a date picker to view/edit any past day, which also serves as backfill), and a thin progress line showing X/Y done today.
- "My Why" shown as one quiet muted line under the date if set.
- Habit list for habits scheduled today. Tapping a build habit toggles done instantly. Quit habits show clean-days count and a "Slipped" button (opens a sheet with an optional trigger note, resets counter, saves to slips). Count habits show a +/- stepper with progress toward the target and are done when the target is hit.
- Schedules per habit: every day, specific weekdays, or X times per week. Unscheduled days never break streaks.
- Optional "+ note" on any log entry.
- Non-negotiables: up to 3 habits can be flagged. A day is "won" only if all non-negotiables are done. Non-negotiables are pinned at the top of the list.
- Inline "Add habit" at the bottom with a minimal form (name, type, schedule, target if count, non-negotiable toggle). Swipe or long-press a habit to edit, archive, or delete.
- Focus timer: a habit with a count/minutes unit has a timer button (25/45/60/custom). Use the Wake Lock API while running if available. On completion it logs the minutes to that habit.
- Challenges: start a 30, 75, or 100-day challenge across selected habits with a strict mode toggle (any miss resets to day 1). Show challenge progress as a thin bar on Today.
- Missed-habit reflection: for past days with a missed scheduled habit, show a gentle "Why did you miss it?" field that saves into that log's note.

=== STATS TAB ===
- Habit selector chips at top: "All" plus each habit.
- Range toggle: Month / Year. GitHub-style heatmap (horizontal scroll on mobile), 4 intensity levels of the accent color based on completion share. "Won" days (all non-negotiables done) get a small solid dot. Tapping a cell opens a bottom sheet with that day's habits, notes, mood, and journal entry.
- Heatmap color mode toggle: Completion or Mood.
- Metrics: current streak, longest streak, "won" streak (separate), 30-day completion rate, per-habit consistency %, total completions. A day counts toward the normal streak when at least 1 scheduled habit is done; per-habit streaks honor that habit's schedule.
- Charts (Recharts, monochrome plus accent only): Discipline Score line chart (rolling 7-day completion rate over the last 90 days) and best/worst weekday bar chart.
- Weekly review card on Sundays: completed vs missed, best habit, weakest habit, in 3 short lines.
- Slip history list for quit habits.

=== JOURNAL TAB ===
- One entry per logical day with two sections: Morning intention (short) and Evening reflection (long). Distraction-free plain text, no toolbars, autosave with debounce.
- Optional daily prompt shown in muted text above the reflection, rotating from an editable list (defaults: "What did I avoid today?", "One win, one failure", "What would the disciplined version of me do tomorrow?"). Never required.
- Mood and energy 1-5 as two minimal tap rows.
- Inline #tags auto-detected. Full-text search across all entries. Past entries list with date switcher. "On this day" section for entries from earlier months/years.

=== SETTINGS ===
- My Why (personal reason). When a streak of 7+ days breaks, show it in a calm full-screen modal.
- Day rollover time, week start day, theme (system/dark/light), accent color (6 muted options), editable journal prompts.
- Export all data as JSON and CSV, import JSON (validate and handle malformed files gracefully), delete all data with confirmation.

=== PWA (must be fully working) ===
- vite-plugin-pwa with registerType "autoUpdate", precache the full app shell so everything works offline, and an offline fallback.
- Manifest: name, short_name, start_url "/", scope "/", display "standalone", background_color and theme_color matching the dark background, icons at 192, 512, and a maskable 512.
- Generate minimal icons (a single bold mark) and an apple-touch-icon 180x180.
- index.html: apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style black-translucent, apple-mobile-web-app-title, viewport-fit=cover, theme-color meta.
- Do NOT register the service worker inside iframes or the Lovable preview, only on the published site.
- Small dismissible hint on iOS Safari when not in standalone mode: "Tap Share, then Add to Home Screen."
- Badging API: set the icon badge to the number of habits still incomplete today whenever the app opens or a habit changes. Fail silently if unsupported.
- Show a "New version available, tap to refresh" toast when an update is ready.

=== QUALITY ===
- Clean, componentized, typed code. Lazy-load routes and charts, memoize the heatmap so it stays smooth with 3+ years of data and 20 habits.
- Accessible labels and focus states.
- Handle edge cases: midnight/rollover, time zone changes, deleting a habit that has logs (soft delete, keep history), empty states with one line of copy each (no illustrations).

Build all of the above. When finished, list exactly which features were implemented and any that were skipped or simplified.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/944e6f2a-86f5-4391-9242-efaf706e8e0c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
