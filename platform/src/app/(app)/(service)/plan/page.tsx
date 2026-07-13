"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, Label, Pill, KeyBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { EditableText, Segmented } from "@/components/fields";
import { PlanRail } from "@/components/PlanRail";
import { fmtDuration, weekdayName } from "@/lib/music";
import { sectionSongIds, serviceSetDurationSec } from "@/lib/set";
import type { CapacityLevel, PrepStatus, Service } from "@/lib/types";
import { lastSundayNote } from "@/lib/reflect";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "pray", label: "Pray" },
  { id: "prep", label: "Prep" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// Old deep links (home loop nodes, the tour, the coach) used tab ids that no
// longer exist — the work moved to /set, /team, and /send, and the 5-hour
// schedule folded into Overview. Land those links safely.
const LEGACY_TABS: Record<string, TabId> = { plan: "overview", schedule: "overview" };

const TYPE_COLOR: Record<string, string> = {
  pray: "#3d9970",
  plan: "#ff6b5e",
  prep: "#2e2e2e",
  admin: "#b9711d",
};

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="text-charcoal-400">Loading…</div>}>
      <PlanInner />
    </Suspense>
  );
}

function PlanInner() {
  const { state, activeService: svc, updateService, setState } = useStore();
  const params = useSearchParams();
  const [tab, setTab] = useState<TabId>("overview");
  const [showSetup, setShowSetup] = useState(false);

  // React to the URL — the coach navigates to /plan?tab=… to land you on a tab.
  useEffect(() => {
    const p = params.get("tab");
    if (!p) return;
    if (TABS.some((t) => t.id === p)) setTab(p as TabId);
    else if (LEGACY_TABS[p]) setTab(LEGACY_TABS[p]);
  }, [params]);
  useEffect(() => {
    if (params.get("setup") === "new" && (state.profile.guidedSetup ?? true)) setShowSetup(true);
  }, [params, state.profile.guidedSetup]);

  const patch = (fn: (s: Service) => Service) => updateService(svc.id, fn);
  const disableGuide = () =>
    setState((s) => ({ ...s, profile: { ...s.profile, guidedSetup: false } }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-3xl text-charcoal-900">Plan a Service</h1>
          <p className="mt-1 text-charcoal-400">
            {svc.title} · Pray, then plan, then prep. One loop, every week.
          </p>
        </div>
        <Link
          href="/quick"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600 hover:underline"
        >
          <Icon name="sparkle" size={14} /> In a hurry? The 15-minute plan
        </Link>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-charcoal-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? "border-coral-500 text-coral-600"
                : "border-transparent text-charcoal-400 hover:text-charcoal-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <WithRail>
          <Overview svc={svc} patch={patch} setTab={setTab} services={state.services} />
        </WithRail>
      )}
      {tab === "pray" && <Pray svc={svc} patch={patch} services={state.services} />}
      {tab === "prep" && <Prep svc={svc} patch={patch} />}

      {showSetup && (
        <NewServiceSetup
          svc={svc}
          patch={patch}
          onClose={() => setShowSetup(false)}
          onTurnOff={() => {
            disableGuide();
            setShowSetup(false);
          }}
        />
      )}
    </div>
  );
}

function WithRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">{children}</div>
      <PlanRail />
    </div>
  );
}

