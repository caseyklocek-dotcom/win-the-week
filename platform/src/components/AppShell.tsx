"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { ServicesIcon } from "./ServicesIcon";
import { useStore } from "@/lib/store";
import { ThemeToggle } from "./ThemeToggle";
import { BottomNav } from "./BottomNav";
import { Coach } from "./Coach";
import { Tour } from "./Tour";

const NAV_SECTIONS: {
  label?: string;
  items: { href: string; label: string; icon: string; match?: string[] }[];
}[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: "home" }],
  },
  {
    label: "Sunday",
    items: [
      {
        href: "/plan",
        label: "Services",
        icon: "services",
        match: ["/plan", "/set", "/team", "/rehearse", "/packet"],
      },
      { href: "/calendar", label: "Calendar", icon: "calendar" },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/songs", label: "Songs", icon: "music" },
      { href: "/people", label: "Team", icon: "users" },
    ],
  },
  {
    label: "Grow",
    items: [
      { href: "/growth", label: "Goals & Growth", icon: "target" },
      { href: "/tools", label: "Tools", icon: "tool" },
      { href: "/community", label: "Community", icon: "community" },
    ],
  },
];

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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

function navItemActive(
  item: { href: string; match?: string[] },
  pathname: string,
): boolean {
  return item.match
    ? item.match.some((m) => pathname === m || pathname.startsWith(m + "/"))
    : item.href === "/"
      ? pathname === "/"
      : pathname.startsWith(item.href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, activeService } = useStore();

  // Pulse the active nav item briefly whenever the active section changes — a
  // soft cue for where you are, most useful as the first-run tour moves around.
  const activeHref =
    NAV_SECTIONS.flatMap((s) => s.items).find((it) => navItemActive(it, pathname))?.href ?? null;
  const [pulseHref, setPulseHref] = useState<string | null>(null);
  useEffect(() => {
    if (!activeHref) return;
    setPulseHref(activeHref);
    const t = setTimeout(() => setPulseHref(null), 2400);
    return () => clearTimeout(t);
  }, [activeHref]);

  const initials = state.profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex min-h-screen bg-cream-100">
      {/* Sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-charcoal-100 bg-white px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
          <LogoMark className="h-8 w-8 text-coral-500" />
          <span className="headline text-lg leading-none">
            Win the<br />Week
          </span>
        </Link>

        <nav className="flex flex-col gap-5">
          {NAV_SECTIONS.map((section, i) => (
            <div key={section.label ?? i} className="flex flex-col gap-1">
              {section.label && (
                <div className="label px-3 pb-1 text-[0.65rem] text-charcoal-300">
                  {section.label}
                </div>
              )}
              {section.items.map((item) => {
                const active = navItemActive(item, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-coral-100 text-coral-600"
                        : "text-charcoal-600 hover:bg-cream-200"
                    } ${item.href === pulseHref ? "nav-pulse" : ""}`}
                  >
                    {item.icon === "services" ? (
                      <ServicesIcon open={active} size={18} />
                    ) : (
                      <Icon name={item.icon} size={18} />
                    )}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="px-1">
            <ThemeToggle size="sm" />
          </div>
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg border border-charcoal-100 p-3 hover:bg-cream-200"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-white dark:bg-coral-500">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-charcoal-800">
                {state.profile.name}
              </div>
              <div className="truncate text-xs text-charcoal-400">
                {state.profile.churchName}
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-charcoal-100 bg-cream-100/80 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2 text-sm text-charcoal-400">
            <Icon name="calendar" size={16} />
            <span>
              Service ·{" "}
              <span className="font-semibold text-charcoal-800">
                {fmtDate(activeService.date)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* 44px hit area around the 32px avatar (touch target minimum) */}
            <Link
              href="/profile"
              className="-m-1.5 flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-white dark:bg-coral-500">
                {initials}
              </span>
            </Link>
          </div>
        </header>

        {/* Bottom padding on phones = nav height + breathing room + the home
            indicator safe area, so nothing interactive ever hides under the
            fixed bottom nav. */}
        <main className="flex-1 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:px-6 lg:py-6 lg:pb-6">
          {/* Keyed on the route so content gently rises/fades on each page change. */}
          <div key={pathname} className="anim-page-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile primary nav */}
      <BottomNav />

      {/* Guided coach — persists across pages */}
      <Coach />

      {/* First-run product tour — keyed so replay remounts it fresh */}
      <Tour key={state.onboarded ? "done" : "run"} />
    </div>
  );
}
