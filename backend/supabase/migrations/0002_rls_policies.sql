create or replace function private.can_view_account(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      owner_id = (select auth.uid())
      or coalesce((select not p.is_private from public.profiles p where p.id = owner_id), false)
      or exists (
        select 1
        from public.follows f
        where f.follower_id = (select auth.uid())
          and f.following_id = owner_id
      )
    );
$$;

create or replace function private.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.conversation_members cm
      where cm.conversation_id = target_conversation_id
        and cm.user_id = (select auth.uid())
    );
$$;

create or replace function private.can_view_post(target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and private.can_view_account(p.author_id)
  );
$$;

create or replace function private.can_view_story(target_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stories s
    where s.id = target_story_id
      and (s.author_id = (select auth.uid()) or s.expires_at > now())
      and private.can_view_account(s.author_id)
  );
$$;

create or replace function private.can_access_realtime_topic(target_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_topic ~ '^conversation:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then private.is_conversation_member(split_part(target_topic, ':', 2)::uuid)
    else false
  end;
$$;

revoke all on function private.can_view_account(uuid) from public;
revoke all on function private.is_conversation_member(uuid) from public;
revoke all on function private.can_view_post(uuid) from public;
revoke all on function private.can_view_story(uuid) from public;
revoke all on function private.can_access_realtime_topic(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_view_account(uuid) to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.can_view_post(uuid) to authenticated;
grant execute on function private.can_view_story(uuid) to authenticated;
grant execute on function private.can_access_realtime_topic(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.follow_requests enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.activities enable row level security;
alter table public.client_operations enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select on public.follow_requests to authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, update, delete on public.post_media to authenticated;
grant select on public.post_likes to authenticated;
grant select, update, delete on public.comments to authenticated;
grant select, insert, delete on public.stories to authenticated;
grant select, insert on public.story_views to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, delete on public.conversation_members to authenticated;
grant select on public.messages to authenticated;
grant select, insert, update on public.message_receipts to authenticated;
grant select, update on public.activities to authenticated;

create policy profiles_read_authenticated
on public.profiles for select to authenticated
using ((select auth.uid()) is not null);

create policy profiles_insert_self
on public.profiles for insert to authenticated
with check (id = (select auth.uid()));

create policy profiles_update_self
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy follows_read_authorized
on public.follows for select to authenticated
using (
  follower_id = (select auth.uid())
  or following_id = (select auth.uid())
  or private.can_view_account(following_id)
);

create policy follows_insert_public_account
on public.follows for insert to authenticated
with check (
  follower_id = (select auth.uid())
  and coalesce((select not p.is_private from public.profiles p where p.id = following_id), false)
);

create policy follows_delete_self
on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

create policy follow_requests_read_participants
on public.follow_requests for select to authenticated
using (requester_id = (select auth.uid()) or target_id = (select auth.uid()));

create policy posts_read_visible_accounts
on public.posts for select to authenticated
using (private.can_view_account(author_id));

create policy posts_insert_self
on public.posts for insert to authenticated
with check (author_id = (select auth.uid()));

create policy posts_update_self
on public.posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

create policy posts_delete_self
on public.posts for delete to authenticated
using (author_id = (select auth.uid()));

create policy post_media_read_visible_post
on public.post_media for select to authenticated
using (private.can_view_post(post_id));

create policy post_media_insert_owned_post
on public.post_media for insert to authenticated
with check (exists (
  select 1 from public.posts p
  where p.id = post_id and p.author_id = (select auth.uid())
));

create policy post_media_update_owned_post
on public.post_media for update to authenticated
using (exists (
  select 1 from public.posts p
  where p.id = post_id and p.author_id = (select auth.uid())
))
with check (exists (
  select 1 from public.posts p
  where p.id = post_id and p.author_id = (select auth.uid())
));

create policy post_media_delete_owned_post
on public.post_media for delete to authenticated
using (exists (
  select 1 from public.posts p
  where p.id = post_id and p.author_id = (select auth.uid())
));

create policy post_likes_read_visible_post
on public.post_likes for select to authenticated
using (private.can_view_post(post_id));

create policy comments_read_visible_post
on public.comments for select to authenticated
using (private.can_view_post(post_id));

create policy comments_update_self
on public.comments for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()) and private.can_view_post(post_id));

create policy comments_delete_self
on public.comments for delete to authenticated
using (author_id = (select auth.uid()));

create policy stories_read_visible_unexpired
on public.stories for select to authenticated
using (
  (author_id = (select auth.uid()) or expires_at > now())
  and private.can_view_account(author_id)
);

create policy stories_insert_self
on public.stories for insert to authenticated
with check (author_id = (select auth.uid()) and expires_at <= created_at + interval '24 hours');

create policy stories_delete_self
on public.stories for delete to authenticated
using (author_id = (select auth.uid()));

create policy story_views_read_viewer_or_author
on public.story_views for select to authenticated
using (
  viewer_id = (select auth.uid())
  or exists (
    select 1 from public.stories s
    where s.id = story_id and s.author_id = (select auth.uid())
  )
);

create policy story_views_insert_self
on public.story_views for insert to authenticated
with check (viewer_id = (select auth.uid()) and private.can_view_story(story_id));

create policy conversations_read_member
on public.conversations for select to authenticated
using (private.is_conversation_member(id));

create policy conversations_insert_authenticated
on public.conversations for insert to authenticated
with check ((select auth.uid()) is not null);

create policy conversations_update_member
on public.conversations for update to authenticated
using (private.is_conversation_member(id))
with check (private.is_conversation_member(id));

create policy conversation_members_read_member
on public.conversation_members for select to authenticated
using (private.is_conversation_member(conversation_id));

create policy conversation_members_insert_self
on public.conversation_members for insert to authenticated
with check (user_id = (select auth.uid()));

create policy conversation_members_leave_self
on public.conversation_members for delete to authenticated
using (user_id = (select auth.uid()));

create policy messages_read_member
on public.messages for select to authenticated
using (private.is_conversation_member(conversation_id));

create policy message_receipts_read_member
on public.message_receipts for select to authenticated
using (private.is_conversation_member((
  select m.conversation_id from public.messages m where m.id = message_id
)));

create policy message_receipts_insert_self
on public.message_receipts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_conversation_member((
    select m.conversation_id from public.messages m where m.id = message_id
  ))
);

