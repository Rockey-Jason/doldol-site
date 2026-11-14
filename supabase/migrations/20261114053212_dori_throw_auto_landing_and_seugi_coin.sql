alter table public.dori_throw_game_progress
  add column if not exists seugi_coin_balance bigint not null default 0 check (seugi_coin_balance >= 0),
  add column if not exists seugi_coin_earned bigint not null default 0 check (seugi_coin_earned >= 0),
  add column if not exists daily_seugi_coin_earned bigint not null default 0 check (daily_seugi_coin_earned >= 0),
  add column if not exists successful_landings bigint not null default 0 check (successful_landings >= 0),
  add column if not exists best_landing_error_deg numeric(7,3);

comment on column public.dori_throw_game_progress.seugi_coin_balance is
  'Dori Seugi-only currency balance; never mixed with site Doldolcoin.';
comment on column public.dori_throw_game_progress.seugi_coin_earned is
  'Lifetime amount of Seugi Coins earned from successful upright landings.';
comment on column public.dori_throw_game_progress.daily_seugi_coin_earned is
  'Seugi Coins earned today in Asia/Seoul time.';

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
  v_daily bigint;
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
      daily_seugi_coin_earned = 0,
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

  v_daily := coalesce(v_progress.daily_seugi_coin_earned, 0);

  return jsonb_build_object(
    'ok', true,
    'balance', v_progress.seugi_coin_balance::text,
    'seugi_coin_balance', v_progress.seugi_coin_balance::text,
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
    'total_earned', v_progress.seugi_coin_earned::text,
    'seugi_coin_earned', v_progress.seugi_coin_earned::text,
    'successful_landings', v_progress.successful_landings,
    'best_landing_error_deg', v_progress.best_landing_error_deg,
    'daily_earned', v_daily::text,
    'daily_seugi_coin_earned', v_daily::text,
    'daily_limit', 10000,
    'daily_remaining', greatest(0, 10000 - v_daily)::text
  );
end;
$$;

revoke all on function public.dori_throw_game_get_state() from public, anon;
grant execute on function public.dori_throw_game_get_state() to authenticated;

drop function if exists public.dori_throw_game_throw(integer, integer, uuid);

