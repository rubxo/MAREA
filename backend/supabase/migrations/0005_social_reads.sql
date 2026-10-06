-- Invoker functions preserve table RLS, including private accounts.
create function public.list_posts(page_size integer default 20, before_time timestamptz default null,
  before_id uuid default null, author_filter uuid default null, feed_only boolean default false,
  search_text text default '') returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb) from (
    select p.id, p.created_at, jsonb_build_object(
      'id',p.id,'caption',p.caption,'createdAt',p.created_at,
      'author',jsonb_build_object('id',u.id,'username',u.username,'displayName',u.display_name,
        'avatarPath',u.avatar_path,'isPrivate',u.is_private),
      'media',jsonb_build_object('path',m.storage_path,'width',m.width,'height',m.height),
      'likeCount',(select count(*) from public.post_likes l where l.post_id=p.id),
      'commentCount',(select count(*) from public.comments c where c.post_id=p.id),
      'viewerHasLiked',exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid())
    ) item
    from public.posts p join public.profiles u on u.id=p.author_id
    join public.post_media m on m.post_id=p.id and m.position=0
    where (author_filter is null or p.author_id=author_filter)
      and (before_time is null or (p.created_at,p.id)<(before_time,before_id))
      and (not feed_only or p.author_id=auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id))
      and (search_text='' or p.caption ilike '%'||left(search_text,100)||'%')
    order by p.created_at desc,p.id desc limit greatest(1,least(page_size,50))
  ) page;
$$;
create function public.get_post(target_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('id',p.id,'caption',p.caption,'createdAt',p.created_at,
    'author',jsonb_build_object('id',u.id,'username',u.username,'displayName',u.display_name,'avatarPath',u.avatar_path,'isPrivate',u.is_private),
    'media',jsonb_build_object('path',m.storage_path,'width',m.width,'height',m.height),
    'likeCount',(select count(*) from public.post_likes l where l.post_id=p.id),
    'commentCount',(select count(*) from public.comments c where c.post_id=p.id),
    'viewerHasLiked',exists(select 1 from public.post_likes l where l.post_id=p.id and l.user_id=auth.uid()))
  from public.posts p join public.profiles u on u.id=p.author_id join public.post_media m on m.post_id=p.id and m.position=0 where p.id=target_id;
$$;
create function public.publish_post(post_id uuid, caption_text text, media_path text, media_width integer, media_height integer)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null or split_part(media_path,'/',1)<>auth.uid()::text then raise exception 'Unauthorized media path' using errcode='42501'; end if;
  insert into public.posts(id,author_id,caption) values(post_id,auth.uid(),caption_text) on conflict(id) do nothing;
  insert into public.post_media(post_id,storage_path,width,height) values(post_id,media_path,media_width,media_height) on conflict(post_id,position) do nothing;
  return post_id;
end; $$;
-- Restrict mutable columns: clients cannot relocate comments or forge activity ownership.
revoke update on public.comments, public.activities, public.message_receipts from authenticated;
grant update(body) on public.comments to authenticated;
grant update(read_at) on public.activities to authenticated;
grant update(delivered_at,read_at) on public.message_receipts to authenticated;
-- Prevent users from attaching another account's private storage object to an owned post.
drop policy post_media_insert_owned_post on public.post_media;
create policy post_media_insert_owned_post on public.post_media for insert to authenticated with check (
  split_part(storage_path,'/',1)=auth.uid()::text and exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid())
);
drop policy post_media_update_owned_post on public.post_media;
revoke update on public.post_media from authenticated;
revoke all on function public.list_posts(integer,timestamptz,uuid,uuid,boolean,text) from public,anon;
revoke all on function public.get_post(uuid) from public,anon;
revoke all on function public.publish_post(uuid,text,text,integer,integer) from public,anon;
grant execute on function public.list_posts(integer,timestamptz,uuid,uuid,boolean,text) to authenticated;
grant execute on function public.get_post(uuid) to authenticated;
grant execute on function public.publish_post(uuid,text,text,integer,integer) to authenticated;
