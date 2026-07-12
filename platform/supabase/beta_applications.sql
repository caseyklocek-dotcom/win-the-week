-- Beta applications — submitted from the public /beta page.
-- Run this in the Supabase SQL Editor (safe to re-run).
--
-- Visitors (signed out) can INSERT an application; nobody can read them
-- through the browser key. You review applications in the Supabase
-- dashboard: Table Editor -> beta_applications.

create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  church text,
  role text,
  weekly_hours text,
  struggle text,
  status text not null default 'new' -- new -> call_scheduled -> accepted / declined
);

alter table public.beta_applications enable row level security;

drop policy if exists "anyone can apply" on public.beta_applications;
create policy "anyone can apply"
  on public.beta_applications
  for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies on purpose: applications are write-only
-- from the app and managed from the dashboard.
