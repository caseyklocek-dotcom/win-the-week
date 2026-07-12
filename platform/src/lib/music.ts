// ============================================================
// Music theory engine — transposition, Nashville numbers,
// Roman numerals, solfege, and capo handling for chord charts.
// ============================================================

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Keys conventionally spelled with flats
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]);

export const ALL_KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

const NOTE_TO_PITCH: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, "E#": 5, Fb: 4,
  F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10,
  B: 11, "B#": 0, Cb: 11,
};

function keyUsesFlats(key: string): boolean {
  return FLAT_KEYS.has(key) || key.includes("b");
}

function pitchToNote(pitch: number, useFlats: boolean): string {
  const p = ((pitch % 12) + 12) % 12;
  return (useFlats ? FLAT : SHARP)[p];
}

// Parse a chord like "C", "Am7", "F#m7b5", "G/B", "Dsus4"
interface ParsedChord {
  root: string;
  suffix: string;
  bass: string | null;
}
function parseChord(sym: string): ParsedChord | null {
  const m = sym.trim().match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!m) return null;
  return { root: m[1], suffix: m[2] || "", bass: m[3] || null };
}

// ---- Transposition ----
export function transposeChord(sym: string, semitones: number, useFlats: boolean): string {
  const c = parseChord(sym);
  if (!c || !(c.root in NOTE_TO_PITCH)) return sym;
  const newRoot = pitchToNote(NOTE_TO_PITCH[c.root] + semitones, useFlats);
  let out = newRoot + c.suffix;
  if (c.bass && c.bass in NOTE_TO_PITCH) {
    out += "/" + pitchToNote(NOTE_TO_PITCH[c.bass] + semitones, useFlats);
  }
  return out;
}

export function semitonesBetween(fromKey: string, toKey: string): number {
  const a = NOTE_TO_PITCH[fromKey] ?? 0;
  const b = NOTE_TO_PITCH[toKey] ?? 0;
  return b - a;
}

// ---- Degree-based rendering (Nashville / Roman / solfege) ----
const MAJOR_DEGREE: Record<number, { num: string; roman: string }> = {
  0: { num: "1", roman: "I" },
  2: { num: "2", roman: "II" },
  4: { num: "3", roman: "III" },
  5: { num: "4", roman: "IV" },
  7: { num: "5", roman: "V" },
  9: { num: "6", roman: "VI" },
  11: { num: "7", roman: "VII" },
};
const SOLFEGE_SHARP: Record<number, string> = {
  0: "Do", 1: "Di", 2: "Re", 3: "Ri", 4: "Mi", 5: "Fa",
  6: "Fi", 7: "Sol", 8: "Si", 9: "La", 10: "Li", 11: "Ti",
};
const SOLFEGE_FLAT: Record<number, string> = {
  0: "Do", 1: "Ra", 2: "Re", 3: "Me", 4: "Mi", 5: "Fa",
  6: "Se", 7: "Sol", 8: "Le", 9: "La", 10: "Te", 11: "Ti",
};

function isMinorSuffix(suffix: string): boolean {
  return /^m(?!aj)/.test(suffix) || suffix.startsWith("min") || suffix.startsWith("-");
}

function degreeLabel(interval: number, mode: "numbers" | "numerals" | "solfege", minor: boolean): string {
  const iv = ((interval % 12) + 12) % 12;
  if (mode === "solfege") return (minor ? SOLFEGE_FLAT : SOLFEGE_FLAT)[iv];
  const exact = MAJOR_DEGREE[iv];
  if (mode === "numbers") {
    if (exact) return exact.num;
    // chromatic — borrow from below with a sharp
    const below = MAJOR_DEGREE[((iv - 1) % 12 + 12) % 12];
    return below ? "#" + below.num : "?";
  }
  // roman
  let r: string;
  if (exact) r = exact.roman;
  else {
    const below = MAJOR_DEGREE[((iv - 1) % 12 + 12) % 12];
    r = below ? "#" + below.roman : "?";
  }
  return minor ? r.toLowerCase() : r;
}

// Render a chord symbol relative to a key as a degree label, keeping suffix/bass.
export function chordToDegree(
  sym: string,
  key: string,
  mode: "numbers" | "numerals" | "solfege",
): string {
  const c = parseChord(sym);
  if (!c || !(c.root in NOTE_TO_PITCH)) return sym;
  const keyPitch = NOTE_TO_PITCH[key] ?? 0;
  const interval = NOTE_TO_PITCH[c.root] - keyPitch;
  const minor = isMinorSuffix(c.suffix);
  let label = degreeLabel(interval, mode, minor);
  // For numbers/solfege, keep the quality suffix (minus a leading lowercase m which is implied by case for romans only)
  if (mode === "numerals") {
    // strip leading minor marker from suffix since case conveys it
    const suff = c.suffix.replace(/^(m(?!aj)|min|-)/, "");
    label += suff;
  } else {
    label += c.suffix;
  }
  if (c.bass && c.bass in NOTE_TO_PITCH) {
    const bassIv = NOTE_TO_PITCH[c.bass] - keyPitch;
    label += "/" + degreeLabel(bassIv, mode === "solfege" ? "solfege" : "numbers", false);
  }
  return label;
}

// Full render pipeline: given a chord written in originalKey, render for display
// in targetKey with optional capo and a display mode.
export function renderChord(
  sym: string,
  originalKey: string,
  targetKey: string,
  capo: number,
  display: "chords" | "numbers" | "numerals" | "solfege",
): string {
  // First move the chord from its written key to the target service key.
  const toTarget = semitonesBetween(originalKey, targetKey);
  const useFlats = keyUsesFlats(targetKey);
  const inTarget = transposeChord(sym, toTarget, useFlats);

  if (display !== "chords") {
    return chordToDegree(inTarget, targetKey, display);
  }
  // Letter chords. Apply capo: show the shapes the player fingers,
  // which are the sounding chords transposed DOWN by the capo position.
  if (capo > 0) {
    const shapeKey = pitchToNote(NOTE_TO_PITCH[targetKey] + -capo, keyUsesFlats(targetKey));
    const shaped = transposeChord(inTarget, -capo, keyUsesFlats(shapeKey));
    return shaped;
  }
  return inTarget;
}

// "1 song" / "4 songs" — a count with its noun correctly pluralized.
export function countLabel(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export function fmtDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// The weekday a service falls on, e.g. "Sunday" or "Saturday". Used for the
// date-tied labels so a non-Sunday service reads correctly.
export function weekdayName(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
}
