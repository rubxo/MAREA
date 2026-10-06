-- Membership is created atomically by a trusted RPC, never by joining a guessed UUID.
revoke insert, update on public.conversations from authenticated;
revoke insert, delete on public.conversation_members from authenticated;
drop policy if exists conversation_members_insert_self on public.conversation_members;
drop policy if exists conversations_insert_authenticated on public.conversations;
alter table public.conversations add column direct_key text unique;

create or replace function public.get_or_create_direct_conversation(target_username text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  viewer uuid := auth.uid();
  peer uuid;
  pair_key text;
  conversation uuid;
begin
  if viewer is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select id into peer from public.profiles where username = lower(btrim(target_username));
  if peer is null or peer = viewer then
    raise exception 'Selecciona otro usuario válido' using errcode = '22023';
  end if;
  if not private.can_view_account(peer) then
    raise exception 'Debes seguir esta cuenta privada antes de escribirle' using errcode = '42501';
  end if;
  pair_key := least(viewer::text, peer::text) || ':' || greatest(viewer::text, peer::text);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pair_key, 0));
  select id into conversation from public.conversations where direct_key = pair_key;
  if conversation is null then
    -- Adopt existing two-person conversations when upgrading an existing database.
    select c.id into conversation from public.conversations c
    where exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = viewer)
      and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = peer)
      and (select count(*) from public.conversation_members m where m.conversation_id = c.id) = 2
    order by c.created_at limit 1;
    if conversation is null then
      insert into public.conversations(direct_key) values(pair_key) returning id into conversation;
      insert into public.conversation_members(conversation_id, user_id)
      values(conversation, viewer), (conversation, peer);
    else
      update public.conversations set direct_key = pair_key where id = conversation;
    end if;
  end if;
  return conversation;
end;
$$;

-- Clients cannot forge/regress receipts or move a receipt to an unrelated message.
revoke insert, update on public.message_receipts from authenticated;
create or replace function public.acknowledge_messages(
  target_conversation_id uuid,
  through_message_id uuid,
  mark_read boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare boundary public.messages%rowtype;
begin
  if not private.is_conversation_member(target_conversation_id) then
    raise exception 'Conversation membership required' using errcode = '42501';
  end if;
  select * into boundary from public.messages
  where id = through_message_id and conversation_id = target_conversation_id;
  if not found then raise exception 'Message not found' using errcode = '22023'; end if;
  insert into public.message_receipts as receipt(message_id, user_id, delivered_at, read_at)
  select m.id, auth.uid(), now(), case when mark_read then now() else null end
  from public.messages m
  where m.conversation_id = target_conversation_id and m.sender_id <> auth.uid()
    and (m.created_at, m.id) <= (boundary.created_at, boundary.id)
  on conflict(message_id, user_id) do update
    set delivered_at = coalesce(receipt.delivered_at, excluded.delivered_at),
        read_at = coalesce(receipt.read_at, excluded.read_at);
end;
$$;

create or replace function public.get_chat_inbox()
returns table(
  conversation_id uuid, updated_at timestamptz, peer_id uuid, peer_username text,
  peer_display_name text, peer_avatar_path text, peer_is_private boolean, last_message_id uuid,
  last_sender_id uuid, last_body text, last_created_at timestamptz, unread_count bigint
) language sql stable set search_path = '' as $$
  select c.id, c.updated_at, p.id, p.username, p.display_name, p.avatar_path, p.is_private,
    last_message.id, last_message.sender_id, last_message.body, last_message.created_at,
    (select count(*) from public.messages m
     left join public.message_receipts r on r.message_id = m.id and r.user_id = auth.uid()
     where m.conversation_id = c.id and m.sender_id <> auth.uid() and r.read_at is null)
  from public.conversations c
  join public.conversation_members peer on peer.conversation_id = c.id and peer.user_id <> auth.uid()
  join public.profiles p on p.id = peer.user_id
  left join lateral (
    select m.* from public.messages m where m.conversation_id = c.id
    order by m.created_at desc, m.id desc limit 1
  ) last_message on true
  where private.is_conversation_member(c.id)
  order by c.updated_at desc, c.id desc;
$$;

revoke all on function public.get_or_create_direct_conversation(text) from public, anon;
revoke all on function public.acknowledge_messages(uuid, uuid, boolean) from public, anon;
revoke all on function public.get_chat_inbox() from public, anon;
grant execute on function public.get_or_create_direct_conversation(text) to authenticated;
grant execute on function public.acknowledge_messages(uuid, uuid, boolean) to authenticated;
grant execute on function public.get_chat_inbox() to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_members') then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end $$;
