-- ============================================================
-- Service packets — run once in the Supabase SQL editor.
--
-- Makes packet links real across devices: the leader publishes a packet,
-- the volunteer opens it on their phone (no account), confirms or declines,
-- checks off practice steps, and can leave a note. Tokens are unguessable
-- capability links, so reads/writes go through SECURITY DEFINER functions
-- keyed by the token — there is deliberately NO public SELECT policy, which
-- keeps the table un-enumerable.
-- ============================================================

create table if not exists public.packets (
  token text primary key,
  owner uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.packet_responses (
  token text primary key references public.packets (token) on delete cascade,
  status text check (status in ('confirmed', 'declined')),
  reason text,
  note text,
  practice jsonb not null default '[]'::jsonb,
  opened_at timestamptz,
  responded_at timestamptz
);

alter table public.packets enable row level security;
alter table public.packet_responses enable row level security;

-- Leaders manage their own packets.
drop policy if exists "owner manages own packets" on public.packets;
create policy "owner manages own packets" on public.packets
  for all using (auth.uid() = owner) with check (auth.uid() = owner);

-- Leaders read responses to their own packets (the Send board).
drop policy if exists "owner reads own responses" on public.packet_responses;
create policy "owner reads own responses" on public.packet_responses
  for select using (
    exists (
      select 1 from public.packets p
      where p.token = packet_responses.token and p.owner = auth.uid()
    )
  );

-- ---- Volunteer-side functions (token = capability) ----

create or replace function public.get_packet(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select payload from public.packets where token = p_token;
$$;

create or replace function public.packet_mark_opened(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.packets where token = p_token) then return; end if;
  insert into public.packet_responses (token, opened_at)
  values (p_token, now())
  on conflict (token) do update
    set opened_at = coalesce(packet_responses.opened_at, excluded.opened_at);
end;
$$;

create or replace function public.packet_respond(p_token text, p_status text, p_reason text)
returns public.packet_responses language plpgsql security definer set search_path = public as $$
declare result public.packet_responses;
begin
  if p_status not in ('confirmed', 'declined') then
    raise exception 'bad status';
  end if;
  if not exists (select 1 from public.packets where token = p_token) then
    raise exception 'no such packet';
  end if;
  insert into public.packet_responses (token, status, reason, responded_at)
  values (p_token, p_status, p_reason, now())
  on conflict (token) do update
    set status = excluded.status, reason = excluded.reason, responded_at = excluded.responded_at
  returning * into result;
  return result;
end;
$$;

create or replace function public.packet_practice(p_token text, p_practice jsonb)
returns public.packet_responses language plpgsql security definer set search_path = public as $$
declare result public.packet_responses;
begin
  if not exists (select 1 from public.packets where token = p_token) then
    raise exception 'no such packet';
  end if;
  insert into public.packet_responses (token, practice)
  values (p_token, coalesce(p_practice, '[]'::jsonb))
  on conflict (token) do update set practice = excluded.practice
  returning * into result;
  return result;
end;
$$;

create or replace function public.packet_note(p_token text, p_note text)
returns public.packet_responses language plpgsql security definer set search_path = public as $$
declare result public.packet_responses;
begin
  if not exists (select 1 from public.packets where token = p_token) then
    raise exception 'no such packet';
  end if;
  insert into public.packet_responses (token, note)
  values (p_token, p_note)
  on conflict (token) do update set note = excluded.note
  returning * into result;
  return result;
end;
$$;

grant execute on function
  public.get_packet(text),
  public.packet_mark_opened(text),
  public.packet_respond(text, text, text),
  public.packet_practice(text, jsonb),
  public.packet_note(text, text)
to anon, authenticated;
