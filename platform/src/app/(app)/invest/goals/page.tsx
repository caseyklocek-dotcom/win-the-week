"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, Label, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EditableText } from "@/components/fields";
import { dimensionLabel } from "@/lib/compass";
import type { Goal, GoalMilestone } from "@/lib/types";

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const milestonePct = (ms: GoalMilestone[]) =>
  ms.length === 0 ? 0 : Math.round((ms.filter((m) => m.done).length / ms.length) * 100);

export default function GoalsPage() {
  const { state, setState } = useStore();
  // Goals default to collapsed — we track which are expanded, not which are
  // collapsed, so a freshly loaded list opens tidy.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleCollapse = (gid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(gid) ? next.delete(gid) : next.add(gid);
      return next;
    });

  // ---- goal mutations ----
  const updateGoal = (gid: string, fields: Partial<Goal>) =>
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) => (g.id === gid ? { ...g, ...fields } : g)),
    }));
  const nudge = (gid: string, delta: number) =>
    setState((s) => ({
      ...s,
      goals: s.goals.map((g) =>
        g.id === gid ? { ...g, pct: Math.max(0, Math.min(100, g.pct + delta)) } : g,
      ),
    }));
  const removeGoal = (gid: string) =>
    setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== gid) }));
  const addGoal = () => {
    const gid = id("g");
    setExpanded((prev) => new Set(prev).add(gid)); // open the new one for editing
    setState((s) => ({
      ...s,
      goals: [...s.goals, { id: gid, label: "New goal", source: "Quarterly focus", pct: 0 }],
    }));
  };

  // ---- milestone mutations (steps drive the percentage) ----
  const withMilestones = (g: Goal, ms: GoalMilestone[]): Goal => ({
    ...g,
    milestones: ms,
    pct: milestonePct(ms),
  });
  const mapGoal = (gid: string, fn: (g: Goal) => Goal) =>
    setState((s) => ({ ...s, goals: s.goals.map((g) => (g.id === gid ? fn(g) : g)) }));

  const toggleMilestone = (gid: string, mid: string) =>
    mapGoal(gid, (g) =>
      withMilestones(
        g,
        (g.milestones ?? []).map((m) => (m.id === mid ? { ...m, done: !m.done } : m)),
      ),
    );
  const editMilestone = (gid: string, mid: string, label: string) =>
    mapGoal(gid, (g) =>
      withMilestones(
        g,
        (g.milestones ?? []).map((m) => (m.id === mid ? { ...m, label } : m)),
      ),
    );
  const removeMilestone = (gid: string, mid: string) =>
    mapGoal(gid, (g) =>
      withMilestones(g, (g.milestones ?? []).filter((m) => m.id !== mid)),
    );
  const addMilestone = (gid: string) =>
    mapGoal(gid, (g) =>
      withMilestones(g, [
        ...(g.milestones ?? []),
        { id: id("m"), label: "New step", done: false },
      ]),
    );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="headline text-charcoal-900">QUARTERLY GOALS</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          Each goal moves forward as you check off its steps. Concrete things you can actually
          do, not a slider to guess at. Small, consistent steps, not dramatic overhauls.
        </p>
      </div>

      <div className="space-y-4">
        {state.goals.map((g) => {
          const ms = g.milestones ?? [];
          const hasSteps = ms.length > 0;
          const doneCount = ms.filter((m) => m.done).length;
          const isCollapsed = !expanded.has(g.id);
          return (
            <div key={g.id} className="border-b border-cream-200 py-5">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => toggleCollapse(g.id)}
                  className="mt-0.5 shrink-0 text-charcoal-400 transition hover:text-charcoal-700"
                  title={isCollapsed ? "Expand" : "Collapse"}
                >
                  <Icon name={isCollapsed ? "chevronRight" : "chevronDown"} size={15} />
                </button>
                <div className="min-w-0 flex-1">
                  <EditableText
                    value={g.label}
                    onCommit={(v) => updateGoal(g.id, { label: v })}
                    className="font-semibold"
                  />
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-400">
                    {g.compassDimId ? (
                      <>
                        <Icon name="compass" size={12} />
                        {dimensionLabel(g.compassDimId)} · Compass
                      </>
                    ) : (
                      g.source
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-charcoal-700">
                  {g.pct}%
                </span>
                <button
                  onClick={() => removeGoal(g.id)}
                  className="shrink-0 text-charcoal-300 transition hover:text-error"
                  title="Remove goal"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>

              {/* progress bar with a tick at each step boundary */}
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${g.pct}%` }}
                />
                {hasSteps &&
                  ms.slice(0, -1).map((m, i) => (
                    <span
                      key={m.id}
                      className="absolute top-0 h-full w-px bg-white/70"
                      style={{ left: `${((i + 1) / ms.length) * 100}%` }}
                    />
                  ))}
              </div>

              {!isCollapsed && (hasSteps ? (
                <div className="mt-3 space-y-1.5">
                  {ms.map((m) => (
                    <div key={m.id} className="group flex items-start gap-2.5">
                      <button
                        onClick={() => toggleMilestone(g.id, m.id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          m.done
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-charcoal-200 bg-white text-transparent hover:border-teal-400"
                        }`}
                        title={m.done ? "Mark not done" : "Mark done"}
                      >
                        <Icon name="check" size={12} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <EditableText
                          value={m.label}
                          onCommit={(v) => editMilestone(g.id, m.id, v)}
                          className={`text-sm ${
                            m.done ? "text-charcoal-400 line-through" : "text-charcoal-700"
                          }`}
                        />
                      </div>
                      <button
                        onClick={() => removeMilestone(g.id, m.id)}
                        className="mt-0.5 shrink-0 text-charcoal-200 opacity-0 transition group-hover:opacity-100 hover:text-error"
                        title="Remove step"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => addMilestone(g.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"
                    >
                      <Icon name="plus" size={12} /> Add a step
                    </button>
                    <span className="text-xs text-charcoal-400">
                      {doneCount} of {ms.length} done
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => nudge(g.id, -5)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-charcoal-200 text-charcoal-500 transition hover:border-charcoal-300 hover:text-charcoal-800"
                    title="Less progress"
                  >
                    −
                  </button>
                  <div className="flex-1">
                    <ProgressBar pct={g.pct} tone="teal" />
                  </div>
                  <button
                    onClick={() => nudge(g.id, 5)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-charcoal-200 text-charcoal-500 transition hover:border-charcoal-300 hover:text-charcoal-800"
                    title="More progress"
                  >
                    +
                  </button>
                  <button
                    onClick={() => addMilestone(g.id)}
                    className="shrink-0 text-xs font-semibold text-teal-600 hover:underline"
                  >
                    Add steps
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {state.goals.length === 0 && (
          <div className="border-t border-charcoal-100 pt-5">
            <p className="text-sm text-charcoal-400">
              No goals yet. Take the Compass to turn a weak area into a goal, or add one below.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={addGoal}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
        >
          <Icon name="plus" size={14} /> Add a goal
        </button>
        <Link href="/invest" className="text-xs font-semibold text-charcoal-400 hover:underline">
          ← Back to Growth
        </Link>
      </div>
    </div>
  );
}
