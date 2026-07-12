// ============================================================
// Experience mode — Guided vs Fast.
//
// Guided: the app walks the leader through each week in plain language with
// coaching notes ("why this matters"). The default for anyone new.
// Fast: one-screen flows, keyboard-first, no hand-holding. For leaders who
// already know the loop and just want speed.
//
// The mode lives on Profile. Older profiles only have `guidedSetup`, so the
// resolver falls back to it: guidedSetup === false reads as Fast.
// ============================================================

import type { Profile } from "./types";

export type ExperienceMode = "guided" | "fast";

export function profileMode(p: Profile): ExperienceMode {
  if (p.mode === "guided" || p.mode === "fast") return p.mode;
  return p.guidedSetup === false ? "fast" : "guided";
}