create function public.dori_throw_game_throw(p_charge integer, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_request public.dori_throw_game_requests%rowtype;
  v_progress public.dori_throw_game_progress%rowtype;
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_q numeric;
  v_flight_duration numeric;
  v_flight_speed numeric;
  v_flight_height numeric;
  v_spin_rate numeric;
  v_total_rotation numeric;
  v_landing_angle numeric;
  v_angle_error numeric;
  v_tolerance numeric;
  v_rotations integer;
  v_success boolean;
  v_base_reward numeric;
  v_quality_multiplier numeric;
  v_reward bigint := 0;
  v_balance bigint;
  v_daily bigint;
  v_daily_limit bigint := 10000;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  if p_request_id is null or p_charge is null or p_charge < 1 or p_charge > 100 then
    raise exception '던지기 기록이 올바르지 않습니다.' using errcode = '22023';
  end if;

  perform public.ensure_dori_site_user_profile(v_uid);

  -- The client may submit only the charge percentage. Flight outcome is recalculated here.
  v_payload := jsonb_build_object('charge', p_charge);
  insert into public.dori_throw_game_requests(user_id, request_id, action, payload)
  values (v_uid, p_request_id, 'throw', v_payload)
  on conflict (user_id, request_id) do nothing;

  select * into v_request
  from public.dori_throw_game_requests
  where user_id = v_uid and request_id = p_request_id
  for update;

  if v_request.action <> 'throw' or v_request.payload <> v_payload then
    raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.';
  end if;

  if v_request.result is not null then
    return v_request.result;
  end if;

  insert into public.dori_throw_game_progress(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_progress
  from public.dori_throw_game_progress
  where user_id = v_uid
  for update;

  if v_progress.last_throw_at is not null
     and clock_timestamp() - v_progress.last_throw_at < interval '1200 milliseconds' then
    raise exception '다음 던지기까지 잠시 기다려 주세요.';
  end if;

  if v_progress.daily_date <> v_today then
    v_progress.daily_seugi_coin_earned := 0;
  end if;

  -- Keep these constants identical to the client-side flight preview.
  v_q := p_charge::numeric / 100;
  v_flight_duration := 2.85 - (v_q * 0.58) - (v_progress.power_level * 0.016);
  v_flight_speed := 710 / v_flight_duration;
  v_flight_height := 108 + (v_q * 72) + (v_progress.power_level * 2);
  v_spin_rate := 2.35 + (v_q * 8.4) + (v_progress.power_level * 0.28);
  v_total_rotation := v_spin_rate * v_flight_duration;
  v_landing_angle := mod((v_total_rotation * 180) / pi()::numeric, 360);
  v_angle_error := least(v_landing_angle, 360 - v_landing_angle);
  v_tolerance := 12 + (v_progress.accuracy_level * 0.75);
  v_rotations := floor(v_total_rotation / (2 * pi()::numeric))::integer;
  v_success := v_angle_error <= v_tolerance;

  if v_success then
    v_base_reward := 18 + (p_charge * 1.15);
    v_quality_multiplier := 1 + ((v_tolerance - v_angle_error) / v_tolerance) * 1.25;
    v_reward := least(500::numeric,
      floor(v_base_reward * v_quality_multiplier * (1 + v_progress.power_level * 0.025))
    )::bigint;
    v_reward := least(v_reward, greatest(0, v_daily_limit - v_progress.daily_seugi_coin_earned));
  end if;

  v_daily := v_progress.daily_seugi_coin_earned + v_reward;
  v_balance := v_progress.seugi_coin_balance + v_reward;

  update public.dori_throw_game_progress
  set seugi_coin_balance = v_balance,
      seugi_coin_earned = seugi_coin_earned + v_reward,
      daily_seugi_coin_earned = v_daily,
      daily_date = v_today,
      total_throws = total_throws + 1,
      successful_landings = successful_landings + case when v_success then 1 else 0 end,
      best_landing_error_deg = case
        when best_landing_error_deg is null then round(v_angle_error, 3)
        else least(best_landing_error_deg, round(v_angle_error, 3))
      end,
      last_throw_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where user_id = v_uid;

  v_result := jsonb_build_object(
    'ok', true,
    'charge', p_charge,
    'success', v_success,
    'coin_reward', v_reward,
    'balance', v_balance::text,
    'seugi_coin_balance', v_balance::text,
    'seugi_coin_earned', (v_progress.seugi_coin_earned + v_reward)::text,
    'total_throws', v_progress.total_throws + 1,
    'successful_landings', v_progress.successful_landings + case when v_success then 1 else 0 end,
    'daily_seugi_coin_earned', v_daily::text,
    'daily_limit', v_daily_limit,
    'landing_angle_deg', round(v_landing_angle, 2),
    'angle_error_deg', round(v_angle_error, 2),
    'angle_tolerance_deg', round(v_tolerance, 2),
    'flight_duration_sec', round(v_flight_duration, 3),
    'flight_speed', round(v_flight_speed, 2),
    'flight_height', round(v_flight_height, 2),
    'spin_rate_rad_sec', round(v_spin_rate, 3),
    'rotations', v_rotations
  );

  update public.dori_throw_game_requests
  set result = v_result
  where user_id = v_uid and request_id = p_request_id;

  return v_result;
end;
$$;

revoke all on function public.dori_throw_game_throw(integer, uuid) from public, anon;
grant execute on function public.dori_throw_game_throw(integer, uuid) to authenticated;

create or replace function public.dori_throw_game_upgrade(p_upgrade text, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_request public.dori_throw_game_requests%rowtype;
  v_progress public.dori_throw_game_progress%rowtype;
  v_level integer;
  v_cost bigint;
  v_balance bigint;
  v_new_level integer;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  if p_request_id is null or p_upgrade not in ('power', 'accuracy') then
    raise exception '업그레이드 요청이 올바르지 않습니다.' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object('upgrade', p_upgrade);
  insert into public.dori_throw_game_requests(user_id, request_id, action, payload)
  values (v_uid, p_request_id, 'upgrade', v_payload)
  on conflict (user_id, request_id) do nothing;

  select * into v_request
  from public.dori_throw_game_requests
  where user_id = v_uid and request_id = p_request_id
  for update;

  if v_request.action <> 'upgrade' or v_request.payload <> v_payload then
    raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.';
  end if;

  if v_request.result is not null then
    return v_request.result;
  end if;

  insert into public.dori_throw_game_progress(user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select * into v_progress
  from public.dori_throw_game_progress
  where user_id = v_uid
  for update;

  if p_upgrade = 'power' then
    v_level := v_progress.power_level;
    if v_level >= 20 then
      raise exception '힘은 이미 최대 레벨입니다.';
    end if;
    v_cost := ceil(150::numeric * power(1.48::numeric, v_level::numeric))::bigint;
    v_new_level := v_level + 1;
  else
    v_level := v_progress.accuracy_level;
    if v_level >= 20 then
      raise exception '정확도는 이미 최대 레벨입니다.';
    end if;
    v_cost := ceil(180::numeric * power(1.48::numeric, v_level::numeric))::bigint;
    v_new_level := v_level + 1;
  end if;

  if v_progress.seugi_coin_balance < v_cost then
    raise exception '세우기 코인이 부족합니다.';
  end if;

  v_balance := v_progress.seugi_coin_balance - v_cost;

  if p_upgrade = 'power' then
    update public.dori_throw_game_progress
    set power_level = v_new_level,
        seugi_coin_balance = v_balance,
        updated_at = clock_timestamp()
    where user_id = v_uid;
  else
    update public.dori_throw_game_progress
    set accuracy_level = v_new_level,
        seugi_coin_balance = v_balance,
        updated_at = clock_timestamp()
    where user_id = v_uid;
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'upgrade', p_upgrade,
    'level', v_new_level,
    'cost', v_cost,
    'balance', v_balance::text,
    'seugi_coin_balance', v_balance::text,
    'power_level', case when p_upgrade = 'power' then v_new_level else v_progress.power_level end,
    'accuracy_level', case when p_upgrade = 'accuracy' then v_new_level else v_progress.accuracy_level end
  );

  update public.dori_throw_game_requests
  set result = v_result
  where user_id = v_uid and request_id = p_request_id;

  return v_result;
end;
$$;

revoke all on function public.dori_throw_game_upgrade(text, uuid) from public, anon;
grant execute on function public.dori_throw_game_upgrade(text, uuid) to authenticated;

comment on table public.dori_throw_game_progress is
  'Dori Seugi game levels, independent Seugi Coin balance, and upright-landing statistics.';

notify pgrst, 'reload schema';
