"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { makeSiblingService } from "@/lib/seed";

// Lets a leader running more than one service (8am + 10:30am, say) switch
// between this week's sibling occurrences on the same date. Renders nothing
// for the common case of a single service — see Profile > Services.
export function ServiceTypeTabs() {
  const { state, activeService, addService, setActiveService } = useStore();
  const serviceTypes = state.profile.serviceTypes ?? [];
  const [pendingTypeId, setPendingTypeId] = useState<string | null>(null);

  if (serviceTypes.length < 2) return null;

  const siblings = state.services.filter((s) => s.date === activeService.date);
  const activeTypeId = activeService.serviceTypeId ?? serviceTypes[0]?.id;
  const pendingType = serviceTypes.find((t) => t.id === pendingTypeId) ?? null;

  const selectType = (typeId: string) => {
    if (typeId === activeTypeId) return;
    const existing = siblings.find((s) => s.serviceTypeId === typeId);
    if (existing) {
      setActiveService(existing.id);
      setPendingTypeId(null);
    } else {
      setPendingTypeId(typeId);
    }
  };

  const createSibling = (copyContent: boolean) => {
    if (!pendingType) return;
    const next = makeSiblingService(activeService, activeService.date, pendingType.id, copyContent);
    addService(next);
    setPendingTypeId(null);
  };

  return (
    <div className="no-print mb-2">
      <div className="flex flex-wrap gap-1.5">
        {serviceTypes.map((t) => {
          const on = t.id === activeTypeId;
          const exists = siblings.some((s) => s.serviceTypeId === t.id);
          return (
            <button
              key={t.id}
              onClick={() => selectType(t.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                on
                  ? "border-coral-500 bg-coral-500 text-white"
                  : exists
                    ? "border-charcoal-100 bg-cream-100 text-charcoal-600 hover:border-coral-300"
                    : "border-dashed border-charcoal-200 text-charcoal-400 hover:border-coral-300 hover:text-coral-600"
              }`}
            >
              {t.name || t.time}
              {!exists && !on && <span className="ml-1 font-normal">+</span>}
            </button>
          );
        })}
      </div>

      {pendingType && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-coral-300 bg-coral-100 px-3.5 py-2.5">
          <p className="text-sm text-charcoal-800">
            Copy the set and team roles from <b className="text-charcoal-900">{activeService.serviceTypeId ? serviceTypes.find((t) => t.id === activeService.serviceTypeId)?.name : "this service"}</b> into <b className="text-charcoal-900">{pendingType.name}</b>?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => createSibling(false)}
              className="rounded-lg border border-charcoal-300 px-3 py-1.5 text-xs font-bold text-charcoal-700 transition hover:border-charcoal-400"
            >
              Start blank
            </button>
            <button
              onClick={() => createSibling(true)}
              className="rounded-lg bg-charcoal-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-charcoal-800"
            >
              Copy from {activeService.serviceTypeId ? serviceTypes.find((t) => t.id === activeService.serviceTypeId)?.name : "current"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
