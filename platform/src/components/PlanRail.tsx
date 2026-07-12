"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label, ProgressBar } from "./ui";
import { Icon } from "./Icon";
import { STAGES, stageIndex, sentCount } from "@/lib/leaders";
import type { LeaderTrack } from "@/lib/types";

// The leader's current growth edge: the first area not yet sent (or the
// capstone if everything's sent), plus where they are in that area.
function currentFocus(track: LeaderTrack) {
  const area =
    track.areas.find((a) => a.stage !== "sent") ?? track.areas[track.areas.length - 1];
  if (!area) return null;
  const fullySent = track.areas.every((a) => a.stage === "sent");
  return {
    label: area.label,
    stage: STAGES[stageIndex(area.stage)]?.label ?? "",
    fullySent,
  };
}

export function PlanRail() {
  const { state } = useStore();
  const leaders = state.leaders ?? [];

  return (
    <div className="space-y-6">
      {/* Leader Track — the Growth side, so it carries the teal accent. Reads
          the real Leader Track (state.leaders); the header opens the full
          page and each name deep-links straight to that person. */}
      <Card>
        <Link href="/invest/leaders" className="group flex items-center justify-between">
          <Label>Leaders On Deck</Label>
          <Icon name="arrowRight" size={14} className="text-charcoal-300 transition group-hover:text-teal-500" />
        </Link>
        <p className="mt-1 text-xs text-charcoal-400">
          Pour into one person every week.
        </p>
        <div className="mt-4 space-y-2.5">
          {leaders.length === 0 && (
            <Link href="/invest/leaders" className="block text-xs font-semibold text-teal-600 hover:underline">
              No one on deck yet. Start raising someone up →
            </Link>
          )}
          {leaders.map((l) => {
            const focus = currentFocus(l);
            const sent = sentCount(l);
            return (
              <Link
                key={l.id}
                href={`/growth/leaders?leader=${l.id}`}
                className="block rounded-lg border border-charcoal-100 p-3 transition hover:border-teal-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-charcoal-800">{l.name}</span>
                  <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-600">
                    {sent}/{l.areas.length} sent
                  </span>
                </div>
                {focus && (
                  <div className="mt-1 text-xs text-teal-600">
                    {focus.fullySent ? "Sent to lead a service" : `${focus.label} · ${focus.stage}`}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Quarterly goals — the Growth side, so it carries the teal accent
          rather than coral. Links to /growth/goals where goals are editable. */}
      <Link href="/invest/goals" className="block group">
        <Card className="transition group-hover:border-teal-300">
          <div className="flex items-center justify-between">
            <Label>Your quarterly goals</Label>
            <Icon name="arrowRight" size={14} className="text-charcoal-300 group-hover:text-teal-500 transition" />
          </div>
          <div className="mt-4 space-y-4">
            {state.goals.length === 0 && (
              <p className="text-xs text-charcoal-400">No goals yet. Add them in Goals &amp; Growth.</p>
            )}
            {state.goals.map((g) => (
              <div key={g.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-charcoal-800">{g.label}</span>
                  <span className="text-charcoal-400">{g.pct}%</span>
                </div>
                <ProgressBar pct={g.pct} tone="teal" />
                <div className="mt-1 text-xs text-charcoal-400">{g.source}</div>
              </div>
            ))}
          </div>
        </Card>
      </Link>
    </div>
  );
}
