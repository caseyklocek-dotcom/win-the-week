"use client";

// ============================================================
// V2 App Shell — editorial top nav.
//
// The sidebar is gone. One calm header carries the whole app: wordmark,
// six destinations, the ⌘K command pill, the Guided/Fast mode switch, and
// the leader's avatar. Content sits on the warm cream canvas in a single
// readable column. Coral marks the weekly work; Invest wears teal — the
// long game gets its own color, per the design system.
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { pcsMode, profileMode } from "@/lib/mode";
import { ThemeToggle } from "./ThemeToggle";
import { BottomNav } from "./BottomNav";
import { Coach } from "./Coach";
import { Tour } from "./Tour";
import { CommandPalette, openPalette } from "./CommandPalette";

type NavItem = {
  href: string;
  label: string;
  match?: string[];
  invest?: boolean; // teal accent — the long-game side of the app
  scheduling?: boolean; // hidden in Planning Center mode
};

const NAV: NavItem[] = [
  { href: "/", label: "This Sunday" },
  {
    href: "/plan",
    label: "Plan",
    match: ["/plan", "/set", "/team", "/rehearse", "/send", "/packet", "/quick"],
  },
  { href: "/calendar", label: "Calendar" },
  { href: "/songs", label: "Songs" },
  { href: "/people", label: "People", scheduling: true },
  { href: "/reports", label: "Reports" },
  { href: "/invest", label: "Invest", invest: true, match: ["/invest", "/tools", "/community"] },
];

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="248 347 1004 895" className={className} fill="currentColor" aria-hidden="true">
      <g transform="translate(247,0)">
        <path d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z" />
        <path d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z" />
      </g>
    </svg>
  );
}

function navItemActive(item: NavItem, pathname: string): boolean {
  return item.match
    ? item.match.some((m) => pathname === m || pathname.startsWith(m + "/"))
    : item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);
}

// Detect the platform once so the pill shows the right modifier key.
function useCmdLabel() {
  const [label, setLabel] = useState("⌘K");
  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform ?? "");
    setLabel(mac ? "⌘K" : "Ctrl K");
  }, []);
  return label;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, setState } = useStore();
  const cmdLabel = useCmdLabel();

  const mode = profileMode(state.profile);
  const setMode = (m: "guided" | "fast") =>
    setState((s) => ({ ...s, profile: { ...s.profile, mode: m } }));

  const initials = state.profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      {/* ---- Top nav ---- */}
      <header className="no-print sticky top-0 z-30 border-b border-charcoal-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-5 px-4 lg:gap-7 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <LogoMark className="h-6 w-6 text-coral-500" />
            <span className="headline hidden text-[13px] tracking-[0.05em] sm:block">
              Win the Week
            </span>
          </Link>

          <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Primary">
            {NAV.filter((item) => !(item.scheduling && pcsMode(state.profile))).map((item) => {
              const active = navItemActive(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-16 items-center px-3 text-[13.5px] font-semibold transition-colors ${
                    active
                      ? "text-charcoal-900"
                      : item.invest
                        ? "text-teal-600 hover:text-teal-500"
                        : "text-charcoal-400 hover:text-charcoal-700"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span
                      aria-hidden
                      className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${
                        item.invest ? "bg-teal-500" : "bg-coral-500"
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2.5 lg:gap-3">
            {/* ⌘K pill */}
            <button
              onClick={openPalette}
              className="hidden items-center gap-2.5 rounded-full border border-charcoal-100 bg-cream-100 py-1.5 pl-3.5 pr-2 text-xs font-medium text-charcoal-400 transition-colors hover:border-charcoal-200 hover:text-charcoal-600 md:flex"
            >
              Find or do anything
              <kbd className="rounded-md border border-charcoal-100 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-600">
                {cmdLabel}
              </kbd>
            </button>
            <button
              onClick={openPalette}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-charcoal-400 hover:bg-cream-200 hover:text-charcoal-700 md:hidden"
            >
              <Icon name="search" size={18} />
            </button>

            {/* Guided / Fast mode */}
            <div
              className="hidden items-center rounded-full border border-charcoal-100 p-0.5 lg:flex"
              role="group"
              aria-label="Experience mode"
            >
              {(["guided", "fast"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  title={
                    m === "guided"
                      ? "Guided: step-by-step with coaching"
                      : "Fast: one screen, keyboard-first"
                  }
                  className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition-colors ${
                    mode === m
                      ? "bg-charcoal-800 text-white"
                      : "text-charcoal-400 hover:text-charcoal-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="hidden lg:block">
              <ThemeToggle size="sm" />
            </div>

            <Link
              href="/profile"
              className="flex h-9 w-9 shrink-0 items-center justify-center"
              aria-label="Profile"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-white dark:bg-coral-500">
                {initials}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---- Content ---- */}
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-9 lg:pb-12">
        {/* Keyed on the route so content gently rises/fades on each page change. */}
        <div key={pathname} className="anim-page-in">
          {children}
        </div>
      </main>

      {/* Mobile primary nav */}
      <BottomNav />

      {/* ⌘K — mounted once, listens globally */}
      <CommandPalette />

      {/* Guided coach — only in Guided mode; Fast mode means no hand-holding */}
      {mode === "guided" && <Coach />}

      {/* First-run product tour — keyed so replay remounts it fresh */}
      <Tour key={state.onboarded ? "done" : "run"} />
    </div>
  );
}
