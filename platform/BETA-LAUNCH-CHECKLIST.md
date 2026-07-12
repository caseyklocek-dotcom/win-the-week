# Beta Launch Checklist — the front door is built, these steps turn it on

Written July 1, 2026. The app now has a public welcome/pricing page (`/welcome`),
a beta application (`/beta`), plan tiers with Advanced gating, and legal pages.
The items below are the manual steps only you can do, in priority order.

## 1. Fix sign-in email BEFORE beta day (critical)

Supabase's built-in email sends roughly 2 to 4 emails per hour. On beta day,
when several leaders request magic links in the same hour, sign-in will
silently stop working. Fix:

1. Sign up at https://resend.com (free tier: 3,000 emails/mo).
2. Verify your sending domain (or use their onboarding domain to start).
3. In Resend: create an SMTP key (Settings → SMTP).
4. In Supabase: **Authentication → Emails → SMTP Settings** → enable custom
   SMTP and paste the Resend host/port/user/password.
5. Send yourself a test magic link.

## 2. Create the beta applications table (required for /beta to work)

Supabase dashboard → **SQL Editor** → New query → paste all of
`platform/supabase/beta_applications.sql` → Run. Safe to re-run.

Applications then land in **Table Editor → beta_applications**. Check it
daily during the application window (there is no email notification yet;
Calendly emails you when they book the call, so nobody gets lost).

## 3. Calendly: make a dedicated beta call event type

The /beta success screen currently points at your generic "Let's Connect!"
link (45 min). Your Calendly plan blocked creating a new event type through
the API, so make it by hand:

1. In Calendly, create "Win the Week Beta Call," 30 minutes.
2. Add questions: church name, role, and "What's the hardest part of your week?"
3. Update `BETA_CALL_URL` at the top of `src/app/beta/page.tsx` with the new link.

## 4. Review the legal drafts

Read `/terms` and `/privacy` in the app (drafted plain-English, beta-scoped).
Adjust anything that doesn't sound like you. Before billing ever goes live,
have them reviewed properly.

## 5. Deploy and point Supabase at production

1. Deploy to Vercel as usual (env vars are already set if the current deploy works).
2. Supabase → **Authentication → URL Configuration**: make sure your live
   domain and `https://YOUR-DOMAIN/login` are in Site URL / Redirect URLs.
3. Visit the live site signed out: you should land on `/welcome`.

## How the money story works right now

- Pricing shows Base $15/mo and Advanced $30/mo with a 14-day free trial, no card.
- Nothing is actually billed. Trial start dates are recorded per account, so
  when Stripe lands (end of beta, per the build plan) you can enforce cleanly.
- Existing accounts and beta members are on the "Founding Beta" tier: everything
  unlocked, free during beta.
- Base-tier trial accounts see an upgrade screen on the Growth section
  (Compass, Goals, Leaders). The upgrade is instant and free during beta.

## Not built yet (deliberately)

- Stripe checkout and billing enforcement — end of beta.
- Email notification to you when an application arrives — Calendly booking
  emails cover the gap for now.
