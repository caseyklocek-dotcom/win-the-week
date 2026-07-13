"use client";

// ============================================================
// The 15-Minute Plan — V2's hero flow.
//
// Four steps, one screen each: Heart → Set → Team → Send. A gentle count-up
// timer keeps the sitting honest without ever punishing a pause, smart
// suggestions come from the leader's own library (lib/suggest.ts), and the
// Sunday Sheet on the right assembles itself while they work. Everything
// writes straight to the active service — leave anytime, nothing is lost.
// ============================================================

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { profileMode } from "@/lib/mode";
import { rankSuggestions } from "@/lib/suggest";
import { songFromLibrary } from "@/lib/library";
import { sectionSongIds, serviceSetDurationSec } from "@/lib/set";
import { fmtDuration, weekdayName } from "@/lib/music";
import { Icon } from "@/components/Icon";
import { KeyBadge } from "@/components/ui";
import type { Service, SetSection, Song } from "@/lib/types";

const TARGET_SEC = 15 * 60; // the promise in the name
const SET_TARGET_SEC = 20 * 60; // a healthy worship-set length to aim near

function rid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 9)}`;
}

function fullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

type StepKey = "heart" | "set" | "team" | "send";
const STEPS: { key: StepKey; label: string; coach: string }[] = [
  {
    key: "heart",
    label: "Heart",
    coach:
      "Before the songs: what is God saying to your church this week? One theme, one scripture. Everything else hangs on this.",
  },
  {
    key: "set",
    label: "Set",
    coach:
      "Pick from what your library already knows. Rested songs feel fresh, familiar songs rehearse cheap. Three or four is plenty.",
  },
  {
    key: "team",
    label: "Team",
    coach:
      "Most weeks the fastest faithful move is the same team as last week. Fill the gaps, then let them know early.",
  },
  {
    key: "send",
    label: "Send",
    coach:
      "Done beats perfect. Send the packet while the week is young, and Saturday night stays calm.",
  },
];

// ---- the live Sunday Sheet preview ----
function SundaySheet({
  svc,
  churchName,
  serviceTime,
  songs,
  confirmed,
  totalRoles,
}: {
  svc: Service;
  churchName: string;
  serviceTime: string;
  songs: Song[];
  confirmed: number;
  totalRoles: number;
}) {
  return (
    <div className="rounded-[4px] border border-charcoal-100 bg-white p-6 shadow-md">
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-coral-600">
        {churchName || "Your church"}
      </p>
      <p className="editorial mt-1.5 text-center text-xl text-charcoal-900">
        {svc.theme ? svc.theme : svc.title || "This Sunday"}
      </p>
      <p className="mt-0.5 text-center text-xs text-charcoal-400">
        {fullDate(svc.date)} · {serviceTime}
      </p>
      {svc.scripture && (
        <p className="mt-1 text-center text-xs text-charcoal-600">{svc.scripture}</p>
      )}
      <div className="mt-4 border-t border-cream-200">
        {songs.map((s) => (
          <div
            key={s.id}
            className="flex items-baseline justify-between border-b border-cream-200 py-1.5 text-xs"
          >
            <span className="min-w-0 truncate font-semibold text-charcoal-800">{s.title}</span>
            <span className="ml-3 shrink-0 tabular-nums text-charcoal-400">
              {s.serviceKey} · {fmtDuration(s.durationSec)}
            </span>
          </div>
        ))}
        {songs.length === 0 && (
          <p className="border-b border-cream-200 py-2 text-center text-xs text-charcoal-300">
            Songs land here as you pick them
          </p>
        )}
        <div className="flex items-baseline justify-between py-1.5 text-xs">
          <span className="text-charcoal-400">Team</span>
          <span className="tabular-nums text-charcoal-600">
            {totalRoles > 0 ? `${confirmed} of ${totalRoles} confirmed` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function QuickPlanPage() {
  const {
    state,
    activeService: svc,
    updateService,
    teamTemplates,
    applyTeamTemplate,
    songLibrary,
  } = useStore();
  const mode = profileMode(state.profile);

  // ---- where the week actually is → statuses + a sensible starting step ----
  const songs = useMemo(
    () =>
      svc.setSections
        .flatMap((s) => sectionSongIds(s).map((id) => svc.songs.find((x) => x.id === id)))
        .filter((s): s is Song => Boolean(s)),
    [svc],
  );
  const roles = svc.teams.flatMap((t) => t.roles);
  const confirmed = roles.filter((r) => r.status === "ok").length;
  const openRoles = roles.filter((r) => r.status === "no").length;

  const done: Record<StepKey, boolean> = {
    heart: Boolean(svc.theme || svc.scripture),
    set: songs.length >= 3,
    team: roles.length > 0 && openRoles === 0,
    send: svc.status.plan === "done",
  };

  const [step, setStep] = useState<StepKey>(() => {
    if (!done.heart) return "heart";
    if (!done.set) return "set";
    if (!done.team) return "team";
    return "send";
  });
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  // ---- the gentle timer ----
  const timerKey = `wtw_quick_start_${svc.id}`;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let start = Number(sessionStorage.getItem(timerKey));
    if (!start) {
      start = Date.now();
      sessionStorage.setItem(timerKey, String(start));
    }
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [timerKey]);
  const onPace = elapsed <= (TARGET_SEC * (stepIdx + 1)) / STEPS.length;

  // ---- mutations ----
  const patch = (updater: (s: Service) => Service) => updateService(svc.id, updater);

  const setHeart = (fields: Partial<Pick<Service, "theme" | "scripture" | "oneThing">>) =>
    patch((s) => ({ ...s, ...fields }));

  // Add into the first "Worship"-ish section (or create one).
  const addFromLibrary = (libId: string) => {
    const lib = songLibrary.find((l) => l.id === libId);
    if (!lib) return;
    const newSong = songFromLibrary(lib);
    patch((s) => {
      let sections = s.setSections;
      let targetId = sections.find((sec) => /worship/i.test(sec.label))?.id ?? sections[0]?.id;
      if (!targetId) {
        const sec: SetSection = { id: rid("setsec"), label: "Worship", rows: [] };
        sections = [sec];
        targetId = sec.id;
      }
      return {
        ...s,
        songs: [...s.songs, newSong],
        setSections: sections.map((sec) =>
          sec.id === targetId
            ? { ...sec, rows: [...sec.rows, { kind: "song" as const, refId: newSong.id }] }
            : sec,
        ),
      };
    });
  };

  const removeSong = (songId: string) =>
    patch((s) => ({
      ...s,
      songs: s.songs.filter((x) => x.id !== songId),
      setSections: s.setSections.map((sec) => ({
        ...sec,
        rows: sec.rows.filter((r) => !(r.kind === "song" && r.refId === songId)),
      })),
    }));

  const applySameAsLastWeek = () => {
    const past = state.services
      .filter((s) => s.id !== svc.id && s.date < svc.date)
      .sort((a, b) => b.date.localeCompare(a.date));
    const prev = past[0];
    if (!prev) return;
    patch((s) => ({
      ...s,
      teams: s.teams.map((t) => {
        if (!t.group) return t;
        const prevTeam = prev.teams.find((pt) => pt.group === t.group);
        return prevTeam
          ? { ...t, roles: prevTeam.roles.map((r) => ({ ...r, id: rid("r") })) }
          : { ...t, roles: [] };
      }),
    }));
  };

  const markPlanDone = () =>
    patch((s) => ({ ...s, status: { ...s.status, plan: "done" } }));

  // ---- suggestions + library search ----
  const suggestions = useMemo(() => rankSuggestions(state, svc, 5), [state, svc]);
  const [q, setQ] = useState("");
  const searchHits = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const inSet = new Set(songs.map((s) => s.libraryId));
    return songLibrary
      .filter((l) => !inSet.has(l.id))
      .filter((l) => `${l.title} ${l.artist}`.toLowerCase().includes(term))
      .slice(0, 5);
  }, [q, songLibrary, songs]);

  const totalSec = serviceSetDurationSec(svc);
  const timerPct = Math.min(100, (elapsed / TARGET_SEC) * 100);

  const goNext = () => stepIdx < STEPS.length - 1 && setStep(STEPS[stepIdx + 1].key);
  const goBack = () => stepIdx > 0 && setStep(STEPS[stepIdx - 1].key);

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---- header ---- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="relative h-14 w-14 shrink-0" aria-label={`Elapsed ${fmtClock(elapsed)}`}>
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" className="stroke-cream-200" strokeWidth="5" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              className="stroke-coral-500"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${Math.max(1, timerPct)} 100`}
              transform="rotate(-90 28 28)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold tabular-nums text-charcoal-900">
            {fmtClock(elapsed)}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="headline text-2xl text-charcoal-900">The 15-minute plan</h1>
          <p className="text-sm text-charcoal-400">
            {fullDate(svc.date)}
            {svc.title ? ` · ${svc.title}` : ""}
          </p>
        </div>
        <span
          className={`ml-auto rounded-full px-3.5 py-1.5 text-xs font-bold ${
            elapsed > TARGET_SEC
              ? "bg-cream-200 text-charcoal-600"
              : onPace
                ? "bg-ok-tint text-ok-ink"
                : "bg-wait-tint text-wait-ink"
          }`}
        >
          {elapsed > TARGET_SEC ? "Your pace is the right pace" : onPace ? "On pace" : "No rush"}
        </span>
      </div>

      {/* ---- body ---- */}
      <div className="mt-8 grid gap-y-8 border-t border-charcoal-100 pt-7 lg:grid-cols-[190px_1.4fr_1fr] lg:gap-y-0">
        {/* stepper */}
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:pr-6" aria-label="Steps">
          {STEPS.map((s, i) => {
            const active = s.key === step;
            return (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors lg:rounded-none lg:border-b lg:border-cream-200 lg:px-0 ${
                  active ? "" : "opacity-70 hover:opacity-100"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done[s.key] && !active ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok-bar text-white">
                    <Icon name="check" size={12} strokeWidth={2.6} />
                  </span>
                ) : (
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-coral-500 text-white shadow-[0_0_0_4px_var(--color-coral-100)]"
                        : "border-2 border-dashed border-charcoal-200 text-charcoal-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span>
                  <span
                    className={`block text-sm font-bold ${
                      active ? "text-charcoal-900" : "text-charcoal-500"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="hidden text-[11px] text-charcoal-400 lg:block">
                    {s.key === "heart" &&
                      (done.heart ? "Theme & scripture set" : "Theme & scripture")}
                    {s.key === "set" && `${songs.length} of 3+ songs`}
                    {s.key === "team" &&
                      (roles.length
                        ? `${confirmed} confirmed · ${openRoles} open`
                        : "Start from last week")}
                    {s.key === "send" && (done.send ? "Plan locked" : "Packet & team email")}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* main step panel */}
        <section className="lg:border-l lg:border-charcoal-100 lg:px-7">
          {mode === "guided" && (
            <p className="editorial mb-5 border-l-2 border-coral-300 pl-4 text-[15px] text-charcoal-600">
              {STEPS[stepIdx].coach}
            </p>
          )}

          {step === "heart" && (
            <div className="space-y-5">
              <h2 className="label text-charcoal-400">The heart of this Sunday</h2>
              {(
                [
                  { key: "theme", label: "Theme", ph: "e.g. God's word lights the next step" },
                  { key: "scripture", label: "Scripture", ph: "e.g. Psalm 119:105" },
                  { key: "oneThing", label: "The one thing", ph: "If they remember one sentence…" },
                ] as const
              ).map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-charcoal-400">
                    {f.label}
                  </span>
                  <input
                    value={(svc[f.key] as string) ?? ""}
                    onChange={(e) => setHeart({ [f.key]: e.target.value })}
                    placeholder={f.ph}
                    className="mt-1.5 w-full border-b border-charcoal-100 bg-transparent py-2 text-[15px] text-charcoal-900 outline-none transition-colors placeholder:text-charcoal-300 focus:border-coral-500"
                  />
                </label>
              ))}
            </div>
          )}

          {step === "set" && (
            <div>
              <h2 className="label text-charcoal-400">
                Pick the set{svc.theme ? ` · suggested for "${svc.theme}"` : ""}
              </h2>
              <div className="mt-1">
                {suggestions.length === 0 && (
                  <p className="border-b border-cream-200 py-4 text-sm text-charcoal-400">
                    Everything in your library is already in the set. Search below, or add new
                    songs from the{" "}
                    <Link href="/songs" className="font-semibold text-coral-600 hover:underline">
                      library
                    </Link>
                    .
                  </p>
                )}
                {suggestions.map(({ lib, reasons }) => (
                  <div key={lib.id} className="flex items-center gap-3.5 border-b border-cream-200 py-3">
                    <KeyBadge k={lib.originalKey} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-charcoal-900">
                        {lib.title}
                        <span className="ml-2 font-normal text-charcoal-400">{lib.artist}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {reasons.map((r) => (
                          <span
                            key={r.label}
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                              r.tone === "teal"
                                ? "bg-teal-100 text-teal-600"
                                : r.tone === "amber"
                                  ? "bg-wait-tint text-wait-ink"
                                  : "bg-cream-200 text-charcoal-600"
                            }`}
                          >
                            {r.label}
                          </span>
                        ))}
                      </span>
                    </span>
                    <button
                      onClick={() => addFromLibrary(lib.id)}
                      aria-label={`Add ${lib.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] border-coral-500 text-coral-600 transition hover:bg-coral-50"
                    >
                      <Icon name="plus" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative mt-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search the library for anything else…"
                  className="w-full rounded-full border border-charcoal-100 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-charcoal-300 focus:border-coral-400"
                />
                {searchHits.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lg">
                    {searchHits.map((lib) => (
                      <button
                        key={lib.id}
                        onClick={() => {
                          addFromLibrary(lib.id);
                          setQ("");
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-coral-50"
                      >
                        <span className="font-semibold text-charcoal-800">{lib.title}</span>
                        <span className="text-xs text-charcoal-400">{lib.artist}</span>
                        <Icon name="plus" size={14} className="ml-auto text-coral-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {songs.length > 0 && (
                <div className="mt-5">
                  <h3 className="label text-charcoal-400">In the set</h3>
                  {songs.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 border-b border-cream-200 py-2">
                      <span className="text-sm font-semibold text-charcoal-800">{s.title}</span>
                      <span className="text-xs text-charcoal-400">
                        {s.serviceKey} · {fmtDuration(s.durationSec)}
                      </span>
                      <button
                        onClick={() => removeSong(s.id)}
                        aria-label={`Remove ${s.title}`}
                        className="ml-auto text-charcoal-300 transition hover:text-no-bar"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-charcoal-400">
                <span className="shrink-0">Set so far · {songs.length} songs</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-200">
                  <span
                    className="block h-full bg-teal-500"
                    style={{ width: `${Math.min(100, (totalSec / SET_TARGET_SEC) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 tabular-nums">
                  {fmtDuration(totalSec)} of {fmtDuration(SET_TARGET_SEC)}
                </span>
              </div>
              <p className="mt-3 text-xs text-charcoal-400">
                Keys, leads, and moments live in the full{" "}
                <Link href="/set" className="font-semibold text-coral-600 hover:underline">
                  set builder
                </Link>
                .
              </p>
            </div>
          )}

          {step === "team" && (
            <div>
              <h2 className="label text-charcoal-400">Who serves this {weekdayName(svc.date)}</h2>
              <div className="mt-3 flex flex-wrap gap-2.5">
                <button
                  onClick={applySameAsLastWeek}
                  className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
                >
                  Same team as last week
                </button>
                {teamTemplates.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTeamTemplate(svc.id, t.id)}
                    className="rounded-full border border-charcoal-100 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-cream-200 pt-4 text-sm">
                <span className="font-bold text-ok-ink">{confirmed} confirmed</span>
                <span className="font-bold text-wait-ink">
                  {roles.filter((r) => r.status === "wait").length} awaiting
                </span>
                <span className="font-bold text-no-ink">{openRoles} open</span>
                <span className="text-charcoal-400">{roles.length} positions</span>
              </div>
              <p className="mt-4 text-sm text-charcoal-500">
                Assign names, nudge, and fill slots in the full{" "}
                <Link href="/team" className="font-semibold text-coral-600 hover:underline">
                  team roster
                </Link>
                . This step just gets the skeleton standing.
              </p>
            </div>
          )}

          {step === "send" && (
            <div>
              <h2 className="label text-charcoal-400">Close the loop</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li className="flex items-center gap-2.5">
                  <Icon
                    name="check"
                    size={15}
                    className={songs.length ? "text-ok-bar" : "text-charcoal-200"}
                  />
                  <span className={songs.length ? "text-charcoal-800" : "text-charcoal-400"}>
                    {songs.length} songs · {fmtDuration(totalSec)}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon
                    name="check"
                    size={15}
                    className={
                      confirmed > 0 && !openRoles ? "text-ok-bar" : "text-charcoal-200"
                    }
                  />
                  <span className="text-charcoal-800">
                    {confirmed} of {roles.length} team confirmed
                    {openRoles > 0 && (
                      <Link href="/team" className="ml-1.5 font-semibold text-coral-600 hover:underline">
                        · {openRoles} open →
                      </Link>
                    )}
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Icon
                    name="check"
                    size={15}
                    className={done.send ? "text-ok-bar" : "text-charcoal-200"}
                  />
                  <span className={done.send ? "text-charcoal-800" : "text-charcoal-400"}>
                    Plan marked done
                  </span>
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link
                  href="/packet"
                  onClick={markPlanDone}
                  className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
                >
                  Finish: open the packet <Icon name="arrowRight" size={15} />
                </Link>
                {!done.send && (
                  <button
                    onClick={markPlanDone}
                    className="rounded-full border border-charcoal-100 px-5 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
                  >
                    Just mark the plan done
                  </button>
                )}
              </div>
              {elapsed <= TARGET_SEC && done.heart && songs.length >= 3 && (
                <p className="mt-5 text-sm font-semibold text-ok-ink">
                  Planned in {fmtClock(elapsed)}. That&rsquo;s the whole point.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Sunday Sheet */}
        <aside className="lg:pl-7">
          <SundaySheet
            svc={svc}
            churchName={state.profile.churchName}
            serviceTime={state.profile.serviceTime}
            songs={songs}
            confirmed={confirmed}
            totalRoles={roles.length}
          />
          <p className="mt-2.5 text-center text-xs text-charcoal-400">
            The Sunday Sheet builds itself as you plan
          </p>
        </aside>
      </div>

      {/* ---- footer bar ---- */}
      <div className="mt-8 flex items-center gap-3 border-t border-charcoal-100 pt-5">
        <span className="text-xs text-charcoal-400">Autosaved · finish anytime</span>
        <div className="ml-auto flex gap-2.5">
          {stepIdx > 0 && (
            <button
              onClick={goBack}
              className="rounded-full border border-charcoal-100 px-5 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200"
            >
              Back
            </button>
          )}
          {stepIdx < STEPS.length - 1 && (
            <button
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Next: {STEPS[stepIdx + 1].label} <Icon name="arrowRight" size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
