// ============================================================
// Song Library — the reusable catalog that sits behind every set.
//
// Model: a set still stores its own Song copies (so per-Sunday key, flow, and
// lead live with the service). Each copy carries a libraryId back to the
// catalog record. Catalog fields (title, artist, chart, links...) sync from the
// set back to the library; per-service fields do not.
// ============================================================

import type { AppState, LibrarySong, Song } from "./types";
import type { ParsedMeta } from "./parseChart";

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

// Fields shared between a Song and its LibrarySong record. Note: "flow" is
// per-service and maps to "defaultFlow" on the library, so it is NOT here.
const CATALOG_KEYS = [
  "title",
  "artist",
  "originalKey",
  "durationSec",
  "chartSource",
  "chart",
  "pdfName",
  "multitracksUrl",
  "songSelectUrl",
  "ccli",
  "notes",
  "tempo",
  "timeSignature",
] as const;

export function dedupeKey(title: string, artist: string): string {
  return title.trim().toLowerCase() + "|" + artist.trim().toLowerCase();
}

// Catalog record built from an existing set song.
export function librarySongFromSong(song: Song): LibrarySong {
  return {
    id: id("lib"),
    title: song.title,
    artist: song.artist,
    originalKey: song.originalKey,
    durationSec: song.durationSec,
    defaultFlow: song.flow,
    chartSource: song.chartSource,
    chart: song.chart,
    pdfName: song.pdfName,
    multitracksUrl: song.multitracksUrl,
    songSelectUrl: song.songSelectUrl,
    ccli: song.ccli,
    notes: song.notes,
  };
}

// Fresh set copy pulled from a catalog record. Sunday key defaults to the
// chart's original key; lead is left open for this service.
export function songFromLibrary(lib: LibrarySong): Song {
  return {
    id: id("song"),
    libraryId: lib.id,
    title: lib.title,
    artist: lib.artist,
    originalKey: lib.originalKey,
    serviceKey: lib.originalKey,
    durationSec: lib.durationSec,
    flow: lib.defaultFlow || "Adoration",
    leadName: "",
    chartSource: lib.chartSource,
    chart: lib.chart,
    pdfName: lib.pdfName,
    pdfPath: lib.pdfPath,
    multitracksUrl: lib.multitracksUrl,
    songSelectUrl: lib.songSelectUrl,
    ccli: lib.ccli,
    notes: lib.notes,
  };
}

export function blankLibrarySong(): LibrarySong {
  return {
    id: id("lib"),
    title: "New song",
    artist: "",
    originalKey: "C",
    durationSec: 240,
    defaultFlow: "Adoration",
    chartSource: "none",
  };
}

// Merge what the chart reader saw into a library record. Fills ONLY fields the
// leader hasn't set — imported details never overwrite real data.
export function libraryPatchFromParsedMeta(
  lib: LibrarySong,
  meta: ParsedMeta,
): Partial<LibrarySong> {
  const patch: Partial<LibrarySong> = {};
  const titleUnset = !lib.title.trim() || lib.title === "New song";
  if (meta.title && titleUnset) patch.title = meta.title;
  if (meta.artist && !lib.artist.trim()) patch.artist = meta.artist;
  if (meta.tempo && !lib.tempo) patch.tempo = meta.tempo;
  if (meta.timeSignature && !lib.timeSignature) patch.timeSignature = meta.timeSignature;
  if (meta.ccli && !lib.ccli) patch.ccli = meta.ccli;
  if (meta.themes.length > 0) {
    const merged = [...new Set([...(lib.tags ?? []), ...meta.themes])];
    if (merged.length !== (lib.tags?.length ?? 0)) patch.tags = merged;
  }
  return patch;
}

// Same idea for a per-service Song copy (no tags on Song).
export function songPatchFromParsedMeta(song: Song, meta: ParsedMeta): Partial<Song> {
  const patch: Partial<Song> = {};
  const titleUnset = !song.title.trim() || song.title === "New song";
  if (meta.title && titleUnset) patch.title = meta.title;
  if (meta.artist && !song.artist.trim()) patch.artist = meta.artist;
  if (meta.tempo && !song.tempo) patch.tempo = meta.tempo;
  if (meta.timeSignature && !song.timeSignature) patch.timeSignature = meta.timeSignature;
  if (meta.ccli && !song.ccli) patch.ccli = meta.ccli;
  return patch;
}

// A complete library record built from one parsed import — the batch-drop path.
export function librarySongFromParsed(parsed: {
  chart: LibrarySong["chart"];
  meta: ParsedMeta;
}): LibrarySong {
  const { chart, meta } = parsed;
  return {
    id: id("lib"),
    title: meta.title ?? "Imported song",
    artist: meta.artist ?? "",
    originalKey: meta.originalKey ?? chart?.settings.key ?? "C",
    durationSec: 240,
    defaultFlow: meta.suggestedFlow ?? "Adoration",
    chartSource: "builtin",
    chart,
    ccli: meta.ccli ?? undefined,
    tags: meta.themes.length ? meta.themes : undefined,
    tempo: meta.tempo ?? undefined,
    timeSignature: meta.timeSignature ?? undefined,
  };
}

// Pull the catalog-relevant subset out of a Song patch, so a set edit can be
// mirrored to the library record.
export function catalogPatchFromSong(fields: Partial<Song>): Partial<LibrarySong> {
  const out: Partial<LibrarySong> = {};
  for (const k of CATALOG_KEYS) {
    if (k in fields) {
      // keys line up 1:1 between Song and LibrarySong for this subset
      (out as Record<string, unknown>)[k] = (fields as Record<string, unknown>)[k];
    }
  }
  return out;
}

// Lazy migration: derive a song library from every service's songs (de-duped by
// title + artist) and stamp each set song with its libraryId. Idempotent — once
// songLibrary exists it returns the state untouched. Used both for existing
// local data and for seeding fresh installs.
export function migrateLibrary(state: AppState): AppState {
  if (state.songLibrary) return state;

  const byKey = new Map<string, LibrarySong>();
  const library: LibrarySong[] = [];

  for (const svc of state.services) {
    for (const song of svc.songs) {
      const key = dedupeKey(song.title, song.artist);
      if (!byKey.has(key)) {
        const lib = librarySongFromSong(song);
        byKey.set(key, lib);
        library.push(lib);
      }
    }
  }

  const services = state.services.map((svc) => ({
    ...svc,
    songs: svc.songs.map((song) => ({
      ...song,
      libraryId:
        song.libraryId ?? byKey.get(dedupeKey(song.title, song.artist))?.id,
    })),
  }));

  return { ...state, songLibrary: library, services };
}
