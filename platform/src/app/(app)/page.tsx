"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card, Label, Pill, ProgressBar, KeyBadge } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ServiceSwitcher } from "@/components/ServiceSwitcher";
import { fmtDuration, weekdayName } from "@/lib/music";
import { sectionSongIds, serviceDisplayTitle, serviceSetDurationSec } from "@/lib/set";

function fullDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getGreeting(
  firstName: string,
  doneCount: number,
  svcDate: string,
): { headline: string; nudge: string | null } {
  const now = new Date();
  const hour = now.getHours();
  // With no profile name, the greeting stands on its own — no ", name" tail.
  const name = firstName ? ", " + firstName : "";

  const svcDateObj = new Date(svcDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round(
    (svcDateObj.getTime() - today.getTime()) / 86_400_000,
  );

  // It's game day
  if (daysUntil === 0) {
    return { headline: `It's ${weekdayName(svcDate)}${name}`, nudge: "Go lead well." };
  }

  // All three stages done
  if (doneCount === 3) {
    const opts = [
      "Sunday's covered. Rest well.",
      "Everything's locked. Nice work.",
      "All set. Enjoy the week.",
    ];
    return {
      headline: `You're ready${name}`,
      nudge: opts[now.getDate() % opts.length],
    };
  }

  // Crunch time (≤ 2 days out) and nothing started
  if (daysUntil <= 2 && doneCount === 0) {
    return {
      headline: `Sunday's close${name}`,
      nudge: "Start anywhere. Just start.",
    };
  }

  // Crunch time, partially done
  if (daysUntil <= 2) {
    return { headline: `Almost there${name}`, nudge: "Finish strong." };
  }

  // Stage-aware mid-week greetings
  if (doneCount === 1) {
    return {
      headline: `Prayed up${name}`,
      nudge: "Time to build the plan.",
    };
  }
  if (doneCount === 2) {
    return {
      headline: `Plan's locked${name}`,
      nudge: "Prep is all that's left.",
    };
  }

  // Nothing started — use time of day
  if (hour < 6)
    return {
      headline: `Burning the midnight oil${name}`,
      nudge: "Where do you want to start?",
    };
  if (hour < 9)
    return {
      headline: `Early start${name}`,
      nudge: "What do you want to tackle first?",
    };
  if (hour < 12)
    return {
      headline: `Good morning${name}`,
      nudge: "Where do you want to begin?",
    };
  if (hour < 17)
    return {
      headline: `Good week${name}`,
      nudge: "Start wherever feels right.",
    };
  if (hour < 21)
    return {
      headline: `Good evening${name}`,
      nudge: "Ready to plan for Sunday?",
    };
  return {
    headline: `Still at it${name}`,
    nudge: "Burning the midnight oil.",
  };
}

export default function Dashboard() {
  const { state, activeService: svc } = useStore();
  // Empty when there's no profile name yet — the greetings drop the name tail.
  const firstName = state.profile.name.trim().split(/\s+/)[0] || "";
  const planStarted = Boolean(svc.title || svc.theme || svc.scripture || svc.oneThing);

  const teamRoles = svc.teams.flatMap((t) => t.roles);
  const confirmed = teamRoles.filter((r) => r.status === "ok").length;
  const awaiting = teamRoles.filter((r) => r.status === "wait").length;
  const open = teamRoles.filter((r) => r.status === "no").length;

  const allSongs = svc.setSections.flatMap((s) =>
    sectionSongIds(s).map((id) => svc.songs.find((song) => song.id === id)).filter(Boolean),
  );
  const totalSec = serviceSetDurationSec(svc);

  const statusOrder = { done: 2, doing: 1, todo: 0 } as const;
  const stages = [
    { key: "pray", label: "Pray", desc: "The heart and the people", href: "/plan?tab=pray" },
    { key: "plan", label: "Plan", desc: "The work of the service", href: "/plan?tab=plan" },
    { key: "prep", label: "Prep", desc: "Execution and the close", href: "/plan?tab=prep" },
  ] as const;
  const doneCount = stages.filter(
    (s) => svc.status[s.key] === "done",
  ).length;

  const { headline, nudge } = getGreeting(firstName, doneCount, svc.date);

  const heroCard = (
    <Card data-tour="dash-hero" className="border-coral-300 bg-gradient-to-br from-white to-coral-100/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {planStarted ? (
          <div className="max-w-xl">
            <Label>{fullDate(svc.date)}</Label>
            <h2 className="mt-1 text-2xl font-bold text-charcoal-900">{serviceDisplayTitle(svc)}</h2>
            {svc.theme && (
              <p className="editorial mt-2 text-lg text-charcoal-600">
                &ldquo;{svc.theme}&rdquo;
              </p>
            )}
            {svc.scripture && (
              <p className="mt-3 text-sm text-charcoal-600">
                <span className="font-semibold">Scripture:</span> {svc.scripture}
              </p>
            )}
            {svc.oneThing && (
              <p className="mt-1 text-sm text-charcoal-600">
                <span className="font-semibold">The one thing:</span> {svc.oneThing}
              </p>
            )}
          </div>
        ) : (
          <div className="max-w-xl">
            <Label>This Sunday</Label>
            <h2 className="mt-1 text-2xl font-bold text-charcoal-900">
              Let&rsquo;s plan {fullDate(svc.date)}
            </h2>
            <p className="editorial mt-2 text-lg text-charcoal-600">
              Start with the heart of the service, a theme and a scripture. The rest follows.
            </p>
          </div>
        )}
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
        >
          {planStarted ? "Open the plan" : "Start planning"}
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </Card>
  );

  const progressCard = (
    <Card>
      <div className="flex items-center justify-between">
        <Label>Pray · Plan · Prep</Label>
        <span className="text-sm text-charcoal-400">{doneCount} of 3 done</span>
      </div>
      <div className="mt-4 space-y-3">
        {stages.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className="flex items-center justify-between rounded-lg border border-charcoal-100 px-3 py-2.5 hover:bg-cream-200"
          >
            <div>
              <div className="text-sm font-semibold text-charcoal-800">{s.label}</div>
              <div className="text-xs text-charcoal-400">{s.desc}</div>
            </div>
            <Pill status={svc.status[s.key]} />
          </Link>
        ))}
      </div>
    </Card>
  );

  const teamCard = (
    <Card>
      <div className="flex items-center justify-between">
        <Label>Team this {weekdayName(svc.date)}</Label>
        <Link href="/team" className="text-xs font-semibold text-coral-600 hover:underline">
          Manage
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-ok-tint py-3">
          <div className="text-2xl font-bold text-ok-ink">{confirmed}</div>
          <div className="text-xs font-medium text-charcoal-600">Confirmed</div>
        </div>
        <div className="rounded-lg bg-wait-tint py-3">
          <div className="text-2xl font-bold text-wait-ink">{awaiting}</div>
          <div className="text-xs font-medium text-charcoal-600">Awaiting</div>
        </div>
        <div className="rounded-lg bg-no-tint py-3">
          <div className="text-2xl font-bold text-no-ink">{open}</div>
          <div className="text-xs font-medium text-charcoal-600">Open</div>
        </div>
      </div>
    </Card>
  );

  const setCard = (
    <Card>
      <div className="flex items-center justify-between">
        <Label>The set</Label>
        <span className="text-sm text-charcoal-400">{fmtDuration(totalSec)}</span>
      </div>
      <div className="mt-4 space-y-2">
        {allSongs.map(
          (s) =>
            s && (
              <div key={s.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-charcoal-800">
                    {s.title}
                  </div>
                  <div className="truncate text-xs text-charcoal-400">{s.artist}</div>
                </div>
                <KeyBadge k={s.serviceKey} />
              </div>
            ),
        )}
      </div>
      <Link
        href="/set"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600 hover:underline"
      >
        Build the set <Icon name="arrowRight" size={14} />
      </Link>
    </Card>
  );

  const capacityCard = (
    <Card>
      <Label>Your capacity</Label>
      <div className="mt-3 flex items-center gap-2">
        {(["low", "medium", "high"] as const).map((lvl) => (
          <span
            key={lvl}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              svc.capacity.level === lvl
                ? "bg-charcoal-800 text-white dark:bg-coral-500"
                : "bg-cream-200 text-charcoal-400"
            }`}
          >
            {lvl}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-charcoal-600">{svc.capacity.note}</p>
    </Card>
  );

  const goalsCard = (
    <Card>
      <div className="flex items-center justify-between">
        <Label>Your quarterly goals</Label>
        <Link href="/invest/goals" className="text-xs font-semibold text-teal-600 hover:underline">
          Invest your week
        </Link>
      </div>
      <div className="mt-4 space-y-4">
        {state.goals.map((g) => (
          <div key={g.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-charcoal-800">{g.label}</span>
              <span className="text-charcoal-400">{g.pct}%</span>
            </div>
            <ProgressBar pct={g.pct} tone="teal" />
          </div>
        ))}
        {state.goals.length === 0 && (
          <p className="text-sm text-charcoal-400">No goals yet.</p>
        )}
      </div>
      <Link
        href="/invest/compass"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-coral-600 hover:underline"
      >
        Take the Compass <Icon name="arrowRight" size={14} />
      </Link>
    </Card>
  );

  // Brand-new user: no service has been planned yet. Don't expose the cards that
  // link into a service they never created — point them to plan their first one.
  const firstServiceHero = (
    <Card data-tour="dash-hero" className="border-coral-300 bg-gradient-to-br from-white to-coral-100/40">
      <div className="max-w-xl">
        <Label>Start here</Label>
        <h2 className="mt-1 text-2xl font-bold text-charcoal-900">
          Plan your first service
        </h2>
        <p className="editorial mt-2 text-lg text-charcoal-600">
          Nothing&rsquo;s on the calendar yet. Start with {fullDate(svc.date)} &mdash; the heart of
          the service first, then the set, the team, and the prep follow.
        </p>
        <Link
          href="/plan?setup=new"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-coral-500 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition-colors hover:bg-coral-600"
        >
          Plan your first service
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </Card>
  );

  const CARDS: Record<string, { node: React.ReactNode; full: boolean }> = {
    nextSunday: { node: heroCard, full: true },
    progress: { node: progressCard, full: false },
    team: { node: teamCard, full: false },
    set: { node: setCard, full: false },
    capacity: { node: capacityCard, full: false },
    goals: { node: goalsCard, full: true },
  };

  const cardOrder =
    state.profile.dashboardCards?.length
      ? state.profile.dashboardCards
      : ["nextSunday", "progress", "team", "set", "capacity", "goals"];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="headline text-3xl text-charcoal-900">
            {headline}
          </h1>
          <p className="mt-1 text-charcoal-400">
            {fullDate(svc.date)}
            {svc.title ? ` · ${svc.title}` : ""}
          </p>
          {nudge && (
            <p className="mt-0.5 text-sm text-charcoal-400/70 italic">
              {nudge}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ServiceSwitcher />
          <Link
            href="/profile"
            className="hidden items-center gap-1.5 rounded-lg border border-charcoal-200 px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300 sm:flex"
          >
            <Icon name="settings" size={15} /> Customize
          </Link>
        </div>
      </div>

      {planStarted ? (
        <div className="grid gap-6 md:grid-cols-2">
          {cardOrder
            .filter((key) => CARDS[key])
            .map((key) => (
              <div key={key} className={CARDS[key].full ? "md:col-span-2" : ""}>
                {CARDS[key].node}
              </div>
            ))}
        </div>
      ) : (
        firstServiceHero
      )}
    </div>
  );
}
