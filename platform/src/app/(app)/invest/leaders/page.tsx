"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { Collapsible } from "@/components/Collapsible";
import { Icon } from "@/components/Icon";
import { EditableText } from "@/components/fields";
import {
  STAGES,
  stageIndex,
  blankLeaderTrack,
  trackProgress,
  sentCount,
  isFullySent,
} from "@/lib/leaders";
import type { LeaderTrack, TrackStage } from "@/lib/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// A leader's current growth edge: first area not yet sent (or the capstone).
function currentFocus(track: LeaderTrack) {
  const area =
    track.areas.find((a) => a.stage !== "sent") ?? track.areas[track.areas.length - 1];
  if (!area) return null;
  const fullySent = track.areas.every((a) => a.stage === "sent");
  return { label: area.label, stage: STAGES[stageIndex(area.stage)]?.label ?? "", fullySent };
}

export default function LeadersPage() {
  const { state, setState } = useStore();
  const leaders = state.leaders ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Deep link: ?leader=<id> preselects a leader (used by the planning rail).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("leader");
    if (p) setSelectedId(p);
  }, []);

  // ---- mutations ----
  const addLeader = () =>
    setState((s) => {
      const track = blankLeaderTrack("New leader");
      setSelectedId(track.id);
      return { ...s, leaders: [...(s.leaders ?? []), track] };
    });

  const updateLeader = (id: string, fields: Partial<LeaderTrack>) =>
    setState((s) => ({
      ...s,
      leaders: (s.leaders ?? []).map((l) => (l.id === id ? { ...l, ...fields } : l)),
    }));

  const removeLeader = (id: string) =>
    setState((s) => ({ ...s, leaders: (s.leaders ?? []).filter((l) => l.id !== id) }));

  const mapArea = (
    leaderId: string,
    areaId: string,
    fn: (a: LeaderTrack["areas"][number]) => LeaderTrack["areas"][number],
  ) =>
    setState((s) => ({
      ...s,
      leaders: (s.leaders ?? []).map((l) =>
        l.id === leaderId
          ? { ...l, areas: l.areas.map((a) => (a.id === areaId ? fn(a) : a)) }
          : l,
      ),
    }));

  const setStage = (leaderId: string, areaId: string, stage: TrackStage) =>
    mapArea(leaderId, areaId, (a) => ({
      ...a,
      stage,
      sentDate: stage === "sent" ? a.sentDate ?? new Date().toISOString() : undefined,
    }));

  const setAreaNote = (leaderId: string, areaId: string, note: string) =>
    mapArea(leaderId, areaId, (a) => ({ ...a, note }));

  const selected = leaders.find((l) => l.id === selectedId) ?? null;
  // One leader: drop straight into their track. Many: show the card overview.
  const detail = selected ?? (leaders.length === 1 ? leaders[0] : null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="headline text-charcoal-900">LEADER TRACK</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          The leaders you&apos;re raising up. You walk each person from watching, to helping,
          to leading, until they&apos;re <span className="font-semibold text-charcoal-600">sent</span> to
          carry it on their own. Move at their pace; the areas grow in parallel.
        </p>
      </div>

      {leaders.length === 0 ? (
        <Card className="border-coral-300 bg-gradient-to-br from-white to-coral-100/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <Label>Leaders On Deck</Label>
              <h2 className="mt-1 text-xl font-bold text-charcoal-900">
                Start raising your next leader
              </h2>
              <p className="mt-2 text-sm text-charcoal-600">
                Pick someone on your team and walk them through planning, co-leading, rehearsal,
                tech, and leading a service. One shared journey, ending in being sent.
              </p>
            </div>
            <button
              onClick={addLeader}
              className="inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              <Icon name="userPlus" size={16} /> Add a leader
            </button>
          </div>
        </Card>
      ) : detail ? (
        <LeaderDetail
          key={detail.id}
          track={detail}
          showAllLink={leaders.length > 1}
          onBackToAll={() => setSelectedId(null)}
          onAdd={addLeader}
          onRename={(name) => updateLeader(detail.id, { name })}
          onRemove={() => {
            removeLeader(detail.id);
            setSelectedId(null);
          }}
          onSetStage={(areaId, stage) => setStage(detail.id, areaId, stage)}
          onSetNote={(areaId, note) => setAreaNote(detail.id, areaId, note)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Label>Who you&rsquo;re raising up</Label>
            <span className="text-sm text-charcoal-400">{leaders.length} leaders</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {leaders.map((l) => (
              <LeaderCard key={l.id} track={l} onOpen={() => setSelectedId(l.id)} />
            ))}
            <button
              onClick={addLeader}
              className="flex min-h-[7rem] items-center justify-center gap-2 rounded-xl border border-dashed border-charcoal-200 text-sm font-semibold text-charcoal-500 transition hover:border-teal-400 hover:text-teal-600"
            >
              <Icon name="userPlus" size={16} /> Add a leader
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Overview card: quick glance at one leader, click to open ----
function LeaderCard({ track, onOpen }: { track: LeaderTrack; onOpen: () => void }) {
  const pct = Math.round(trackProgress(track) * 100);
  const sent = sentCount(track);
  const focus = currentFocus(track);
  const done = isFullySent(track);

  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-xl border border-charcoal-100 bg-white p-5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-base font-bold text-charcoal-900">{track.name}</span>
        {done ? (
          <span className="shrink-0 rounded-full bg-coral-100 px-2 py-0.5 text-[11px] font-bold text-coral-600">
            Sent
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-600">
            {sent}/{track.areas.length} sent
          </span>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-200">
        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-teal-600">
          {focus ? (focus.fullySent ? "Sent to lead a service" : `${focus.label} · ${focus.stage}`) : "—"}
        </span>
        <span className="font-semibold text-charcoal-400 transition group-hover:text-teal-600">Open →</span>
      </div>
    </button>
  );
}

// ---- Detail: the full track for one leader ----
function LeaderDetail({
  track,
  showAllLink,
  onBackToAll,
  onAdd,
  onRename,
  onRemove,
  onSetStage,
  onSetNote,
}: {
  track: LeaderTrack;
  showAllLink: boolean;
  onBackToAll: () => void;
  onAdd: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onSetStage: (areaId: string, stage: TrackStage) => void;
  onSetNote: (areaId: string, note: string) => void;
}) {
  const pct = Math.round(trackProgress(track) * 100);
  const sent = sentCount(track);

  return (
    <div className="space-y-5">
      {/* nav row */}
      <div className="flex items-center justify-between">
        {showAllLink ? (
          <button
            onClick={onBackToAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal-500 transition hover:text-teal-600"
          >
            <Icon name="arrowRight" size={13} className="rotate-180" /> All leaders
          </button>
        ) : (
          <Link href="/invest" className="text-xs font-semibold text-charcoal-400 hover:underline">
            ← Back to Growth
          </Link>
        )}
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"
        >
          <Icon name="userPlus" size={13} /> Add a leader
        </button>
      </div>

      {/* header */}
      <div className="border-t border-charcoal-100 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Label>Their leader track</Label>
            <div className="mt-1 text-xl font-bold text-charcoal-900">
              <EditableText value={track.name} onCommit={onRename} />
            </div>
            <p className="mt-1 text-xs text-charcoal-400">
              Started {fmtDate(track.startedDate)} · {sent} of {track.areas.length} sent
            </p>
          </div>
          <button
            onClick={onRemove}
            className="shrink-0 text-charcoal-300 transition hover:text-error"
            title="Remove this leader"
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-cream-200">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-charcoal-400">
          These areas grow in parallel. Co-leading runs alongside planning, tech alongside
          either. <span className="font-semibold text-charcoal-600">Lead a Service</span> is
          the capstone where it all comes together.
        </p>
      </div>

      {/* fully-sent banner — coral, the payoff */}
      {isFullySent(track) && (
        <Card className="border-coral-300 bg-gradient-to-br from-white to-coral-100/40">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-500 text-white">
              <Icon name="send" size={17} />
            </span>
            <div>
              <h3 className="font-bold text-charcoal-900">Sent to lead a service</h3>
              <p className="mt-1 text-sm text-charcoal-600">
                {track.name} can now run a service start to finish. This isn&apos;t the finish line.
                It&apos;s where they begin to <span className="font-semibold">invest their week</span> in
                someone else. Who will they raise up next?
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* areas — each folds away; header shows current stage */}
      {track.areas.map((a) => {
        const isSent = a.stage === "sent";
        return (
          <Collapsible
            key={a.id}
            defaultOpen={false}
            header={<h3 className="text-base font-bold text-charcoal-900">{a.label}</h3>}
            right={
              isSent ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-coral-100 px-2.5 py-1 text-xs font-bold text-coral-600">
                  <Icon name="check" size={12} /> Sent
                </span>
              ) : (
                <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-600">
                  {STAGES[stageIndex(a.stage)].label}
                </span>
              )
            }
          >
            <AreaBody track={track} areaId={a.id} onSetStage={onSetStage} onSetNote={onSetNote} />
          </Collapsible>
        );
      })}
    </div>
  );
}

function AreaBody({
  track,
  areaId,
  onSetStage,
  onSetNote,
}: {
  track: LeaderTrack;
  areaId: string;
  onSetStage: (areaId: string, stage: TrackStage) => void;
  onSetNote: (areaId: string, note: string) => void;
}) {
  const a = track.areas.find((x) => x.id === areaId)!;
  const current = stageIndex(a.stage);
  const isSent = a.stage === "sent";

  return (
    <div>
      <p className="-mt-1 text-sm text-charcoal-500">{a.blurb}</p>

      {/* the journey: Watch → Help → Lead with help → Lead → Sent */}
      <div className="mt-4 flex items-stretch gap-1.5">
        {STAGES.map((stg, i) => {
          const reached = i <= current;
          const active = i === current;
          const last = i === STAGES.length - 1;
          return (
            <button
              key={stg.key}
              onClick={() => onSetStage(a.id, stg.key)}
              title={stg.mentor}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition ${
                active
                  ? last
                    ? "border-coral-600 bg-coral-600 text-white shadow-[var(--shadow-coral)]"
                    : "border-teal-500 bg-teal-500 text-white"
                  : reached
                    ? "border-teal-300 bg-teal-100 text-teal-700"
                    : "border-charcoal-200 bg-white text-charcoal-400 hover:border-teal-400 hover:text-teal-600"
              }`}
            >
              <Icon name={last ? "send" : reached ? "check" : "arrowRight"} size={14} />
              <span className="text-[0.7rem] font-semibold leading-tight">{stg.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-charcoal-400">
        Now: <span className="font-semibold text-charcoal-600">{STAGES[current].mentor}</span>
        {isSent && a.sentDate ? ` · sent ${fmtDate(a.sentDate)}` : ""}
      </p>

      {/* coaching note */}
      <div className="mt-3 rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2">
        <div className="label text-charcoal-400">Note</div>
        <div className="mt-0.5 text-sm text-charcoal-700">
          <EditableText
            value={a.note ?? ""}
            onCommit={(v) => onSetNote(a.id, v)}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  );
}
