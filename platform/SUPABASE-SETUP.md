# Backend Setup — Supabase (magic-link accounts)

This wires the app to a real backend so worship leaders get real accounts they
can use across devices. Phase 1 (this step): **accounts only** — sign in with a
magic link. Your app data still lives in the browser for now; moving it into the
database and adding calendar sync are the next steps.

Until you finish steps 1–3, the app keeps running exactly as before (no login).
The moment the two keys are in place, the sign-in screen turns on.

---

## 1. Create the Supabase project (~3 min)

1. Go to https://supabase.com and sign up (free).
2. **New project** → name it `win-the-week`, pick a region near you, set a
   database password (save it somewhere; you won't need it day-to-day).
3. Wait ~2 minutes for it to provision.

## 2. Copy your two keys

In the project: **Project Settings → API**. Copy:

- **Project URL** (e.g. `https://abcd1234.supabase.co`)
- **anon public** key (the long one under "Project API keys")

> The `anon` key is safe to ship in the browser. Do **not** use the `service_role`
> key here — that one is secret.

## 3. Add the keys locally

In the `platform/` folder:

1. Copy `.env.local.example` to `.env.local`
2. Paste your values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
   ```

3. Install the new dependency and restart:

   ```
   npm install
   npm run dev
   ```

`.env.local` is git-ignored, so your keys won't be committed.

## 4. Turn on magic-link email + set URLs

In Supabase:

1. **Authentication → Sign In / Providers → Email**: make sure **Email** is
   enabled. (Magic link is on by default; no password needed.)
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3001`
   - **Redirect URLs** → add: `http://localhost:3001/login`
   - (The local server runs on port **3001** — that's what "Start Platform" uses.)
   - When you deploy, also add your live URL and `https://YOUR-DOMAIN/login`.

## 5. Test it

1. Visit `http://localhost:3001` → you should be redirected to `/login`.
2. Enter your email → **Send me a link**.
3. Open the email, click the link → it returns to the app, signed in.
4. **Profile → Account** shows your email with a **Sign out** button.

> Supabase's built-in email is rate-limited (fine for a small beta). For higher
> volume later, add your own SMTP under Authentication → Emails.

---

## When you deploy to Vercel

Add the same two variables in **Vercel → Project → Settings → Environment
Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then add the production URL to Supabase's Site URL + Redirect URLs (step 4).

---

## Per-account data (the data migration) — REQUIRED for accounts to differ

Once accounts are working, run the database table so each leader's data is tied
to their login (instead of shared per-browser):

1. Supabase dashboard → **SQL Editor** → **New query**.
2. Open `platform/supabase/app_state.sql`, paste the whole thing, and **Run**.
   (It's safe to re-run.)

After that, sign in: a brand-new account starts empty (fresh-start + tour), each
account loads only its own data, and that data follows the leader across devices
and browsers. Until this table exists, the app falls back to per-browser
localStorage.

## What's next (not yet built)

- **Calendar sync (OAuth)** — "Connect Google / Apple / Outlook," now possible
  because there's a backend to hold the connection. This replaces the old
  "scan your week" step pointing at the runway.
- **Stripe billing** — at the end of the free beta.
