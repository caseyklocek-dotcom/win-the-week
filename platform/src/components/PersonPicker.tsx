"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { sortAssignCandidates } from "@/lib/positions";
import type { Person } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// A focused popup for assigning someone from the roster to a position — search,
// click, done. Never leaves the page. Sorts by best fit (last week's person on
// this position, then a roles match) and flags anyone already carrying another
// slot this week, so a leader can still assign them on purpose. Also offers a
// one-tap "new person" path that still lands in the roster so the database
// keeps growing, plus clear/remove actions when editing an existing slot.
export function PersonPicker({
  open,
  position,
  isAssigned,
  onClose,
  onPick,
  onCreateBlank,
  onClear,
  onRemoveSlot,
}: {
  open: boolean;
  position?: string;
  isAssigned?: boolean;
  onClose: () => void;
  onPick: (person: Person) => void;
  onCreateBlank: () => void;
  onClear?: () => void;
  onRemoveSlot?: () => void;
}) {
  const { people, state, activeService } = useStore();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pool = term
      ? people.filter((p) => (p.name + " " + p.roles.join(" ")).toLowerCase().includes(term))
      : people;

    if (!position) {
      return pool
        .slice()
        .sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((person) => ({ person, tag: undefined, conflictWith: undefined }));
    }

    const ranked = sortAssignCandidates(pool, position, {
      services: state.services,
      currentTeams: activeService.teams,
      targetDate: activeService.date,
      currentServiceId: activeService.id,
    });
    const inactive = pool
      .filter((p) => !p.active)
      .map((person) => ({ person, tag: undefined, conflictWith: undefined }));
    return [...ranked, ...inactive];
  }, [q, people, position, state.services, activeService]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Assign someone from your roster"
    >
      <div
        className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 mt-8 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-2xl">
        {/* Header + search */}
        <div className="border-b border-charcoal-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-charcoal-900">
              {position ? `Assign · ${position}` : "Assign from your roster"}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-400 transition hover:bg-cream-200 hover:text-charcoal-800"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-charcoal-200 bg-cream-100 px-3 py-2 focus-within:border-coral-400 focus-within:bg-white">
            <Icon name="users" size={16} className="text-charcoal-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or role…"
              className="w-full bg-transparent text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400"
            />
          </div>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-charcoal-400">
              {people.length === 0
                ? "Your roster is empty. Add someone to start building it."
                : "No one matches that search."}
            </p>
          ) : (
            results.map(({ person, tag, conflictWith }) => (
              <button
                key={person.id}
                onClick={() => onPick(person)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-cream-200"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                    person.active
                      ? "bg-charcoal-800 text-white dark:bg-coral-500"
                      : "bg-cream-200 text-charcoal-400"
                  }`}
                >
                  {initials(person.name) || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-charcoal-800">
                    {person.name}
                  </div>
                  <div className="truncate text-xs text-charcoal-400">
                    {tag === "double-booked"
                      ? `Already on ${conflictWith}`
                      : person.roles.length > 0
                        ? person.roles.join(", ")
                        : "No roles yet"}
                  </div>
                </div>
                {tag === "last-week" && (
                  <span className="shrink-0 rounded-full bg-ok-tint px-2 py-0.5 text-[0.65rem] font-semibold text-ok-ink">
                    Last week
                  </span>
                )}
                {tag === "double-booked" && (
                  <span className="shrink-0 rounded-full bg-wait-tint px-2 py-0.5 text-[0.65rem] font-semibold text-wait-ink">
                    Double-booked
                  </span>
                )}
                {!person.active && (
                  <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-[0.65rem] font-semibold text-charcoal-400">
                    Inactive
                  </span>
                )}
                <Icon name="plus" size={16} className="shrink-0 text-coral-500" />
              </button>
            ))
          )}
        </div>

        {/* Footer — new person path, plus clear/remove when editing a filled slot */}
        <div className="space-y-2 border-t border-charcoal-100 p-3">
          <button
            onClick={onCreateBlank}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
          >
            <Icon name="plus" size={16} /> Add someone new
          </button>
          {(onClear || onRemoveSlot) && (
            <div className="flex gap-2">
              {onClear && (
                <button
                  onClick={onClear}
                  disabled={!isAssigned}
                  className="flex-1 rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300 hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear assignment
                </button>
              )}
              {onRemoveSlot && (
                <button
                  onClick={onRemoveSlot}
                  className="flex-1 rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-error transition hover:border-error hover:bg-no-tint"
                >
                  Remove this slot
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
