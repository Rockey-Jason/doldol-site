create unique index if not exists users_user_id_unique_idx
on public.users(user_id);

create or replace function public.ensure_dori_site_user_profile(p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb;
  v_email text;
  v_name text;
  v_login_id text;
begin
  if p_auth_user_id is null then
    return;
  end if;

  select a.raw_user_meta_data, a.email
    into v_meta, v_email
  from auth.users a
  where a.id = p_auth_user_id;

  if not found then
    return;
  end if;

  if exists (
    select 1 from public.users u
    where u.user_id = p_auth_user_id::text
  ) then
    return;
  end if;

  v_name := coalesce(
    nullif(pg_catalog.btrim(coalesce(v_meta->>'name','')), ''),
    nullif(pg_catalog.split_part(coalesce(v_email,''),'@',1), ''),
    '돌이 사용자'
  );
  v_login_id := nullif(pg_catalog.btrim(coalesce(v_meta->>'login_id','')), '');

  if v_email is not null and pg_catalog.length(v_email) < 10 then
    v_email := null;
  end if;

  begin
    insert into public.users(
      user_id, name, email, login_id, user_level, doldolcoin, exp, exp_level
    )
    values (
      p_auth_user_id::text, v_name, v_email, v_login_id, 1, 0, 0, 1
    )
    on conflict (user_id) do nothing;
  exception when unique_violation then
    insert into public.users(
      user_id, name, email, login_id, user_level, doldolcoin, exp, exp_level
    )
    values (
      p_auth_user_id::text, v_name, v_email, null, 1, 0, 0, 1
    )
    on conflict (user_id) do nothing;
  end;
end;
$$;

revoke all on function public.ensure_dori_site_user_profile(uuid) from public, anon, authenticated;

create or replace function public.on_auth_user_created_dori_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_dori_site_user_profile(new.id);
  return new;
end;
$$;

revoke all on function public.on_auth_user_created_dori_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_dori_profile on auth.users;
create trigger on_auth_user_created_dori_profile
after insert on auth.users
for each row
execute function public.on_auth_user_created_dori_profile();

do $$
declare
  v_id uuid;
begin
  for v_id in
    select a.id
    from auth.users a
    left join public.users u on u.user_id = a.id::text
    where u.user_id is null
  loop
    perform public.ensure_dori_site_user_profile(v_id);
  end loop;
end;
$$;

create or replace function public.dori_throw_game_get_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_progress public.dori_throw_game_progress%rowtype;
  v_user public.users%rowtype;
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
  if v_uid is null then
    raise exception '로그인 후 돌이 세우기를 이용할 수 있습니다.' using errcode = '28000';
  end if;

  perform public.ensure_dori_site_user_profile(v_uid);

  insert into public.dori_throw_game_progress(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  update public.dori_throw_game_progress
  set daily_date = v_today,
      daily_earned = 0,
      updated_at = clock_timestamp()
  where user_id = v_uid
    and daily_date <> v_today;

  select * into v_progress
  from public.dori_throw_game_progress
  where user_id = v_uid;

  select * into v_user
  from public.users
  where user_id = v_uid::text;

  if not found then
    raise exception '사용자 프로필을 복구하지 못했습니다.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'ok', true,
    'balance', coalesce(v_user.doldolcoin, 0)::text,
    'user_name', coalesce(v_user.name, '돌이 사용자'),
    'profile_image', v_user.profile_image,
    'user_level', coalesce(v_user.user_level, 1),
    'exp', coalesce(v_user.exp, 0)::text,
    'exp_level', coalesce(v_user.exp_level, 1),
    'power_level', v_progress.power_level,
    'accuracy_level', v_progress.accuracy_level,
    'total_throws', v_progress.total_throws,
    'total_spins', v_progress.total_spins,
    'best_spins', v_progress.best_spins,
    'total_earned', v_progress.total_earned::text,
    'daily_earned', v_progress.daily_earned::text,
    'daily_limit', 25000,
    'daily_remaining', greatest(0, 25000 - v_progress.daily_earned)::text
  );
end;
$$;

revoke all on function public.dori_throw_game_get_state() from public, anon;
grant execute on function public.dori_throw_game_get_state() to authenticated;

comment on function public.ensure_dori_site_user_profile(uuid) is
'Internal helper that restores a missing site user profile for an existing Auth user using trusted Auth metadata.';
