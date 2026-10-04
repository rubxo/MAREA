create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_display_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if requested_username !~ '^[a-z0-9_]{3,24}$' then
    requested_username := 'user_' || right(replace(new.id::text, '-', ''), 12);
  end if;

  if char_length(requested_display_name) not between 1 and 50 then
    requested_display_name := left(coalesce(nullif(split_part(new.email, '@', 1), ''), 'Marea'), 50);
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, requested_username, requested_display_name);

  return new;
end;
$$;

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();
