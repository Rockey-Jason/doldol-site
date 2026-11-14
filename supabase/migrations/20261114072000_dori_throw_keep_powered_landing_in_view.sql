-- Keep boosted throw landing coordinates inside the visible arena while preserving actual flight distance.
-- Align displayed and server landing verdicts, restore the displayed daily coin limit,
-- and increase the effect of both throw-game upgrades.
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
    'daily_limit', 25000,
    'daily_remaining', greatest(0, 25000 - v_daily)::text
  );
end;
$$;

revoke all on function public.dori_throw_game_get_state() from public, anon;
grant execute on function public.dori_throw_game_get_state() to authenticated;

create or replace function public.dori_throw_game_throw(p_charge integer, p_request_id uuid)
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
  v_gravity_multiplier numeric := 9.00;
  v_flight_duration numeric;
  v_flight_distance numeric;
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
  v_daily_limit bigint := 25000;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  if p_request_id is null or p_charge is null or p_charge < 1 or p_charge > 100 then
    raise exception '던지기 기록이 올바르지 않습니다.' using errcode = '22023';
  end if;

  perform public.ensure_dori_site_user_profile(v_uid);

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

  -- All gameplay coefficients are mirrored in getFlightParams() on the client.
  -- Upright judging uses the same one-decimal precision shown to the player.
  v_q := p_charge::numeric / 100;
  v_flight_duration := (2.90 - (v_q * 0.45) - (v_progress.power_level * 0.018)) / sqrt(v_gravity_multiplier);
  v_flight_distance := 260 + (v_q * 450) + (v_progress.power_level * 20);
  v_flight_speed := v_flight_distance / v_flight_duration;
  v_flight_height := 105 + (v_q * 125) + (v_progress.power_level * 7);
  v_spin_rate := 3.80 + (v_q * 15) + (v_progress.power_level * 1.00);
  v_total_rotation := v_spin_rate * v_flight_duration;
  v_landing_angle := mod((v_total_rotation * 180) / pi()::numeric, 360);
  v_angle_error := least(v_landing_angle, 360 - v_landing_angle);
  v_tolerance := 18 + (v_progress.accuracy_level * 2.40);
  v_rotations := floor(v_total_rotation / (2 * pi()::numeric))::integer;
  v_success := round(v_angle_error, 1) <= round(v_tolerance, 1);

  if v_success then
    v_base_reward := 18 + (p_charge * 1.15);
    v_quality_multiplier := 1 + ((v_tolerance - v_angle_error) / v_tolerance) * 1.25;
    v_reward := least(500::numeric, greatest(1::numeric,
      floor(v_base_reward * v_quality_multiplier * (1 + v_progress.power_level * 0.05))
    ))::bigint;
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
    'daily_limit_reached', (v_success and v_reward = 0 and v_daily >= v_daily_limit),
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
    'flight_distance_px', round(v_flight_distance, 2),
    'landing_x_px', round(190 + least(v_flight_distance, 850), 2),
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

comment on function public.dori_throw_game_throw(integer, uuid) is
  'Server-scored Dori throw using one-decimal visible landing verdicts, a 25,000 Seugi Coin daily cap, and stronger power and accuracy upgrades.';

notify pgrst, 'reload schema';
