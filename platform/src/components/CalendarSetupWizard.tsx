"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { CalendarProvider } from "@/lib/types";

const PROVIDERS: { id: CalendarProvider; label: string; note: string }[] = [
  { id: "google", label: "Google Calendar", note: "Live two-way calendar sync" },
  { id: "microsoft", label: "Microsoft Outlook", note: "Live two-way calendar sync" },
  { id: "apple", label: "Apple Calendar", note: "Use a calendar file while direct access is prepared" },
];

export function CalendarSetupWizard({
  onImport,
  onPreview,
}: {
  onImport: (file: File, provider: CalendarProvider, detailMode: "titles" | "busy") => Promise<void>;
  onPreview: (detailMode: "titles" | "busy") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<CalendarProvider>("google");
  const [detailMode, setDetailMode] = useState<"titles" | "busy">("titles");
  const [availability, setAvailability] = useState<Record<"google" | "microsoft", boolean>>({
    google: false,
    microsoft: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar/status")
      .then((response) => response.json())
      .then((status) => {
        if (cancelled) return;
        setAvailability({
          google: Boolean(status.google?.configured),
          microsoft: Boolean(status.microsoft?.configured),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const liveProvider = provider === "google" || provider === "microsoft";
  const canConnect = liveProvider && availability[provider];

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-charcoal-100 bg-cream-50">
      <div className="flex items-center gap-2 border-b border-charcoal-100 px-5 py-3">
        {[0, 1, 2].map((item) => (
          <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? "bg-coral-500" : "bg-charcoal-100"}`} />
        ))}
      </div>
      <div className="p-5 sm:p-7">
        {step === 0 && (
          <>
            <div className="label text-coral-600">First-time setup · 1 of 3</div>
            <h2 className="mt-1 text-2xl font-bold text-charcoal-900">Bring your calendars together</h2>
            <p className="mt-2 max-w-2xl text-sm text-charcoal-500">
              Choose where most of your commitments live. You can layer additional calendars in the next step.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {PROVIDERS.map((item) => (
                <button key={item.id} onClick={() => setProvider(item.id)} className={`rounded-xl border p-4 text-left transition ${provider === item.id ? "border-coral-400 bg-coral-100/60 shadow-[0_0_0_2px_var(--color-coral-100)]" : "border-charcoal-100 bg-white hover:border-charcoal-200"}`}>
                  <span className="block text-sm font-bold text-charcoal-900">{item.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-charcoal-500">{item.note}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {provider === "apple" ? (
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
                  <Icon name="upload" size={15} /> Continue to Import
                </button>
              ) : canConnect ? (
                <a href={`/api/calendar/${provider}/start`} className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600">
                  <Icon name="link" size={15} /> Connect {provider === "microsoft" ? "Outlook" : "Google"}
                </a>
              ) : (
                <button disabled className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-charcoal-200 px-5 py-2.5 text-sm font-bold text-charcoal-500">
                  <Icon name="link" size={15} />
                  Connect {provider === "microsoft" ? "Outlook" : "Google"}
                </button>
              )}
              {provider !== "apple" && <button onClick={() => setStep(1)} className="rounded-full border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600">Set Up a Preview</button>}
            </div>
            <p className="mt-3 text-xs text-charcoal-400">
              {canConnect
                ? `${provider === "microsoft" ? "Microsoft" : "Google"} sign-in is ready.`
                : provider === "apple"
                  ? "Continue to import an Apple Calendar file safely."
                  : `${provider === "microsoft" ? "Microsoft" : "Google"} connection is waiting for administrator setup.`}
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <div className="label text-coral-600">First-time setup · 2 of 3</div>
            <h2 className="mt-1 text-2xl font-bold text-charcoal-900">Choose what appears</h2>
            <p className="mt-2 max-w-2xl text-sm text-charcoal-500">You stay in control of how much calendar detail Win the Week stores and displays.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setDetailMode("titles")} className={`rounded-xl border p-4 text-left ${detailMode === "titles" ? "border-coral-400 bg-coral-100/60" : "border-charcoal-100 bg-white"}`}>
                <span className="block text-sm font-bold text-charcoal-900">Show event titles</span>
                <span className="mt-1 block text-xs text-charcoal-500">Best for recognizing commitments at a glance.</span>
              </button>
              <button onClick={() => setDetailMode("busy")} className={`rounded-xl border p-4 text-left ${detailMode === "busy" ? "border-coral-400 bg-coral-100/60" : "border-charcoal-100 bg-white"}`}>
                <span className="block text-sm font-bold text-charcoal-900">Only show “Busy”</span>
                <span className="mt-1 block text-xs text-charcoal-500">Keep titles private while still avoiding conflicts.</span>
              </button>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setStep(0)} className="rounded-full border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600">Back</button>
              <button onClick={() => setStep(2)} className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white">Preview My Week</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="label text-coral-600">First-time setup · 3 of 3</div>
            <h2 className="mt-1 text-2xl font-bold text-charcoal-900">Start with a safe preview</h2>
            <p className="mt-2 max-w-2xl text-sm text-charcoal-500">See the complete workflow using sample calendar layers, or import a current calendar file. Nothing is written back until you choose it.</p>
            <input ref={fileRef} type="file" accept=".ics,text/calendar" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onImport(file, provider, detailMode); event.target.value = ""; }} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => onPreview(detailMode)} className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-coral)]"><Icon name="calendar" size={15} /> Open Unified Calendar</button>
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600"><Icon name="upload" size={15} /> Import Calendar File</button>
              <button onClick={() => setStep(1)} className="rounded-full px-4 py-2.5 text-sm font-semibold text-charcoal-500">Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
