"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

// First-run product tour. Mounted in the app shell so it survives navigation.
// Shows once when state.onboarded is false: a welcome card, then a guided walk
// across the key pages, spotlighting one section at a time. Page-based (not
// nav-based) so it works the same on mobile and desktop. Finishing or skipping
// sets onboarded = true; it can be replayed from Profile.

type Step = {
  route: string;
  selector?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    route: "/",
    selector: '[data-tour="dash-hero"]',
    title: "Your home base",
    body: "Every Sunday you're leading shows up right here. Start each week from this screen.",
  },
  {
    route: "/plan?tab=schedule",
    selector: '[data-tour="plan-loop"]',
    title: "Plan in five hours",
    body: "Each service moves through Pray, Plan, and Prep across five focused hours. Tap “Walk me through it” and a coach guides you hour by hour.",
  },
  {
    route: "/set",
    selector: '[data-coach="set"]',
    title: "Build the set",
    body: "Add songs, set keys, and make chord charts you can transpose and print. All in one place.",
  },
  {
    route: "/songs",
    selector: '[data-tour="songs"]',
    title: "Bring in your songs",
    body: "Your song library lives here. Add a song and either build a chart you can transpose and print, or upload an existing PDF from CCLI SongSelect or Multitracks.com.",
  },
  {
    route: "/team",
    selector: '[data-coach="team"]',
    title: "Line up your team",
    body: "Fill each role, track who has confirmed, and message everyone right from here.",
  },
  {
    route: "/tools",
    selector: '[data-tour="tools"]',
    title: "Save your templates",
    body: "Build a rehearsal plan and a team roster once, here in Tools. Then every new service fills itself in instead of starting from scratch.",
  },
  {
    route: "/calendar",
    selector: '[data-tour="runway"]',
    title: "Stay weeks ahead",
    body: "The runway shows what to do 8, 4, 3, 2, and 1 weeks out, so no Sunday sneaks up on you.",
  },
  {
    route: "/growth",
    selector: '[data-tour="growth"]',
    title: "Grow as a leader",
    body: "Take the Worship Leadership Compass, set quarterly goals, and raise up the people around you.",
  },
  {
    route: "/profile",
    selector: '[data-tour="profile"]',
    title: "Make it yours",
    body: "Add your name, church, and service time. You can replay this tour from here anytime.",
  },
  {
    route: "/",
    selector: '[data-tour="dash-hero"]',
    title: "Plan your first Sunday",
    body: "That's the tour. Start right here. Pick a date and I'll walk you through the heart of the service, then the set, the team, and the prep.",
  },
];

