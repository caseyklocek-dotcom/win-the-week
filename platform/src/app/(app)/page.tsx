"use client";

// ============================================================
// V2 Home — "This Sunday", the editorial dashboard.
//
// One calm page that answers "what does Sunday need from me right now?":
// a greeting that knows where you are in the week, the Pray/Plan/Prep loop
// as a single thread with a named next step, the set and the team side by
// side, and a sunrise gauge for how ready Saturday already feels. Hairlines
// instead of boxes; everything that looks editable is editable.
// ============================================================

import Link from "next/link";
import { useStore } from "@/lib/store";
import { profileMode } from "@/lib/mode";
import { KeyBadge, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ServiceSwitcher } from "@/components/ServiceSwitcher";
import { fmtDuration, weekdayName } from "@/lib/music";
import { sectionSongIds, serviceDisplayTitle, serviceSetDurationSec } from "@/lib/set";
import type { Service, Song } from "@/lib/types";

function fullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function daysUntil(iso: string): number {
  const svcDate = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((svcDate.getTime() - today.getTime()) / 86_400_000);
}

function daysOutLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return "past";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  return `${d} days out`;
}

function getGreeting(
  firstName: string,
  doneCount: number,
  svcDate: string,
): { headline: string; nudge: string | null } {
  const now = new Date();
  const hour = now.getHours();
  const name = firstName ? ", " + firstName : "";
  const d = daysUntil(svcDate);

  if (d === 0) return { headline: `It's ${weekdayName(svcDate)}${name}`, nudge: "Go lead well." };
  if (doneCount === 3) {
    const opts = [
      "Sunday's covered. Rest well.",
      "Everything's locked. Nice work.",
      "All set. Enjoy the week.",
    ];
    return { headline: `You're ready${name}`, nudge: opts[now.getDate() % opts.length] };
  }
  if (d <= 2 && doneCount === 0)
    return { headline: `Sunday's close${name}`, nudge: "Start anywhere. Just start." };
  if (d <= 2) return { headline: `Almost there${name}`, nudge: "Finish strong." };
  if (doneCount === 1) return { headline: `Prayed up${name}`, nudge: "Time to build the plan." };
  if (doneCount === 2) return { headline: `Plan's locked${name}`, nudge: "Prep is all that's left." };
  if (hour < 6)
    return { headline: `Burning the midnight oil${name}`, nudge: "Where do you want to start?" };
  if (hour < 9) return { headline: `Early start${name}`, nudge: "What do you want to tackle first?" };
  if (hour < 12) return { headline: `Good morning${name}`, nudge: "Where do you want to begin?" };
  if (hour < 17) return { headline: `Good week${name}`, nudge: "Start wherever feels right." };
  if (hour < 21) return { headline: `Good evening${name}`, nudge: "Ready to plan for Sunday?" };
  return { headline: `Still at it${name}`, nudge: "Burning the midnight oil." };
}

// The single most useful thing to do next, by looking at the actual state of
// the week — this is what the loop thread points at.
function nextStep(
  svc: Service,
  songs: Song[],
): { label: string; href: string } {
  const roles = svc.teams.flatMap((t) => t.roles);
  const open = roles.find((r) => r.status === "no");
  const awaiting = roles.find((r) => r.status === "wait");

  if (svc.status.pray !== "done") return { label: "start with prayer", href: "/plan?tab=pray" };
  if (songs.length === 0) return { label: "build the set", href: "/set" };
  if (open) return { label: `fill the ${open.position} slot`, href: "/team" };
  if (awaiting)
    return { label: `nudge ${awaiting.person.split(" ")[0] || "the team"}`, href: "/team" };
  if (svc.status.plan !== "done") return { label: "finish the plan", href: "/plan" };
  if (svc.status.prep !== "done") return { label: "run your prep", href: "/plan?tab=prep" };
  return { label: "send the packet", href: "/packet" };
}

