-- A repeated acknowledgement must not emit another UPDATE and cause a realtime loop.
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
        read_at = coalesce(receipt.read_at, excluded.read_at)
    where receipt.delivered_at is null or (receipt.read_at is null and excluded.read_at is not null);
end;
$$;
