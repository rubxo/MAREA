create or replace function public.publish_post(post_id uuid, caption_text text, media_path text, media_width integer, media_height integer)
returns uuid language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null or split_part(media_path,'/',1)<>auth.uid()::text then raise exception 'Unauthorized media path' using errcode='42501'; end if;
  insert into public.posts(id,author_id,caption) values(post_id,auth.uid(),caption_text) on conflict(id) do nothing;
  insert into public.post_media(post_id,storage_path,width,height) values(post_id,media_path,media_width,media_height)
    on conflict on constraint post_media_post_id_position_key do nothing;
  return post_id;
end; $$;
