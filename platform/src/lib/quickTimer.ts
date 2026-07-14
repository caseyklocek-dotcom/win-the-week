// ============================================================
// Quick-plan timer — pausable, shared between /quick and QuickResumePill.
//
// Planning gets interrupted (a phone call, a kid, a knock at the door), and
// the whole point of the timer is an honest "how long did this take" — so
// it needs a real pause, not just a clock that keeps running in the
// background. State lives in sessionStorage as JSON:
//   { accumulatedSec: number; runningSince: number | null }
// elapsed() = accumulatedSec + (runningSince ? now - runningSince : 0).
// Exiting (abandoning the sitting) clears the key entirely — it only drops
// time tracking, never anything already entered on the service itself.
// ============================================================

export interface QuickTimerState {
  accumulatedSec: number;
  runningSince: number | null; // epoch ms, or null while paused
}

function key(svcId: string): string {
  return `wtw_quick_timer_${svcId}`;
}

function read(svcId: string): QuickTimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key(svcId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickTimerState;
    if (typeof parsed.accumulatedSec !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(svcId: string, state: QuickTimerState) {
  try {
    sessionStorage.setItem(key(svcId), JSON.stringify(state));
  } catch {
    /* storage full or blocked — the sitting still works, just untimed */
  }
}

/** Start (if no session yet) or fetch the current session, running by default. */
export function ensureStarted(svcId: string): QuickTimerState {
  const existing = read(svcId);
  if (existing) return existing;
  const fresh: QuickTimerState = { accumulatedSec: 0, runningSince: Date.now() };
  write(svcId, fresh);
  return fresh;
}

/** Current elapsed seconds for a session, or null if none is active. */
export function elapsedSec(svcId: string): number | null {
  const s = read(svcId);
  if (!s) return null;
  const live = s.runningSince ? (Date.now() - s.runningSince) / 1000 : 0;
  return Math.floor(s.accumulatedSec + live);
}

export function isRunning(svcId: string): boolean {
  return read(svcId)?.runningSince != null;
}

export function isActive(svcId: string): boolean {
  return read(svcId) !== null;
}

export function pause(svcId: string) {
  const s = read(svcId);
  if (!s || !s.runningSince) return;
  const live = (Date.now() - s.runningSince) / 1000;
  write(svcId, { accumulatedSec: s.accumulatedSec + live, runningSince: null });
}

export function resume(svcId: string) {
  const s = read(svcId);
  if (!s || s.runningSince) return;
  write(svcId, { ...s, runningSince: Date.now() });
}

/** Abandon the sitting entirely — stops tracking, keeps whatever was entered. */
export function exit(svcId: string) {
  try {
    sessionStorage.removeItem(key(svcId));
  } catch {
    /* nothing to clean up */
  }
}

/** Called when the plan is finished — returns the final elapsed and clears state. */
export function finish(svcId: string): number {
  const total = elapsedSec(svcId) ?? 0;
  exit(svcId);
  return total;
}
