// ============================================================
// Song suggestions — the leader's own library, read intelligently.
//
// No AI here by design (V2 ships free of per-use costs): the reasons come
// from rotation math over the leader's real services. The seam is clean —
// a smarter Coach can replace rankSuggestions() later without touching UI.
//
// A suggestion explains itself with up to three reasons:
//   "rested N weeks"  — sung before, but not recently (fresh again)
//   "fits {word}"     — a theme/scripture word matches the song's tags/title
//   "team knows it"   — sung 2+ times, so rehearsal is cheap
//   "new to the team" — never sung; offered sparingly for variety
// ============================================================

import type { AppState, LibrarySong, Service } from "./types";
import { sectionSongIds } from "./set";

export interface SongSuggestion {
  lib: LibrarySong;
  reasons: { label: string; tone: "plain" | "teal" | "amber" }[];
  score: number;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "in", "on", "to", "with",
  "next", "step", "this", "that", "your", "our", "his", "her", "you", "god",
]);

function themeWords(svc: Service): string[] {
  const raw = `${svc.theme ?? ""} ${svc.oneThing ?? ""} ${svc.title ?? ""}`;
  return raw
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

/** Weeks between two ISO dates, rounded down. */
function weeksBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00").getTime();
  const b = new Date(toIso + "T00:00:00").getTime();
  return Math.floor((b - a) / (7 * 86_400_000));
}

export function rankSuggestions(
  state: AppState,
  svc: Service,
  limit = 5,
): SongSuggestion[] {
  const inSet = new Set(
    svc.setSections
      .flatMap((s) => sectionSongIds(s))
      .map((id) => svc.songs.find((song) => song.id === id)?.libraryId)
      .filter(Boolean),
  );

  // Usage across every other service, keyed by library id.
  const lastUsed: Record<string, string> = {};
  const timesUsed: Record<string, number> = {};
  for (const s of state.services) {
    if (s.id === svc.id) continue;
    for (const song of s.songs) {
      if (!song.libraryId) continue;
      timesUsed[song.libraryId] = (timesUsed[song.libraryId] ?? 0) + 1;
      if (!lastUsed[song.libraryId] || s.date > lastUsed[song.libraryId])
        lastUsed[song.libraryId] = s.date;
    }
  }

  const words = themeWords(svc);

  const out: SongSuggestion[] = [];
  for (const lib of state.songLibrary) {
    if (inSet.has(lib.id)) continue;

    const reasons: SongSuggestion["reasons"] = [];
    let score = 0;

    const used = timesUsed[lib.id] ?? 0;
    const last = lastUsed[lib.id];
    if (used > 0 && last) {
      const rested = weeksBetween(last, svc.date);
      if (rested >= 4) {
        reasons.push({ label: `rested ${rested} weeks`, tone: "plain" });
        score += Math.min(rested, 16); // freshness, capped
      } else if (rested >= 0 && rested < 3) {
        score -= 12; // just sung — keep it resting
      }
    } else {
      reasons.push({ label: "new to the team", tone: "amber" });
      score += 2; // a little variety, never the top pick by default
    }

    const hay = `${lib.title} ${lib.tags?.join(" ") ?? ""} ${lib.defaultFlow}`.toLowerCase();
    const hit = words.find((w) => hay.includes(w));
    if (hit) {
      reasons.push({ label: `fits "${hit}"`, tone: "teal" });
      score += 14;
    }

    if (used >= 2) {
      reasons.push({ label: "team knows it", tone: "plain" });
      score += 6;
    }

    out.push({ lib, reasons: reasons.slice(0, 3), score });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
