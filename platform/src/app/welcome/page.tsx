"use client";

// Public front door: what Win the Week is, and one way in — book a call with
// Casey to join the founding beta. Signed-out visitors land here (RequireAuth
// redirects to /welcome, not /login).

import Link from "next/link";
import { Icon } from "@/components/Icon";

// Casey's Calendly booking page for beta calls.
const BETA_CALL_URL = "https://calendly.com/caseyklocek/let-s-connect-clone";

function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="248 347 1004 895" className={`${className} text-coral-500`} fill="currentColor" aria-hidden="true">
      <g transform="translate(247,0)">
        <path d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z" />
        <path d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z" />
      </g>
    </svg>
  );
}

const STEPS = [
  {
    icon: "heart",
    title: "PRAY",
    body: "Start with the why. Set the one central takeaway for Sunday and let it shape everything that follows.",
  },
  {
    icon: "calendar",
    title: "PLAN",
    body: "Build the set, pick the keys, and schedule the team inside an 8-week runway that keeps you ahead.",
  },
  {
    icon: "music",
    title: "PREP",
    body: "Charts in any key, a guided rehearsal, and a one-tap service packet so nothing essential is missed.",
  },
];

const FEATURES = [
  {
    icon: "music",
    title: "Worship set builder",
    body: "Type a song and a key, drop in your service moments, and watch the running order build itself.",
  },
  {
    icon: "file",
    title: "Charts in any key",
    body: "Editable chord charts with live transpose, capo, and Nashville numbers, plus your own uploaded PDFs.",
  },
  {
    icon: "users",
    title: "Team scheduling",
    body: "A simple roster with templates that fill each Sunday automatically and show who is confirmed at a glance.",
  },
  {
    icon: "printer",
    title: "The service packet",
    body: "Charts, running order, tech notes, and assignments printed as one clean packet in one tap.",
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-cream-100 text-charcoal-800">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="headline text-lg leading-none">
            Win the<br />Week
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-charcoal-600 transition hover:text-coral-600"
          >
            Sign In
          </Link>
          <a
            href={BETA_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Apply for the Beta
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <div className="label text-coral-600">For solo and bi-vocational worship leaders</div>
        <h1 className="headline mx-auto mt-4 max-w-3xl text-4xl text-charcoal-900 sm:text-6xl">
          Prepare faithfully for Sunday in five hours a week
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-charcoal-600">
          One place for your plan, your set, your charts, and your team. The week gets a
          rhythm, the prep gets done, and so Sunday morning you get to worship.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={BETA_CALL_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
          >
            Apply for the Beta
            <Icon name="arrowRight" size={15} />
          </a>
        </div>
      </section>

      {/* Pray / Plan / Prep */}
      <section className="border-y border-charcoal-100 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="label text-coral-600">The framework</div>
          <h2 className="headline mt-2 text-3xl text-charcoal-900">Pray. Plan. Prep.</h2>
          <p className="mt-3 max-w-2xl text-charcoal-600">
            Five focused hours, spread across the week, moving through three phases. Faithfulness
            over perfection, every single week.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="rounded-xl border border-charcoal-100 bg-cream-50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-100 text-coral-600">
                  <Icon name={s.icon} size={22} />
                </div>
                <h3 className="headline mt-4 text-lg text-charcoal-900">{s.title}</h3>
                <p className="mt-2 text-sm text-charcoal-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="label text-coral-600">What&rsquo;s inside</div>
        <h2 className="headline mt-2 text-3xl text-charcoal-900">Built for the week you actually have</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4 rounded-xl border border-charcoal-100 bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-coral-100 text-coral-600">
                <Icon name={f.icon} size={20} />
              </div>
              <div>
                <h3 className="font-bold text-charcoal-900">{f.title}</h3>
                <p className="mt-1 text-sm text-charcoal-600">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Growth (Advanced) — teal, the long game */}
      <section className="border-y border-charcoal-100 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="label text-teal-600">The long game</div>
          <h2 className="headline mt-2 text-3xl text-charcoal-900">Then grow past survival</h2>
          <p className="mt-3 max-w-2xl text-charcoal-600">
            Once the week is under control, Advanced turns the time you got back into growth:
            see where you stand with the Leader Compass, set quarterly goals against it, and
            build the bench with Leaders on Deck.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: "compass", title: "Leader Compass", body: "A self-assessment across the dimensions of worship leadership, tracked over time." },
              { icon: "target", title: "Quarterly goals", body: "Goals with concrete milestones, tied to the Compass so growth is measurable." },
              { icon: "trendingUp", title: "Leaders on Deck", body: "Walk your next leaders from watching to being sent, one area at a time." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-teal-200 bg-teal-50 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <Icon name={f.icon} size={22} />
                </div>
                <h3 className="mt-4 font-bold text-charcoal-900">{f.title}</h3>
                <p className="mt-2 text-sm text-charcoal-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="editorial text-2xl text-charcoal-800">
          &ldquo;Win the Week really makes you be able to just worship on Sunday vs trying to
          figure everything out. It is a game-changer for a worship leader!&rdquo;
        </p>
        <p className="label mt-4 text-charcoal-400">Elijah · Worship Leader</p>
      </section>

      {/* Founding beta */}
      <section className="border-t border-charcoal-100 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="mx-auto max-w-3xl rounded-2xl border border-charcoal-100 bg-charcoal-800 p-7 text-center dark:bg-cream-200">
            <div className="label text-coral-400">The founding beta</div>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white dark:text-charcoal-800">
              A small group of worship leaders is shaping Win the Week before it opens wide.
              Founding members get every Advanced feature free during the beta, a direct line to
              Casey, and a founder rate locked in when billing begins.
            </p>
            <a
              href={BETA_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-coral-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-coral-600"
            >
              Apply for the Beta
              <Icon name="arrowRight" size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-charcoal-100">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-charcoal-400">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-5" />
            <span>Win the Week · Worship leadership for the week you actually have</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-coral-600">Terms</Link>
            <Link href="/privacy" className="hover:text-coral-600">Privacy</Link>
            <Link href="/login" className="hover:text-coral-600">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
