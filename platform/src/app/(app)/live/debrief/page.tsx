"use client";

// ============================================================
// Sunday debrief — what actually happened, for the staff table.
//
// Reads the Live timing log: planned vs actual per item, total service
// length, and the leader's fresh reflection. Printable, so it can sit in
// the middle of a Monday conversation. Shows the active service's morning,
// or the most recent Sunday that has one.
// ============================================================

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Icon } from "@/components/Icon";
import { fmtDuration } from "@/lib/music";
import type { LiveLog, Service } from "@/lib/types";

function fullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface DebriefItem {
  title: string;
  plannedSec: number;
  actualSec: number;
}

// Aggregate the append-only transition log into one row per item (a reprise
// or a "back" revisit sums into the same title, first-seen order).
function aggregate(log: LiveLog): DebriefItem[] {
  const order: string[] = [];
  const byTitle = new Map<string, DebriefItem>();
  const end = log.endedAt ? new Date(log.endedAt).getTime() : Date.now();
  log.items.forEach((entry, i) => {
    const start = new Date(entry.startedAt).getTime();
    const next = log.items[i + 1] ? new Date(log.items[i + 1].startedAt).getTime() : end;
    const dur = Math.max(0, Math.round((next - start) / 1000));
    let item = byTitle.get(entry.title);
    if (!item) {
      item = { title: entry.title, plannedSec: entry.plannedSec, actualSec: 0 };
      byTitle.set(entry.title, item);
      order.push(entry.title);
    }
    item.actualSec += dur;
  });
  return order.map((t) => byTitle.get(t)!);
}

export default function DebriefPage() {
  const { state, activeService } = useStore();

  // The service being debriefed: the active one if it ran Live, else the most
  // recent one that did.
  const svc: Service | undefined = useMemo(() => {
    if (activeService.live) return activeService;
    return [...state.services]
      .filter((s) => s.live)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [activeService, state.services]);

  const items = useMemo(() => (svc?.live ? aggregate(svc.live) : []), [svc]);
  const totals = useMemo(() => {
    const planned = items.reduce((a, b) => a + b.plannedSec, 0);
    const actual = items.reduce((a, b) => a + b.actualSec, 0);
    const max = Math.max(1, ...items.map((i) => Math.max(i.plannedSec, i.actualSec)));
    return { planned, actual, max };
  }, [items]);

  if (!svc?.live) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="label text-charcoal-400">Sunday debrief</p>
        <h1 className="headline mt-2 text-3xl text-charcoal-900">No morning on record yet</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-charcoal-400">
          Run a service in Live mode and the planned-versus-actual picture lands here, ready for
          the staff conversation.
        </p>
        <Link
          href="/live"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)]"
        >
          Open Sunday Live <Icon name="arrowRight" size={15} />
        </Link>
      </div>
    );
  }

  const live = svc.live;
  const drift = totals.actual - totals.planned;
  const preparationDone = svc.status.pray === "done" && svc.status.plan === "done" && svc.status.prep === "done";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label text-coral-600">Sunday debrief</p>
          <h1 className="headline mt-1.5 text-3xl text-charcoal-900 lg:text-4xl">How it went</h1>
          <p className="mt-2 text-sm text-charcoal-400">
            {fullDate(svc.date)}
            {svc.title ? ` · ${svc.title}` : ""} · started {clock(live.startedAt)}
            {live.endedAt ? `, done ${clock(live.endedAt)}` : ""}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 rounded-full border border-charcoal-100 px-4 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
        >
          <Icon name="printer" size={14} /> Print for the team
        </button>
      </div>

      {/* totals */}
      <div className="mt-7 rounded-2xl border border-coral-200 bg-gradient-to-br from-white to-coral-100/60 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 text-white shadow-[var(--shadow-coral)]">
            <Icon name="heart" size={18} />
          </span>
          <div>
            <p className="label text-coral-600">Sunday carried</p>
            <p className="mt-1 text-lg font-bold text-charcoal-900">
              {preparationDone
                ? "You did the work before Sunday, so you could be present on Sunday."
                : "Sunday is in the books. Keep what helped, and release the rest."}
            </p>
            <p className="mt-1 text-sm text-charcoal-500">
              Capture one honest thought while it&apos;s still fresh. Next week&apos;s plan will be better for it.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-x-10 gap-y-3 border-t border-charcoal-100 pt-6">
        <div>
          <p className="label text-charcoal-400">Planned</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-charcoal-900">
            {fmtDuration(totals.planned)}
          </p>
        </div>
        <div>
          <p className="label text-charcoal-400">Actual</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-charcoal-900">
            {fmtDuration(totals.actual)}
          </p>
        </div>
        <div>
          <p className="label text-charcoal-400">Drift</p>
          <p
            className={`mt-0.5 text-2xl font-extrabold tabular-nums ${
              Math.abs(drift) <= 120
                ? "text-ok-ink"
                : drift > 0
                  ? "text-wait-ink"
                  : "text-teal-600"
            }`}
          >
            {drift >= 0 ? "+" : "−"}
            {fmtDuration(Math.abs(drift))}
          </p>
        </div>
      </div>

      {/* per-item planned vs actual */}
      <div className="mt-7">
        <h2 className="label text-charcoal-400">Item by item</h2>
        <div className="mt-2">
          {items.map((it) => {
            const diff = it.actualSec - it.plannedSec;
            return (
              <div key={it.title} className="border-b border-cream-200 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-bold text-charcoal-900">
                    {it.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-bold tabular-nums ${
                      Math.abs(diff) <= 45
                        ? "text-charcoal-400"
                        : diff > 0
                          ? "text-wait-ink"
                          : "text-teal-600"
                    }`}
                  >
                    {diff === 0 ? "on the nose" : `${diff > 0 ? "+" : "−"}${fmtDuration(Math.abs(diff))}`}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-14 text-[10px] font-bold uppercase tracking-wide text-charcoal-300">
                      Plan
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                      <span
                        className="block h-full rounded-full bg-charcoal-200"
                        style={{ width: `${(it.plannedSec / totals.max) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 text-right text-[11px] tabular-nums text-charcoal-400">
                      {fmtDuration(it.plannedSec)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-14 text-[10px] font-bold uppercase tracking-wide text-coral-600">
                      Actual
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                      <span
                        className="block h-full rounded-full bg-coral-500"
                        style={{ width: `${(it.actualSec / totals.max) * 100}%` }}
                      />
                    </span>
                    <span className="w-12 text-right text-[11px] tabular-nums text-charcoal-400">
                      {fmtDuration(it.actualSec)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* reflection */}
      {live.reflection && (
        <div className="mt-7 border-t border-charcoal-100 pt-6">
          <h2 className="label text-charcoal-400">While it was fresh</h2>
          <p className="editorial mt-2 max-w-xl text-lg text-charcoal-700">
            &ldquo;{live.reflection}&rdquo;
          </p>
          <p className="mt-1 text-xs text-charcoal-400">
            Carried into next week&rsquo;s plan automatically.
          </p>
        </div>
      )}

      <div className="no-print mt-8 flex gap-3 border-t border-charcoal-100 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
        >
          Back to This Sunday
        </Link>
        <Link
          href="/plan?tab=prep"
          className="rounded-full border border-charcoal-100 px-5 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
        >
          Carry Sunday Into Next Week
        </Link>
      </div>
    </div>
  );
}
