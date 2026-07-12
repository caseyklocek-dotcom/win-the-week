// ============================================================
// Position Library — stock role chips + custom positions, so building a
// team is tap-tap-tap instead of typing a label from scratch every week.
// ============================================================

import type {
  AppState,
  Person,
  PositionDef,
  PositionGroup,
  Service,
  Team,
} from "./types";

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

// ---- Group metadata (order + icon shown on every section header) ----
export const GROUP_ORDER: PositionGroup[] = ["band", "tech", "teaching"];
export const GROUP_META: Record<PositionGroup, { label: string; icon: string }> = {
  band: { label: "Band", icon: "music" },
  tech: { label: "Tech", icon: "tool" },
  teaching: { label: "Teaching", icon: "book" },
};

// ---- The stock canon ----
// `label` is exactly what shows everywhere — abbreviations live in the label
// itself (no separate full-name field to keep in sync).
export const BUILTIN_POSITIONS: PositionDef[] = [
  // Band
  { id: "wl", label: "Worship Leader", group: "band", stacks: false },
  { id: "leadvox", label: "Lead Vox", group: "band", stacks: false },
  { id: "bgv", label: "BGV", group: "band", stacks: true },
  { id: "ag", label: "AG", group: "band", stacks: true },
  { id: "eg", label: "EG", group: "band", stacks: true },
  { id: "piano", label: "Piano", group: "band", stacks: false },
  { id: "keys", label: "Keys", group: "band", stacks: true },
  { id: "bass", label: "Bass", group: "band", stacks: false },
  { id: "drums", label: "Drums", group: "band", stacks: false },
  { id: "perc", label: "Perc", group: "band", stacks: true },
  { id: "violin", label: "Violin", group: "band", stacks: true },
  // Tech
  { id: "audio", label: "Audio", group: "tech", stacks: false },
  { id: "video", label: "Video", group: "tech", stacks: false },
  { id: "lx", label: "LX", group: "tech", stacks: false },
  { id: "cam", label: "CAM", group: "tech", stacks: true },
  { id: "slides", label: "Slides", group: "tech", stacks: false },
  { id: "producer", label: "Producer", group: "tech", stacks: false },
  // Teaching
  { id: "pastor", label: "Pastor", group: "teaching", stacks: false },
  { id: "teaching", label: "Teaching", group: "teaching", stacks: false },
  { id: "host", label: "Host", group: "teaching", stacks: false },
];

// ---- One-tap presets (band roster starting points) ----
export interface PositionPreset {
  id: string;
  label: string;
  positionIds: string[]; // ids into BUILTIN_POSITIONS; repeats stack automatically
}
export const PRESETS: PositionPreset[] = [
  {
    id: "five-piece",
    label: "5-piece band",
    positionIds: ["leadvox", "ag", "keys", "bass", "drums"],
  },
  {
    id: "full-band",
    label: "Full band + vocals",
    positionIds: ["leadvox", "ag", "eg", "keys", "bass", "drums", "bgv", "bgv"],
  },
];

// ---- Classification (migration only) ----
// Best-guess group for a free-typed legacy position string, so existing data
// lands in a sensible section instead of all piling into Band.
const TECH_HINTS = [
  "audio", "sound", "video", "light", "lx", "cam", "camera", "produc",
  "propresenter", "slide", "stream", "media", "tech", "av",
];
const TEACHING_HINTS = [
  "teach", "pastor", "preach", "sermon", "scripture", "host", "announce", "word",
];
export function classifyLabel(label: string): PositionGroup {
  const l = label.toLowerCase();
  if (TECH_HINTS.some((h) => l.includes(h))) return "tech";
  if (TEACHING_HINTS.some((h) => l.includes(h))) return "teaching";
  return "band";
}

function nameMatchesGroup(name: string): PositionGroup | null {
  const n = name.trim().toLowerCase();
  if (["band", "music", "worship"].includes(n)) return "band";
  if (["tech", "production", "av", "avl"].includes(n)) return "tech";
  if (["teaching", "the word", "word"].includes(n)) return "teaching";
  return null;
}

// ---- Stacking ----
// "BGV2" -> "BGV"; a label with no trailing number returns itself unchanged.
export function baseLabel(label: string): string {
  return label.replace(/\s*\d+$/, "").trim();
}

/** The labels a stacking family should carry for a given count: a lone member
 * stays bare ("BGV"), two or more get numbered ("BGV1","BGV2",...). Matches the
 * rule that a number only appears when there are multiples. */
export function labelFamily(base: string, count: number): string[] {
  if (count <= 1) return [base];
  return Array.from({ length: count }, (_, i) => `${base}${i + 1}`);
}

/** True when `base` names a built-in stacking position (BGV, AG, CAM...), so we
 * know a family should be auto-numbered. Custom labels never stack. */
export function isStackingBase(base: string, library: PositionDef[]): boolean {
  const b = base.toLowerCase();
  return library.some((p) => p.stacks && p.label.toLowerCase() === b);
}

/** Re-label every member of a stacking family in order so the count drives the
 * numbering: 1 member -> bare, 2+ -> 1..N. Used after an add or a removal so
 * "BGV1/BGV2/BGV3" losing BGV2 becomes "BGV1/BGV2", and a family that drops to
 * one member loses its number entirely. */
export function renumberFamily<T extends { position: string }>(
  items: T[],
  base: string,
): T[] {
  const b = base.toLowerCase();
  const count = items.filter((i) => baseLabel(i.position).toLowerCase() === b).length;
  const labels = labelFamily(base, count);
  let n = 0;
  return items.map((it) =>
    baseLabel(it.position).toLowerCase() === b ? { ...it, position: labels[n++] } : it,
  );
}

