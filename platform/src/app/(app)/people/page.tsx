"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { blankPerson } from "@/lib/people";
import { RolePicker } from "@/components/RolePicker";
import type { Person } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NewPersonModal({
  onDone,
  onCancel,
}: {
  onDone: (fields: {
    name: string;
    roles: string[];
    mainRole: string | undefined;
    email: string;
    phone: string;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [mainRole, setMainRole] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const handleDone = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      nameRef.current?.focus();
      return;
    }
    onDone({
      name: trimmed,
      roles,
      mainRole,
      email: email.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-charcoal-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-charcoal-800">
            New Person
          </h2>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <Label>Name *</Label>
            <input
              ref={nameRef}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDone()}
              placeholder="Full name"
              className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
            />
          </div>
          <div>
            <Label>Roles / instruments</Label>
            <div className="mt-2">
              <RolePicker
                roles={roles}
                main={mainRole}
                onChange={(r, m) => {
                  setRoles(r);
                  setMainRole(m);
                }}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Email</Label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                type="email"
                className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                type="tel"
                className="mt-1 w-full rounded-lg border border-charcoal-200 bg-cream-50 px-3 py-2 text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400 focus:border-coral-400"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-charcoal-100 px-6 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const { state, people, addPerson, updatePerson, removePerson } = useStore();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // How many service role slots currently reference each person.
  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const svc of state.services) {
      for (const team of svc.teams) {
        for (const slot of team.roles) {
          if (slot.personId) counts[slot.personId] = (counts[slot.personId] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [state.services]);

  const results = useMemo(() => {
    const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
    const term = q.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((p) =>
      (p.name + " " + p.roles.join(" ")).toLowerCase().includes(term),
    );
  }, [q, people]);

  const handleModalDone = (fields: {
    name: string;
    roles: string[];
    mainRole: string | undefined;
    email: string;
    phone: string;
  }) => {
    const p = { ...blankPerson(), ...fields };
    addPerson(p);
    setQ("");
    setOpenId(p.id);
    setShowModal(false);
  };

  const activeCount = people.filter((p) => p.active).length;

  return (
    <>
    {showModal && (
      <NewPersonModal
        onDone={handleModalDone}
        onCancel={() => setShowModal(false)}
      />
    )}
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-charcoal-900">PEOPLE</h1>
          <p className="mt-1 text-sm text-charcoal-400">
            Your team roster. Everyone in one place, ready to assign to any Sunday.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-charcoal-500">
          <span className="flex items-center gap-1.5">
            <Icon name="users" size={16} /> {people.length} people
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="heart" size={16} /> {activeCount} serving
          </span>
        </div>
      </div>

      {/* Search + add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-charcoal-200 bg-white px-3 py-2 focus-within:border-coral-400">
          <Icon name="users" size={16} className="text-charcoal-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your roster…"
            className="w-full bg-transparent text-sm text-charcoal-800 outline-none placeholder:text-charcoal-400"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
        >
          <Icon name="plus" size={16} /> New person
        </button>
      </div>

      {people.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-charcoal-500">
            Nobody here yet. Add your first team member, or assign people on a service and
            they&apos;ll land here automatically.
          </p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="text-center">
          <p className="text-sm text-charcoal-400">No one matches that search.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {results.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              uses={usage[person.id] ?? 0}
              open={openId === person.id}
              onToggle={() =>
                setOpenId((id) => (id === person.id ? null : person.id))
              }
              onUpdate={(fields) => updatePerson(person.id, fields)}
              onRemove={() => {
                removePerson(person.id);
                setOpenId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function PersonRow({
  person,
  uses,
  open,
  onToggle,
  onUpdate,
  onRemove,
}: {
  person: Person;
  uses: number;
  open: boolean;
  onToggle: () => void;
  onUpdate: (fields: Partial<Person>) => void;
  onRemove: () => void;
}) {
  // Local draft — only committed when Save is clicked.
  const [draft, setDraft] = useState({
    name: person.name,
    roles: person.roles,
    mainRole: person.mainRole,
    email: person.email ?? "",
    phone: formatPhone(person.phone ?? ""),
    notes: person.notes ?? "",
    active: person.active,
  });
  const [saved, setSaved] = useState(false);

  // Re-sync if the upstream person changes (e.g. added via modal).
  useEffect(() => {
    setDraft({
      name: person.name,
      roles: person.roles,
      mainRole: person.mainRole,
      email: person.email ?? "",
      phone: formatPhone(person.phone ?? ""),
      notes: person.notes ?? "",
      active: person.active,
    });
  }, [person]);

  const handleSave = () => {
    onUpdate({
      name: draft.name,
      roles: draft.roles,
      mainRole: draft.mainRole,
      email: draft.email,
      phone: draft.phone,
      notes: draft.notes,
      active: draft.active,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 p-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
            person.active
              ? "bg-charcoal-800 text-white dark:bg-coral-500"
              : "bg-cream-200 text-charcoal-400"
          }`}
        >
          {initials(person.name) || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-charcoal-800">
              {person.name}
            </span>
            {!person.active && (
              <span className="rounded-full bg-cream-200 px-2 py-0.5 text-[0.65rem] font-semibold text-charcoal-400">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-charcoal-400">
            <span className="inline-flex items-center gap-1">
              {person.mainRole && (
                <Icon name="star" size={11} className="text-coral-500" />
              )}
              {person.roles.length > 0
                ? [
                    person.mainRole,
                    ...person.roles.filter((r) => r !== person.mainRole),
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "No roles yet"}
            </span>
            <span>·</span>
            <span>
              {uses > 0 ? `In ${uses} service${uses === 1 ? "" : "s"}` : "Not scheduled"}
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-charcoal-500 transition hover:bg-cream-200 hover:text-charcoal-800"
        >
          {open ? "Close" : "Edit"}
          <Icon name="chevronDown" size={14} className={open ? "rotate-180" : ""} />
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-charcoal-100 p-4">
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2 text-sm text-charcoal-800 outline-none transition focus:border-coral-400 focus:bg-white"
            />
          </Field>

          <Field label="Roles / instruments">
            <div className="mt-1">
              <RolePicker
                roles={draft.roles}
                main={draft.mainRole}
                onChange={(r, m) => setDraft((d) => ({ ...d, roles: r, mainRole: m }))}
              />
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <input
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="name@email.com"
                type="email"
                className="w-full rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2 text-sm text-charcoal-800 outline-none transition focus:border-coral-400 focus:bg-white"
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhone(e.target.value) }))}
                placeholder="(555) 123-4567"
                type="tel"
                className="w-full rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2 text-sm text-charcoal-800 outline-none transition focus:border-coral-400 focus:bg-white"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Strengths, availability, what they're growing in…"
              rows={2}
              className="w-full resize-none rounded-lg border border-charcoal-100 bg-cream-100 px-3 py-2 text-sm text-charcoal-800 outline-none transition focus:border-coral-400 focus:bg-white"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-charcoal-600">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              className="h-4 w-4 rounded border-charcoal-200 text-coral-500 focus:ring-coral-400"
            />
            Currently serving on the team
          </label>

          <div className="flex items-center justify-between border-t border-charcoal-100 pt-3">
            <div className="flex items-center gap-3">
              <Link
                href="/team"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
              >
                Assign on a service <Icon name="arrowRight" size={13} />
              </Link>
              <button
                onClick={onRemove}
                className="text-xs font-semibold text-charcoal-400 transition hover:text-error"
              >
                Remove
              </button>
            </div>
            <button
              onClick={handleSave}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                saved
                  ? "bg-[#e7f4ee] text-[#2f7d5b]"
                  : "bg-coral-500 text-white shadow-[var(--shadow-coral)] hover:bg-coral-600"
              }`}
            >
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
