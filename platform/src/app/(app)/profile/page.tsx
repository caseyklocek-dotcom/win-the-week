"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, Label } from "@/components/ui";
import { EditableText } from "@/components/fields";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PLAN_META, trialDaysLeft } from "@/lib/plan";
import { profileMode, isAccountAdmin } from "@/lib/mode";
import { myLeaderTrack } from "@/lib/leaders";
import type { PlanTier, Profile, ServiceType } from "@/lib/types";

// Move an item within an array from one index to another.
function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

const ALL_CARDS: { id: string; label: string }[] = [
  { id: "nextSunday", label: "Upcoming service" },
  { id: "progress", label: "Pray · Plan · Prep" },
  { id: "team", label: "Team this Sunday" },
  { id: "set", label: "The set" },
  { id: "capacity", label: "Your capacity" },
  { id: "goals", label: "Quarterly goals" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Service start times, 15-minute increments, 6:00am-9:00pm — covers every
// early/contemporary/evening service a church realistically runs.
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 15, 30, 45]) {
      if (h === 21 && m > 0) break;
      const period = h < 12 ? "am" : "pm";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${h12}:${String(m).padStart(2, "0")}${period}`);
    }
  }
  return out;
})();

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern — New York" },
  { value: "America/Chicago", label: "Central — Chicago" },
  { value: "America/Denver", label: "Mountain — Denver" },
  { value: "America/Phoenix", label: "Mountain, no DST — Phoenix" },
  { value: "America/Los_Angeles", label: "Pacific — Los Angeles" },
  { value: "America/Anchorage", label: "Alaska — Anchorage" },
  { value: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
];

export default function ProfilePage() {
  const { state, setState, resetDemo, resetFresh, setOnboarded } = useStore();
  const auth = useAuth();
  const profile = state.profile;
  const fileRef = useRef<HTMLInputElement>(null);

  const patchProfile = (fields: Partial<Profile>) =>
    setState((s) => ({ ...s, profile: { ...s.profile, ...fields } }));

  const serviceTypes: ServiceType[] = profile.serviceTypes?.length
    ? profile.serviceTypes
    : [
        {
          id: "styp-primary",
          name: "Sunday Service",
          day: profile.serviceDay,
          time: profile.serviceTime,
          timezone: profile.timezone,
        },
      ];

  // Keep the legacy serviceDay/serviceTime/timezone fields mirrored to the
  // first service type — a few surfaces (dashboard, reports, packets) still
  // read those directly for the leader's primary service.
  const patchServiceTypes = (next: ServiceType[]) => {
    const primary = next[0];
    patchProfile({
      serviceTypes: next,
      ...(primary
        ? { serviceDay: primary.day, serviceTime: primary.time, timezone: primary.timezone }
        : {}),
    });
  };

  const updateServiceType = (id: string, fields: Partial<ServiceType>) =>
    patchServiceTypes(serviceTypes.map((st) => (st.id === id ? { ...st, ...fields } : st)));

  const addServiceType = () => {
    const n = serviceTypes.length + 1;
    patchServiceTypes([
      ...serviceTypes,
      {
        id: `styp-${Math.random().toString(36).slice(2, 9)}`,
        name: `Service ${n}`,
        day: serviceTypes[0]?.day || "Sunday",
        time: "",
        timezone: serviceTypes[0]?.timezone || "America/Chicago",
      },
    ]);
  };

  const removeServiceType = (id: string) => {
    if (serviceTypes.length <= 1) return;
    patchServiceTypes(serviceTypes.filter((st) => st.id !== id));
  };

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchProfile({ photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  // Dashboard cards: enabled (in order) + the rest disabled
  const enabled = (profile.dashboardCards?.length
    ? profile.dashboardCards
    : ALL_CARDS.map((c) => c.id)
  ).filter((id) => ALL_CARDS.some((c) => c.id === id));
  const disabled = ALL_CARDS.map((c) => c.id).filter((id) => !enabled.includes(id));

  const setCards = (next: string[]) => patchProfile({ dashboardCards: next });

  const toggleCard = (id: string) =>
    enabled.includes(id)
      ? setCards(enabled.filter((x) => x !== id))
      : setCards([...enabled, id]);

  const labelFor = (id: string) => ALL_CARDS.find((c) => c.id === id)?.label ?? id;

  // ---- drag-and-drop reordering ----
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const onDrop = (to: number) => {
    if (dragIdx !== null && dragIdx !== to) setCards(reorder(enabled, dragIdx, to));
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="headline text-charcoal-900">YOUR PROFILE</h1>
        <p className="mt-1 text-sm text-charcoal-400">
          Your details, church, service rhythm, and how your dashboard is arranged.
        </p>
      </div>

      {/* Identity */}
      <Card data-tour="profile">
        <Label>You</Label>
        <div className="mt-4 flex items-start gap-5">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-charcoal-800 text-xl font-bold text-white dark:bg-coral-500">
              {profile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs font-semibold text-coral-600 hover:underline"
            >
              {profile.photo ? "Change" : "Add photo"}
            </button>
            {profile.photo && (
              <button
                onClick={() => patchProfile({ photo: null })}
                className="text-xs text-charcoal-400 hover:text-error"
              >
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPhoto}
              className="hidden"
            />
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <EditableText value={profile.name} onCommit={(v) => patchProfile({ name: v })} />
            </Field>
            <Field label="Role">
              <EditableText value={profile.role} onCommit={(v) => patchProfile({ role: v })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Church">
                <EditableText
                  value={profile.churchName}
                  onCommit={(v) => patchProfile({ churchName: v })}
                />
              </Field>
            </div>
          </div>
        </div>
      </Card>

      {/* Services */}
      <Card>
        <Label>Services</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          Add a row for every service your church runs — an early service, a contemporary
          service, a Saturday night. One is plenty if you only lead one.
        </p>
        <div className="mt-4 space-y-3">
          {serviceTypes.map((st) => (
            <div key={st.id} className="rounded-lg border border-charcoal-100 bg-cream-100 p-3">
              <div className="flex items-start gap-3">
                <div className="grid flex-1 gap-2.5 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Field label="Name">
                      <EditableText
                        value={st.name}
                        onCommit={(v) => updateServiceType(st.id, { name: v })}
                        placeholder="e.g. Sunday Early"
                      />
                    </Field>
                  </div>
                  <Field label="Day">
                    <select
                      value={st.day}
                      onChange={(e) => updateServiceType(st.id, { day: e.target.value })}
                      className="w-full rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time">
                    <select
                      value={st.time}
                      onChange={(e) => updateServiceType(st.id, { time: e.target.value })}
                      className="w-full rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                    >
                      {!TIME_OPTIONS.includes(st.time) && st.time && (
                        <option value={st.time}>{st.time}</option>
                      )}
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {serviceTypes.length > 1 && (
                  <button
                    onClick={() => removeServiceType(st.id)}
                    className="mt-6 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-charcoal-300 transition hover:bg-white hover:text-error"
                    title="Remove this service"
                    aria-label={`Remove ${st.name || "this service"}`}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              <div className="mt-2.5 max-w-[280px]">
                <Field label="Timezone">
                  <select
                    value={st.timezone}
                    onChange={(e) => updateServiceType(st.id, { timezone: e.target.value })}
                    className="w-full rounded-lg border border-charcoal-100 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800 outline-none focus:border-coral-400"
                  >
                    {!TIMEZONE_OPTIONS.some((tz) => tz.value === st.timezone) && st.timezone && (
                      <option value={st.timezone}>{st.timezone}</option>
                    )}
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addServiceType}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-charcoal-200 py-2.5 text-sm font-semibold text-charcoal-400 transition hover:border-coral-400 hover:text-coral-600"
        >
          <Icon name="plus" size={14} /> Add another service
        </button>
        {serviceTypes.length > 1 && (
          <p className="mt-3 text-xs text-charcoal-400">
            Each week you&rsquo;ll be able to switch between these and copy the set list over
            without dragging the wrong volunteer along — team assignments always start
            unassigned on a new service.
          </p>
        )}
      </Card>

      {/* How you plan */}
      <Card>
        <Label>How you like to plan</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          This sets what &ldquo;Plan this service&rdquo; opens and how much the app coaches you.
        </p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {(
            [
              {
                m: "guided" as const,
                title: "Guided",
                desc: "Step-by-step through Pray · Plan · Prep, with coaching along the way.",
              },
              {
                m: "fast" as const,
                title: "Fast",
                desc: "The 15-minute plan — one screen, keyboard-first, no hand-holding.",
              },
            ]
          ).map(({ m, title, desc }) => {
            const on = profileMode(profile) === m;
            return (
              <button
                key={m}
                onClick={() => patchProfile({ mode: m })}
                aria-pressed={on}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  on
                    ? "border-coral-400 bg-coral-50"
                    : "border-charcoal-100 hover:border-charcoal-200 hover:bg-cream-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-charcoal-900">{title}</span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      on ? "border-coral-500 bg-coral-500" : "border-charcoal-200"
                    }`}
                  >
                    {on && <Icon name="check" size={10} strokeWidth={3} className="text-white" />}
                  </span>
                </div>
                <p className="mt-1 text-xs text-charcoal-500">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 border-t border-charcoal-100 pt-4" />
        <button
          onClick={() => patchProfile({ planningCenterMode: !profile.planningCenterMode })}
          className="flex w-full items-center justify-between gap-4 text-left"
          role="switch"
          aria-checked={profile.planningCenterMode === true}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-charcoal-800">
              I schedule in Planning Center
            </div>
            <p className="mt-0.5 text-xs text-charcoal-400">
              Win the Week keeps the heart, prep, songs, and growth; Planning Center keeps the
              scheduling. Team, Send, and Packet step aside until you turn this off.
            </p>
          </div>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              profile.planningCenterMode ? "bg-coral-500" : "bg-charcoal-100"
            }`}
            aria-hidden
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all ${
                profile.planningCenterMode ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      </Card>

      {/* Your role — preview control until real per-person logins ship */}
      <Card>
        <Label>Your role</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          Preview what each access level sees. Real invites for other leaders on your team are
          coming — for now, switch roles here to see the Account Admin experience.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              {
                r: "holder" as const,
                title: "Account Holder",
                desc: "Unrestricted. Sees everyone's Leader Track, goals, and Compass.",
              },
              {
                r: "admin" as const,
                title: "Account Admin",
                desc: "Full planning, team, and admin tools. Invest stays hidden until sent and unlocked.",
              },
            ]
          ).map(({ r, title, desc }) => {
            const on = (profile.accountRole ?? "holder") === r;
            return (
              <button
                key={r}
                onClick={() => patchProfile({ accountRole: r })}
                aria-pressed={on}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  on
                    ? "border-teal-400 bg-teal-50"
                    : "border-charcoal-100 hover:border-charcoal-200 hover:bg-cream-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-charcoal-900">{title}</span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                      on ? "border-teal-500 bg-teal-500" : "border-charcoal-200"
                    }`}
                  >
                    {on && <Icon name="check" size={10} strokeWidth={3} className="text-white" />}
                  </span>
                </div>
                <p className="mt-1 text-xs text-charcoal-500">{desc}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Dashboard customization */}
      <Card>
        <Label>Dashboard layout</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          Choose which cards show on your dashboard. Drag the handle to reorder them.
        </p>

        <div className="mt-4 space-y-2">
          {enabled.map((id, idx) => {
            const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
            const isDragging = dragIdx === idx;
            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => {
                  setDragIdx(idx);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIdx(idx);
                }}
                onDrop={() => onDrop(idx)}
                onDragEnd={() => {
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={`flex items-center gap-3 rounded-lg border bg-cream-100 px-3 py-2.5 transition ${
                  isOver
                    ? "border-coral-400 ring-1 ring-coral-300"
                    : "border-charcoal-100"
                } ${isDragging ? "opacity-50" : ""}`}
              >
                <span className="cursor-grab text-charcoal-300 active:cursor-grabbing" title="Drag to reorder">
                  <Icon name="grip" size={16} />
                </span>
                <span className="flex-1 text-sm font-semibold text-charcoal-800">
                  {labelFor(id)}
                </span>
                <button
                  onClick={() => toggleCard(id)}
                  className="text-xs font-semibold text-charcoal-400 hover:text-error"
                >
                  Hide
                </button>
              </div>
            );
          })}
        </div>

        {disabled.length > 0 && (
          <div className="mt-4">
            <div className="label mb-2 text-charcoal-400">Hidden</div>
            <div className="flex flex-wrap gap-2">
              {disabled.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleCard(id)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-charcoal-200 px-3 py-1.5 text-xs font-semibold text-charcoal-500 transition hover:border-coral-400 hover:text-coral-600"
                >
                  <Icon name="plus" size={13} /> {labelFor(id)}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Guided setup */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Label>Guided setup</Label>
            <p className="mt-1 text-xs text-charcoal-400">
              Walk through each step when you set up a new service. Turn it off to drop
              straight into the plan.
            </p>
          </div>
          {(() => {
            const on = profile.guidedSetup ?? true;
            return (
              <button
                onClick={() => patchProfile({ guidedSetup: !on })}
                role="switch"
                aria-checked={on}
                title={on ? "Guided setup is on" : "Guided setup is off"}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-coral-500" : "bg-charcoal-200"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`}
                />
              </button>
            );
          })()}
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <Label>Appearance</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          Light, dark, or follow your device. Your choice is saved on this device.
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </Card>

      {/* Plan */}
      <PlanCard
        tier={state.plan?.tier ?? "beta"}
        daysLeft={trialDaysLeft(state.plan)}
        onSwitch={(tier) =>
          setState((s) => ({ ...s, plan: { ...(s.plan ?? { tier }), tier } }))
        }
      />

      {/* Account */}
      {auth.enabled && auth.user && (
        <Card>
          <Label>Account</Label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-charcoal-700">
              Signed in as <span className="font-semibold">{auth.user.email}</span>
            </p>
            <button
              onClick={() => auth.signOut()}
              className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
            >
              Sign out
            </button>
          </div>
        </Card>
      )}

      {/* Beta controls */}
      <Card>
        <Label>Beta &amp; data</Label>
        <p className="mt-1 text-xs text-charcoal-400">
          This is a free beta. Everything you change is saved in this browser only.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setOnboarded(false)}
            className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-coral-400 hover:text-coral-600"
          >
            Replay the tour
          </button>
          <button
            onClick={() => {
              if (confirm("Start fresh? This clears everything in this browser and gives you a clean, empty Sunday.")) resetFresh();
            }}
            className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-error hover:text-error"
          >
            Start fresh (clear my data)
          </button>
          <button
            onClick={() => {
              if (confirm("Load the sample data? This replaces what's in this browser with an example church to explore.")) resetDemo();
            }}
            className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
          >
            Load sample data
          </button>
        </div>
      </Card>
    </div>
  );
}

