-- Win the Week — private storage for uploaded PDF chord charts.
-- Run ONCE in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run.

-- Private bucket (files are reachable only via short-lived signed URLs).
insert into storage.buckets (id, name, public)
values ('charts', 'charts', false)
on conflict (id) do nothing;

-- Row-level security: each leader can only touch files inside their own folder
-- (the first path segment is their user id, e.g. "<uid>/song-123.pdf").
drop policy if exists "charts_select_own" on storage.objects;
create policy "charts_select_own"
  on storage.objects for select
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "charts_insert_own" on storage.objects;
create policy "charts_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "charts_update_own" on storage.objects;
create policy "charts_update_own"
  on storage.objects for update
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "charts_delete_own" on storage.objects;
create policy "charts_delete_own"
  on storage.objects for delete
  using (bucket_id = 'charts' and (storage.foldername(name))[1] = auth.uid()::text);
