"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ServiceSwitcher, useServiceNav } from "@/components/ServiceSwitcher";
import { ServiceActions } from "@/components/ServiceActions";
import { useStore } from "@/lib/store";
import { pcsMode } from "@/lib/mode";

const ALL_TABS = [
  { href: "/plan", label: "Plan" },
  { href: "/set", label: "Set" },
  { href: "/team", label: "Team", scheduling: true },
  { href: "/rehearse", label: "Rehearse" },
  { href: "/send", label: "Send", scheduling: true },
  { href: "/packet", label: "Packet", scheduling: true },
];

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function ServiceWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeService } = useServiceNav();
  const { state } = useStore();
  // Planning Center keeps the scheduling; those tabs step aside.
  const TABS = pcsMode(state.profile) ? ALL_TABS.filter((t) => !t.scheduling) : ALL_TABS;

  // On phones the tab row scrolls horizontally; keep the active tab in view
  // whenever the route changes so "where am I" never scrolls off-screen.
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = tabsRef.current;
    if (!c || c.scrollWidth <= c.clientWidth) return;
    const el = c.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < c.scrollLeft || right > c.scrollLeft + c.clientWidth) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      c.scrollTo({
        left: Math.max(0, left - (c.clientWidth - el.offsetWidth) / 2),
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }, [pathname]);

  return (
    <div className="mx-auto max-w-6xl">
      {/* Workspace chrome — hidden when printing the packet */}
      <div className="no-print mb-4 lg:mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 lg:gap-3">
          <div className="min-w-0">
            <div className="label text-charcoal-300">{activeService.season}</div>
            <p className="mt-0.5 text-sm text-charcoal-400">
              {fmtDate(activeService.date)}
            </p>
          </div>
          <ServiceSwitcher />
        </div>

        {/* One row, always: tabs swipe sideways on phones (scrollbar hidden)
            and the actions cluster stays pinned on the right. On desktop the
            row may wrap exactly as before. */}
        <div className="mt-2 flex items-end justify-between gap-2 border-b border-charcoal-100 lg:mt-4 lg:flex-wrap lg:gap-3">
          <div
            ref={tabsRef}
            className="scrollbar-none relative -mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {TABS.map((t) => {
              const active = pathname === t.href || pathname.startsWith(t.href + "/");
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-coral-500 text-coral-600"
                      : "border-transparent text-charcoal-400 hover:text-charcoal-800"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
          <div className="shrink-0 pb-2">
            <ServiceActions />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