// ---------------- Overview ----------------
// The command center for this Sunday: the heart, the single next move, the
// Pray/Plan/Prep spine, and a readiness snapshot that links into each tab.
function Overview({
  svc,
  patch,
  setTab,
  services,
}: {
  svc: Service;
  patch: (fn: (s: Service) => Service) => void;
  setTab: (id: TabId) => void;
  services: Service[];
}) {
  const cycle: Record<PrepStatus, PrepStatus> = { todo: "doing", doing: "done", done: "todo" };
  const stages = [
    { key: "pray", label: "Pray", desc: "The heart and the people" },
    { key: "plan", label: "Plan", desc: "The work of the service" },
    { key: "prep", label: "Prep", desc: "Execution and the close" },
  ] as const;

  // Readiness numbers, pulled live from the service.
  const roles = svc.teams.flatMap((t) => t.roles);
  const confirmed = roles.filter((r) => r.status === "ok").length;
  const awaiting = roles.filter((r) => r.status === "wait").length;
  const openRoles = roles.filter((r) => r.status === "no").length;
  const songCount = svc.setSections.reduce((n, s) => n + sectionSongIds(s).length, 0);
  const totalSec = serviceSetDurationSec(svc);
  // Comms now run through the Send board: personal packet links per person.
  const assignedCount = new Set(
    roles.filter((r) => r.person.trim() || r.personId).map((r) => r.personId ?? r.person.trim().toLowerCase()),
  ).size;
  const sentCount = Object.keys(svc.sentPackets ?? {}).length;
  const unsent = Math.max(0, assignedCount - sentCount);
  const lastNote = lastSundayNote(services, svc.date);

  // The single most useful next move. First unmet thing wins.
  const next: { text: string; cta: string; go: () => void } | null = openRoles
    ? {
        text: `${openRoles} ${openRoles === 1 ? "role" : "roles"} still need someone.`,
        cta: "Assign the team",
        go: () => (window.location.href = "/team"),
      }
    : songCount === 0
      ? {
          text: "No songs in the set yet.",
          cta: "Build the set",
          go: () => (window.location.href = "/set"),
        }
      : unsent > 0
        ? {
            text: `${unsent} ${unsent === 1 ? "person hasn't" : "people haven't"} gotten their link yet.`,
            cta: "Send the week",
            go: () => (window.location.href = "/send"),
          }
        : awaiting
          ? {
              text: `${awaiting} ${awaiting === 1 ? "person" : "people"} still to confirm.`,
              cta: "Follow up with the team",
              go: () => (window.location.href = "/team"),
            }
          : svc.status.prep !== "done"
            ? {
                text: "Set and team are ready. Lock in the details.",
                cta: "Finish prep",
                go: () => setTab("prep"),
              }
            : null;

  const stageDone = (["pray", "plan", "prep"] as const).filter(
    (k) => svc.status[k] === "done",
  ).length;

  return (
    <div className="space-y-5">
      {/* ── The one move. Everything else folds below it. ───────────── */}
      {next ? (
        <Card className="border-coral-300 bg-gradient-to-br from-white to-coral-100/50">
          <Label>Your next step</Label>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <p className="text-lg font-semibold text-charcoal-900">{next.text}</p>
            <button
              onClick={next.go}
              className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              {next.cta}
              <Icon name="arrowRight" size={15} />
            </button>
          </div>
        </Card>
      ) : (
        <Card className="border-ok-border bg-ok-tint/50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok-bar text-white">
              <Icon name="check" size={18} />
            </span>
            <div>
              <p className="text-lg font-semibold text-charcoal-900">You&rsquo;re ready for Sunday.</p>
              <p className="text-sm text-charcoal-500">Set, team, and comms are all locked. Rest well.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Last Sunday speaks first ─────────────────────────────────── */}
      {lastNote && (
        <div className="border-l-2 border-coral-400 pl-4">
          <Label>From last Sunday</Label>
          <p className="editorial mt-1 text-[15px] text-charcoal-700">
            &ldquo;{lastNote.note}&rdquo;
          </p>
        </div>
      )}

      {/* ── The heart — edited right here, no hunting. ──────────────── */}
      <div className="rounded-xl border border-charcoal-100 bg-cream-200/40 p-4">
        <Label>The heart of this {weekdayName(svc.date)}</Label>
        <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-charcoal-500">Theme</div>
            <EditableText
              value={svc.theme}
              onCommit={(v) => patch((p) => ({ ...p, theme: v }))}
              placeholder="Set a theme"
            />
            <div className="mt-2 text-xs font-semibold text-charcoal-500">Scripture</div>
            <EditableText
              value={svc.scripture}
              onCommit={(v) => patch((p) => ({ ...p, scripture: v }))}
              placeholder="e.g. Psalm 119:105"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-charcoal-500">The one takeaway</div>
            <EditableText
              multiline
              value={svc.oneThing}
              onCommit={(v) => patch((p) => ({ ...p, oneThing: v }))}
              placeholder="If they remember one sentence…"
            />
          </div>
        </div>
      </div>

      {/* ── One status strip: the loop + where it stands. ──────────── */}
      <Card>
        <div className="flex items-center justify-between">
          <Label>The loop</Label>
          <span className="text-xs font-medium text-charcoal-400">{stageDone} of 3 done</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {stages.map((s) => (
            <button
              key={s.key}
              onClick={() =>
                patch((p) => ({
                  ...p,
                  status: { ...p.status, [s.key]: cycle[p.status[s.key]] },
                }))
              }
              title="Click to advance"
              className="inline-flex items-center gap-2 rounded-full border border-charcoal-100 py-1 pl-2.5 pr-1.5 transition hover:border-coral-300"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[s.key] }} />
              <span className="text-sm font-semibold text-charcoal-800">{s.label}</span>
              <Pill status={svc.status[s.key]} />
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-charcoal-100 pt-4">
          <Link href="/set" className="group rounded-lg px-2 py-1.5 transition hover:bg-cream-200">
            <div className="text-xs font-semibold text-charcoal-400 group-hover:text-coral-600">Set</div>
            <div className="text-base font-bold text-charcoal-900">
              {songCount} {songCount === 1 ? "song" : "songs"}
            </div>
            <div className="text-xs text-charcoal-400">{fmtDuration(totalSec)}</div>
          </Link>
          <Link href="/team" className="group rounded-lg px-2 py-1.5 transition hover:bg-cream-200">
            <div className="text-xs font-semibold text-charcoal-400 group-hover:text-coral-600">Team</div>
            <div className="text-base font-bold text-charcoal-900">
              {confirmed}/{roles.length}
            </div>
            <div className="text-xs text-charcoal-400">{awaiting} awaiting · {openRoles} open</div>
          </Link>
          <Link href="/send" className="group rounded-lg px-2 py-1.5 transition hover:bg-cream-200">
            <div className="text-xs font-semibold text-charcoal-400 group-hover:text-coral-600">
              Send
            </div>
            <div className="text-base font-bold text-charcoal-900">
              {sentCount}/{assignedCount || "–"} links
            </div>
            <div className="text-xs text-charcoal-400">
              {unsent > 0 ? `${unsent} to send` : sentCount > 0 ? "everyone has one" : "not started"}
            </div>
          </Link>
        </div>
      </Card>

      {/* ── The 5-hour schedule — the framework, folded until wanted. ── */}
      <ScheduleFold svc={svc} patch={patch} />
    </div>
  );
}

// The Schedule (Casey's five hours) used to be its own tab; it's Intensive 1
// curriculum, so it stays — as opt-in depth under the overview, not a stop on
// every visit.
function ScheduleFold({
  svc,
  patch,
}: {
  svc: Service;
  patch: (fn: (s: Service) => Service) => void;
}) {
  const [open, setOpen] = useState(false);
  const banked = Object.values(svc.loopSeconds ?? {}).reduce((a, b) => a + b, 0);
  return (
    <div className="pt-2">
      {/* An obvious control, not a caption — bordered surface, hover, and an
          explicit Open/Hide with the chevron in a chip. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
          open
            ? "border-charcoal-200 bg-cream-200/60"
            : "border-charcoal-100 bg-cream-200/30 hover:border-charcoal-200 hover:bg-cream-200/60"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-charcoal-500 shadow-sm transition-colors group-hover:text-coral-600">
            <Icon name="clock" size={16} />
          </span>
          <div>
            <div className="text-sm font-bold text-charcoal-900">The 5-hour schedule</div>
            <p className="text-xs text-charcoal-400">
              The full framework, hour by hour
              {banked > 0 ? ` · ${Math.round(banked / 60)} min banked` : ""}
            </p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-charcoal-500 transition-colors group-hover:text-coral-600">
          {open ? "Hide" : "Open"}
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-charcoal-100 bg-white transition-colors group-hover:border-coral-300">
            <Icon name={open ? "chevronUp" : "chevronDown"} size={14} />
          </span>
        </span>
      </button>
      {open && (
        <div className="mt-4">
          <Schedule svc={svc} patch={patch} />
        </div>
      )}
    </div>
  );
}

// ---------------- Schedule = THE LOOP ----------------
// Casey's Five Hours as a repeatable weekly loop, not a flat checklist. The
// hours run in order; the one that needs you is open, finished ones fold to a
// line. Hour 1 reaches across the runway; Hour 5 is after Sunday and feeds the
// next week's Hour 1.
const hourFull = (b: Service["blocks"][number]) =>
  b.tasks.length > 0 && b.tasks.every((t) => t.done);

function Schedule({ svc, patch }: { svc: Service; patch: (fn: (s: Service) => Service) => void }) {
  const total = svc.blocks.reduce((n, b) => n + b.tasks.length, 0);
  const done = svc.blocks.reduce((n, b) => n + b.tasks.filter((t) => t.done).length, 0);
  const hoursDone = svc.blocks.filter(hourFull).length;
  const activeIdx = svc.blocks.findIndex((b) => !hourFull(b)); // -1 when the loop is complete
  const { setState } = useStore();
  const startWalk = () =>
    setState((s) => {
      const firstIncomplete = svc.blocks.findIndex((b) => !hourFull(b));
      const hourIndex = svc.loopHour ?? (firstIncomplete < 0 ? 0 : firstIncomplete);
      return {
        ...s,
        activeServiceId: svc.id,
        coach: { serviceId: svc.id, hourIndex, status: "active", runningSince: Date.now() },
      };
    });

  const toggle = (hour: number, taskId: string) =>
    patch((p) => ({
      ...p,
      blocks: p.blocks.map((b) =>
        b.hour === hour
          ? { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
          : b,
      ),
    }));

  const stateOf = (i: number): "done" | "active" | "todo" =>
    activeIdx === -1 || i < activeIdx ? "done" : i === activeIdx ? "active" : "todo";

  const complete = activeIdx === -1;
  const pre = svc.blocks.slice(0, 4); // Hours 1–4: before Sunday
  const after = svc.blocks[4]; // Hour 5: after Sunday

  return (
    <div className="space-y-3">
      {/* ── Loop status: where you are, in one line ─────────────────── */}
      <Card data-tour="plan-loop" className={complete ? "border-ok-border bg-ok-tint/50" : "border-coral-300 bg-gradient-to-br from-white to-coral-100/40"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Label>The loop</Label>
            <p className="mt-1 text-base font-semibold text-charcoal-900">
              {complete
                ? "Every hour's in. Rest well. Hour 5 reopens the loop after Sunday."
                : `You're on Hour ${activeIdx + 1} · ${svc.blocks[activeIdx].focus}`}
            </p>
          </div>
          <button
            onClick={startWalk}
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            {svc.loopHour != null && !complete ? "Resume the loop" : "Walk me through it"}{" "}
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
        {/* segmented progress: one segment per hour */}
        <div className="mt-3 flex items-center gap-1.5">
          {svc.blocks.map((b, i) => {
            const st = stateOf(i);
            return (
              <div
                key={b.hour}
                title={`Hour ${i + 1} · ${b.focus}`}
                className={`h-1.5 flex-1 rounded-full ${
                  st === "done" ? "bg-ok-bar" : st === "active" ? "bg-coral-500" : "bg-cream-200"
                }`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 text-xs text-charcoal-400">
          {hoursDone} of 5 hours complete · {done}/{total} steps
        </div>
      </Card>

      {/* Hours 1–4 */}
      {pre.map((b, i) => (
        <HourStep key={b.hour} block={b} n={i + 1} state={stateOf(i)} onToggle={toggle} />
      ))}

      {/* Sunday divider */}
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-charcoal-100" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white dark:bg-charcoal-100 dark:text-charcoal-900">
          Sunday · lead
        </span>
        <div className="h-px flex-1 bg-charcoal-100" />
      </div>

      {/* Hour 5 — after Sunday */}
      {after && <HourStep block={after} n={5} state={stateOf(4)} onToggle={toggle} />}

      {/* Hour 5 report — what each hour actually cost, banked by the coach */}
      {svc.loopSeconds && Object.keys(svc.loopSeconds).length > 0 && (
        <Card>
          <Label>Time this loop</Label>
          <p className="mt-1 text-xs text-charcoal-400">
            What each hour actually took. Your honest read for Hour 5.
          </p>
          <div className="mt-3 space-y-1.5">
            {svc.blocks.map((b, i) => {
              const sec = svc.loopSeconds?.[i];
              if (!sec) return null;
              const min = Math.round(sec / 60);
              const over = sec >= 3600;
              return (
                <div key={b.hour} className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-600">
                    Hour {i + 1} · {b.focus}
                  </span>
                  <span className="font-semibold" style={{ color: over ? "var(--color-no-ink)" : "var(--color-ok-ink)" }}>
                    {min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${min % 60}m`}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

function HourStep({
  block,
  n,
  state,
  onToggle,
}: {
  block: Service["blocks"][number];
  n: number;
  state: "done" | "active" | "todo";
  onToggle: (hour: number, taskId: string) => void;
}) {
  const [open, setOpen] = useState(state === "active");
  const dcount = block.tasks.filter((t) => t.done).length;
  const tcount = block.tasks.length;
  const allDone = dcount === tcount && tcount > 0;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white transition ${
        state === "active"
          ? "border-coral-300 shadow-[var(--shadow-coral)]"
          : "border-charcoal-100"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            state === "todo" && !allDone ? "text-charcoal-500" : "text-white"
          }`}
          style={{
            background:
              state === "done" || allDone
                ? "var(--color-ok-bar)"
                : state === "active"
                  ? "var(--color-coral-500)"
                  : "var(--color-cream-200)",
          }}
        >
          {allDone || state === "done" ? <Icon name="check" size={16} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-charcoal-900">{block.focus}</span>
          <span className="block text-xs text-charcoal-400">
            Hour {n} · {block.when}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`text-xs font-semibold ${state === "active" ? "text-coral-600" : "text-charcoal-400"}`}>
            {allDone ? "Done" : `${dcount}/${tcount}`}
          </span>
          <Icon name={open ? "chevronUp" : "chevronRight"} size={15} className="text-charcoal-400" />
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {block.outcome && (
            <p className="mb-3 rounded-lg bg-cream-100 px-3 py-2 text-xs text-charcoal-600">
              <span className="font-semibold text-charcoal-800">So that:</span> {block.outcome}
            </p>
          )}
          <div className="space-y-1">
            {block.tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onToggle(block.hour, t.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-cream-200"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    t.done
                      ? "border-coral-500 bg-coral-500 text-white"
                      : "border-charcoal-200 text-transparent"
                  }`}
                >
                  <Icon name="check" size={13} />
                </span>
                <span className={`text-sm ${t.done ? "text-charcoal-400 line-through" : "text-charcoal-800"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {n === 1 && (
            <Link
              href="/calendar"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline"
            >
              Open the runway and sweep 8 · 4 · 3 · 2 · 1 <Icon name="arrowRight" size={13} />
            </Link>
          )}
          {n === 5 && (
            <p className="mt-3 text-xs text-charcoal-400">
              Happens <span className="font-semibold text-charcoal-600">after Sunday</span>. Its
              Kingdom Win and one fix become next week&rsquo;s Hour 1.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Pray ----------------
function Pray({
  svc,
  patch,
  services,
}: {
  svc: Service;
  patch: (fn: (s: Service) => Service) => void;
  services: Service[];
}) {
  const caps: { value: CapacityLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];
  const lastNote = lastSundayNote(services, svc.date);
  return (
    <div data-coach="pray" className="space-y-6">
      {lastNote && (
        <div className="border-l-2 border-coral-400 pl-4">
          <Label>From last Sunday</Label>
          <p className="editorial mt-1 text-[15px] text-charcoal-700">
            &ldquo;{lastNote.note}&rdquo;
          </p>
        </div>
      )}
      <Card>
        <Label>How much do you have this week?</Label>
        <p className="mt-1 text-sm text-charcoal-400">
          Before you plan anything, name your real capacity, time and energy. Be
          honest; the week should flow from what you actually have, not what you
          wish you had.
        </p>
        <div className="mt-4">
          <div className="mb-1.5 text-xs font-semibold text-charcoal-500">
            My capacity this week
          </div>
          <Segmented
            options={caps}
            value={svc.capacity.level}
            onChange={(v) =>
              patch((p) => ({ ...p, capacity: { ...p.capacity, level: v } }))
            }
          />
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold text-charcoal-500">
            So this week, I&rsquo;ll&hellip;
          </div>
          <p className="mb-1.5 text-[11px] text-charcoal-400">
            Turn that capacity into one or two decisions. What you&rsquo;ll protect,
            simplify, or skip. You&rsquo;ll see this when you build the set and team.
          </p>
          <EditableText
            multiline
            value={svc.capacity.note}
            placeholder="e.g. Short week. Keep the set to 4 songs and reuse last week's arrangement."
            onCommit={(v) => patch((p) => ({ ...p, capacity: { ...p.capacity, note: v } }))}
          />
        </div>
      </Card>

      <Card>
        <Label>Sit with the Word</Label>
        <p className="mt-2 text-sm text-charcoal-600">
          <span className="font-semibold">Scripture:</span> {svc.scripture}
        </p>
        <p className="editorial mt-2 text-lg text-charcoal-700">&ldquo;{svc.theme}&rdquo;</p>
        <div className="mt-4">
          <div className="mb-1 text-xs font-semibold text-charcoal-500">
            Prayer focus for the team
          </div>
          <div className="flex flex-wrap gap-2">
            {svc.teams
              .flatMap((t) => t.roles)
              .filter((r) => r.person)
              .map((r) => (
                <span
                  key={r.id}
                  className="rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-charcoal-700"
                >
                  {r.person}
                </span>
              ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Guided setup for a NEW service — the step-by-step on-ramp. Sets the 8-weeks-out
// skeleton (occasion, the heart, capacity). Can be switched off for leaders who
// already know the rhythm.
function NewServiceSetup({
  svc,
  patch,
  onClose,
  onTurnOff,
}: {
  svc: Service;
  patch: (fn: (s: Service) => Service) => void;
  onClose: () => void;
  onTurnOff: () => void;
}) {
  const [step, setStep] = useState(0);
  const [svcDate, setSvcDate] = useState(svc.date);
  const [season, setSeason] = useState(svc.season);
  const [theme, setTheme] = useState(svc.theme);
  const [scripture, setScripture] = useState(svc.scripture);
  const [oneThing, setOneThing] = useState(svc.oneThing);
  const [capLevel, setCapLevel] = useState<CapacityLevel>(svc.capacity.level);
  const [capNote, setCapNote] = useState(svc.capacity.note);

  const STEPS = 5;
  const commit = () =>
    patch((s) => ({
      ...s,
      date: svcDate || s.date,
      season,
      theme,
      scripture,
      oneThing,
      capacity: { level: capLevel, note: capNote },
    }));

  const go = (n: number) => {
    commit();
    setStep(Math.max(0, Math.min(STEPS - 1, n)));
  };
  const finish = () => {
    commit();
    onClose();
  };

  const input =
    "w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-medium text-charcoal-800 outline-none focus:border-coral-400";

  const weekdayLabel = svcDate
    ? new Date(svcDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  const caps: { value: CapacityLevel; label: string }[] = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={finish}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-charcoal-100 bg-white p-6 shadow-[var(--shadow-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="label text-coral-600">Set up this service · {step + 1} of {STEPS}</span>
          <button onClick={finish} className="text-charcoal-300 transition hover:text-charcoal-700" title="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-ok-bar" : i === step ? "bg-coral-500" : "bg-cream-200"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-charcoal-900">When are you gathering?</h2>
            <p className="mt-1 text-sm text-charcoal-500">
              Set the date and the occasion. Most services are Sunday, but pick whatever day you
              gather. Saturday nights, midweek, holidays. We&rsquo;ll take the rest one piece at a time.
            </p>
            <div className="mt-4">
              <div className="label mb-1 text-charcoal-400">Service date</div>
              <input
                type="date"
                value={svcDate}
                onChange={(e) => setSvcDate(e.target.value)}
                className={input}
              />
              {weekdayLabel && (
                <p className="mt-1.5 text-xs font-semibold text-charcoal-500">{weekdayLabel}</p>
              )}
            </div>
            <div className="mt-4">
              <div className="label mb-1 text-charcoal-400">Occasion</div>
              <input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Ordinary Time" className={input} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-charcoal-900">Set the heart</h2>
            <p className="mt-1 text-sm text-charcoal-500">
              Pray first, then name where Sunday is pointing. This is the anchor everything else serves.
            </p>
            <div className="mt-4">
              <div className="label mb-1 text-charcoal-400">Theme</div>
              <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. God's word lights the next step" className={input} />
            </div>
            <div className="mt-4">
              <div className="label mb-1 text-charcoal-400">Scripture</div>
              <input value={scripture} onChange={(e) => setScripture(e.target.value)} placeholder="e.g. Psalm 119:105" className={input} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-charcoal-900">Name the one thing</h2>
            <p className="mt-1 text-sm text-charcoal-500">
              If your people remember one thing from Sunday, what is it? One sentence.
            </p>
            <textarea
              value={oneThing}
              onChange={(e) => setOneThing(e.target.value)}
              rows={3}
              placeholder="The one takeaway for this Sunday"
              className={`${input} mt-4 resize-none`}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-charcoal-900">How much do you have?</h2>
            <p className="mt-1 text-sm text-charcoal-500">
              Be honest about your real capacity this week. The plan should flow from what you actually have.
            </p>
            <div className="mt-4">
              <Segmented options={caps} value={capLevel} onChange={(v) => setCapLevel(v)} />
            </div>
            <textarea
              value={capNote}
              onChange={(e) => setCapNote(e.target.value)}
              rows={3}
              placeholder="e.g. Short week. Keep the set to 4 songs and reuse last week's arrangement."
              className={`${input} mt-4 resize-none`}
            />
          </div>
        )}

        {step === 4 && (
          <div className="mt-5">
            <h2 className="text-2xl font-bold text-charcoal-900">You&rsquo;re set{weekdayLabel ? ` for ${weekdayLabel}` : ""}</h2>
            <p className="mt-1 text-sm text-charcoal-500">
              The skeleton&rsquo;s in. It&rsquo;s on your runway now. Come back as it gets closer and the loop will carry it the rest of the way.
            </p>
            <div className="mt-4 rounded-lg border border-charcoal-100 bg-cream-100 px-4 py-3">
              <p className="editorial text-lg text-charcoal-800">&ldquo;{theme || "Set a theme"}&rdquo;</p>
              <p className="mt-1 text-sm text-charcoal-500">{scripture || "—"}</p>
            </div>
            <div className="mt-3 space-y-1.5 text-sm text-charcoal-600">
              <div className="flex items-center gap-2"><span className="label w-16 text-charcoal-400">4 wks</span> Coordinate the set &amp; teams</div>
              <div className="flex items-center gap-2"><span className="label w-16 text-charcoal-400">3 wks</span> Get the emails out</div>
              <div className="flex items-center gap-2"><span className="label w-16 text-charcoal-400">2 wks</span> Lock the details</div>
              <div className="flex items-center gap-2"><span className="label w-16 text-charcoal-400">Week of</span> Prep &amp; lead</div>
            </div>
            <Link href="/calendar" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-coral-600 hover:underline">
              See it on the runway <Icon name="arrowRight" size={13} />
            </Link>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              step === 0 ? "cursor-not-allowed border-charcoal-100 text-charcoal-300" : "border-charcoal-200 text-charcoal-600 hover:border-charcoal-300"
            }`}
          >
            Back
          </button>
          {step < STEPS - 1 ? (
            <button
              onClick={() => go(step + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Next <Icon name="arrowRight" size={15} />
            </button>
          ) : (
            <button
              onClick={finish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Go to the plan <Icon name="check" size={15} />
            </button>
          )}
        </div>

        <button onClick={onTurnOff} className="mt-4 block w-full text-center text-xs text-charcoal-400 hover:text-charcoal-600 hover:underline">
          I know the rhythm. Set up new services without the guide
        </button>
      </div>
    </div>
  );
}

// ---------------- Prep ----------------
function Prep({ svc, patch }: { svc: Service; patch: (fn: (s: Service) => Service) => void }) {
  return (
    <div data-coach="prep" className="space-y-6">
      {svc.live && (
        <Link
          href="/live/debrief"
          className="group flex items-center justify-between rounded-xl border border-charcoal-100 bg-cream-200/40 p-4 transition hover:border-coral-300"
        >
          <div>
            <Label>Sunday&rsquo;s debrief</Label>
            <p className="mt-1 text-sm text-charcoal-600">
              Planned vs actual from Live mode, ready for the staff conversation.
            </p>
          </div>
          <Icon
            name="arrowRight"
            size={16}
            className="shrink-0 text-charcoal-400 group-hover:text-coral-600"
          />
        </Link>
      )}
      <Card>
        <Label>Execution · what to rehearse</Label>
        <div className="mt-3">
          <EditableText
            multiline
            value={svc.rehearsalNotes}
            onCommit={(v) => patch((p) => ({ ...p, rehearsalNotes: v }))}
          />
        </div>
      </Card>

      <Card>
        <Label>Audio / Visual / Lighting notes</Label>
        <div className="mt-3">
          <EditableText
            multiline
            value={svc.avlNotes}
            onCommit={(v) => patch((p) => ({ ...p, avlNotes: v }))}
          />
        </div>
      </Card>

      <Card>
        <Label>The close · reflection</Label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-charcoal-500">
              What to watch for on Sunday
            </div>
            <EditableText
              multiline
              value={svc.watchFor}
              onCommit={(v) => patch((p) => ({ ...p, watchFor: v }))}
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-charcoal-500">
              One thing to carry into next week
            </div>
            <EditableText
              multiline
              value={svc.carryForward}
              onCommit={(v) => patch((p) => ({ ...p, carryForward: v }))}
            />
          </div>
        </div>
      </Card>

      <Card className="bg-cream-200/60">
        <div className="flex items-center gap-2 text-sm text-charcoal-600">
          <Icon name="check" size={16} className="text-coral-600" />
          Sunday&rsquo;s reflection becomes next week&rsquo;s prayer. The loop closes here.
        </div>
      </Card>
    </div>
  );
}
