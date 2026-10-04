create or replace function private.lock_operation(
  target_operation_id uuid,
  target_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.client_operations%rowtype;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if target_operation_id is null then
    raise exception 'operation_id is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_operation_id::text, 0)
  );

  select * into existing
  from public.client_operations
  where operation_id = target_operation_id;

  if found then
    if existing.user_id <> current_user_id or existing.kind <> target_kind then
      raise exception 'operation_id is already owned by another operation'
        using errcode = '42501';
    end if;
    return existing.result;
  end if;

  return null;
end;
$$;

create or replace function private.remember_operation(
  target_operation_id uuid,
  target_kind text,
  target_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.client_operations (operation_id, user_id, kind, result)
  values (target_operation_id, (select auth.uid()), target_kind, target_result);
  return target_result;
end;
$$;

create or replace function private.request_follow_impl(
  operation_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached jsonb;
  current_user_id uuid := (select auth.uid());
  target_private boolean;
  request_id uuid;
  response jsonb;
begin
  cached := private.lock_operation(operation_id, 'follow');
  if cached is not null then return cached; end if;

  if target_user_id is null or target_user_id = current_user_id then
    raise exception 'Invalid follow target' using errcode = '22023';
  end if;

  select is_private into target_private
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.follows
    where follower_id = current_user_id and following_id = target_user_id
  ) then
    response := pg_catalog.jsonb_build_object('status', 'following');
  elsif target_private then
    select id into request_id
    from public.follow_requests
    where requester_id = current_user_id
      and target_id = target_user_id
      and status = 'pending';

    if request_id is null then
      insert into public.follow_requests (requester_id, target_id)
      values (current_user_id, target_user_id)
      returning id into request_id;

      insert into public.activities (recipient_id, actor_id, kind, entity_id)
      values (target_user_id, current_user_id, 'follow_request', request_id);
    end if;

    response := pg_catalog.jsonb_build_object(
      'status', 'requested',
      'requestId', request_id
    );
  else
    insert into public.follows (follower_id, following_id)
    values (current_user_id, target_user_id)
    on conflict do nothing;

    insert into public.activities (recipient_id, actor_id, kind)
    values (target_user_id, current_user_id, 'follow');
    response := pg_catalog.jsonb_build_object('status', 'following');
  end if;

  return private.remember_operation(operation_id, 'follow', response);
end;
$$;

create or replace function private.respond_follow_request_impl(
  operation_id uuid,
  target_request_id uuid,
  decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached jsonb;
  request_record public.follow_requests%rowtype;
  response jsonb;
begin
  cached := private.lock_operation(operation_id, 'respond_follow');
  if cached is not null then return cached; end if;

  if decision not in ('accepted', 'rejected') then
    raise exception 'Decision must be accepted or rejected' using errcode = '22023';
  end if;

  select * into request_record
  from public.follow_requests
  where id = target_request_id
  for update;

  if not found then
    raise exception 'Follow request not found' using errcode = 'P0002';
  end if;
  if request_record.target_id <> (select auth.uid()) then
    raise exception 'Only the target can respond' using errcode = '42501';
  end if;
  if request_record.status <> 'pending' then
    raise exception 'Follow request already resolved' using errcode = '22023';
  end if;

  update public.follow_requests
  set status = decision, responded_at = now()
  where id = target_request_id;

  if decision = 'accepted' then
    insert into public.follows (follower_id, following_id)
    values (request_record.requester_id, request_record.target_id)
    on conflict do nothing;

    insert into public.activities (recipient_id, actor_id, kind)
    values (request_record.requester_id, request_record.target_id, 'follow');
  end if;

  response := pg_catalog.jsonb_build_object('status', decision);
  return private.remember_operation(operation_id, 'respond_follow', response);
end;
$$;

create or replace function private.set_post_like_impl(
  operation_id uuid,
  target_post_id uuid,
  liked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached jsonb;
  current_user_id uuid := (select auth.uid());
  post_author_id uuid;
  like_count bigint;
  inserted_rows integer;
  response jsonb;
begin
  cached := private.lock_operation(operation_id, 'like');
  if cached is not null then return cached; end if;

  select author_id into post_author_id
  from public.posts
  where id = target_post_id and private.can_view_account(author_id);

  if not found then
    raise exception 'Post not found or not visible' using errcode = '42501';
  end if;

  if liked then
    insert into public.post_likes (post_id, user_id)
    values (target_post_id, current_user_id)
    on conflict do nothing;

    get diagnostics inserted_rows = row_count;

    if inserted_rows = 1 and post_author_id <> current_user_id then
      insert into public.activities (recipient_id, actor_id, kind, entity_id)
      values (post_author_id, current_user_id, 'like', target_post_id);
    end if;
  else
    delete from public.post_likes
    where post_id = target_post_id and user_id = current_user_id;
  end if;

  select count(*) into like_count
  from public.post_likes
  where post_id = target_post_id;

  response := pg_catalog.jsonb_build_object('liked', liked, 'likeCount', like_count);
  return private.remember_operation(operation_id, 'like', response);
end;
$$;

create or replace function private.create_comment_idempotent_impl(
  operation_id uuid,
  comment_id uuid,
  target_post_id uuid,
  comment_body text,
  parent_comment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached jsonb;
  current_user_id uuid := (select auth.uid());
  post_author_id uuid;
  response jsonb;
begin
  cached := private.lock_operation(operation_id, 'comment');
  if cached is not null then return cached; end if;

  if comment_id is null or char_length(btrim(comment_body)) not between 1 and 1000 then
    raise exception 'Invalid comment' using errcode = '22023';
  end if;

  select author_id into post_author_id
  from public.posts
  where id = target_post_id
    and comments_enabled
    and private.can_view_account(author_id);

  if not found then
    raise exception 'Post not found, not visible, or comments disabled' using errcode = '42501';
  end if;

  if parent_comment_id is not null and not exists (
    select 1 from public.comments
    where id = parent_comment_id and post_id = target_post_id
  ) then
    raise exception 'Parent comment does not belong to post' using errcode = '22023';
  end if;

  insert into public.comments (id, post_id, author_id, parent_id, body)
  values (comment_id, target_post_id, current_user_id, parent_comment_id, btrim(comment_body));

  if post_author_id <> current_user_id then
    insert into public.activities (recipient_id, actor_id, kind, entity_id)
    values (post_author_id, current_user_id, 'comment', comment_id);
  end if;

  response := pg_catalog.jsonb_build_object('commentId', comment_id);
  return private.remember_operation(operation_id, 'comment', response);
end;
$$;

create or replace function private.send_message_idempotent_impl(
  operation_id uuid,
  message_id uuid,
  target_conversation_id uuid,
  message_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cached jsonb;
  current_user_id uuid := (select auth.uid());
  response jsonb;
begin
  cached := private.lock_operation(operation_id, 'message');
  if cached is not null then return cached; end if;

  if not private.is_conversation_member(target_conversation_id) then
    raise exception 'Conversation membership required' using errcode = '42501';
  end if;
  if message_id is null or char_length(btrim(message_body)) not between 1 and 4000 then
    raise exception 'Invalid message' using errcode = '22023';
  end if;

  insert into public.messages (id, conversation_id, sender_id, body)
  values (message_id, target_conversation_id, current_user_id, btrim(message_body));

  insert into public.message_receipts (message_id, user_id)
  select message_id, cm.user_id
  from public.conversation_members cm
  where cm.conversation_id = target_conversation_id
    and cm.user_id <> current_user_id;

  update public.conversations
  set updated_at = now()
  where id = target_conversation_id;

  response := pg_catalog.jsonb_build_object(
    'messageId', message_id,
    'conversationId', target_conversation_id
  );
  return private.remember_operation(operation_id, 'message', response);
end;
$$;

revoke all on function private.lock_operation(uuid, text) from public;
revoke all on function private.remember_operation(uuid, text, jsonb) from public;
revoke all on function private.request_follow_impl(uuid, uuid) from public;
revoke all on function private.respond_follow_request_impl(uuid, uuid, text) from public;
revoke all on function private.set_post_like_impl(uuid, uuid, boolean) from public;
revoke all on function private.create_comment_idempotent_impl(uuid, uuid, uuid, text, uuid) from public;
revoke all on function private.send_message_idempotent_impl(uuid, uuid, uuid, text) from public;

grant execute on function private.request_follow_impl(uuid, uuid) to authenticated;
grant execute on function private.respond_follow_request_impl(uuid, uuid, text) to authenticated;
grant execute on function private.set_post_like_impl(uuid, uuid, boolean) to authenticated;
grant execute on function private.create_comment_idempotent_impl(uuid, uuid, uuid, text, uuid) to authenticated;
grant execute on function private.send_message_idempotent_impl(uuid, uuid, uuid, text) to authenticated;

create or replace function public.request_follow(operation_id uuid, target_user_id uuid)
returns jsonb language sql set search_path = ''
as $$ select private.request_follow_impl(operation_id, target_user_id) $$;

create or replace function public.respond_follow_request(operation_id uuid, target_request_id uuid, decision text)
returns jsonb language sql set search_path = ''
as $$ select private.respond_follow_request_impl(operation_id, target_request_id, decision) $$;

create or replace function public.set_post_like(operation_id uuid, target_post_id uuid, liked boolean)
returns jsonb language sql set search_path = ''
as $$ select private.set_post_like_impl(operation_id, target_post_id, liked) $$;

create or replace function public.create_comment_idempotent(
  operation_id uuid,
  comment_id uuid,
  target_post_id uuid,
  comment_body text,
  parent_comment_id uuid default null
)
returns jsonb language sql set search_path = ''
as $$
  select private.create_comment_idempotent_impl(
    operation_id, comment_id, target_post_id, comment_body, parent_comment_id
  )
$$;

create or replace function public.send_message_idempotent(
  operation_id uuid,
  message_id uuid,
  target_conversation_id uuid,
  message_body text
)
returns jsonb language sql set search_path = ''
as $$
  select private.send_message_idempotent_impl(
    operation_id, message_id, target_conversation_id, message_body
  )
$$;

revoke all on function public.request_follow(uuid, uuid) from public, anon;
revoke all on function public.respond_follow_request(uuid, uuid, text) from public, anon;
revoke all on function public.set_post_like(uuid, uuid, boolean) from public, anon;
revoke all on function public.create_comment_idempotent(uuid, uuid, uuid, text, uuid) from public, anon;
revoke all on function public.send_message_idempotent(uuid, uuid, uuid, text) from public, anon;

grant execute on function public.request_follow(uuid, uuid) to authenticated;
grant execute on function public.respond_follow_request(uuid, uuid, text) to authenticated;
grant execute on function public.set_post_like(uuid, uuid, boolean) to authenticated;
grant execute on function public.create_comment_idempotent(uuid, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.send_message_idempotent(uuid, uuid, uuid, text) to authenticated;
