// ============================================================
// People Library — the reusable roster behind every service.
//
// Model: a service still stores its own RoleSlots (so per-Sunday position and
// confirmation status live with the service). Each slot carries a personId back
// to the roster record. The canonical name is resolved from the library, so a
// rename in one place updates everywhere.
// ============================================================

import type { AppState, Person, RoleSlot } from "./types";

function id(p: string) {
  return p + "-" + Math.random().toString(36).slice(2, 9);
}

export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function blankPerson(): Person {
  return { id: id("person"), name: "New name", roles: [], active: true };
}

// Resolve the display name for a slot: prefer the library record, fall back to
// the snapshot string stored on the slot.
export function resolveName(slot: RoleSlot, people: Person[]): string {
  if (slot.personId) {
    const p = people.find((x) => x.id === slot.personId);
    if (p) return p.name;
  }
  return slot.person;
}

// Lazy migration: derive a roster from every service's role slots plus the
// people you're raising up (de-duped by name), and stamp each slot with its personId.
// Idempotent — once people exists it returns the state untouched.
export function migratePeople(state: AppState): AppState {
  if (state.people) return state;

  const byKey = new Map<string, Person>();
  const people: Person[] = [];

  const ensure = (name: string, role?: string) => {
    const clean = name.trim();
    if (!clean) return undefined;
    const key = nameKey(clean);
    let person = byKey.get(key);
    if (!person) {
      person = { id: id("person"), name: clean, roles: [], active: true };
      byKey.set(key, person);
      people.push(person);
    }
    if (role && role.trim() && !person.roles.includes(role.trim())) {
      person.roles.push(role.trim());
    }
    return person;
  };

  // Role slots across every service contribute names + the positions they fill.
  for (const svc of state.services) {
    for (const team of svc.teams) {
      for (const slot of team.roles) {
        ensure(slot.person, slot.position);
      }
    }
  }

  // The people you're raising up are part of the roster too.
  for (const b of state.bench) {
    ensure(b.name, b.role);
  }

  // Second pass: link each slot to its roster record.
  const services = state.services.map((svc) => ({
    ...svc,
    teams: svc.teams.map((team) => ({
      ...team,
      roles: team.roles.map((slot) => ({
        ...slot,
        personId:
          slot.personId ??
          (slot.person.trim() ? byKey.get(nameKey(slot.person))?.id : undefined),
      })),
    })),
  }));

  return { ...state, people, services };
}
