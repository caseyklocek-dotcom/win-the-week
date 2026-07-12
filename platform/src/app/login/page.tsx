"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  const router = useRouter();
  const { enabled, loading, session, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Already signed in (or auth disabled) → no reason to be here.
  useEffect(() => {
    if (!loading && (session || !enabled)) router.replace("/");
  }, [loading, session, enabled, router]);

  // A magic link that came back with an error (expired, already used) lands here
  // with the details in the URL hash. Surface it kindly and clean the URL.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.hash) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get("error_code");
    const desc = params.get("error_description");
    if (code || desc) {
      setError(
        code === "otp_expired"
          ? "That sign-in link expired. Request a fresh one below and open it within the hour."
          : (desc ?? "").replace(/\+/g, " ") || "Something went wrong with that link.",
      );
      setStatus("error");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);
    const err = await signInWithEmail(email);
    if (err) {
      setError(err);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <svg viewBox="248 347 1004 895" className="h-9 w-9 text-coral-500" fill="currentColor" aria-hidden="true">
            <g transform="translate(247,0)">
              <path d="M 641.828125 676.425781 L 1.046875 879.589844 L 1004.945312 1242.070312 Z" />
              <path d="M 644.914062 916.925781 L 1004.710938 347.28125 L 1.230469 718.039062 Z" />
            </g>
          </svg>
          <span className="headline text-xl leading-none">
            Win the<br />Week
          </span>
        </div>

        <div className="rounded-2xl border border-charcoal-100 bg-white p-6 shadow-[var(--shadow-lg)]">
          {status === "sent" ? (
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ok-tint text-ok-ink">
                <Icon name="check" size={22} />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-charcoal-900">Check your email</h1>
              <p className="mt-2 text-sm text-charcoal-600">
                We sent a sign-in link to <span className="font-semibold">{email}</span>. Open it on
                this device and you&rsquo;ll land right in your dashboard.
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-5 text-sm font-semibold text-coral-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h1 className="text-2xl font-bold text-charcoal-900">Sign in</h1>
              <p className="mt-1 text-sm text-charcoal-500">
                Enter your email and we&rsquo;ll send you a one-tap sign-in link. No password to
                remember.
              </p>
              <div className="mt-5">
                <label className="label mb-1 block text-charcoal-400">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@church.org"
                  className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2.5 text-sm font-medium text-charcoal-800 outline-none focus:border-coral-400"
                />
              </div>
              {status === "error" && error && (
                <p className="mt-2 text-sm text-no-ink">{error}</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send me a link"}
                {status !== "sending" && <Icon name="arrowRight" size={15} />}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-charcoal-400">
          New here?{" "}
          <a href="/welcome" className="font-semibold text-coral-600 hover:underline">
            See what Win the Week is
          </a>
        </p>
        <p className="mt-2 text-center text-xs text-charcoal-400">
          By signing in you agree to the{" "}
          <a href="/terms" className="underline hover:text-coral-600">Terms</a> and{" "}
          <a href="/privacy" className="underline hover:text-coral-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
