-- Win the Week — per-user app state (Phase 2 data migration)
-- Run this ONCE in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run; it won't duplicate anything.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: every leader can only read/write their OWN row.
alter table public.app_state enable row level security;

drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
  on public.app_state for select
  using (auth.uid() = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
  on public.app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
  on public.app_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own"
  on public.app_state for delete
  using (auth.uid() = user_id);
