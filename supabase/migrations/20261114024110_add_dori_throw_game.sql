
create table if not exists public.dori_throw_game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  power_level integer not null default 0 check (power_level between 0 and 20),
  accuracy_level integer not null default 0 check (accuracy_level between 0 and 20),
  total_throws bigint not null default 0 check (total_throws >= 0),
  total_spins bigint not null default 0 check (total_spins >= 0),
  best_spins integer not null default 0 check (best_spins between 0 and 3),
  total_earned bigint not null default 0 check (total_earned >= 0),
  daily_earned bigint not null default 0 check (daily_earned >= 0),
  daily_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  last_throw_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create table if not exists public.dori_throw_game_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  action text not null check (action in ('throw', 'upgrade')),
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default clock_timestamp(),
  primary key (user_id, request_id)
);
alter table public.dori_throw_game_progress enable row level security;
alter table public.dori_throw_game_requests enable row level security;
revoke all on table public.dori_throw_game_progress from public, anon, authenticated;
revoke all on table public.dori_throw_game_requests from public, anon, authenticated;

create or replace function public.dori_throw_game_get_state()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_progress public.dori_throw_game_progress%rowtype;
  v_balance bigint;
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
  if v_uid is null then raise exception '로그인 후 돌이 세우기를 이용할 수 있습니다.' using errcode = '28000'; end if;
  insert into public.dori_throw_game_progress(user_id) values (v_uid) on conflict (user_id) do nothing;
  update public.dori_throw_game_progress set daily_date = v_today, daily_earned = 0, updated_at = clock_timestamp()
    where user_id = v_uid and daily_date <> v_today;
  select * into v_progress from public.dori_throw_game_progress where user_id = v_uid;
  select coalesce(doldolcoin, 0) into v_balance from public.users where user_id = v_uid::text;
  if not found then raise exception '사용자 계정을 찾을 수 없습니다.'; end if;
  return jsonb_build_object(
    'ok', true, 'balance', coalesce(v_balance, 0)::text,
    'power_level', v_progress.power_level, 'accuracy_level', v_progress.accuracy_level,
    'total_throws', v_progress.total_throws, 'total_spins', v_progress.total_spins,
    'best_spins', v_progress.best_spins, 'total_earned', v_progress.total_earned::text,
    'daily_earned', v_progress.daily_earned::text, 'daily_limit', 25000,
    'daily_remaining', greatest(0, 25000 - v_progress.daily_earned)::text
  );
end; $$;