/** Append a new instance of `def` to a list and return it correctly numbered.
 * Non-stacking positions are added as-is; stacking ones renumber the family. */
export function withAddedPosition<T extends { position: string }>(
  items: T[],
  def: PositionDef,
  make: (label: string) => T,
): T[] {
  const appended = [...items, make(def.label)];
  return def.stacks ? renumberFamily(appended, def.label) : appended;
}

// Placeholder strings that should never become tray chips (defaults left over
// from adding a blank slot/team/person).
const JUNK_LABELS = new Set(["role", "new team", "new name", "new role", "position"]);

// ---- Migration ----
// Seed the built-in canon once, then harvest any free-typed position string
// already in use (services, templates) that doesn't match a built-in, so
// nothing the leader already typed disappears from the tray. Also prunes any
// junk placeholder chips a previous version may have harvested.
export function migratePositions(state: AppState): AppState {
  const existing = state.positionLibrary?.filter(
    (p) => !(p.custom && JUNK_LABELS.has(p.label.trim().toLowerCase())),
  );
  const builtinLabels = new Set(BUILTIN_POSITIONS.map((p) => p.label.toLowerCase()));
  const seen = new Set(existing?.map((p) => p.label.toLowerCase()) ?? []);
  const customs: PositionDef[] = [];

  const harvest = (label: string) => {
    const clean = label.trim();
    if (!clean || JUNK_LABELS.has(clean.toLowerCase())) return;
    const key = baseLabel(clean).toLowerCase();
    if (builtinLabels.has(key) || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    customs.push({
      id: uid("pos"),
      label: clean,
      group: classifyLabel(clean),
      stacks: false,
      custom: true,
    });
  };

  for (const svc of state.services) {
    for (const team of svc.teams) {
      for (const slot of team.roles) harvest(slot.position);
    }
  }
  for (const tpl of state.teamTemplates ?? []) {
    for (const slot of tpl.slots) harvest(slot.position);
  }

  if (existing) {
    // Rewrite when we added customs OR pruned junk from the stored list.
    const changed =
      customs.length > 0 || existing.length !== (state.positionLibrary?.length ?? 0);
    return changed
      ? { ...state, positionLibrary: [...existing, ...customs] }
      : state;
  }
  return { ...state, positionLibrary: [...BUILTIN_POSITIONS, ...customs] };
}

/** Ensure every service has exactly one Team per group (Band / Tech /
 * Teaching), tagging an existing recognizably-named team rather than
 * duplicating it. Ad-hoc teams the leader named something else are untouched. */
export function ensureCanonicalTeams(state: AppState): AppState {
  return {
    ...state,
    services: state.services.map((svc) => {
      const teams = [...svc.teams];
      for (const group of GROUP_ORDER) {
        const already = teams.find((t) => t.group === group);
        if (already) continue;
        const byName = teams.find((t) => !t.group && nameMatchesGroup(t.name) === group);
        if (byName) {
          byName.group = group;
          continue;
        }
        teams.push({
          id: uid("team"),
          name: GROUP_META[group].label,
          color: "#ff6b5e",
          group,
          roles: [],
        });
      }
      return { ...svc, teams };
    }),
  };
}

// ---- Smart-sort candidates for the assign sheet ----
export interface AssignCandidate {
  person: Person;
  tag?: "last-week" | "double-booked";
  conflictWith?: string; // other position labels they're already on, this service
}

/** Most recent service strictly before targetDate that has any team data. */
function previousService(services: Service[], targetDate: string, excludeId: string): Service | null {
  const target = new Date(targetDate + "T00:00:00").getTime();
  const past = services
    .filter((s) => s.id !== excludeId && new Date(s.date + "T00:00:00").getTime() < target)
    .sort((a, b) => new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime());
  return past[0] ?? null;
}

export function sortAssignCandidates(
  people: Person[],
  position: string,
  opts: {
    services: Service[];
    currentTeams: Team[];
    targetDate: string;
    currentServiceId: string;
    excludeRoleId?: string;
  },
): AssignCandidate[] {
  const active = people.filter((p) => p.active);
  const base = baseLabel(position).toLowerCase();

  // Who filled this same base position last time out.
  const prev = previousService(opts.services, opts.targetDate, opts.currentServiceId);
  const lastWeekIds = new Set<string>();
  if (prev) {
    for (const team of prev.teams) {
      for (const slot of team.roles) {
        if (baseLabel(slot.position).toLowerCase() === base && slot.personId) {
          lastWeekIds.add(slot.personId);
        }
      }
    }
  }

  // Who's already carrying another slot this week (for the double-booked tag).
  const conflicts = new Map<string, string[]>();
  for (const team of opts.currentTeams) {
    for (const slot of team.roles) {
      if (!slot.personId || slot.id === opts.excludeRoleId) continue;
      const list = conflicts.get(slot.personId) ?? [];
      list.push(slot.position);
      conflicts.set(slot.personId, list);
    }
  }

  const roleMatch = (p: Person) =>
    p.roles.some((r) => {
      const rl = r.toLowerCase();
      return rl.includes(base) || base.includes(rl);
    });

  const scored = active.map((person) => {
    const tag: AssignCandidate["tag"] = lastWeekIds.has(person.id)
      ? "last-week"
      : conflicts.has(person.id)
        ? "double-booked"
        : undefined;
    return {
      person,
      tag,
      conflictWith: conflicts.get(person.id)?.join(", "),
      lastWeek: lastWeekIds.has(person.id),
      matched: roleMatch(person),
    };
  });

  scored.sort((a, b) => {
    if (a.lastWeek !== b.lastWeek) return a.lastWeek ? -1 : 1;
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    return a.person.name.localeCompare(b.person.name);
  });

  return scored.map(({ person, tag, conflictWith }) => ({ person, tag, conflictWith }));
}
