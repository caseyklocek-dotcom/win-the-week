// ============================================================
// Leader Track — discipleship, framed from the developing leader's point of
// view. A worship leader raises someone up across several areas of serving.
// Each area moves from watching, to helping, to leading, to being *sent* to
// carry it on their own. Not a ladder — a journey walked alongside, ending in
// being entrusted. The areas grow in PARALLEL (Co-lead alongside Plan; Tech
// alongside either), and "Lead a Service" is the capstone where they converge.
// ============================================================

import type { AppState, LeaderTrack, TrackArea, TrackStage } from "./types";

function rid(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

// The five stages, in order, from the developing leader's POV. `mentor` keeps
// the original hand-off phrasing so the leader and disciple share one meaning.
export const STAGES: { key: TrackStage; label: string; mentor: string; blurb: string }[] = [
  { key: "watch", label: "Watch", mentor: "You watch me do it", blurb: "Learning by watching your leader." },
  { key: "help", label: "Help", mentor: "You help me do it", blurb: "Jumping in alongside your leader." },
  { key: "lead-with-help", label: "Lead with help", mentor: "I help you do it", blurb: "You lead — your leader is right beside you." },
  { key: "lead", label: "Lead", mentor: "I watch you do it", blurb: "You lead — your leader watches and coaches." },
  { key: "sent", label: "Sent", mentor: "Released to lead it on your own", blurb: "Entrusted to carry this on your own." },
];

export const STAGE_KEYS = STAGES.map((s) => s.key);
export function stageIndex(stage: TrackStage): number {
  return STAGE_KEYS.indexOf(stage);
}

// The areas of a worship leader's serving. They progress in parallel —
// Co-lead runs alongside Plan; Tech alongside Plan or Rehearsal; and Lead a
// Service is the capstone where everything comes together.
export const AREA_DEFS: { id: string; label: string; blurb: string }[] = [
  { id: "plan", label: "Plan a Service", blurb: "The whole process, eight weeks out to the week of — Pray, Plan, Prep and all five hours: communication, band notes, vocal and tech prep. Not just songs on a page." },
  { id: "colead", label: "Co-lead a Service", blurb: "Leading on stage alongside their worship leader, so the team and the congregation see them grow into a leader. Runs in parallel with planning." },
  { id: "rehearsal", label: "Lead Rehearsal", blurb: "The prep checklist, devotional and prayer, all the music, and leading the tech team through rehearsal. Takes a few reps — not a one-time hand-off." },
  { id: "tech", label: "Lead the Tech", blurb: "Serving the tech team well, or preparing the tech for service — lyrics, audio, and the basic signal chains and setup. Scales to whatever the church has." },
  { id: "service", label: "Lead a Service", blurb: "The capstone: plan it, lead the rehearsal, and lead the service — start to finish, on their own." },
];

export function blankAreas(): TrackArea[] {
  return AREA_DEFS.map((a) => ({ id: a.id, label: a.label, blurb: a.blurb, stage: "watch" as TrackStage }));
}

export function blankLeaderTrack(name: string, personId?: string): LeaderTrack {
  return {
    id: rid("leader"),
    personId,
    name: name.trim() || "New leader",
    startedDate: new Date().toISOString(),
    areas: blankAreas(),
  };
}

// Overall advancement across all areas, 0..1 (average stage progress).
export function trackProgress(track: LeaderTrack): number {
  if (track.areas.length === 0) return 0;
  const max = STAGE_KEYS.length - 1;
  const sum = track.areas.reduce((acc, a) => acc + stageIndex(a.stage), 0);
  return sum / (track.areas.length * max);
}
export function sentCount(track: LeaderTrack): number {
  return track.areas.filter((a) => a.stage === "sent").length;
}
// The capstone area being sent means they can run a whole service alone.
export function isFullySent(track: LeaderTrack): boolean {
  return track.areas.find((a) => a.id === "service")?.stage === "sent";
}

// Lazy seed: one example developing leader, mid-journey, so the space isn't
// empty on first open. Idempotent — runs only when `leaders` is absent.
export function migrateLeaders(state: AppState): AppState {
  if (state.leaders) return state;
  const stageFor = (areaId: string): TrackStage =>
    areaId === "plan" ? "lead"
    : areaId === "colead" ? "sent"
    : areaId === "rehearsal" ? "lead-with-help"
    : areaId === "tech" ? "help"
    : "watch";
  const days = (n: number) => new Date(Date.now() - 1000 * 60 * 60 * 24 * n).toISOString();
  const example: LeaderTrack = {
    id: rid("leader"),
    name: "Jordan (example)",
    startedDate: days(70),
    areas: AREA_DEFS.map((a) => ({
      id: a.id,
      label: a.label,
      blurb: a.blurb,
      stage: stageFor(a.id),
      ...(a.id === "colead"
        ? { sentDate: days(14), note: "First time co-leading — the team responded so well to them." }
        : {}),
    })),
    notes: "An example track — rename it, edit it, or delete it, then add the real leaders you're raising.",
  };
  return { ...state, leaders: [example] };
}
