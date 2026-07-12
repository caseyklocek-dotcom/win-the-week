// ============================================================
// Team Templates — reusable scheduling scaffolds
// ============================================================

import type {
  AppState,
  Person,
  PositionGroup,
  RoleSlot,
  Service,
  TeamTemplate,
  TeamTemplateSlot,
  TeamTemplatePoolEntry,
} from "./types";
import { classifyLabel } from "./positions";

// ---- ID helpers ----
const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

// ---- Labels ----
export const FREQ_LABELS: Record<string, string> = {
  weekly: "Every week",
  biweekly: "Every other week",
  monthly: "Once a month",
  custom: "Custom",
};

export const WEEK_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
  5: "5th",
};

/** Join an ordered list of week ordinals into "1st", "1st & 3rd", "1st, 2nd & 4th" */
function joinWeeks(weeks: number[]): string {
  const labels = [...weeks]
    .filter((w) => w >= 1 && w <= 5)
    .sort((a, b) => a - b)
    .map((w) => WEEK_LABELS[w]);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

/** Human-readable summary of a pool entry's schedule */
export function entryLabel(entry: TeamTemplatePoolEntry): string {
  if (entry.frequency === "custom") {
    const weeks = entry.customWeeks ?? [];
    if (weeks.length === 0) return "Pick weeks";
    return `${joinWeeks(weeks)} Sunday`;
  }
  return FREQ_LABELS[entry.frequency] ?? entry.frequency;
}

// ---- Factory helpers ----
export function blankEntry(personId: string): TeamTemplatePoolEntry {
  return { personId, frequency: "weekly" };
}

export function blankSlot(position = "Role", group: PositionGroup = "band"): TeamTemplateSlot {
  return { id: uid("ts"), position, pool: [], group };
}

export function blankTemplate(name = "New template"): TeamTemplate {
  return {
    id: uid("tt"),
    name,
    starred: false,
    slots: [
      blankSlot("Lead Vox", "band"),
      blankSlot("AG", "band"),
      blankSlot("Drums", "band"),
    ],
  };
}

// ---- Migration ----
/**
 * Normalize persisted team templates so every slot has a `pool` array.
 * Older saved templates (from before the pool field existed) can have
 * slots with `pool` undefined, which crashes the slot editor on load.
 */
export function migrateTeamTemplates(state: AppState): AppState {
  if (!state.teamTemplates) return state;
  return {
    ...state,
    teamTemplates: state.teamTemplates.map((t) => ({
      ...t,
      starred: t.starred ?? false,
      slots: (t.slots ?? []).map((s) => ({
        ...s,
        group: s.group ?? classifyLabel(s.position),
        pool: (s.pool ?? []).map((e) => {
          // Migrate legacy single `customWeek` → `customWeeks` array.
          const legacy = (e as { customWeek?: number }).customWeek;
          if (e.customWeeks === undefined && legacy !== undefined) {
            const { customWeek: _drop, ...rest } = e as TeamTemplatePoolEntry & {
              customWeek?: number;
            };
            return { ...rest, customWeeks: [legacy] };
          }
          return e;
        }),
      })),
    })),
  };
}

// ---- Eligibility logic ----

/** Which occurrence of the weekday is this date within its month? (1-indexed) */
function weekOfMonth(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

/**
 * Return the date of the most recent service (strictly before targetDate)
 * in which personId appears in any team role slot.
 */
function lastServedDate(
  personId: string,
  services: Service[],
  targetDate: string,
): Date | null {
  const target = new Date(targetDate + "T00:00:00");
  const past = services
    .filter((s) => new Date(s.date + "T00:00:00") < target)
    .sort(
      (a, b) =>
        new Date(b.date + "T00:00:00").getTime() -
        new Date(a.date + "T00:00:00").getTime(),
    );

  for (const svc of past) {
    for (const team of svc.teams) {
      if (team.roles.some((r) => r.personId === personId)) {
        return new Date(svc.date + "T00:00:00");
      }
    }
  }
  return null;
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function isEntryEligible(
  entry: TeamTemplatePoolEntry,
  services: Service[],
  targetDate: string,
): boolean {
  const { frequency, personId } = entry;

  if (frequency === "weekly") return true;

  if (frequency === "custom") {
    const target = new Date(targetDate + "T00:00:00");
    const weeks = entry.customWeeks ?? [];
    return weeks.includes(weekOfMonth(target));
  }

  const last = lastServedDate(personId, services, targetDate);
  if (!last) return true; // never served → always eligible

  const target = new Date(targetDate + "T00:00:00");
  const days = daysBetween(last, target);

  if (frequency === "biweekly") return days >= 14;
  if (frequency === "monthly") return days >= 28;
  return true;
}

// ---- Auto-scheduler ----

/**
 * Apply a team template to a service date. For each slot, picks the first
 * eligible person (in pool priority order); slots with no eligible person are
 * left open (status "no"). Roles come back grouped by section (band / tech /
 * teaching) so the caller can merge each group into its canonical Team
 * without disturbing sections the template doesn't touch.
 */
export function autoSchedule(
  template: TeamTemplate,
  people: Person[],
  services: Service[],
  targetDate: string,
): Partial<Record<PositionGroup, RoleSlot[]>> {
  const out: Partial<Record<PositionGroup, RoleSlot[]>> = {};

  for (const slot of template.slots) {
    let role: RoleSlot | null = null;
    for (const entry of slot.pool) {
      const person = people.find((p) => p.id === entry.personId);
      if (!person || !person.active) continue;
      if (isEntryEligible(entry, services, targetDate)) {
        role = {
          id: uid("r"),
          position: slot.position,
          person: person.name,
          personId: person.id,
          status: "wait" as const,
        };
        break;
      }
    }
    if (!role) {
      role = { id: uid("r"), position: slot.position, person: "", status: "no" as const };
    }
    (out[slot.group] ??= []).push(role);
  }

  return out;
}