create or replace function public.dori_throw_game_throw(p_charge integer, p_spins integer, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_request public.dori_throw_game_requests%rowtype;
  v_user public.users%rowtype;
  v_progress public.dori_throw_game_progress%rowtype;
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_base bigint;
  v_spin_multiplier numeric;
  v_power_multiplier numeric;
  v_accuracy_multiplier numeric;
  v_user_multiplier numeric := 1;
  v_reward bigint;
  v_balance bigint;
  v_result jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '28000'; end if;
  if p_request_id is null or p_charge is null or p_charge < 1 or p_charge > 100 or p_spins is null or p_spins < 0 or p_spins > 3 then
    raise exception '던지기 기록이 올바르지 않습니다.' using errcode = '22023';
  end if;
  v_payload := jsonb_build_object('charge', p_charge, 'spins', p_spins);
  insert into public.dori_throw_game_requests(user_id, request_id, action, payload)
    values (v_uid, p_request_id, 'throw', v_payload) on conflict (user_id, request_id) do nothing;
  select * into v_request from public.dori_throw_game_requests where user_id = v_uid and request_id = p_request_id for update;
  if v_request.action <> 'throw' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_user from public.users where user_id = v_uid::text for update;
  if not found then raise exception '사용자 계정을 찾을 수 없습니다.'; end if;
  insert into public.dori_throw_game_progress(user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_progress from public.dori_throw_game_progress where user_id = v_uid for update;
  if v_progress.last_throw_at is not null and clock_timestamp() - v_progress.last_throw_at < interval '1200 milliseconds' then
    raise exception '다음 던지기까지 잠시 기다려 주세요.';
  end if;
  if v_progress.daily_date <> v_today then v_progress.daily_date := v_today; v_progress.daily_earned := 0; end if;
  v_base := case when p_charge <= 20 then 10 when p_charge <= 40 then 22 when p_charge <= 60 then 45
    when p_charge <= 80 then 82 when p_charge <= 95 then 132 else 180 end;
  v_spin_multiplier := case p_spins when 0 then 1.00 when 1 then 1.55 when 2 then 2.55 else 4.00 end;
  v_power_multiplier := 1 + (v_progress.power_level * 0.035);
  v_accuracy_multiplier := 1 + (v_progress.accuracy_level * 0.025);
  if v_user.doldolcoin_multiplier_expires_at is not null and v_user.doldolcoin_multiplier_expires_at > clock_timestamp() then
    v_user_multiplier := greatest(1, coalesce(v_user.doldolcoin_multiplier, 1));
  end if;
  v_reward := least(2500::numeric, floor(v_base * v_spin_multiplier * v_power_multiplier * v_accuracy_multiplier * v_user_multiplier))::bigint;
  v_reward := least(v_reward, greatest(0, 25000 - v_progress.daily_earned));
  if v_reward > 0 then
    update public.users set doldolcoin = coalesce(doldolcoin, 0) + v_reward where user_id = v_uid::text returning doldolcoin into v_balance;
  else v_balance := coalesce(v_user.doldolcoin, 0);
  end if;
  update public.dori_throw_game_progress set
    total_throws = v_progress.total_throws + 1,
    total_spins = v_progress.total_spins + p_spins,
    best_spins = greatest(v_progress.best_spins, p_spins),
    total_earned = v_progress.total_earned + v_reward,
    daily_earned = v_progress.daily_earned + v_reward,
    daily_date = v_today, last_throw_at = clock_timestamp(), updated_at = clock_timestamp()
    where user_id = v_uid;
  v_result := jsonb_build_object(
    'ok', true, 'charge', p_charge, 'spins', p_spins, 'base_coin', v_base,
    'coin_reward', v_reward, 'balance', coalesce(v_balance, v_user.doldolcoin, 0)::text,
    'power_level', v_progress.power_level, 'accuracy_level', v_progress.accuracy_level,
    'total_throws', v_progress.total_throws + 1, 'total_spins', v_progress.total_spins + p_spins,
    'best_spins', greatest(v_progress.best_spins, p_spins),
    'daily_earned', (v_progress.daily_earned + v_reward)::text, 'daily_limit', 25000
  );
  update public.dori_throw_game_requests set result = v_result where user_id = v_uid and request_id = p_request_id;
  return v_result;
end; $$;

create or replace function public.dori_throw_game_upgrade(p_upgrade text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_payload jsonb;
  v_request public.dori_throw_game_requests%rowtype;
  v_user public.users%rowtype;
  v_progress public.dori_throw_game_progress%rowtype;
  v_level integer;
  v_cost bigint;
  v_balance bigint;
  v_new_level integer;
  v_result jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode = '28000'; end if;
  if p_request_id is null or p_upgrade not in ('power', 'accuracy') then raise exception '업그레이드 요청이 올바르지 않습니다.' using errcode = '22023'; end if;
  v_payload := jsonb_build_object('upgrade', p_upgrade);
  insert into public.dori_throw_game_requests(user_id, request_id, action, payload)
    values (v_uid, p_request_id, 'upgrade', v_payload) on conflict (user_id, request_id) do nothing;
  select * into v_request from public.dori_throw_game_requests where user_id = v_uid and request_id = p_request_id for update;
  if v_request.action <> 'upgrade' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_user from public.users where user_id = v_uid::text for update;
  if not found then raise exception '사용자 계정을 찾을 수 없습니다.'; end if;
  insert into public.dori_throw_game_progress(user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_progress from public.dori_throw_game_progress where user_id = v_uid for update;
  if p_upgrade = 'power' then
    v_level := v_progress.power_level;
    if v_level >= 20 then raise exception '힘은 이미 최대 레벨입니다.'; end if;
    v_cost := ceil(150::numeric * power(1.48::numeric, v_level::numeric))::bigint;
    v_new_level := v_level + 1;
  else
    v_level := v_progress.accuracy_level;
    if v_level >= 20 then raise exception '정확도는 이미 최대 레벨입니다.'; end if;
    v_cost := ceil(180::numeric * power(1.48::numeric, v_level::numeric))::bigint;
    v_new_level := v_level + 1;
  end if;
  if coalesce(v_user.doldolcoin, 0) < v_cost then raise exception '돌돌코인이 부족합니다.'; end if;
  update public.users set doldolcoin = coalesce(doldolcoin, 0) - v_cost where user_id = v_uid::text returning doldolcoin into v_balance;
  if p_upgrade = 'power' then
    update public.dori_throw_game_progress set power_level = v_new_level, updated_at = clock_timestamp() where user_id = v_uid;
  else update public.dori_throw_game_progress set accuracy_level = v_new_level, updated_at = clock_timestamp() where user_id = v_uid;
  end if;
  v_result := jsonb_build_object('ok', true, 'upgrade', p_upgrade, 'level', v_new_level, 'cost', v_cost,
    'balance', v_balance::text, 'power_level', case when p_upgrade = 'power' then v_new_level else v_progress.power_level end,
    'accuracy_level', case when p_upgrade = 'accuracy' then v_new_level else v_progress.accuracy_level end);
  update public.dori_throw_game_requests set result = v_result where user_id = v_uid and request_id = p_request_id;
  return v_result;
end; $$;
revoke all on function public.dori_throw_game_get_state() from public, anon;
revoke all on function public.dori_throw_game_throw(integer, integer, uuid) from public, anon;
revoke all on function public.dori_throw_game_upgrade(text, uuid) from public, anon;
grant execute on function public.dori_throw_game_get_state() to authenticated;
grant execute on function public.dori_throw_game_throw(integer, integer, uuid) to authenticated;
grant execute on function public.dori_throw_game_upgrade(text, uuid) to authenticated;
comment on table public.dori_throw_game_progress is 'Dori Seugi game levels, throw statistics, and daily coin cap state.';
comment on table public.dori_throw_game_requests is 'Idempotency records for Dori Seugi throws and upgrades.';
