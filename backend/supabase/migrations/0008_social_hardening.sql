-- Cancel requests and unfollow in one authorized transaction.
create function public.cancel_follow(target_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 delete from public.follows where follower_id=auth.uid() and following_id=target_user_id;
 update public.follow_requests set status='cancelled',responded_at=now()
 where requester_id=auth.uid() and target_id=target_user_id and status='pending';
end; $$;
revoke all on function public.cancel_follow(uuid) from public,anon;
grant execute on function public.cancel_follow(uuid) to authenticated;
drop policy follows_read_authorized on public.follows;
create policy follows_read_authorized on public.follows for select to authenticated using (
 follower_id=auth.uid() or following_id=auth.uid() or
 (private.can_view_account(following_id) and private.can_view_account(follower_id))
);
-- Clients cannot move other users' objects into their own accessible paths.
drop policy storage_update_own_objects on storage.objects;
create policy storage_update_own_objects on storage.objects for update to authenticated
 using (owner_id=auth.uid()::text)
 with check (owner_id=auth.uid()::text and split_part(name,'/',1)=auth.uid()::text and bucket_id in ('avatars','post-media','story-media'));
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='activities') then
 alter publication supabase_realtime add table public.activities;
 end if;
end; $$;

