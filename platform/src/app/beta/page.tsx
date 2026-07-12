"use client";

// Founding beta application: a short form saved to Supabase, then straight
// into scheduling a call with Casey. Public — no account needed to apply.

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabase";

// Casey's Calendly booking page for beta calls. Swap this if a dedicated
// "Win the Week Beta Call" event type gets created later.
const BETA_CALL_URL = "https://calendly.com/caseyklocek/let-s-connect-clone";

const HOURS_OPTIONS = [
  "Under 5 hours",
  "5 to 10 hours",
  "10 to 15 hours",
  "More than 15 hours",
];

export default function BetaApplyPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    church: "",
    role: "",
    weeklyHours: "",
    struggle: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    if (!supabase) {
      setError("Applications aren't open on this build yet. Email caseyklocek@gmail.com and we'll get you in.");
      setStatus("error");
      return;
    }
    const { error: err } = await supabase.from("beta_applications").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      church: form.church.trim() || null,
      role: form.role.trim() || null,
      weekly_hours: form.weeklyHours || null,
      struggle: form.struggle.trim() || null,
    });
    if (err) {
      console.error("Beta application insert failed:", err);
      setError("Something went wrong saving your application. Try again, or email caseyklocek@gmail.com.");
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  const inputCls =
    "w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2.5 text-sm font-medium text-charcoal-800 outline-none focus:border-coral-400";

  return (
    <div className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/welcome" className="inline-flex items-center gap-2.5">
          <svg viewBox="248 347 1004 895" className="h-8 w-8 text-coral-500" fill="currentColor" aria-hidden="true">
            <g transform="translate(247,0)">
              <path d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z" />
              <path d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z" />
            </g>
          </svg>
          <span className="headline text-lg leading-none text-charcoal-900">
            Win the<br />Week
          </span>
        </Link>

        {status === "sent" ? (
          <div className="mt-8 rounded-2xl border border-charcoal-100 bg-white p-7 shadow-[var(--shadow-lg)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok-tint text-ok-ink">
              <Icon name="check" size={22} />
            </div>
            <h1 className="headline mt-4 text-2xl text-charcoal-900">Application received</h1>
            <p className="mt-2 text-sm text-charcoal-600">
              Thanks, {form.name.split(" ")[0] || "friend"}. One step left: grab a time for a
              short call with Casey. That call is where we make sure the beta is a real fit for
              your week and your church.
            </p>
            <a
              href={BETA_CALL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Schedule Your Call
              <Icon name="arrowRight" size={15} />
            </a>
            <p className="mt-3 text-center text-xs text-charcoal-400">
              Prefer email? Reach Casey at caseyklocek@gmail.com.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-charcoal-100 bg-white p-7 shadow-[var(--shadow-lg)]">
            <div className="label text-coral-600">The founding beta</div>
            <h1 className="headline mt-2 text-2xl text-charcoal-900">Apply to join</h1>
            <p className="mt-2 text-sm text-charcoal-600">
              A small group of worship leaders is shaping Win the Week before it opens wide.
              Tell us about your week, then schedule a short call with Casey to see if it&rsquo;s
              a fit.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="label mb-1 block text-charcoal-400">Your name</label>
                <input required value={form.name} onChange={set("name")} className={inputCls} placeholder="First and last name" />
              </div>
              <div>
                <label className="label mb-1 block text-charcoal-400">Email</label>
                <input required type="email" value={form.email} onChange={set("email")} className={inputCls} placeholder="you@church.org" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label mb-1 block text-charcoal-400">Church</label>
                  <input value={form.church} onChange={set("church")} className={inputCls} placeholder="Church name" />
                </div>
                <div>
                  <label className="label mb-1 block text-charcoal-400">Your role</label>
                  <input value={form.role} onChange={set("role")} className={inputCls} placeholder="Worship leader, volunteer…" />
                </div>
              </div>
              <div>
                <label className="label mb-1 block text-charcoal-400">Hours on worship prep each week</label>
                <select required value={form.weeklyHours} onChange={set("weeklyHours")} className={inputCls}>
                  <option value="" disabled>Pick the closest</option>
                  {HOURS_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label mb-1 block text-charcoal-400">What&rsquo;s the hardest part of your week?</label>
                <textarea
                  required
                  rows={3}
                  value={form.struggle}
                  onChange={set("struggle")}
                  className={inputCls}
                  placeholder="The thing that eats your time or steals your peace before Sunday."
                />
              </div>
              {status === "error" && error && <p className="text-sm text-no-ink">{error}</p>}
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send My Application"}
                {status !== "sending" && <Icon name="arrowRight" size={15} />}
              </button>
            </form>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-charcoal-400">
          Founding members use every Advanced feature free during the beta and keep a founder
          rate when billing begins.
        </p>
      </div>
    </div>
  );
}
