"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { ServicesIcon } from "./ServicesIcon";
import { useStore } from "@/lib/store";
import { pcsMode, isAccountAdmin } from "@/lib/mode";
import { myLeaderTrack } from "@/lib/leaders";

// Phone tab bar. Five primary tabs cover the weekly core; everything else lives
// behind "More" so the bar stays clean. Home and Growth are both reachable now.
type NavItem = { href: string; label: string; icon: string; match?: string[]; scheduling?: boolean };

const PRIMARY: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  {
    href: "/plan",
    label: "Services",
    icon: "services",
    match: ["/plan", "/set", "/team", "/rehearse", "/packet"],
  },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/songs", label: "Songs", icon: "music" },
];

const MORE: NavItem[] = [
  { href: "/people", label: "Team", icon: "users", scheduling: true },
  { href: "/reports", label: "Reports", icon: "target" },
  { href: "/invest", label: "Invest", icon: "target" },
  { href: "/tools", label: "Tools", icon: "tool" },
  { href: "/community", label: "Community", icon: "community" },
  { href: "/profile", label: "Profile", icon: "settings" },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function MoreIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { state } = useStore();
  const investLocked =
    isAccountAdmin(state.profile) && !myLeaderTrack(state, state.profile)?.investUnlocked;
  const more = MORE.filter(
    (it) => !(it.scheduling && pcsMode(state.profile)) && !(it.href === "/invest" && investLocked),
  );

  const onMore = more.some((it) => isActive(it, pathname));

  // Close the sheet whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Pulse the active tab briefly when the section changes (matches desktop).
  const activeKey = onMore ? "more" : (PRIMARY.find((it) => isActive(it, pathname))?.href ?? null);
  const [pulse, setPulse] = useState<string | null>(null);
  useEffect(() => {
    if (!activeKey) return;
    setPulse(activeKey);
    const t = setTimeout(() => setPulse(null), 2400);
    return () => clearTimeout(t);
  }, [activeKey]);

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div className="anim-fade-in absolute inset-0 bg-black/40" />
          <div
            className="anim-sheet-up absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-charcoal-100 bg-white p-4"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-200" />
            <div className="grid grid-cols-3 gap-2">
              {more.map((it) => {
                const active = isActive(it, pathname);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-semibold transition-colors ${
                      active ? "bg-coral-100 text-coral-600" : "text-charcoal-600 hover:bg-cream-200"
                    }`}
                  >
                    <Icon name={it.icon} size={22} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-charcoal-100 bg-white/90 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Primary"
      >
        {PRIMARY.map((tab) => {
          const active = isActive(tab, pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.65rem] font-semibold transition-colors ${
                active ? "text-coral-600" : "text-charcoal-400 hover:text-charcoal-700"
              } ${pulse === tab.href ? "nav-pulse" : ""}`}
            >
              {tab.icon === "services" ? (
                <ServicesIcon open={active} size={22} />
              ) : (
                <Icon name={tab.icon} size={22} />
              )}
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-current={onMore ? "page" : undefined}
          className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.65rem] font-semibold transition-colors ${
            onMore || moreOpen ? "text-coral-600" : "text-charcoal-400 hover:text-charcoal-700"
          } ${pulse === "more" ? "nav-pulse" : ""}`}
        >
          <MoreIcon size={22} />
          More
        </button>
      </nav>
    </>
  );
}
