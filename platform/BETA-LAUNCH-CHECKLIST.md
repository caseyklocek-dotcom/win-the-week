# Beta Launch Checklist — the front door is built, these steps turn it on

Written July 1, 2026. The app now has a public welcome page (`/welcome`),
plan tiers with Advanced gating, and legal pages. Beta signup is a single
"Apply for the Beta" button that opens Casey's Calendly directly — no form,
no database, no email setup required. The items below are the remaining
manual steps only you can do, in priority order.

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

## 2. (Optional) Make a dedicated beta call event type

The "Apply for the Beta" button currently points at your generic "Let's
Connect!" Calendly link (45 min). If you'd rather beta applicants land on
something purpose-built:

1. In Calendly, create "Win the Week Beta Call," 30 minutes.
2. Add questions: church name, role, and "What's the hardest part of your week?"
3. Update `BETA_CALL_URL` at the top of `src/app/welcome/page.tsx` with the new link.

## 3. Review the legal drafts

Read `/terms` and `/privacy` in the app (drafted plain-English, beta-scoped).
Adjust anything that doesn't sound like you. Before billing ever goes live,
have them reviewed properly.

## 4. Deploy and point Supabase at production

1. Deploy to Vercel as usual (env vars are already set if the current deploy works).
2. Supabase → **Authentication → URL Configuration**: make sure your live
   domain and `https://YOUR-DOMAIN/login` are in Site URL / Redirect URLs.
3. Visit the live site signed out: you should land on `/welcome`.

## How the money story works right now

- The public landing page (`/welcome`) is beta-only — no pricing, no "start a
  free trial." The only call to action is applying for the beta. Base/Advanced
  pricing still exists in the code (`src/lib/plan.ts`) for when billing
  actually launches, it's just not pitched anywhere public yet.
- Nothing is actually billed. Every new account defaults to the "Founding
  Beta" tier: everything unlocked, free during beta, with a founder rate
  locked in when billing begins.

## Not built yet (deliberately)

- Stripe checkout and billing enforcement — end of beta.