// ---- Saturday confidence — how ready the week already is, 0–100 ----
function confidence(svc: Service, songs: Song[]): { pct: number; parts: string[] } {
  const roles = svc.teams.flatMap((t) => t.roles);
  const confirmed = roles.filter((r) => r.status === "ok").length;
  const teamRatio = roles.length ? confirmed / roles.length : 1;
  const open = roles.filter((r) => r.status === "no").length;

  let pct = 0;
  if (svc.status.pray === "done") pct += 15;
  if (svc.status.plan === "done") pct += 25;
  else if (songs.length > 0) pct += 12;
  if (svc.status.prep === "done") pct += 25;
  if (songs.length > 0) pct += 15;
  pct += Math.round(teamRatio * 20);
  pct = Math.min(100, pct);

  const parts: string[] = [];
  parts.push(songs.length > 0 ? `${songs.length} songs set` : "no songs yet");
  if (open > 0) parts.push(`${open} role${open > 1 ? "s" : ""} open`);
  else if (roles.length) parts.push("team covered");
  parts.push(svc.status.prep === "done" ? "prep done" : "prep ahead");
  return { pct, parts };
}

// Consecutive past Sundays fully prepped (all three stages done).
function prepStreak(services: Service[]): number {
  const todayIso = new Date().toISOString().slice(0, 10);
  const past = services
    .filter((s) => s.date < todayIso)
    .sort((a, b) => b.date.localeCompare(a.date));
  let n = 0;
  for (const s of past) {
    if (s.status.pray === "done" && s.status.plan === "done" && s.status.prep === "done") n++;
    else break;
  }
  return n;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Sunrise arc gauge — the one bold visual on the page.
function SunriseGauge({ pct }: { pct: number }) {
  return (
    <svg width="168" height="98" viewBox="0 0 168 98" aria-label={`Saturday confidence ${pct}%`}>
      <defs>
        <linearGradient id="sunrise" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb3ac" />
          <stop offset="1" stopColor="#ff6b5e" />
        </linearGradient>
      </defs>
      <path
        d="M16 88 A68 68 0 0 1 152 88"
        fill="none"
        className="stroke-cream-200"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M16 88 A68 68 0 0 1 152 88"
        fill="none"
        stroke="url(#sunrise)"
        strokeWidth="12"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${Math.max(2, pct)} 100`}
      />
      <text
        x="84"
        y="82"
        textAnchor="middle"
        className="fill-charcoal-900"
        fontSize="27"
        fontWeight="800"
      >
        {pct}%
      </text>
    </svg>
  );
}

// One node on the Pray/Plan/Prep thread. Hints render as SIBLINGS of this
// link (never children) — nesting <a> inside <a> is invalid HTML.
function LoopNode({
  label,
  status,
  href,
}: {
  label: string;
  status: "done" | "doing" | "todo";
  href: string;
}) {
  return (
    <Link href={href} className="group flex shrink-0 items-center gap-2.5">
      {status === "done" ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ok-bar text-white">
          <Icon name="check" size={13} strokeWidth={2.6} />
        </span>
      ) : status === "doing" ? (
        <span className="h-6 w-6 rounded-full bg-coral-500 shadow-[0_0_0_5px_var(--color-coral-100)]" />
      ) : (
        <span className="h-6 w-6 rounded-full border-2 border-dashed border-charcoal-200 bg-white" />
      )}
      <span
        className={`text-sm font-bold ${
          status === "todo" ? "text-charcoal-400" : "text-charcoal-900"
        } group-hover:text-coral-600`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function Dashboard() {
  const { state, activeService: svc } = useStore();
  const firstName = state.profile.name.trim().split(/\s+/)[0] || "";
  const planStarted = Boolean(svc.title || svc.theme || svc.scripture || svc.oneThing);

  const teamRoles = svc.teams.flatMap((t) => t.roles);
  const confirmed = teamRoles.filter((r) => r.status === "ok");
  const awaiting = teamRoles.filter((r) => r.status === "wait");
  const open = teamRoles.filter((r) => r.status === "no");

  const allSongs = svc.setSections
    .flatMap((s) => sectionSongIds(s).map((id) => svc.songs.find((song) => song.id === id)))
    .filter((s): s is Song => Boolean(s));
  const totalSec = serviceSetDurationSec(svc);

  const doneCount = (["pray", "plan", "prep"] as const).filter(
    (k) => svc.status[k] === "done",
  ).length;
  const { headline, nudge } = getGreeting(firstName, doneCount, svc.date);
  const next = nextStep(svc, allSongs);
  const conf = confidence(svc, allSongs);
  const streak = prepStreak(state.services);

  const show = (key: string) =>
    !state.profile.dashboardCards?.length || state.profile.dashboardCards.includes(key);

  const stageStatus = (k: "pray" | "plan" | "prep"): "done" | "doing" | "todo" =>
    svc.status[k] === "done" ? "done" : svc.status[k] === "doing" ? "doing" : "todo";

  // ---- Brand-new user: nothing planned yet ----
  if (!planStarted) {
    return (
      <div className="mx-auto max-w-3xl py-10" data-tour="dash-hero">
        <p className="label text-coral-600">Start here</p>
        <h1 className="headline mt-2 text-4xl text-charcoal-900 lg:text-5xl">
          Plan your first service
        </h1>
        <p className="editorial mt-4 max-w-xl text-xl text-charcoal-600">
          Nothing&rsquo;s on the calendar yet. Start with {fullDate(svc.date)} &mdash; the heart of
          the service first, then the set, the team, and the prep follow.
        </p>
        <Link
          href="/plan?setup=new"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-coral-500 px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
        >
          Plan your first service
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* ---- Greeting ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4" data-tour="dash-hero">
        <div className="min-w-0">
          <p className="label text-coral-600">
            {fullDate(svc.date)} · {daysOutLabel(svc.date)}
          </p>
          <h1 className="headline mt-1.5 text-4xl text-charcoal-900 lg:text-[2.85rem]">
            {headline}.
          </h1>
          <p className="mt-2.5 text-[15px] text-charcoal-600">
            <Link href="/plan" className="font-semibold hover:text-coral-600">
              {serviceDisplayTitle(svc)}
            </Link>
            {svc.scripture && <span className="text-charcoal-400"> · {svc.scripture}</span>}
            <span className="text-charcoal-400">
              {" "}
              ·{" "}
              <Link
                href="/profile"
                className="border-b border-dotted border-charcoal-200 hover:border-coral-500 hover:text-coral-600"
              >
                {state.profile.serviceTime} service
              </Link>
            </span>
          </p>
          {nudge && <p className="editorial mt-1 text-charcoal-400">{nudge}</p>}
        </div>
        <div className="flex items-center gap-3">
          <ServiceSwitcher />
          {daysUntil(svc.date) === 0 ? (
            <Link
              href="/live"
              className="flex items-center gap-1.5 rounded-full bg-charcoal-800 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-charcoal-900"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-400" /> Go live
            </Link>
          ) : (
            doneCount < 3 && (
              // ONE way in — the mode decides the method. Guided walks the
              // coached loop; Fast opens the 15-minute plan.
              <Link
                href={profileMode(state.profile) === "fast" ? "/quick" : "/plan?tab=pray"}
                className="hidden items-center gap-1.5 rounded-full bg-coral-500 px-4 py-2 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600 sm:flex"
              >
                <Icon name="sparkle" size={15} /> Plan this service
              </Link>
            )
          )}
          <Link
            href="/profile"
            className="hidden items-center gap-1.5 rounded-full border border-charcoal-100 px-3.5 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-200 sm:flex"
          >
            <Icon name="settings" size={15} /> Customize
          </Link>
        </div>
      </div>

      {/* ---- The loop, one thread ---- */}
      {show("progress") && (
        <div className="mt-9 flex flex-wrap items-center gap-x-4 gap-y-3">
          <LoopNode label="Pray" status={stageStatus("pray")} href="/plan?tab=pray" />
          <span
            aria-hidden
            className={`hidden h-0.5 min-w-8 flex-1 rounded-full sm:block ${
              stageStatus("pray") === "done"
                ? "bg-gradient-to-r from-ok-bar to-coral-400"
                : "bg-cream-200"
            }`}
          />
          <LoopNode label="Plan" status={stageStatus("plan")} href="/plan" />
          {doneCount < 3 && (
            <Link
              href={next.href}
              className="text-[13px] font-medium text-charcoal-400 hover:text-coral-600"
            >
              · next: {next.label}
            </Link>
          )}
          <span
            aria-hidden
            className={`hidden h-0.5 min-w-8 flex-1 rounded-full sm:block ${
              stageStatus("plan") === "done"
                ? "bg-gradient-to-r from-ok-bar to-coral-400"
                : "bg-cream-200"
            }`}
          />
          <LoopNode label="Prep" status={stageStatus("prep")} href="/plan?tab=prep" />
          {stageStatus("prep") === "todo" && (
            <span className="text-[13px] font-medium text-charcoal-300">
              {daysUntil(svc.date) >= 2 ? "Saturday" : "today"}
            </span>
          )}
        </div>
      )}

      {/* ---- Set · Team · Confidence ---- */}
      <div className="mt-9 grid gap-y-10 border-t border-charcoal-100 pt-8 lg:grid-cols-[1.25fr_1fr_1fr] lg:gap-y-0">
        {/* The set */}
        {show("set") && (
          <section className="lg:pr-8">
            <div className="flex items-baseline justify-between">
              <h2 className="label text-charcoal-400">The set</h2>
              <span className="text-xs font-semibold text-charcoal-400">
                {fmtDuration(totalSec)}
              </span>
            </div>
            <div className="mt-2">
              {allSongs.map((s) => (
                <Link
                  key={s.id}
                  href="/set"
                  className="group flex items-center gap-3.5 border-b border-cream-200 py-3"
                >
                  <KeyBadge k={s.serviceKey} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-charcoal-900 group-hover:text-coral-600">
                      {s.title}
                    </span>
                    <span className="block truncate text-xs text-charcoal-400">
                      {s.artist}
                      {s.leadName ? ` · ${s.leadName.split(" ")[0]} leads` : ""}
                      {s.flow ? ` · ${s.flow.toLowerCase()}` : ""}
                    </span>
                  </span>
                  <span className="border-b border-dotted border-charcoal-200 text-xs text-charcoal-400 group-hover:border-coral-400">
                    {fmtDuration(s.durationSec)}
                  </span>
                </Link>
              ))}
              <Link
                href="/set"
                className="flex items-center gap-2 py-3.5 text-sm font-semibold text-coral-600 hover:text-coral-500"
              >
                <Icon name="plus" size={15} /> Add a song or moment
              </Link>
            </div>
          </section>
        )}

        {/* Team */}
        {show("team") && (
          <section className="lg:border-l lg:border-charcoal-100 lg:px-8">
            <div className="flex items-baseline justify-between">
              <h2 className="label text-charcoal-400">
                Team · {confirmed.length} of {teamRoles.length} confirmed
              </h2>
              <Link href="/team" className="text-xs font-semibold text-coral-600 hover:underline">
                Manage
              </Link>
            </div>
            {teamRoles.length > 0 && (
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-cream-200">
                <span
                  className="bg-ok-bar"
                  style={{ width: `${(confirmed.length / teamRoles.length) * 100}%` }}
                />
                <span
                  className="bg-wait-bar"
                  style={{ width: `${(awaiting.length / teamRoles.length) * 100}%` }}
                />
              </div>
            )}
            <div className="mt-2">
              {awaiting.slice(0, 2).map((r) => (
                <Link
                  key={r.id}
                  href="/team"
                  className="group flex items-center gap-2.5 border-b border-cream-200 py-3 text-sm"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-wait-bar" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-charcoal-800">
                    {r.person || r.position}
                    <span className="font-normal text-charcoal-400"> · {r.position}</span>
                  </span>
                  <span className="text-xs font-bold text-coral-600 group-hover:underline">
                    Nudge
                  </span>
                </Link>
              ))}
              {open.slice(0, 2).map((r) => (
                <Link
                  key={r.id}
                  href="/team"
                  className="group flex items-center gap-2.5 border-b border-cream-200 py-3 text-sm"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-no-bar" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-charcoal-800">
                    {r.position}
                    <span className="font-normal text-charcoal-400"> · open</span>
                  </span>
                  <span className="text-xs font-bold text-coral-600 group-hover:underline">
                    Fill slot
                  </span>
                </Link>
              ))}
              {awaiting.length === 0 && open.length === 0 && teamRoles.length > 0 && (
                <p className="border-b border-cream-200 py-3 text-sm text-charcoal-400">
                  Everyone&rsquo;s confirmed. Well led.
                </p>
              )}
              {teamRoles.length === 0 && (
                <p className="border-b border-cream-200 py-3 text-sm text-charcoal-400">
                  No roster yet for this Sunday.
                </p>
              )}
              <div className="flex items-center py-3.5">
                {confirmed.slice(0, 5).map((r, i) => (
                  <span
                    key={r.id}
                    title={r.person}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-cream-100 bg-charcoal-100 text-[10px] font-bold text-charcoal-600 ${
                      i > 0 ? "-ml-2" : ""
                    }`}
                  >
                    {initialsOf(r.person)}
                  </span>
                ))}
                {confirmed.length > 5 && (
                  <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-cream-100 bg-charcoal-100 text-[10px] font-bold text-charcoal-600">
                    +{confirmed.length - 5}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Saturday confidence */}
        <section className="lg:border-l lg:border-charcoal-100 lg:pl-8">
          <h2 className="label text-charcoal-400">Saturday confidence</h2>
          <div className="mt-2 flex flex-col items-center">
            <SunriseGauge pct={conf.pct} />
            <p className="mt-1 max-w-[26ch] text-center text-xs text-charcoal-400">
              {conf.parts.join(" · ")}
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/packet"
              className="flex items-center justify-center gap-2 rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
            >
              Send the packet
            </Link>
            <Link
              href="/team"
              className="flex items-center justify-center gap-2 rounded-full border border-charcoal-100 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition-colors hover:border-charcoal-200"
            >
              Same team as last week
            </Link>
          </div>
          {show("capacity") && svc.capacity.note && (
            <p className="mt-4 text-center text-xs text-charcoal-400">
              <span className="font-bold uppercase tracking-wide">
                {svc.capacity.level} capacity
              </span>{" "}
              · {svc.capacity.note}
            </p>
          )}
        </section>
      </div>

      {/* ---- Quote · streak · win ---- */}
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-charcoal-100 pt-7">
        {svc.theme && (
          <p className="editorial min-w-0 max-w-xl text-lg text-charcoal-700">
            &ldquo;{svc.theme}&rdquo;
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {streak >= 2 && (
            <span className="rounded-full bg-coral-100 px-3.5 py-1.5 text-xs font-bold text-coral-600">
              ◆ {streak} weeks prepared in a row
            </span>
          )}
          {doneCount === 3 && (
            <span className="rounded-full bg-cream-200 px-3.5 py-1.5 text-xs font-semibold text-charcoal-600">
              This week&rsquo;s win: everything&rsquo;s done early
            </span>
          )}
        </div>
      </div>

      {/* ---- Invest: quarterly goals ---- */}
      {show("goals") && state.goals.length > 0 && (
        <div className="mt-8 border-t border-charcoal-100 pt-7">
          <div className="flex items-baseline justify-between">
            <h2 className="label text-charcoal-400">Your quarterly goals</h2>
            <Link
              href="/invest/goals"
              className="text-xs font-semibold text-teal-600 hover:underline"
            >
              Invest your week
            </Link>
          </div>
          <div className="mt-4 grid gap-x-10 gap-y-4 lg:grid-cols-3">
            {state.goals.slice(0, 3).map((g) => (
              <Link key={g.id} href="/invest/goals" className="group">
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-charcoal-800 group-hover:text-teal-600">
                    {g.label}
                  </span>
                  <span className="text-charcoal-400">{g.pct}%</span>
                </div>
                <ProgressBar pct={g.pct} tone="teal" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
