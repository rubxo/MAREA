begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
insert into auth.users(id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'chat1@marea.test'),
  ('a1000000-0000-0000-0000-000000000002', 'chat2@marea.test'),
  ('a1000000-0000-0000-0000-000000000003', 'chat3@marea.test');
update public.profiles set username = 'chat_one', is_private = false where id = 'a1000000-0000-0000-0000-000000000001';
update public.profiles set username = 'chat_two', is_private = false where id = 'a1000000-0000-0000-0000-000000000002';
update public.profiles set username = 'chat_private', is_private = true where id = 'a1000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.get_or_create_direct_conversation('chat_private')$$, '42501',
  'Debes seguir esta cuenta privada antes de escribirle', 'private DM requires accepted follow');
select throws_ok($$select public.get_or_create_direct_conversation('chat_one')$$, '22023',
  'Selecciona otro usuario válido', 'self DM rejected');
select lives_ok($$select public.get_or_create_direct_conversation('chat_two')$$, 'public DM creates atomically');
select is(public.get_or_create_direct_conversation('chat_two'), public.get_or_create_direct_conversation('chat_two'), 'DM creation is idempotent');
select throws_ok($$insert into public.conversation_members(conversation_id,user_id) values
  ('a4000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001')$$,
  '42501', 'permission denied for table conversation_members', 'cannot self join a guessed conversation');
select throws_ok($$insert into public.conversations default values$$, '42501',
  'permission denied for table conversations', 'cannot bypass atomic conversation creation');
select lives_ok($$select public.send_message_idempotent('a5000000-0000-0000-0000-000000000001',
  'a5000000-0000-0000-0000-000000000001', public.get_or_create_direct_conversation('chat_two'), 'Hola')$$,
  'member sends message');
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000002', true);
select is((select unread_count from public.get_chat_inbox() limit 1), 1::bigint, 'recipient inbox counts unread');
select lives_ok($$select public.acknowledge_messages(public.get_or_create_direct_conversation('chat_one'),
  'a5000000-0000-0000-0000-000000000001', true)$$, 'recipient marks read');
select public.acknowledge_messages(public.get_or_create_direct_conversation('chat_one'), 'a5000000-0000-0000-0000-000000000001', false);
select ok((select read_at is not null and delivered_at is not null from public.message_receipts
  where message_id = 'a5000000-0000-0000-0000-000000000001'), 'delayed delivery acknowledgement cannot regress read');
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.messages), 0::bigint, 'outsider cannot read DM');
select is((select count(*) from public.get_chat_inbox()), 0::bigint, 'outsider cannot inspect inbox');
select * from finish();
rollback;
