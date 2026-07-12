"use client";

// The Growth section (Compass, goals, Leaders on Deck) is Advanced-tier.
// Base accounts see an upgrade screen instead. During the free beta the
// switch is instant and free — billing enforcement arrives with Stripe.

import { useStore } from "@/lib/store";
import { hasAdvanced } from "@/lib/plan";
import { Icon } from "@/components/Icon";

const ADVANCED_PITCH = [
  { icon: "compass", text: "Leader Compass: see where you stand and retake it each season" },
  { icon: "target", text: "Quarterly goals with milestones, tied to your Compass" },
  { icon: "trendingUp", text: "Leaders on Deck: raise up your next leaders, area by area" },
];

export default function GrowthLayout({ children }: { children: React.ReactNode }) {
  const { state, setState } = useStore();

  if (hasAdvanced(state.plan)) return <>{children}</>;

  const upgrade = () =>
    setState((s) => ({ ...s, plan: { ...(s.plan ?? { tier: "base" }), tier: "advanced" } }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-[var(--shadow-md)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
          <Icon name="compass" size={24} />
        </div>
        <div className="label mt-5 text-teal-600">Advanced</div>
        <h1 className="headline mt-2 text-2xl text-charcoal-900">Grow past survival</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-charcoal-600">
          You&rsquo;re on the Base plan, which covers everything this Sunday needs. Growth is the
          long game: Advanced adds the tools for where you and your team are headed.
        </p>
        <ul className="mx-auto mt-6 max-w-md space-y-3 text-left">
          {ADVANCED_PITCH.map((f) => (
            <li key={f.text} className="flex items-start gap-3 text-sm text-charcoal-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Icon name={f.icon} size={16} />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
        <button
          onClick={upgrade}
          className="mt-7 inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-600"
        >
          Upgrade to Advanced
          <Icon name="arrowRight" size={15} />
        </button>
        <p className="mt-3 text-xs text-charcoal-400">
          $30/mo after the beta ($15 more than Base). Free while the beta runs, so the upgrade
          is instant today.
        </p>
      </div>
    </div>
  );
}
