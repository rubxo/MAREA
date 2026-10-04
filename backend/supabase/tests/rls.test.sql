begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- Stable identities keep policy tests readable and reproducible.
insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'luna@marea.test'),
  ('10000000-0000-0000-0000-000000000002', 'nico@marea.test'),
  ('10000000-0000-0000-0000-000000000003', 'sol@marea.test'),
  ('10000000-0000-0000-0000-000000000004', 'teo@marea.test');

insert into public.profiles (id, username, display_name, is_private)
values
  ('10000000-0000-0000-0000-000000000001', 'luna', 'Luna Márquez', false),
  ('10000000-0000-0000-0000-000000000002', 'nico', 'Nico Ríos', true),
  ('10000000-0000-0000-0000-000000000003', 'sol', 'Sol Vega', false),
  ('10000000-0000-0000-0000-000000000004', 'teo', 'Teo Mora', false);

insert into public.follows (follower_id, following_id)
values ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

insert into public.posts (id, author_id, caption)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Private coast'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'Public coast');

insert into public.stories (id, author_id, storage_path, expires_at)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002/stories/private.jpg', now() + interval '1 hour'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003/stories/public.jpg', now() + interval '1 hour');

insert into public.conversations (id)
values ('40000000-0000-0000-0000-000000000001');

insert into public.conversation_members (conversation_id, user_id)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');

insert into public.messages (id, conversation_id, sender_id, body)
values (
  '50000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Meet by the tide pools'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select results_eq(
  $$select id from public.posts order by id$$,
  $$values
    ('20000000-0000-0000-0000-000000000001'::uuid),
    ('20000000-0000-0000-0000-000000000002'::uuid)$$,
  'accepted follower reads private and public posts'
);

select results_eq(
  $$select id from public.stories order by id$$,
  $$values
    ('30000000-0000-0000-0000-000000000001'::uuid),
    ('30000000-0000-0000-0000-000000000002'::uuid)$$,
  'accepted follower reads unexpired private and public stories'
);

select results_eq(
  $$select following_id from public.follows order by following_id$$,
  $$values ('10000000-0000-0000-0000-000000000002'::uuid)$$,
  'follower can read their relationship'
);

select results_eq(
  $$select id from public.conversations$$,
  $$values ('40000000-0000-0000-0000-000000000001'::uuid)$$,
  'conversation member reads the conversation'
);

select results_eq(
  $$select id from public.messages$$,
  $$values ('50000000-0000-0000-0000-000000000001'::uuid)$$,
  'conversation member reads messages'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);

select results_eq(
  $$select id from public.posts order by id$$,
  $$values ('20000000-0000-0000-0000-000000000002'::uuid)$$,
  'non-follower cannot read private posts'
);

select results_eq(
  $$select id from public.stories order by id$$,
  $$values ('30000000-0000-0000-0000-000000000002'::uuid)$$,
  'non-follower cannot read private stories'
);

select is_empty(
  $$select * from public.follows where following_id = '10000000-0000-0000-0000-000000000002'::uuid$$,
  'non-follower cannot enumerate a private account follower list'
);

select is_empty(
  $$select * from public.conversations$$,
  'non-member cannot read conversations'
);

select is_empty(
  $$select * from public.messages$$,
  'non-member cannot read messages'
);

select throws_ok(
  $$insert into public.messages (id, conversation_id, sender_id, body)
    values (
      '50000000-0000-0000-0000-000000000099',
      '40000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000004',
      'Intrusion'
    )$$,
  '42501',
  null,
  'non-member cannot insert a message'
);

select throws_ok(
  $$select public.set_post_like(
    '60000000-0000-0000-0000-000000000099'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    true
  )$$,
  '42501',
  null,
  'RPC rejects a like on an invisible private post'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.set_post_like(
    '60000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    true
  )$$,
  'follower can like a visible private post'
);

select lives_ok(
  $$select public.set_post_like(
    '60000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    true
  )$$,
  'repeating like operation_id is safe'
);

select results_eq(
  $$select count(*) from public.post_likes
    where post_id = '20000000-0000-0000-0000-000000000001'::uuid
      and user_id = '10000000-0000-0000-0000-000000000001'::uuid$$,
  array[1::bigint],
  'repeated like creates one row'
);

select lives_ok(
  $$select public.send_message_idempotent(
    '60000000-0000-0000-0000-000000000002'::uuid,
    '50000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Same wave, one message'
  )$$,
  'member sends a message through RPC'
);

select lives_ok(
  $$select public.send_message_idempotent(
    '60000000-0000-0000-0000-000000000002'::uuid,
    '50000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Same wave, one message'
  )$$,
  'repeating message operation_id is safe'
);

select results_eq(
  $$select count(*) from public.messages
    where id = '50000000-0000-0000-0000-000000000002'::uuid$$,
  array[1::bigint],
  'repeated send creates one message'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);

select throws_ok(
  $$select public.send_message_idempotent(
    '60000000-0000-0000-0000-000000000003'::uuid,
    '50000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000001'::uuid,
    'Still intrusion'
  )$$,
  '42501',
  null,
  'RPC rejects a non-member sender'
);

select lives_ok(
  $$select public.request_follow(
    '60000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid
  )$$,
  'non-follower can request access to a private account'
);

select lives_ok(
  $$select public.request_follow(
    '60000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid
  )$$,
  'repeating follow operation_id is safe'
);

select results_eq(
  $$select count(*) from public.follow_requests
    where requester_id = '10000000-0000-0000-0000-000000000004'::uuid
      and target_id = '10000000-0000-0000-0000-000000000002'::uuid
      and status = 'pending'$$,
  array[1::bigint],
  'repeated follow request creates one pending row'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$select public.respond_follow_request(
    '60000000-0000-0000-0000-000000000005'::uuid,
    (select id from public.follow_requests
      where requester_id = '10000000-0000-0000-0000-000000000004'::uuid
        and target_id = '10000000-0000-0000-0000-000000000002'::uuid
        and status = 'pending'),
    'accepted'
  )$$,
  'private account owner accepts a request'
);

select lives_ok(
  $$select public.respond_follow_request(
    '60000000-0000-0000-0000-000000000005'::uuid,
    (select id from public.follow_requests
      where requester_id = '10000000-0000-0000-0000-000000000004'::uuid
        and target_id = '10000000-0000-0000-0000-000000000002'::uuid),
    'accepted'
  )$$,
  'repeating follow response operation_id is safe'
);

select results_eq(
  $$select count(*) from public.follows
    where follower_id = '10000000-0000-0000-0000-000000000004'::uuid
      and following_id = '10000000-0000-0000-0000-000000000002'::uuid$$,
  array[1::bigint],
  'accepted request creates one follow relationship'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.create_comment_idempotent(
    '60000000-0000-0000-0000-000000000006'::uuid,
    '70000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    'The water looks unreal'
  )$$,
  'visible post accepts a comment through RPC'
);

select lives_ok(
  $$select public.create_comment_idempotent(
    '60000000-0000-0000-0000-000000000006'::uuid,
    '70000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000001'::uuid,
    'The water looks unreal'
  )$$,
  'repeating comment operation_id is safe'
);

select results_eq(
  $$select count(*) from public.comments
    where id = '70000000-0000-0000-0000-000000000001'::uuid$$,
  array[1::bigint],
  'repeated comment creates one row'
);

select * from finish();
rollback;
