// ============================================================
// Set helpers — typed rows (song | element), durations, migration
// ============================================================
import type { AppState, Service, SetElement, SetRow, SetSection } from "./types";

function rid(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

export function blankElement(title = "New element", durationSec = 300): SetElement {
  return { id: rid("el"), title, durationSec };
}

// The song ids inside a section, in order — for readers that only care about songs.
export function sectionSongIds(section: SetSection): string[] {
  return (section.rows ?? [])
    .filter((r): r is Extract<SetRow, { kind: "song" }> => r.kind === "song")
    .map((r) => r.refId);
}

// What to call a service in a heading: its title, else its occasion/season
// label, else the date. Never blank, never "Untitled".
export function serviceDisplayTitle(
  svc: Pick<Service, "title" | "season" | "date">,
): string {
  const title = (svc.title || "").trim();
  if (title) return title;
  const season = (svc.season || "").trim();
  if (season) return season;
  return new Date(svc.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function rowTitle(row: SetRow, svc: Service): string {
  if (row.kind === "song") return svc.songs.find((s) => s.id === row.refId)?.title ?? "";
  return (svc.elements ?? []).find((e) => e.id === row.refId)?.title ?? "";
}

export function rowDurationSec(row: SetRow, svc: Service): number {
  if (row.kind === "song")
    return svc.songs.find((s) => s.id === row.refId)?.durationSec ?? 0;
  return (svc.elements ?? []).find((e) => e.id === row.refId)?.durationSec ?? 0;
}

export function sectionDurationSec(section: SetSection, svc: Service): number {
  return (section.rows ?? []).reduce((n, r) => n + rowDurationSec(r, svc), 0);
}

export function serviceSetDurationSec(svc: Service): number {
  return svc.setSections.reduce((n, sec) => n + sectionDurationSec(sec, svc), 0);
}

// Lazy, idempotent: gives every service an elements[] and every section a
// rows[] derived from legacy songIds. Returns the same reference when nothing
// needs changing, so it's safe to run on every load.
export function migrateSet(state: AppState): AppState {
  let touched = false;
  const services = state.services.map((svc) => {
    const needElements = !svc.elements;
    let secTouched = false;
    const setSections = svc.setSections.map((sec) => {
      if (sec.rows) return sec;
      secTouched = true;
      const rows: SetRow[] = (sec.songIds ?? []).map((refId) => ({
        kind: "song",
        refId,
      }));
      return { ...sec, rows };
    });
    if (!needElements && !secTouched) return svc;
    touched = true;
    return {
      ...svc,
      elements: svc.elements ?? [],
      setSections: secTouched ? setSections : svc.setSections,
    };
  });
  return touched ? { ...state, services } : state;
}
