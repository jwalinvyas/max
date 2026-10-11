import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { setupPwa } from "@/lib/pwa";
import { useApp, useOverallStreak } from "@/data/AppData";

export function TabBar() {
  const tabs = [
    { to: "/", label: "Today" },
    { to: "/journal", label: "Journal" },
    { to: "/stats", label: "Stats" },
  ] as const;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur pb-safe"
    >
      <ul className="mx-auto flex max-w-xl">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <Link
              to={t.to}
              activeOptions={{ exact: true }}
              className="tap flex h-14 items-center justify-center text-sm font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-foreground" , "aria-current": "page" }}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PwaSetup() {
  useEffect(() => {
    setupPwa((update) => {
      toast("New version available", {
        description: "Tap to refresh.",
        duration: Infinity,
        action: { label: "Refresh", onClick: update },
      });
    });
  }, []);
  return null;
}

export function IosInstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const safari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setShow(ios && safari && !standalone && localStorage.getItem("max.iosHint") !== "1");
  }, []);
  if (!show) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-20 z-40 mb-[env(safe-area-inset-bottom)] flex items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm">
      <span className="flex-1">Tap Share, then Add to Home Screen.</span>
      <button
        className="tap text-muted-foreground"
        onClick={() => {
          localStorage.setItem("max.iosHint", "1");
          setShow(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

/** When a streak of 7+ days breaks, show "My Why" calmly. */
export function StreakBreakWhy() {
  const { ready, settings, today } = useApp();
  const { current } = useOverallStreak();
  const [open, setOpen] = useState(false);
  const [prev, setPrev] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const stored = Number(localStorage.getItem("max.lastStreak") ?? 0);
    if (stored >= 7 && current < stored && current <= 1 && settings.why.trim()) {
      setPrev(stored);
      setOpen(true);
    }
    localStorage.setItem("max.lastStreak", String(current));
  }, [ready, current, today, settings.why]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Your why" className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-background px-safe text-center">
      <p className="eyebrow">A {prev}-day streak ended</p>
      <p className="max-w-md text-3xl font-semibold leading-tight">{settings.why}</p>
      <p className="text-muted-foreground">Start again today.</p>
      <button className="tap rounded-full border px-6" onClick={() => setOpen(false)} autoFocus>
        Continue
      </button>
    </div>
  );
}
