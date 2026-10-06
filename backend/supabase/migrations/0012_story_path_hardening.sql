-- Reassert the folder constraint for installations that applied the initial
-- story migration before its media-path validation was introduced.
drop policy if exists stories_insert_self on public.stories;
create policy stories_insert_self on public.stories for insert to authenticated
with check (
  author_id = (select auth.uid())
  and split_part(storage_path, '/', 1) = (select auth.uid())::text
  and expires_at <= created_at + interval '24 hours'
);
