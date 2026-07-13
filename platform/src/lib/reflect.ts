// ============================================================
// Reflection handoff — last Sunday speaks into this Sunday.
//
// Live mode (and the Prep tab) write a service's carryForward. This helper
// finds the most recent PAST service with a note so the next week's planning
// surfaces open with it — the loop actually closes.
// ============================================================

import type { Service } from "./types";

export interface LastSundayNote {
  note: string;
  date: string; // ISO date of the service the note came from
}

/** Most recent service before `beforeDate` that carries a reflection. */
export function lastSundayNote(
  services: Service[],
  beforeDate: string,
): LastSundayNote | null {
  const past = services
    .filter((s) => s.date < beforeDate && s.carryForward?.trim())
    .sort((a, b) => b.date.localeCompare(a.date));
  const hit = past[0];
  return hit ? { note: hit.carryForward.trim(), date: hit.date } : null;
}