// Current plan + switch. During the free beta the switch is honor-system and
// instant; Stripe enforcement replaces these buttons when billing goes live.
function PlanCard({
  tier,
  daysLeft,
  onSwitch,
}: {
  tier: PlanTier;
  daysLeft: number | null;
  onSwitch: (tier: PlanTier) => void;
}) {
  const meta = PLAN_META[tier];
  return (
    <Card>
      <Label>Plan</Label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-charcoal-700">
            You&rsquo;re on <span className="font-semibold">{meta.name}</span>
            <span className="text-charcoal-400"> · {meta.price}</span>
            {daysLeft !== null && (
              <span className="text-charcoal-400"> · {daysLeft} trial days left</span>
            )}
          </p>
          <p className="mt-1 text-xs text-charcoal-400">{meta.blurb}</p>
        </div>
        {tier === "base" && (
          <button
            onClick={() => onSwitch("advanced")}
            className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
          >
            Upgrade to Advanced
          </button>
        )}
        {tier === "advanced" && (
          <button
            onClick={() => onSwitch("base")}
            className="rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
          >
            Switch to Base
          </button>
        )}
      </div>
      {tier !== "beta" && (
        <p className="mt-2 text-xs text-charcoal-400">
          Nothing is billed during the free beta. Billing begins when the beta ends, and early
          accounts keep a founder rate.
        </p>
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
