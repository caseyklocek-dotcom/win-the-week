import type { AppState, PlanState, PlanTier } from "./types";

// The welcome page stashes the tier a visitor picked before they sign in;
// migratePlan picks it up on their first load so the new account starts on
// the plan they chose.
export const SIGNUP_PLAN_KEY = "wtw_signup_plan";

export const TRIAL_DAYS = 14;

// Single source of truth for how each tier is presented across the welcome
// page, the profile Plan card, and the Growth upgrade screen.
export const PLAN_META: Record<
  PlanTier,
  { name: string; price: string; blurb: string }
> = {
  base: {
    name: "Base",
    price: "$15/mo",
    blurb: "The 5-hour planner, the 8-week framework, and the community.",
  },
  advanced: {
    name: "Advanced",
    price: "$30/mo",
    blurb: "Everything in Base plus the Leader Compass, quarterly goals, and Leaders on Deck.",
  },
  beta: {
    name: "Founding Beta",
    price: "Free during beta",
    blurb: "Every feature unlocked, with a founder rate locked in when billing begins.",
  },
};

// Does this tier see the Growth section (Compass, goals, Leaders on Deck)?
export function hasAdvanced(plan: PlanState | undefined): boolean {
  return (plan?.tier ?? "beta") !== "base";
}

export function trialDaysLeft(plan: PlanState | undefined): number | null {
  if (!plan?.trialStartedAt || plan.tier === "beta") return null;
  const elapsed = Date.now() - new Date(plan.trialStartedAt).getTime();
  return Math.max(0, TRIAL_DAYS - Math.floor(elapsed / 86_400_000));
}

// Lazy migration, same pattern as the other lib migrations: accounts that
// predate plans (the founding beta testers) get full access; a fresh account
// that arrived through the welcome page starts on the tier it picked there.
export function migratePlan(s: AppState): AppState {
  if (s.plan) return s;
  let tier: PlanTier = "beta";
  let trialStartedAt: string | undefined;
  if (typeof window !== "undefined") {
    const chosen = window.localStorage.getItem(SIGNUP_PLAN_KEY);
    if (chosen === "base" || chosen === "advanced") {
      tier = chosen;
      trialStartedAt = new Date().toISOString();
      window.localStorage.removeItem(SIGNUP_PLAN_KEY);
    }
  }
  return { ...s, plan: { tier, trialStartedAt } };
}
