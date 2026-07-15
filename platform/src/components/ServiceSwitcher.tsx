"use client";

import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// Shared navigation across the seeded Sundays. Prev/next walk the services in
// date order; "This Sunday" jumps back to the nearest upcoming service.
export function useServiceNav() {
  const { state, activeService, setActiveService } = useStore();
  // When a leader runs more than one service, siblings share a date — prev/next
  // should walk this service's own recurring slot (e.g. every 10:30am), not
  // hop sideways to the 8am service on the same Sunday.
  const sameType = state.services.filter(
    (s) => s.serviceTypeId === activeService.serviceTypeId,
  );
  const sorted = [...(sameType.length > 0 ? sameType : state.services)].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const idx = sorted.findIndex((s) => s.id === activeService.id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  const today = todayISO();
  const nearest = sorted.find((s) => s.date >= today) ?? sorted[sorted.length - 1];

  return {
    activeService,
    sorted,
    idx,
    prev,
    next,
    nearest,
    isNearest: nearest?.id === activeService.id,
    goPrev: () => prev && setActiveService(prev.id),
    goNext: () => next && setActiveService(next.id),
    goNearest: () => nearest && setActiveService(nearest.id),
  };
}

export function ServiceSwitcher() {
  const { activeService, prev, next, isNearest, goPrev, goNext, goNearest } =
    useServiceNav();

  return (
    <div className="no-print flex items-center gap-2">
      {!isNearest && (
        <button
          onClick={goNearest}
          className="flex min-h-11 items-center rounded-lg border border-charcoal-200 px-3 py-1.5 text-xs font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600 lg:min-h-0 lg:px-2.5"
        >
          This Sunday
        </button>
      )}
      <div className="flex items-center gap-1 rounded-lg border border-charcoal-100 bg-white p-1">
        <button
          onClick={goPrev}
          disabled={!prev}
          title="Previous service"
          aria-label="Previous service"
          className="flex h-11 w-10 items-center justify-center rounded-md text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800 disabled:opacity-30 disabled:hover:bg-transparent lg:h-7 lg:w-7"
        >
          <Icon name="chevronDown" size={16} className="rotate-90" />
        </button>
        <span className="min-w-[6.5rem] px-1 text-center text-sm font-semibold text-charcoal-800">
          {fmtDate(activeService.date)}
        </span>
        <button
          onClick={goNext}
          disabled={!next}
          title="Next service"
          aria-label="Next service"
          className="flex h-11 w-10 items-center justify-center rounded-md text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800 disabled:opacity-30 disabled:hover:bg-transparent lg:h-7 lg:w-7"
        >
          <Icon name="chevronDown" size={16} className="-rotate-90" />
        </button>
      </div>
    </div>
  );
}
