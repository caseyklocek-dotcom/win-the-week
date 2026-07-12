"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label, Pill } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { PersonPicker } from "@/components/PersonPicker";
import { PositionTray } from "@/components/PositionTray";
import { resolveName, blankPerson } from "@/lib/people";
import { serviceDisplayTitle } from "@/lib/set";
import {
  GROUP_ORDER,
  GROUP_META,
  PRESETS,
  baseLabel,
  isStackingBase,
  renumberFamily,
  withAddedPosition,
  sortAssignCandidates,
} from "@/lib/positions";
import { weekdayName } from "@/lib/music";
import type { RoleStatus, Service, Team, BenchPerson, Person, PositionDef } from "@/lib/types";

// ---- Awaiting modal ----
function AwaitingModal({
  slots,
  people,
  onClose,
}: {
  slots: { teamName: string; position: string; personId?: string; person: string }[];
  people: Person[];
  onClose: () => void;
}) {
  const lookup = (personId?: string) => people.find((p) => p.id === personId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            Awaiting confirmation
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-400">
            Reach out to anyone who hasn't confirmed yet.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {slots.map((slot, i) => {
            const person = lookup(slot.personId);
            return (
              <div key={i} className="rounded-lg border border-charcoal-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-charcoal-800">{slot.person || "Unknown"}</div>
                    <div className="text-xs text-charcoal-400">{slot.position} · {slot.teamName}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={person?.email ? `mailto:${person.email}` : undefined}
                    onClick={!person?.email ? (e) => e.preventDefault() : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      person?.email
                        ? "border-charcoal-200 text-charcoal-700 hover:border-coral-400 hover:text-coral-600"
                        : "cursor-default border-charcoal-100 text-charcoal-300"
                    }`}
                    title={person?.email || "No email on file"}
                  >
                    <Icon name="mail" size={15} />
                    {person?.email ? "Email" : "No email"}
                  </a>
                  <a
                    href={person?.phone ? `sms:${person.phone}` : undefined}
                    onClick={!person?.phone ? (e) => e.preventDefault() : undefined}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      person?.phone
                        ? "border-charcoal-200 text-charcoal-700 hover:border-coral-400 hover:text-coral-600"
                        : "cursor-default border-charcoal-100 text-charcoal-300"
                    }`}
                    title={person?.phone || "No phone on file"}
                  >
                    <Icon name="message" size={15} />
                    {person?.phone ? "Text" : "No phone"}
                  </a>
                </div>
                {!person?.email && !person?.phone && (
                  <p className="mt-2 text-xs text-charcoal-400">
                    Add contact info on the{" "}
                    <a href="/people" className="text-coral-600 hover:underline">People page</a>.
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end border-t border-charcoal-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-charcoal-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-charcoal-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Open positions modal ----
function OpenModal({
  slots,
  services,
  currentTeams,
  targetDate,
  currentServiceId,
  onAssign,
  onClose,
}: {
  slots: { tid: string; rid: string; teamName: string; position: string }[];
  services: Service[];
  currentTeams: Team[];
  targetDate: string;
  currentServiceId: string;
  onAssign: (tid: string, rid: string, person: Person) => void;
  onClose: () => void;
}) {
  const { people } = useStore();
  const [selectedSlot, setSelectedSlot] = useState(slots[0] ?? null);

  const suggestions = (position: string, excludeRoleId: string) =>
    sortAssignCandidates(people, position, {
      services,
      currentTeams,
      targetDate,
      currentServiceId,
      excludeRoleId,
    });

  if (!selectedSlot) return null;
  const candidates = suggestions(selectedSlot.position, selectedSlot.rid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            Open positions
          </h2>
          <p className="mt-0.5 text-xs text-charcoal-400">Pick a slot, then assign a replacement.</p>
        </div>

        {/* Slot tabs if multiple */}
        {slots.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-charcoal-100 px-4 pt-2 pb-3">
            {slots.map((slot) => (
              <button
                key={`${slot.tid}-${slot.rid}`}
                onClick={() => setSelectedSlot(slot)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSlot.rid === slot.rid
                    ? "bg-coral-500 text-white"
                    : "text-charcoal-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {slot.position}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400">
            {selectedSlot.position} · {selectedSlot.teamName}
          </p>
          {candidates.length === 0 ? (
            <p className="text-sm text-charcoal-400">No one in your roster yet.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map(({ person, tag, conflictWith }) => (
                <button
                  key={person.id}
                  onClick={() => {
                    onAssign(selectedSlot.tid, selectedSlot.rid, person);
                    const remaining = slots.filter((s) => s.rid !== selectedSlot.rid);
                    if (remaining.length > 0) setSelectedSlot(remaining[0]);
                    else onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-charcoal-100 px-4 py-3 text-left transition hover:border-coral-300 hover:bg-coral-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-white">
                    {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-charcoal-800">{person.name}</div>
                    <div className="truncate text-xs text-charcoal-400">
                      {tag === "double-booked"
                        ? `Already on ${conflictWith}`
                        : person.roles.join(", ") || "No roles yet"}
                    </div>
                  </div>
                  {tag === "last-week" && (
                    <span className="shrink-0 rounded-full bg-ok-tint px-2 py-0.5 text-[0.65rem] font-semibold text-ok-ink">
                      Last week
                    </span>
                  )}
                  {tag === "double-booked" && (
                    <span className="shrink-0 rounded-full bg-wait-tint px-2 py-0.5 text-[0.65rem] font-semibold text-wait-ink">
                      Double-booked
                    </span>
                  )}
                  <Icon name="plus" size={15} className="shrink-0 text-coral-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-charcoal-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const STATUS_CYCLE: RoleStatus[] = ["ok", "wait", "no"];
const TEAM_COLORS = ["#ff6b5e", "#3d9970", "#2e2e2e", "#b9711d", "#5b7fb9"];

export default function TeamPage() {
  const { state, people, positionLibrary, activeService: svc, updateService, setState, addPerson,
    teamTemplates, applyTeamTemplate } =
    useStore();

  // Which role slot the assign popup is targeting, if any.
  const [picker, setPicker] = useState<{ tid: string; rid: string } | null>(null);
  const [summaryModal, setSummaryModal] = useState<"awaiting" | "open" | null>(null);
  const [applyModal, setApplyModal] = useState(false);
  const pickerTeam = picker ? svc.teams.find((t) => t.id === picker.tid) : undefined;
  const pickerSlot = picker ? pickerTeam?.roles.find((r) => r.id === picker.rid) : undefined;

  const patchService = (updater: (s: Service) => Service) =>
    updateService(svc.id, updater);

  // Assignment / status changes keep the applied-template link.
  const setTeams = (teams: Team[]) =>
    patchService((s) => ({ ...s, teams }));

  // Structural changes (add/remove a role, a preset) mean the roster no longer
  // matches a template, so the selection is cleared and the coral state drops.
  const setTeamsStructural = (teams: Team[]) =>
    patchService((s) => ({ ...s, teams, appliedTemplateId: undefined }));

  // ---- summary across all teams ----
  const allRoles = svc.teams.flatMap((t) => t.roles);
  const confirmed = allRoles.filter((r) => r.status === "ok").length;
  const awaiting = allRoles.filter((r) => r.status === "wait").length;
  const open = allRoles.filter((r) => r.status === "no").length;

  const canonicalTeams = GROUP_ORDER.map((g) => svc.teams.find((t) => t.group === g)).filter(
    (t): t is Team => !!t,
  );
  const adHocTeams = svc.teams.filter((t) => !t.group);

  // ---- team mutations (ad-hoc teams only) ----
  const renameTeam = (tid: string, name: string) =>
    setTeams(svc.teams.map((t) => (t.id === tid ? { ...t, name } : t)));

  const removeTeam = (tid: string) =>
    setTeamsStructural(svc.teams.filter((t) => t.id !== tid));

  const addTeam = () =>
    setTeamsStructural([
      ...svc.teams,
      {
        id: id("team"),
        name: "New team",
        color: TEAM_COLORS[svc.teams.length % TEAM_COLORS.length],
        roles: [{ id: id("r"), position: "Role", person: "", status: "no" }],
      },
    ]);

  // ---- role mutations ----
  const updateRole = (
    tid: string,
    rid: string,
    fields: Partial<{
      position: string;
      person: string;
      personId?: string;
      status: RoleStatus;
    }>,
  ) =>
    setTeams(
      svc.teams.map((t) =>
        t.id === tid
          ? { ...t, roles: t.roles.map((r) => (r.id === rid ? { ...r, ...fields } : r)) }
          : t,
      ),
    );

  const cycleStatus = (tid: string, rid: string, current: RoleStatus) => {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length];
    updateRole(tid, rid, { status: next });
  };

  // ---- assignment (links a slot to a roster Person) ----
  const assignPerson = (tid: string, rid: string, person: Person) => {
    setTeams(
      svc.teams.map((t) =>
        t.id === tid
          ? {
              ...t,
              roles: t.roles.map((r) =>
                r.id === rid
                  ? {
                      ...r,
                      personId: person.id,
                      person: person.name,
                      status: r.status === "no" ? "wait" : r.status,
                    }
                  : r,
              ),
            }
          : t,
      ),
    );
    setPicker(null);
  };

  const clearPerson = (tid: string, rid: string) =>
    updateRole(tid, rid, { personId: undefined, person: "", status: "no" });

  const handleClear = () => {
    if (!picker) return;
    clearPerson(picker.tid, picker.rid);
    setPicker(null);
  };

  // Footer path: spin up a fresh roster record and assign it on the spot.
  const createAndAssign = () => {
    if (!picker) return;
    const p = blankPerson();
    addPerson(p);
    assignPerson(picker.tid, picker.rid, p);
  };

  // Adds one role from a tray chip. Stacking positions renumber the family so a
  // lone one stays bare (BGV) and a second turns the pair into BGV1/BGV2.
  const addPosition = (tid: string, def: PositionDef) =>
    setTeamsStructural(
      svc.teams.map((t) =>
        t.id === tid
          ? {
              ...t,
              roles: withAddedPosition(t.roles, def, (label) => ({
                id: id("r"),
                position: label,
                person: "",
                status: "no" as const,
              })),
            }
          : t,
      ),
    );

  const addRole = (tid: string) =>
    setTeamsStructural(
      svc.teams.map((t) =>
        t.id === tid
          ? { ...t, roles: [...t.roles, { id: id("r"), position: "Role", person: "", status: "no" }] }
          : t,
      ),
    );

  // Removing a slot renumbers any remaining stacked family (BGV1/BGV2/BGV3
  // losing BGV2 becomes BGV1/BGV2; dropping to one loses the number). Only
  // genuine stacking positions renumber, so custom labels like "Vocals 1" are
  // left exactly as typed.
  const removeRole = (tid: string, rid: string) =>
    setTeamsStructural(
      svc.teams.map((t) => {
        if (t.id !== tid) return t;
        const removed = t.roles.find((r) => r.id === rid);
        const remaining = t.roles.filter((r) => r.id !== rid);
        if (!removed) return { ...t, roles: remaining };
        const base = baseLabel(removed.position);
        return {
          ...t,
          roles: isStackingBase(base, positionLibrary)
            ? renumberFamily(remaining, base)
            : remaining,
        };
      }),
    );

  const handleRemoveSlot = () => {
    if (!picker) return;
    removeRole(picker.tid, picker.rid);
    setPicker(null);
  };

  // ---- one-tap presets ----
  // A preset is a fresh starting point for the whole service, not just the
  // band: it REPLACES the band roster with exactly its set, and clears every
  // other canonical section (Tech, Teaching) so nothing stale from a prior
  // plan or template lingers. Same rule as applying a template or "Same as
  // last week" — whatever the starting point doesn't define, it empties.
  const applyPreset = (positionIds: string[]) => {
    const bandTeam = svc.teams.find((t) => t.group === "band");
    if (!bandTeam) return;
    let newRoles: Team["roles"] = [];
    for (const posId of positionIds) {
      const def = positionLibrary.find((p) => p.id === posId);
      if (!def) continue;
      newRoles = withAddedPosition(newRoles, def, (label) => ({
        id: id("r"),
        position: label,
        person: "",
        status: "no" as const,
      }));
    }
    setTeamsStructural(
      svc.teams.map((t) => {
        if (t.group === "band") return { ...t, roles: newRoles };
        if (t.group) return { ...t, roles: [] };
        return t;
      }),
    );
  };

  const applySameAsLastWeek = () => {
    const past = state.services
      .filter((s) => s.id !== svc.id && new Date(s.date + "T00:00:00") < new Date(svc.date + "T00:00:00"))
      .sort((a, b) => new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime());
    const prev = past[0];
    if (!prev) return;
    const clone = (roles: typeof svc.teams[number]["roles"]) => roles.map((r) => ({ ...r, id: id("r") }));
    const nextTeams = svc.teams.map((t) => {
      if (!t.group) return t;
      const prevTeam = prev.teams.find((pt) => pt.group === t.group);
      return prevTeam ? { ...t, roles: clone(prevTeam.roles) } : { ...t, roles: [] };
    });
    setTeamsStructural(nextTeams);
  };

  // ---- "raising up" list mutations (global, not per-service) ----
  const updateBench = (bid: string, fields: Partial<BenchPerson>) =>
    setState((s) => ({
      ...s,
      bench: s.bench.map((b) => (b.id === bid ? { ...b, ...fields } : b)),
    }));

  const addBench = () =>
    setState((s) => ({
      ...s,
      bench: [...s.bench, { id: id("b"), name: "New name", role: "Role", nextStep: "" }],
    }));

  const removeBench = (bid: string) =>
    setState((s) => ({ ...s, bench: s.bench.filter((b) => b.id !== bid) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-coach="team">
      {/* Apply template modal */}
      {applyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-charcoal-100 px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
                Team template
              </h2>
              <p className="mt-0.5 text-xs text-charcoal-400">
                Applying one rebuilds the whole roster to match it. Pick one to switch.
              </p>
            </div>
            <div className="space-y-2 px-5 py-4">
              {teamTemplates.length === 0 ? (
                <p className="text-sm text-charcoal-400">
                  No templates yet.{" "}
                  <Link href="/tools/team" className="font-semibold text-coral-600 hover:underline">
                    Build one in Tools
                  </Link>
                  .
                </p>
              ) : (
                teamTemplates.map((t) => {
                  const selected = svc.appliedTemplateId === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        // Already on this template — nothing to re-apply, so no
                        // stacking. Only switching to a different one rebuilds.
                        if (!selected) applyTeamTemplate(svc.id, t.id);
                        setApplyModal(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                        selected
                          ? "border-coral-400 bg-coral-50 ring-1 ring-coral-400"
                          : "border-charcoal-100 hover:border-coral-300 hover:bg-coral-50"
                      }`}
                    >
                      <Icon
                        name="users"
                        size={18}
                        className={`shrink-0 ${selected ? "text-coral-600" : "text-charcoal-400"}`}
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${selected ? "text-coral-700" : "text-charcoal-800"}`}>
                          {t.name}
                          {t.starred && !selected && (
                            <span className="ml-2 text-[0.6rem] font-bold uppercase text-charcoal-400">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-charcoal-400">
                          {t.slots.length} slot{t.slots.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      {selected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase text-coral-600">
                          <Icon name="check" size={14} /> On
                        </span>
                      ) : (
                        <Icon name="arrowRight" size={15} className="shrink-0 text-charcoal-300" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end border-t border-charcoal-100 px-5 py-3">
              <button
                onClick={() => setApplyModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-charcoal-900">TEAM</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            Your roster for {serviceDisplayTitle(svc)}. Add a role from the tray, then assign each row.
          </p>
        </div>
        {teamTemplates.length > 0 && (() => {
          const applied = teamTemplates.find((t) => t.id === svc.appliedTemplateId);
          return (
            <button
              onClick={() => setApplyModal(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                applied
                  ? "border-coral-400 bg-coral-50 text-coral-600"
                  : "border-charcoal-200 text-charcoal-600 hover:border-coral-300 hover:text-coral-600"
              }`}
            >
              <Icon name="users" size={14} />
              {applied ? applied.name : "Apply template"}
            </button>
          );
        })()}
      </div>

      {/* Start fast — presets */}
      <Card>
        <Label>Start fast</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.positionIds)}
              className="rounded-full border border-charcoal-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={applySameAsLastWeek}
            className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700 transition hover:border-coral-400 hover:bg-coral-50 hover:text-coral-600"
          >
            <Icon name="rotate" size={12} /> Same as last week
          </button>
        </div>
      </Card>

      {/* Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <Label>This {weekdayName(svc.date)}</Label>
          <span className="text-sm text-charcoal-400">{allRoles.length} positions</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-ok-tint py-3">
            <div className="text-2xl font-bold text-ok-ink">{confirmed}</div>
            <div className="text-xs font-medium text-charcoal-600">Confirmed</div>
          </div>
          <button
            onClick={() => awaiting > 0 && setSummaryModal("awaiting")}
            className={`rounded-lg bg-wait-tint py-3 text-center transition ${awaiting > 0 ? "hover:ring-2 hover:ring-wait-ink/40 cursor-pointer" : "cursor-default"}`}
          >
            <div className="text-2xl font-bold text-wait-ink">{awaiting}</div>
            <div className="text-xs font-medium text-charcoal-600">
              Awaiting {awaiting > 0 && <span className="text-wait-ink">→ reach out</span>}
            </div>
          </button>
          <button
            onClick={() => open > 0 && setSummaryModal("open")}
            className={`rounded-lg bg-no-tint py-3 text-center transition ${open > 0 ? "hover:ring-2 hover:ring-no-ink/40 cursor-pointer" : "cursor-default"}`}
          >
            <div className="text-2xl font-bold text-no-ink">{open}</div>
            <div className="text-xs font-medium text-charcoal-600">
              Open {open > 0 && <span className="text-no-ink">→ fill slot</span>}
            </div>
          </button>
        </div>
        <p className="mt-3 text-xs text-charcoal-400">
          Awaiting opens your contact list · Open lets you fill the slot.
        </p>
      </Card>

      {/* Awaiting modal */}
      {summaryModal === "awaiting" && (
        <AwaitingModal
          slots={svc.teams.flatMap((t) =>
            t.roles
              .filter((r) => r.status === "wait")
              .map((r) => ({ teamName: t.name, position: r.position, personId: r.personId, person: r.person })),
          )}
          people={people}
          onClose={() => setSummaryModal(null)}
        />
      )}

      {/* Open positions modal */}
      {summaryModal === "open" && (
        <OpenModal
          slots={svc.teams.flatMap((t) =>
            t.roles
              .filter((r) => r.status === "no")
              .map((r) => ({ tid: t.id, rid: r.id, teamName: t.name, position: r.position })),
          )}
          services={state.services}
          currentTeams={svc.teams}
          targetDate={svc.date}
          currentServiceId={svc.id}
          onAssign={(tid, rid, person) => assignPerson(tid, rid, person)}
          onClose={() => setSummaryModal(null)}
        />
      )}

      {/* Canonical teams — Band, Tech, Teaching, always present and clearly separated */}
      {canonicalTeams.map((team) => (
        <Card key={team.id}>
          <div className="flex items-center gap-2">
            <Icon name={GROUP_META[team.group!].icon} size={16} className="text-charcoal-400" />
            <Label>{GROUP_META[team.group!].label}</Label>
            <span className="ml-auto text-xs text-charcoal-400">
              {team.roles.length} position{team.roles.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-3">
            <PositionTray
              group={team.group!}
              onAdd={(def) => addPosition(team.id, def)}
            />
          </div>

          <div className="mt-4 space-y-2">
            {team.roles.length === 0 && (
              <p className="text-sm text-charcoal-400">No one here yet. Add a role from the tray above.</p>
            )}
            {team.roles.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-charcoal-100 bg-cream-100 px-2 py-2"
              >
                <button
                  onClick={() => setPicker({ tid: team.id, rid: r.id })}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-white/70"
                >
                  <span className="w-[4.5rem] shrink-0 truncate text-sm font-bold text-charcoal-800">
                    {r.position}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                      r.personId ? "text-charcoal-800" : "text-coral-600"
                    }`}
                  >
                    {r.personId ? resolveName(r, people) : "Assign"}
                  </span>
                </button>
                <button
                  onClick={() => cycleStatus(team.id, r.id, r.status)}
                  className="flex min-h-11 shrink-0 items-center px-1"
                  title="Change status"
                >
                  <Pill status={r.status} />
                </button>
                <button
                  onClick={() => removeRole(team.id, r.id)}
                  aria-label={`Remove ${r.position}`}
                  title="Remove position"
                  className="flex min-h-11 min-w-8 shrink-0 items-center justify-center text-charcoal-300 transition hover:text-error"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Ad-hoc teams — anything beyond Band/Tech/Teaching, freeform as before */}
      {adHocTeams.map((team) => (
        <Card key={team.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2.5">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <EditableText
                value={team.name}
                onCommit={(v) => renameTeam(team.id, v)}
                className="max-w-xs font-semibold"
              />
            </div>
            <button
              onClick={() => removeTeam(team.id)}
              className="shrink-0 text-xs font-semibold text-charcoal-400 hover:text-error"
            >
              Remove
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {team.roles.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2.5"
              >
                <div className="min-w-[8rem] flex-1">
                  <EditableText
                    value={r.position}
                    onCommit={(v) => updateRole(team.id, r.id, { position: v })}
                    placeholder="Position"
                  />
                </div>
                <div className="flex min-w-[8rem] flex-1 items-center gap-1">
                  {r.personId ? (
                    <>
                      <button
                        onClick={() => setPicker({ tid: team.id, rid: r.id })}
                        className="min-h-11 min-w-0 flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-semibold text-charcoal-800 transition hover:bg-cream-200 lg:min-h-0"
                        title="Swap person"
                      >
                        {resolveName(r, people)}
                      </button>
                      <button
                        onClick={() => clearPerson(team.id, r.id)}
                        className="flex min-h-11 min-w-8 shrink-0 items-center justify-center text-charcoal-300 transition hover:text-error lg:min-h-0 lg:min-w-0"
                        title="Clear assignment"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setPicker({ tid: team.id, rid: r.id })}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-coral-600 transition hover:bg-coral-100 lg:min-h-0"
                    >
                      <Icon name="plus" size={14} /> Assign
                    </button>
                  )}
                </div>
                <button
                  onClick={() => cycleStatus(team.id, r.id, r.status)}
                  className="flex min-h-11 shrink-0 items-center lg:min-h-0"
                  title="Change status"
                >
                  <Pill status={r.status} />
                </button>
                <button
                  onClick={() => removeRole(team.id, r.id)}
                  className="shrink-0 text-charcoal-300 transition hover:text-error"
                  title="Remove position"
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addRole(team.id)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600 hover:underline"
          >
            <Icon name="plus" size={14} /> Add a position
          </button>
        </Card>
      ))}

      <button
        onClick={addTeam}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-charcoal-200 py-3 text-sm font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
      >
        <Icon name="plus" size={15} /> Add an extra team
      </button>

      {/* Who you're raising up — quick list; opens the full Leader Track. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Who you&rsquo;re raising up</Label>
          <Link
            href="/growth/leaders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:underline"
          >
            Open the Leader Track <Icon name="arrowRight" size={13} />
          </Link>
        </div>
        <p className="mt-1 text-xs text-charcoal-400">
          People you&apos;re developing toward leading. Carried across every Sunday.
        </p>

        <div className="mt-4 space-y-2">
          {state.bench.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2.5"
            >
              <div className="min-w-[7rem] flex-1">
                <EditableText
                  value={b.name}
                  onCommit={(v) => updateBench(b.id, { name: v })}
                  placeholder="Name"
                />
              </div>
              <div className="min-w-[7rem] flex-1">
                <EditableText
                  value={b.role}
                  onCommit={(v) => updateBench(b.id, { role: v })}
                  placeholder="Role"
                />
              </div>
              <div className="min-w-[10rem] flex-[2]">
                <EditableText
                  value={b.nextStep}
                  onCommit={(v) => updateBench(b.id, { nextStep: v })}
                  placeholder="Next step"
                />
              </div>
              <button
                onClick={() => removeBench(b.id)}
                className="shrink-0 text-charcoal-300 transition hover:text-error"
                title="Remove"
              >
                <Icon name="x" size={15} />
              </button>
            </div>
          ))}
          {state.bench.length === 0 && (
            <p className="text-sm text-charcoal-400">No one yet. Start raising someone up.</p>
          )}
        </div>

        <button
          onClick={addBench}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
        >
          <Icon name="plus" size={14} /> Add someone
        </button>
      </Card>

      <PersonPicker
        open={picker !== null}
        position={pickerSlot?.position}
        isAssigned={!!pickerSlot?.personId}
        onClose={() => setPicker(null)}
        onPick={(person) => picker && assignPerson(picker.tid, picker.rid, person)}
        onCreateBlank={createAndAssign}
        onClear={handleClear}
        onRemoveSlot={handleRemoveSlot}
      />
    </div>
  );
}
