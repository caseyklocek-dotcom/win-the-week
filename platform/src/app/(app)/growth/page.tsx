"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { CompassRadar } from "@/components/CompassRadar";
import { COMPASS_DIMENSIONS, band, BAND_META } from "@/lib/compass";
import { sentCount } from "@/lib/leaders";

const TEAL = "#2a8d9c";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Small teal progress ring for the Goals tile.
function Ring({ pct, size = 52 }: { pct: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream-200)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={TEAL}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-charcoal-800" style={{ fontSize: 13, fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function GrowthPage() {
  const { state } = useStore();
  const latest = state.compass?.history.at(-1);
  const leaders = state.leaders ?? [];

  const axes = latest
    ? COMPASS_DIMENSIONS.map((d) => ({ label: d.label, value: latest.scores[d.id] ?? 0 }))
    : [];
  const overall = latest
    ? Math.round(
        COMPASS_DIMENSIONS.reduce((s, d) => s + (latest.scores[d.id] ?? 0), 0) /
          COMPASS_DIMENSIONS.length,
      )
    : null;
  const overallBand = overall != null ? band(overall) : null;
  const weakest = latest
    ? [...COMPASS_DIMENSIONS]
        .sort((a, b) => (latest.scores[a.id] ?? 0) - (latest.scores[b.id] ?? 0))
        .slice(0, 2)
    : [];

  const totalAreas = leaders.reduce((s, l) => s + l.areas.length, 0);
  const totalSent = leaders.reduce((s, l) => s + sentCount(l), 0);
  const goalCount = state.goals.length;
  const goalsAvg = goalCount
    ? Math.round(state.goals.reduce((s, g) => s + g.pct, 0) / goalCount)
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="headline text-charcoal-900">GROWTH</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          The long game. See where you stand at a glance, then step into a tool to work on it.
        </p>
      </div>

      {/* ── Where you stand — the graphic overview ─────────────────── */}
      <Card data-tour="growth">
        <Label>Where you stand</Label>
        {latest ? (
          <>
          <div className="mt-3 grid items-center gap-6 sm:grid-cols-[220px_1fr]">
            <div className="mx-auto w-full max-w-[220px]">
              <CompassRadar axes={axes} size={220} showLabels={false} stroke={TEAL} fill="rgba(42,141,156,0.16)" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-charcoal-900">{overall}</span>
                {overallBand && (
                  <span className="rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-bold text-coral-600">
                    {BAND_META[overallBand].label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-charcoal-400">
                Overall Compass · last taken {fmtDate(latest.date)}
              </p>
              <div className="mt-4 label text-charcoal-400">Focus next</div>
              <div className="mt-2 space-y-2">
                {weakest.map((d) => {
                  const sc = latest.scores[d.id] ?? 0;
                  return (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 text-sm font-medium leading-tight text-charcoal-700">{d.label}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${sc}%` }} />
                      </div>
                      <span className="w-7 shrink-0 text-right text-sm font-semibold text-charcoal-600">{sc}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end border-t border-charcoal-100 pt-4">
            <Link
              href="/growth/compass?view=results"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
            >
              See full breakdown
              <Icon name="arrowRight" size={15} />
            </Link>
          </div>
          </>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                <Icon name="compass" size={22} />
              </span>
              <p className="max-w-sm text-sm text-charcoal-600">
                Take the Compass to see where you stand across eight areas of leadership.
              </p>
            </div>
            <Link
              href="/growth/compass"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600"
            >
              <Icon name="compass" size={16} /> Start the Compass
            </Link>
          </div>
        )}
      </Card>

      {/* ── The tools — pick one to step into ──────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ToolTile
          href={latest ? "/growth/compass?view=results" : "/growth/compass"}
          icon="compass"
          title="Compass"
          desc="An honest read on 8 areas of your leadership."
        >
          {latest && overallBand ? (
            <span className="inline-flex items-center rounded-full bg-coral-100 px-2.5 py-0.5 text-xs font-bold text-coral-600">
              {overall} · {BAND_META[overallBand].label}
            </span>
          ) : (
            <span className="text-xs font-semibold text-teal-600">Not taken yet →</span>
          )}
        </ToolTile>

        <ToolTile
          href="/growth/leaders"
          icon="users"
          title="Leader Track"
          desc="Raise someone from watching to being sent."
        >
          {leaders.length > 0 ? (
            <div className="w-full">
              <div className="h-2 overflow-hidden rounded-full bg-cream-200">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${totalAreas ? Math.round((totalSent / totalAreas) * 100) : 0}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-charcoal-400">
                {leaders.length} in progress · {totalSent} sent
              </div>
            </div>
          ) : (
            <span className="text-xs font-semibold text-teal-600">Start a track →</span>
          )}
        </ToolTile>

        <ToolTile
          href="/growth/goals"
          icon="target"
          title="Quarterly Goals"
          desc="Concrete steps you check off as you go."
        >
          {goalCount > 0 ? (
            <div className="flex items-center gap-3">
              <Ring pct={goalsAvg} />
              <div className="text-xs text-charcoal-400">
                {goalCount} active<br />goal{goalCount === 1 ? "" : "s"}
              </div>
            </div>
          ) : (
            <span className="text-xs font-semibold text-teal-600">Add a goal →</span>
          )}
        </ToolTile>
      </div>
    </div>
  );
}

function ToolTile({
  href,
  icon,
  title,
  desc,
  children,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-charcoal-100 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600">
          <Icon name={icon} size={19} />
        </span>
        <Icon name="arrowRight" size={16} className="text-charcoal-300 transition group-hover:text-teal-500" />
      </div>
      <h2 className="mt-3 text-lg font-bold text-charcoal-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-charcoal-400">{desc}</p>
      <div className="mt-4 flex min-h-[3rem] items-center">{children}</div>
    </Link>
  );
}
