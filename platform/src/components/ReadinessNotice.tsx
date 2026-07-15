"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { pcsMode } from "@/lib/mode";
import { readinessLabel, serviceReadiness } from "@/lib/readiness";
import { Icon } from "./Icon";

export function ReadinessNotice({
  allowOverride = false,
  overridden = false,
  onOverride,
}: {
  allowOverride?: boolean;
  overridden?: boolean;
  onOverride?: () => void;
}) {
  const { state, activeService } = useStore();
  const readiness = serviceReadiness(activeService, pcsMode(state.profile));
  if (readiness.level === "ready") return null;

  const blockers = readiness.issues.filter((issue) => issue.severity === "blocker");
  const warnings = readiness.issues.filter((issue) => issue.severity === "warning");
  const tone = blockers.length ? "border-no-border bg-no-tint/45" : "border-wait-border bg-wait-tint/45";

  return (
    <div className={`rounded-xl border p-4 ${tone}`} role="status">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-charcoal-900">
            <Icon name={blockers.length ? "x" : "clock"} size={15} />
            {readinessLabel(readiness.level)}
          </div>
          <p className="mt-1 text-xs text-charcoal-600">
            {blockers.length
              ? "Finish the essentials below before sharing or printing a team-ready plan."
              : "The essentials are present. These final checks will make the week calmer."}
          </p>
        </div>
        {allowOverride && blockers.length > 0 && (
          <button
            onClick={onOverride}
            aria-pressed={overridden}
            className="rounded-lg border border-charcoal-200 bg-white px-3 py-1.5 text-xs font-bold text-charcoal-600"
          >
            {overridden ? "Override Enabled" : "Continue Intentionally"}
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[...blockers, ...warnings].slice(0, 6).map((issue) => (
          <Link key={issue.id} href={issue.href} className="group flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${issue.severity === "blocker" ? "bg-no-bar" : "bg-wait-bar"}`} />
            <span className="min-w-0">
              <span className="block text-xs font-bold text-charcoal-800 group-hover:text-coral-600">{issue.label}</span>
              <span className="block text-[11px] text-charcoal-500">{issue.detail}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
