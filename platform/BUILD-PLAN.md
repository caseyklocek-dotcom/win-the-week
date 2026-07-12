# Win the Week Platform — V1 Build Plan

Church service planning platform for solo and bi-vocational worship leaders. Built on the
Win the Week framework (Pray / Plan / Prep), originally prototyped in the LWP demo.

## Goal

Ship a real, tester-ready web app the founding beta churches can use week to week. Free closed
beta for ~3 months, then $15/mo (founder rate locked for beta churches).

## V1 Scope (locked)

**Accounts & money**
- Self-signup for any worship leader; multiple churches
- $15/mo via Stripe — BUILT but not charged until end of free beta

**Dashboard / profile suite**
- Personalized home: church, upcoming Sunday, plan progress, team status, quarterly goals
- Editable profile: name, church, role, photo, service times, defaults
- Customizable — leader chooses what shows on the dashboard

**Planning core (the gold from the demo)**
- Full Pray / Plan / Prep flow, saved per week
- Worship set builder: type song + key, two chart types, paste Multitracks/SongSelect link
- Solo-managed team roster (team members do NOT log in yet)
- 8-week calendar runway, capacity check-in, quarterly goals

**Chord charts (two types per song)**
1. Built-in editable chart — sections/chords/lyrics stored as data. Live: key change, capo,
   Nashville numbers / numerals / Do-Re-Mi, chart type, layout, style, font, color/B&W,
   print-ready PDF in any key.
2. Uploaded PDF — for existing CCLI/Multitracks charts. Stored/viewable/printable as-is, no transpose.

**Output — service packet**
- Select-and-print/download flow: charts (in chosen keys), AVL/tech notes, running order,
  team assignments, set list summary — generated as ONE combined PDF or print view
- Saveable defaults so it's one tap each week

**Comms**
- Email the team through the system (email-first; SMS is a fast-follow, needs carrier registration)

## Cut from V1
LWP song library, artist profiles, funding campaigns, the map, community messaging, audio/stem
playback, real CCLI/Multitracks API sync, team-member logins, SMS.

## Deferred to V2 (after beta validates)
CCLI/Multitracks partnerships + API sync, ProPresenter export, calendar/email account sync,
planning assistant, team-member logins, SMS.

## Reality checks (decided)
- CCLI SongSelect API and Multitracks.com are partnership-gated — NOT V1. V1 uses manual entry,
  PDF upload, and pasted links instead.
- PDFs can't transpose; only built-in (data) charts can. Hence two chart types.
- Free beta = no Stripe on day one; architect so payment is a clean late addition.

## Tech stack
- Next.js (App Router) + React + TypeScript + Tailwind CSS
- Phase 1: local data (localStorage) so the experience is clickable with zero signups
- Phase 2: Supabase (auth + Postgres + file storage) — free tier
- Phase 3: Resend (team email) — free tier
- Phase 4: Stripe (subscriptions) — end of beta
- Hosting: Vercel free tier; custom domain optional (~$12/yr)

## Cost
Beta runs on free tiers: ~$0/mo (optional domain ~$1/mo). At growth scale ~$25–45/mo, covered by
the $15/mo subscriptions.

## Legal (drafted near end of beta; "Win the Week" as the business entity)
Beta disclaimer · Terms of Service · Privacy Policy · CCLI/copyright note (user responsible for
their own song licensing). Single agree-checkbox at signup; footer links; disclaimer on first login.

## Build order
1. App foundation: project, routing, design system  ← in progress
2. Dashboard / profile suite shell (local data)
3. Pray / Plan / Prep planning core
4. Worship set builder
5. Editable transposable chord chart editor
6. Service packet print/download flow
7. Wire accounts + database + file storage (Casey signup)
8. Wire team email (Casey signup)
9. Legal docs
10. Stripe billing (before free beta ends)
