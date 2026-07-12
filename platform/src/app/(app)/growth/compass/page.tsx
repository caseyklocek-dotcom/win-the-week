"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { Icon } from "@/components/Icon";
import { CompassRadar } from "@/components/CompassRadar";

const TEAL = "#2a8d9c";
import {
  COMPASS_PARTS,
  COMPASS_DIMENSIONS,
  TOTAL_STATEMENTS,
  scoreAll,
  band,
  BAND_META,
  suggestedGoalLabel,
  makeMilestones,
} from "@/lib/compass";
import type { CompassResult } from "@/lib/types";

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const INTRO = -1;
const RESULTS = COMPASS_DIMENSIONS.length;

function CompassInner() {
  const params = useSearchParams();
  const { state, setState } = useStore();
  const latest = state.compass?.history.at(-1);
  const viewLatest = params.get("view") === "results" && !!latest;

  const [step, setStep] = useState<number>(viewLatest ? RESULTS : INTRO);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const savedRef = useRef(false);

  // The result we display on the results screen.
  const shownScores = useMemo(
    () => (viewLatest && latest ? latest.scores : scoreAll(answers)),
    [viewLatest, latest, answers],
  );

  const answeredCount = Object.keys(answers).length;

  // Save a fresh result exactly once when we first land on the results screen.
  useEffect(() => {
    if (step !== RESULTS || viewLatest || savedRef.current) return;
    savedRef.current = true;
    const result: CompassResult = {
      id: id("c"),
      date: new Date().toISOString(),
      answers,
      scores: scoreAll(answers),
    };
    setState((s) => ({
      ...s,
      compass: { history: [...(s.compass?.history ?? []), result] },
    }));
  }, [step, viewLatest, answers, setState]);

  const setAnswer = (sid: string, v: number) =>
    setAnswers((a) => ({ ...a, [sid]: v }));

  const addGoalFromDim = (dimId: string) =>
    setState((s) => {
      if (s.goals.some((g) => g.compassDimId === dimId)) return s;
      return {
        ...s,
        goals: [
          ...s.goals,
          {
            id: id("g"),
            label: suggestedGoalLabel(dimId),
            source: "Worship Leadership Compass",
            pct: 0,
            compassDimId: dimId,
            milestones: makeMilestones(dimId),
          },
        ],
      };
    });

  // ---------- INTRO ----------
  if (step === INTRO) {
    return (
      <Shell>
        <Card className="border-coral-300 bg-gradient-to-br from-white to-coral-100/40">
          <div className="mx-auto max-w-lg py-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-coral-500 text-white shadow-[var(--shadow-coral)]">
              <Icon name="compass" size={26} />
            </span>
            <h1 className="headline mt-4 text-2xl text-charcoal-900">
              The Worship Leadership Compass
            </h1>
            <p className="editorial mt-2 text-lg text-charcoal-600">
              A mirror, not a scorecard.
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm text-charcoal-600">
              You&apos;ll move through eight areas. Four about your leadership, four about your
              team&apos;s health. Answer honestly for where things actually are today. Takes
              about ten minutes. At the end you&apos;ll see your map and can turn any weak spot
              into a quarterly goal.
            </p>
            <button
              onClick={() => setStep(0)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Begin <Icon name="arrowRight" size={16} />
            </button>
            <div className="mt-4">
              <Link href="/growth" className="text-xs font-semibold text-charcoal-400 hover:underline">
                Back to Goals &amp; Growth
              </Link>
            </div>
          </div>
        </Card>
      </Shell>
    );
  }

  // ---------- RESULTS ----------
  if (step === RESULTS) {
    const ranked = [...COMPASS_DIMENSIONS].sort(
      (a, b) => (shownScores[b.id] ?? 0) - (shownScores[a.id] ?? 0),
    );
    const strongest = ranked[0];
    const weakest = ranked.slice(-3).reverse();
    const axes = COMPASS_DIMENSIONS.map((d) => ({
      label: d.short ?? d.label,
      value: shownScores[d.id] ?? 0,
    }));

    const overall = Math.round(
      COMPASS_DIMENSIONS.reduce((s, d) => s + (shownScores[d.id] ?? 0), 0) /
        COMPASS_DIMENSIONS.length,
    );
    const overallBand = band(overall);

    return (
      <Shell>
        <div className="space-y-6">
          <div className="text-center">
            <Label>Your Compass</Label>
            <h1 className="headline mt-1 text-2xl text-charcoal-900">HERE&apos;S YOUR MAP</h1>
            <div className="mt-3 flex items-baseline justify-center gap-2">
              <span className="text-4xl font-bold text-charcoal-900">{overall}</span>
              <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-bold text-coral-600">
                {BAND_META[overallBand].label}
              </span>
            </div>
            <p className="mt-1 text-xs text-charcoal-400">Overall Compass score</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-600">
              Strongest right now:{" "}
              <span className="font-semibold text-charcoal-800">{strongest.label}</span>. The
              three below are where a little focus will go furthest.
            </p>
          </div>

          <Card>
            <div className="mx-auto w-full max-w-[340px]">
              <CompassRadar axes={axes} size={340} stroke={TEAL} fill="rgba(42,141,156,0.16)" />
            </div>
          </Card>

          {/* Full score breakdown — folds away; the radar already shows the shape */}
          <Collapsible
            header={<span className="label text-charcoal-400">Score breakdown</span>}
            right={<span className="text-xs font-medium text-charcoal-400">8 areas</span>}
            defaultOpen
          >
            <div className="space-y-5">
              {COMPASS_PARTS.map((part) => (
                <div key={part.id}>
                  <div className="label text-charcoal-400">{part.title}</div>
                  <div className="mt-2 space-y-2">
                    {part.dimensions.map((d) => {
                      const sc = shownScores[d.id] ?? 0;
                      const meta = BAND_META[band(sc)];
                      return (
                        <div key={d.id} className="flex items-center gap-3">
                          <span className="w-44 shrink-0 text-sm leading-tight text-charcoal-700">
                            {d.label}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sc}%`, background: meta.bar }}
                            />
                          </div>
                          <span
                            className="w-8 shrink-0 text-right text-sm font-semibold"
                            style={{ color: meta.text }}
                          >
                            {sc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* Turn weak spots into goals — folds away */}
          <Collapsible
            header={<span className="label text-charcoal-400">Turn focus into a goal</span>}
            right={<span className="text-xs font-medium text-charcoal-400">{weakest.length} areas</span>}
            defaultOpen
          >
            <p className="-mt-2 mb-3 text-xs text-charcoal-400">
              Add any of these to your quarterly goals. Each one comes with a few concrete
              steps to work through. Edit them to fit your church.
            </p>
            <div className="space-y-2">
              {weakest.map((d) => {
                const sc = shownScores[d.id] ?? 0;
                const meta = BAND_META[band(sc)];
                const already = state.goals.some((g) => g.compassDimId === d.id);
                return (
                  <div
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-charcoal-100 bg-cream-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-charcoal-800">{d.label}</div>
                      <span
                        className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ color: meta.text, background: meta.bg }}
                      >
                        {meta.label} · {sc}
                      </span>
                    </div>
                    {already ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok-ink">
                        <Icon name="check" size={15} /> Added
                      </span>
                    ) : (
                      <button
                        onClick={() => addGoalFromDim(d.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-coral-600"
                      >
                        <Icon name="plus" size={14} /> Set as goal
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Collapsible>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/growth"
              className="inline-flex items-center gap-2 rounded-lg bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Done, back to Growth
            </Link>
            <button
              onClick={() => {
                savedRef.current = true; // viewing again shouldn't re-save
                setAnswers({});
                savedRef.current = false;
                setStep(INTRO);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-charcoal-200 px-5 py-3 text-sm font-semibold text-charcoal-700 transition hover:border-charcoal-300"
            >
              <Icon name="rotate" size={15} /> Take it again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- A DIMENSION ----------
  const dim = COMPASS_DIMENSIONS[step];
  const part = COMPASS_PARTS.find((p) => p.id === dim.partId)!;
  const allAnswered = dim.statements.every((st) => answers[st.id] != null);
  const overallPct = Math.round((answeredCount / TOTAL_STATEMENTS) * 100);

  return (
    <Shell>
      <div className="space-y-5">
        {/* progress header */}
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="label text-charcoal-400">{part.title}</span>
            <span className="font-semibold text-charcoal-400">
              Area {step + 1} of {COMPASS_DIMENSIONS.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
            <div
              className="h-full rounded-full bg-teal-500 transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        <Card>
          <h2 className="text-xl font-bold text-charcoal-900">{dim.label}</h2>
          <p className="mt-1 text-sm text-charcoal-500">{dim.blurb}</p>

          <div className="mt-5 space-y-5">
            {dim.statements.map((st) => (
              <div key={st.id} className="border-t border-charcoal-100 pt-4 first:border-0 first:pt-0">
                <p className="text-sm font-medium text-charcoal-800">{st.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {part.scale.map((opt) => {
                    const selected = answers[st.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAnswer(st.id, opt.value)}
                        className={`flex min-w-[3rem] flex-col items-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? "border-teal-500 bg-teal-500 text-white"
                            : "border-charcoal-200 bg-white text-charcoal-600 hover:border-teal-400 hover:text-teal-600"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.hint && (
                          <span
                            className={`mt-0.5 text-[0.6rem] font-medium ${
                              selected ? "text-white/80" : "text-charcoal-400"
                            }`}
                          >
                            {opt.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
          >
            Back
          </button>
          <button
            disabled={!allAnswered}
            onClick={() => setStep((s) => s + 1)}
            className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              allAnswered
                ? "bg-coral-500 text-white shadow-[var(--shadow-coral)] hover:bg-coral-600"
                : "cursor-not-allowed bg-cream-200 text-charcoal-300"
            }`}
          >
            {step === COMPASS_DIMENSIONS.length - 1 ? "See my results" : "Next"}
            <Icon name="arrowRight" size={16} />
          </button>
        </div>
        {!allAnswered && (
          <p className="text-center text-xs text-charcoal-400">
            Answer all five to continue.
          </p>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl">{children}</div>;
}

export default function CompassPage() {
  return (
    <Suspense fallback={<div className="text-charcoal-400">Loading…</div>}>
      <CompassInner />
    </Suspense>
  );
}
