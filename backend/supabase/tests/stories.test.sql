begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id, email) values
  ('b1000000-0000-0000-0000-000000000001', 'stories1@marea.test'),
  ('b1000000-0000-0000-0000-000000000002', 'stories2@marea.test');
update public.profiles set is_private = true where id = 'b1000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000001', true);
select lives_ok($$insert into public.stories(id, author_id, storage_path, created_at, expires_at)
  values ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001/test.jpg', now() + interval '30 days', now() + interval '31 days')$$,
  'owner can publish a photo story');
select is((select created_at from public.stories where id = 'b2000000-0000-0000-0000-000000000001'), now(), 'creation timestamp is server owned');
select is((select expires_at - created_at from public.stories where id = 'b2000000-0000-0000-0000-000000000001'), interval '24 hours', 'story lasts exactly 24 hours');
select throws_ok($$insert into public.stories(author_id, storage_path) values
  ('b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002/stolen.jpg')$$,
  '42501', 'new row violates row-level security policy for table "stories"', 'cannot publish media from another account folder');
select set_config('request.jwt.claim.sub', 'b1000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.stories where author_id = 'b1000000-0000-0000-0000-000000000001'), 0::bigint, 'private stories hidden without accepted follow');
reset role;
insert into public.follows(follower_id, following_id) values ('b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001');
set local role authenticated;
select is((select count(*) from public.stories where author_id = 'b1000000-0000-0000-0000-000000000001'), 1::bigint, 'accepted follower can read story');
select lives_ok($$insert into public.story_views(story_id, viewer_id) values ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002')$$, 'follower records view');
reset role;
update public.stories set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = 'b2000000-0000-0000-0000-000000000001';
set local role authenticated;
select is((select count(*) from public.stories where author_id = 'b1000000-0000-0000-0000-000000000001'), 0::bigint, 'expired stories hidden from followers');
select * from finish();
rollback;