create policy message_receipts_update_self
on public.message_receipts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy activities_read_recipient
on public.activities for select to authenticated
using (recipient_id = (select auth.uid()));

create policy activities_mark_read_recipient
on public.activities for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy storage_avatars_read_authenticated
on storage.objects for select to authenticated
using (bucket_id = 'avatars');

create policy storage_post_media_read_visible
on storage.objects for select to authenticated
using (
  bucket_id = 'post-media'
  and exists (
    select 1 from public.post_media pm
    where pm.storage_path = name and private.can_view_post(pm.post_id)
  )
);

create policy storage_story_media_read_visible
on storage.objects for select to authenticated
using (
  bucket_id = 'story-media'
  and exists (
    select 1 from public.stories s
    where s.storage_path = name and private.can_view_story(s.id)
  )
);

create policy storage_insert_own_folder
on storage.objects for insert to authenticated
with check (
  bucket_id in ('avatars', 'post-media', 'story-media')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy storage_update_own_objects
on storage.objects for update to authenticated
using (owner_id = (select auth.uid())::text)
with check (owner_id = (select auth.uid())::text);

create policy storage_delete_own_objects
on storage.objects for delete to authenticated
using (owner_id = (select auth.uid())::text);

create policy realtime_conversation_receive
on realtime.messages for select to authenticated
using (private.can_access_realtime_topic(realtime.topic()));

create policy realtime_conversation_send
on realtime.messages for insert to authenticated
with check (private.can_access_realtime_topic(realtime.topic()));
