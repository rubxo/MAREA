-- Story lifetimes are server-owned, including clients with an incorrect clock.
create or replace function private.stamp_story_lifetime()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;
create trigger stories_stamp_lifetime before insert on public.stories
for each row execute function private.stamp_story_lifetime();

create index stories_creation_cursor on public.stories (created_at desc, id desc);

drop policy stories_insert_self on public.stories;
create policy stories_insert_self on public.stories for insert to authenticated
with check (
  author_id = (select auth.uid())
  and storage_path like (select auth.uid())::text || '/%'
  and expires_at <= created_at + interval '24 hours'
);