// Best-effort spotlight: dims the page except the matched element, with a coral
// ring. Self-hides (no dim) until the element appears, so the tour never gets
// stuck if a section is missing on a given page.
function TourSpotlight({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    let last = "";
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        if (last !== "") {
          last = "";
          setRect(null);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      if (!scrolled) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        scrolled = true;
      }
      const key = `${Math.round(r.top)},${Math.round(r.left)},${Math.round(r.width)},${Math.round(r.height)}`;
      if (key !== last) {
        last = key;
        setRect(r);
      }
    };
    measure();
    const iv = setInterval(measure, 120);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(iv);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [selector]);

  if (!rect) return null;
  const pad = 10;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const right = rect.right + pad;
  const bottom = rect.bottom + pad;
  const dim = "rgba(0,0,0,0.55)";
  const panel = (style: React.CSSProperties) => (
    <div className="no-print" style={{ position: "fixed", background: dim, ...style }} />
  );
  return (
    <div className="no-print fixed inset-0 z-40" style={{ pointerEvents: "none" }}>
      {panel({ top: 0, left: 0, right: 0, height: top })}
      {panel({ top: bottom, left: 0, right: 0, bottom: 0 })}
      {panel({ top, left: 0, width: left, height: bottom - top })}
      {panel({ top, left: right, right: 0, height: bottom - top })}
      <div
        style={{
          position: "fixed",
          top,
          left,
          width: right - left,
          height: bottom - top,
          border: "2px solid var(--color-coral-500)",
          borderRadius: 12,
          boxShadow: "0 0 0 4px rgba(255,107,94,0.25)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function Tour() {
  const { state, activeService, setOnboarded } = useStore();
  const router = useRouter();
  const planStarted = Boolean(
    activeService.title ||
      activeService.theme ||
      activeService.scripture ||
      activeService.oneThing,
  );
  const [phase, setPhase] = useState<"welcome" | "steps">("welcome");
  const [i, setI] = useState(0);
  const lastRoute = useRef<string>("");

  // Navigate to each step's page as the tour advances.
  useEffect(() => {
    if (state.onboarded || phase !== "steps") return;
    const route = STEPS[i].route;
    if (route !== lastRoute.current) {
      lastRoute.current = route;
      router.push(route);
    }
  }, [i, phase, state.onboarded, router]);

  if (state.onboarded) return null;

  const finish = () => setOnboarded(true);
  const finishAndPlan = () => {
    setOnboarded(true);
    // Brand-new user: drop them straight into planning their first service.
    // Returning user (sample data loaded): just land home.
    router.push(planStarted ? "/" : "/plan?setup=new");
  };
  const firstName = state.profile.name.split(" ")[0];

  // ---------- Welcome ----------
  if (phase === "welcome") {
    return (
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-coral-300 bg-white p-6 shadow-[var(--shadow-lg)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-100 text-coral-600">
            <Icon name="home" size={22} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-charcoal-900">
            Welcome to Win the Week{firstName ? `, ${firstName}` : ""}.
          </h2>
          <p className="mt-2 text-sm text-charcoal-600">
            This is your space to prepare for Sunday without the overwhelm. You&rsquo;re starting
            fresh &mdash; let&rsquo;s take 60 seconds so you know where everything lives.
          </p>
          <p className="mt-3 rounded-lg bg-cream-100 px-3 py-2.5 text-xs text-charcoal-500">
            This is a free beta. Your work saves right here in this browser &mdash; nothing to set up.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                setI(0);
                setPhase("steps");
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
            >
              Show me around <Icon name="arrowRight" size={15} />
            </button>
            <button
              onClick={finish}
              className="rounded-lg border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Steps ----------
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;
  return (
    <>
      {step.selector && <TourSpotlight key={step.selector} selector={step.selector} />}
      <div className="no-print fixed bottom-20 left-1/2 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 lg:bottom-6">
        <div className="overflow-hidden rounded-2xl border border-coral-300 bg-white shadow-[var(--shadow-lg)]">
          <div className="flex items-center justify-between gap-2 border-b border-charcoal-100 px-4 py-2.5">
            <span className="label text-coral-600">
              Tour · {i + 1} of {STEPS.length}
            </span>
            <button
              onClick={finish}
              title="End the tour"
              aria-label="End the tour"
              className="text-charcoal-300 transition hover:text-charcoal-700"
            >
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="px-4 pb-4 pt-3">
            <h3 className="text-base font-bold text-charcoal-900">{step.title}</h3>
            <p className="mt-1 text-sm text-charcoal-600">{step.body}</p>

            <div className="mt-3 flex items-center gap-1">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 flex-1 rounded-full ${
                    idx < i ? "bg-coral-300" : idx === i ? "bg-coral-500" : "bg-cream-200"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              {i > 0 && (
                <button
                  onClick={() => setI((n) => Math.max(0, n - 1))}
                  className="rounded-lg border border-charcoal-200 px-4 py-2.5 text-sm font-semibold text-charcoal-600 transition hover:border-charcoal-300"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => (isLast ? finishAndPlan() : setI((n) => n + 1))}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-coral)] transition hover:bg-coral-600"
              >
                {isLast ? (planStarted ? "Finish" : "Plan my first service") : "Next"}{" "}
                <Icon name={isLast ? (planStarted ? "check" : "arrowRight") : "arrowRight"} size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
