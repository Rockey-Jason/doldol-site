
-- Dori Seugi Season 2: server-backed replays, leaderboards, missions and sitewide achievements.
alter table public.dori_throw_game_progress
  add column if not exists perfect_landings bigint not null default 0 check (perfect_landings >= 0),
  add column if not exists current_perfect_streak integer not null default 0 check (current_perfect_streak >= 0),
  add column if not exists best_perfect_streak integer not null default 0 check (best_perfect_streak >= 0);

create table if not exists public.dori_throw_game_records (
  record_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  mode text not null default 'classic' check (mode in ('classic','time_attack','endless','precision')),
  charge integer not null check (charge between 1 and 100),
  success boolean not null,
  is_perfect boolean not null default false,
  coin_reward bigint not null default 0 check (coin_reward >= 0),
  landing_angle_deg numeric(9,3) not null,
  angle_error_deg numeric(9,3) not null,
  angle_tolerance_deg numeric(9,3) not null,
  flight_duration_sec numeric(9,3) not null,
  flight_distance_px numeric(12,2) not null,
  landing_x_px numeric(12,2) not null,
  flight_speed numeric(12,2) not null,
  flight_height numeric(12,2) not null,
  spin_rate_rad_sec numeric(12,4) not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(user_id,request_id)
);
create index if not exists dori_throw_game_records_user_created_idx
  on public.dori_throw_game_records(user_id,created_at desc);
create index if not exists dori_throw_game_records_leaderboard_idx
  on public.dori_throw_game_records(is_perfect,success,angle_error_deg);
create index if not exists dori_throw_game_records_mode_idx
  on public.dori_throw_game_records(user_id,mode,created_at desc);
alter table public.dori_throw_game_records enable row level security;
revoke all on public.dori_throw_game_records from anon, authenticated;

create table if not exists public.dori_throw_game_daily_missions (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  mission_key text not null check (mission_key in ('throw_5','success_3','perfect_1','challenge_3')),
  target integer not null check (target > 0),
  progress integer not null default 0 check (progress >= 0),
  reward_seugi_coin bigint not null check (reward_seugi_coin > 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  primary key(user_id,mission_date,mission_key)
);
create index if not exists dori_throw_game_daily_missions_user_date_idx
  on public.dori_throw_game_daily_missions(user_id,mission_date desc);
alter table public.dori_throw_game_daily_missions enable row level security;
revoke all on public.dori_throw_game_daily_missions from anon, authenticated;

-- Backfill historic server results so personal records and rankings include prior play.
insert into public.dori_throw_game_records(
  user_id,request_id,mode,charge,success,is_perfect,coin_reward,
  landing_angle_deg,angle_error_deg,angle_tolerance_deg,flight_duration_sec,
  flight_distance_px,landing_x_px,flight_speed,flight_height,spin_rate_rad_sec,created_at
)
select
  r.user_id,r.request_id,
  case when r.payload->>'mode' in ('time_attack','endless','precision') then r.payload->>'mode' else 'classic' end,
  greatest(1,least(100,coalesce((r.payload->>'charge')::integer,1))),
  coalesce((r.result->>'success')::boolean,false),
  coalesce((r.result->>'success')::boolean,false) and coalesce((r.result->>'angle_error_deg')::numeric,999) <= 2.0,
  coalesce((r.result->>'coin_reward')::bigint,0),
  coalesce((r.result->>'landing_angle_deg')::numeric,0),
  coalesce((r.result->>'angle_error_deg')::numeric,180),
  coalesce((r.result->>'angle_tolerance_deg')::numeric,18),
  coalesce((r.result->>'flight_duration_sec')::numeric,0),
  coalesce((r.result->>'flight_distance_px')::numeric,0),
  coalesce((r.result->>'landing_x_px')::numeric,190),
  coalesce((r.result->>'flight_speed')::numeric,0),
  coalesce((r.result->>'flight_height')::numeric,0),
  coalesce((r.result->>'spin_rate_rad_sec')::numeric,0),
  r.created_at
from public.dori_throw_game_requests r
where r.action='throw' and r.result is not null
  and r.result ? 'landing_angle_deg'
on conflict(user_id,request_id) do nothing;

with ordered as (
  select user_id,is_perfect,
    row_number() over(partition by user_id order by created_at,request_id) as seq_all,
    row_number() over(partition by user_id,is_perfect order by created_at,request_id) as seq_state
  from public.dori_throw_game_records
),
streaks as (
  select user_id, count(*) as streak_len
  from ordered
  where is_perfect
  group by user_id,(seq_all-seq_state)
),
counts as (
  select user_id,count(*) filter(where is_perfect) as perfect_count
  from public.dori_throw_game_records
  group by user_id
),
summary as (
  select c.user_id,c.perfect_count,coalesce(max(s.streak_len),0) as best_streak
  from counts c
  left join streaks s using(user_id)
  group by c.user_id,c.perfect_count
),
trailing_streak as (
  select r.user_id,count(*) as current_streak
  from public.dori_throw_game_records r
  where r.is_perfect
    and r.created_at > coalesce(
      (select max(x.created_at) from public.dori_throw_game_records x
       where x.user_id=r.user_id and not x.is_perfect),
      '-infinity'::timestamptz
    )
  group by r.user_id
)
update public.dori_throw_game_progress p
set perfect_landings=coalesce(s.perfect_count,0),
    best_perfect_streak=coalesce(s.best_streak,0),
    current_perfect_streak=coalesce(t.current_streak,0)
from summary s
left join trailing_streak t using(user_id)
where p.user_id=s.user_id;

create or replace function public.dori_throw_game_record_result()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_error numeric;
  v_success boolean;
  v_perfect boolean;
  v_mode text;
  v_inserted integer;
begin
  if new.result is null or old.result is not null then return new; end if;
  v_error := coalesce((new.result->>'angle_error_deg')::numeric,180);
  v_success := coalesce((new.result->>'success')::boolean,false);
  v_perfect := v_success and v_error <= 2.0;
  v_mode := case when new.payload->>'mode' in ('time_attack','endless','precision') then new.payload->>'mode' else 'classic' end;

  insert into public.dori_throw_game_records(
    user_id,request_id,mode,charge,success,is_perfect,coin_reward,
    landing_angle_deg,angle_error_deg,angle_tolerance_deg,flight_duration_sec,
    flight_distance_px,landing_x_px,flight_speed,flight_height,spin_rate_rad_sec,created_at
  ) values (
    new.user_id,new.request_id,v_mode,
    greatest(1,least(100,coalesce((new.payload->>'charge')::integer,1))),
    v_success,v_perfect,coalesce((new.result->>'coin_reward')::bigint,0),
    coalesce((new.result->>'landing_angle_deg')::numeric,0),v_error,
    coalesce((new.result->>'angle_tolerance_deg')::numeric,18),
    coalesce((new.result->>'flight_duration_sec')::numeric,0),
    coalesce((new.result->>'flight_distance_px')::numeric,0),
    coalesce((new.result->>'landing_x_px')::numeric,190),
    coalesce((new.result->>'flight_speed')::numeric,0),
    coalesce((new.result->>'flight_height')::numeric,0),
    coalesce((new.result->>'spin_rate_rad_sec')::numeric,0),
    new.created_at
  ) on conflict(user_id,request_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted=0 then return new; end if;

  update public.dori_throw_game_progress p
  set perfect_landings=p.perfect_landings + case when v_perfect then 1 else 0 end,
      current_perfect_streak=case when v_perfect then p.current_perfect_streak+1 else 0 end,
      best_perfect_streak=case when v_perfect then greatest(p.best_perfect_streak,p.current_perfect_streak+1) else p.best_perfect_streak end,
      updated_at=clock_timestamp()
  where p.user_id=new.user_id;

  insert into public.dori_throw_game_daily_missions(
    user_id,mission_date,mission_key,target,progress,reward_seugi_coin,completed_at
  )
  select new.user_id,v_today,m.mission_key,m.target,
         case when m.advance then 1 else 0 end,
         m.reward_seugi_coin,
         case when m.advance and m.target=1 then clock_timestamp() else null end
  from (values
    ('throw_5',5,35::bigint,true),
    ('success_3',3,50::bigint,v_success),
    ('perfect_1',1,75::bigint,v_perfect),
    ('challenge_3',3,60::bigint,v_mode <> 'classic')
  ) as m(mission_key,target,reward_seugi_coin,advance)
  on conflict(user_id,mission_date,mission_key) do update
  set progress=least(public.dori_throw_game_daily_missions.target,
       public.dori_throw_game_daily_missions.progress + case when excluded.progress>0 then 1 else 0 end),
      completed_at=case
        when public.dori_throw_game_daily_missions.completed_at is not null then public.dori_throw_game_daily_missions.completed_at
        when excluded.progress>0 and public.dori_throw_game_daily_missions.progress+1 >= public.dori_throw_game_daily_missions.target then clock_timestamp()
        else null end;
  return new;
end;
$function$;

drop trigger if exists dori_throw_game_record_result on public.dori_throw_game_requests;
create trigger dori_throw_game_record_result
after update of result on public.dori_throw_game_requests
for each row execute function public.dori_throw_game_record_result();

create or replace function public.dori_throw_game_get_daily_missions()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_rows jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
  insert into public.dori_throw_game_daily_missions(user_id,mission_date,mission_key,target,progress,reward_seugi_coin)
  values
    (v_uid,v_today,'throw_5',5,0,35),
    (v_uid,v_today,'success_3',3,0,50),
    (v_uid,v_today,'perfect_1',1,0,75),
    (v_uid,v_today,'challenge_3',3,0,60)
  on conflict(user_id,mission_date,mission_key) do nothing;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',m.mission_key,
    'title',case m.mission_key
      when 'throw_5' then '돌이 5회 던지기'
      when 'success_3' then '성공 착지 3회'
      when 'perfect_1' then 'PERFECT 착지 1회'
      when 'challenge_3' then '특별 모드 3회 도전'
    end,
    'description',case m.mission_key
      when 'throw_5' then '오늘 돌이를 다섯 번 던져 보자.'
      when 'success_3' then '허용 각도 안에 세 번 착지시키자.'
      when 'perfect_1' then '착지 오차 ±2.0° 이내를 달성하자.'
      when 'challenge_3' then '타임어택·무한·정밀 모드에서 세 번 던져 보자.'
    end,
    'target',m.target,'progress',m.progress,
    'reward_seugi_coin',m.reward_seugi_coin,
    'completed',m.completed_at is not null,
    'claimed',m.claimed_at is not null,
    'completed_at',m.completed_at,
    'claimed_at',m.claimed_at
  ) order by case m.mission_key when 'throw_5' then 1 when 'success_3' then 2 when 'perfect_1' then 3 else 4 end),'[]'::jsonb)
  into v_rows
  from public.dori_throw_game_daily_missions m
  where m.user_id=v_uid and m.mission_date=v_today;
  return jsonb_build_object('ok',true,'date',v_today,'missions',v_rows);
end;
$function$;

create or replace function public.dori_throw_game_claim_daily_mission(p_mission_key text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_reward bigint;
  v_balance bigint;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
  if p_mission_key not in ('throw_5','success_3','perfect_1','challenge_3') then
    raise exception '미션 정보가 올바르지 않습니다.' using errcode='22023';
  end if;
  update public.dori_throw_game_daily_missions
  set claimed_at=clock_timestamp()
  where user_id=v_uid and mission_date=v_today and mission_key=p_mission_key
    and completed_at is not null and claimed_at is null
  returning reward_seugi_coin into v_reward;
  if v_reward is null then
    return jsonb_build_object('ok',false,'reason','not_claimable');
  end if;
  insert into public.dori_throw_game_progress(user_id) values(v_uid) on conflict(user_id) do nothing;
  update public.dori_throw_game_progress p
  set seugi_coin_balance=p.seugi_coin_balance+v_reward,
      seugi_coin_earned=p.seugi_coin_earned+v_reward,
      daily_seugi_coin_earned=case when p.daily_date=v_today then p.daily_seugi_coin_earned+v_reward else v_reward end,
      daily_date=v_today,
      updated_at=clock_timestamp()
  where p.user_id=v_uid
  returning seugi_coin_balance into v_balance;
  return jsonb_build_object('ok',true,'mission_key',p_mission_key,'reward_seugi_coin',v_reward,'balance',v_balance::text);
end;
$function$;

create or replace function public.dori_throw_game_get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
  v_stats jsonb;
  v_records jsonb;
  v_week jsonb;
  v_best jsonb;
  v_perfect jsonb;
  v_success jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
  select jsonb_build_object(
    'perfect_landings',p.perfect_landings,
    'current_perfect_streak',p.current_perfect_streak,
    'best_perfect_streak',p.best_perfect_streak,
    'average_error_7d',coalesce((
      select round(avg(r.angle_error_deg),2)
      from public.dori_throw_game_records r
      where r.user_id=v_uid
        and (r.created_at at time zone 'Asia/Seoul')::date >= v_today-6
    ),0),
    'challenge_throws',(
      select count(*) from public.dori_throw_game_records r
      where r.user_id=v_uid and r.mode<>'classic'
    )
  ) into v_stats
  from public.dori_throw_game_progress p where p.user_id=v_uid;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb)
  into v_records
  from (
    select record_id,mode,charge,success,is_perfect,coin_reward,
      landing_angle_deg,angle_error_deg,angle_tolerance_deg,flight_duration_sec,
      flight_distance_px,landing_x_px,flight_speed,flight_height,spin_rate_rad_sec,created_at
    from public.dori_throw_game_records
    where user_id=v_uid
    order by created_at desc
    limit 12
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'day',to_char(d.day,'MM/DD'),
    'throws',(select count(*) from public.dori_throw_game_records r where r.user_id=v_uid and (r.created_at at time zone 'Asia/Seoul')::date=d.day::date),
    'successes',(select count(*) from public.dori_throw_game_records r where r.user_id=v_uid and r.success and (r.created_at at time zone 'Asia/Seoul')::date=d.day::date),
    'perfects',(select count(*) from public.dori_throw_game_records r where r.user_id=v_uid and r.is_perfect and (r.created_at at time zone 'Asia/Seoul')::date=d.day::date)
  ) order by d.day),'[]'::jsonb)
  into v_week
  from generate_series((v_today-6)::timestamp,v_today::timestamp,interval '1 day') d(day);

  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',q.rank,'name',q.name,'user_number',q.user_number,
    'best_error',q.best_error,'perfect_count',q.perfect_count,'success_count',q.success_count
  ) order by q.rank),'[]'::jsonb)
  into v_best
  from (
    select row_number() over(order by p.best_landing_error_deg asc,p.successful_landings desc,p.total_throws asc) as rank,
      coalesce(nullif(u.name,''),'돌이 사용자') as name,u.user_number,
      p.best_landing_error_deg as best_error,p.perfect_landings as perfect_count,p.successful_landings as success_count
    from public.dori_throw_game_progress p
    join public.users u on u.user_id=p.user_id::text
    where p.best_landing_error_deg is not null and p.total_throws>0
  ) q where q.rank<=10;

  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',q.rank,'name',q.name,'user_number',q.user_number,
    'best_error',q.best_error,'perfect_count',q.perfect_count,'success_count',q.success_count
  ) order by q.rank),'[]'::jsonb)
  into v_perfect
  from (
    select row_number() over(order by p.perfect_landings desc,p.best_landing_error_deg asc nulls last,p.total_throws desc) as rank,
      coalesce(nullif(u.name,''),'돌이 사용자') as name,u.user_number,
      p.best_landing_error_deg as best_error,p.perfect_landings as perfect_count,p.successful_landings as success_count
    from public.dori_throw_game_progress p
    join public.users u on u.user_id=p.user_id::text
    where p.total_throws>0
  ) q where q.rank<=10;

  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',q.rank,'name',q.name,'user_number',q.user_number,
    'best_error',q.best_error,'perfect_count',q.perfect_count,'success_count',q.success_count
  ) order by q.rank),'[]'::jsonb)
  into v_success
  from (
    select row_number() over(order by p.successful_landings desc,p.best_landing_error_deg asc nulls last,p.total_throws desc) as rank,
      coalesce(nullif(u.name,''),'돌이 사용자') as name,u.user_number,
      p.best_landing_error_deg as best_error,p.perfect_landings as perfect_count,p.successful_landings as success_count
    from public.dori_throw_game_progress p
    join public.users u on u.user_id=p.user_id::text
    where p.total_throws>0
  ) q where q.rank<=10;

  return jsonb_build_object(
    'ok',true,
    'stats',coalesce(v_stats,'{}'::jsonb),
    'recent_records',v_records,
    'weekly_stats',v_week,
    'leaderboards',jsonb_build_object('best',v_best,'perfect',v_perfect,'success',v_success)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.dori_throw_game_throw(p_charge integer, p_request_id uuid, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_result jsonb;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  if p_request_id is null or p_charge is null or p_charge < 1 or p_charge > 100
     or p_mode not in ('classic','time_attack','endless','precision') then
    raise exception '던지기 기록이 올바르지 않습니다.' using errcode = '22023';
  end if;

  perform public.ensure_dori_site_user_profile(v_uid);

  v_payload := jsonb_build_object('charge', p_charge, 'mode', p_mode);
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
    'mode', p_mode,
    'success', v_success,
    'coin_reward', v_reward,
    'balance', v_balance::text,
    'seugi_coin_balance', v_balance::text,
    'seugi_coin_earned', (v_progress.seugi_coin_earned + v_reward)::text,
    'total_throws', v_progress.total_throws + 1,
    'successful_landings', v_progress.successful_landings + case when v_success then 1 else 0 end,
    'daily_seugi_coin_earned', v_daily::text,
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
$function$;

CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_achievement public.achievements%rowtype;
  v_user public.users%rowtype;
  v_achievements jsonb;
  v_reward_coin bigint;
  v_reward_exp bigint;
  v_new_exp bigint;
  v_old_level bigint;
  v_new_level bigint;
  v_news_count bigint := 0;
  v_box_count bigint := 0;
  v_condition_met boolean := false;
  v_coupon_exp_multiplier numeric := 1;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_achievement
  from public.achievements
  where id = p_achievement_id and enabled = true;

  if not found then
    return jsonb_build_object(
      'success', false,
      'already_claimed', false,
      'achievement_id', p_achievement_id,
      'reason', 'achievement_not_found'
    );
  end if;

  select * into v_user
  from public.users
  where user_id = v_uid::text
  for update;

  if not found then
    raise exception '사용자 정보를 찾을 수 없습니다.';
  end if;

  v_achievements := coalesce(v_user.user_achievement, '{}'::jsonb);

  if v_achievements ? p_achievement_id then
    return jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'achievement_id', p_achievement_id
    );
  end if;

  if jsonb_typeof(coalesce(v_user.read_dori_news_numbers, '[]'::jsonb)) = 'array' then
    v_news_count := jsonb_array_length(coalesce(v_user.read_dori_news_numbers, '[]'::jsonb));
  end if;

  if p_achievement_id in ('first_box', 'tenth_box', 'hundred_box', 'thousand_box') then
    select count(*) into v_box_count
    from public.dori_box_history
    where user_id = v_uid;
  end if;

  case p_achievement_id
    when 'first_login' then v_condition_met := true;

    when 'first_chess' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid;

    when 'chess_win_talc' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'talc' and result = '1-0';

    when 'chess_win_sleeping' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'sleep' and result = '1-0';

    when 'chess_win_fur' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'fur' and result = '1-0';

    when 'chess_win_rockey' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'rockey' and result = '1-0';

    when 'chess_win_army' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'army' and result = '1-0';

    when 'chess_win_doronum' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'doronum' and result = '1-0';

    when 'chess_win_brilliant' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'brilliant' and result = '1-0';

    when 'chess_10_win' then
      select count(*) >= 10 into v_condition_met
      from public.chess_games where user_id = v_uid and result = '1-0';

    when 'chess_100_win' then
      select count(*) >= 100 into v_condition_met
      from public.chess_games where user_id = v_uid and result = '1-0';

    when 'read_news' then
      v_condition_met := coalesce(v_user.read_dori_news, 0) >= 1 or v_news_count >= 1;

    when 'quiz_correct' then
      v_condition_met := v_user.quiz_right;

    when 'read_1_news' then
      v_condition_met := v_news_count >= 1;

    when 'read_10_news' then
      v_condition_met := v_news_count >= 10;

    when 'rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 100000000;

    when 'very_rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 1000000000000;

    when 'super_rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 10000000000000000;

    when 'rockey_7777777' then
      v_condition_met := coalesce(v_user.special_title_draws, 0) >= 7;

    when 'first_box' then
      v_condition_met := v_box_count >= 1;

    when 'tenth_box' then
      v_condition_met := v_box_count >= 10;

    when 'hundred_box' then
      v_condition_met := v_box_count >= 100;

    when 'thousand_box' then
      v_condition_met := v_box_count >= 1000;

    -- Stock-related achievements are based on submitted BUY orders, not executions.
    -- Cancelled/expired/rejected orders do not count. Legacy BUY trades are retained for compatibility.
    when 'first_dori_electronics' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=4 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=4 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockey_doronium' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=3 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=3 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockeypaper' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=1 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=1 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_bandoche' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=2 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=2 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_food' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=5 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=5 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockeycloth' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=6 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=6 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_stock' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_first_sell' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_10_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 10 into v_condition_met;
    when 'stock_50_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 50 into v_condition_met;
    when 'stock_100_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 100 into v_condition_met;
    when 'stock_500_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 500 into v_condition_met;
    when 'stock_buy_10_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10 into v_condition_met;
    when 'stock_buy_100_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100 into v_condition_met;
    when 'stock_buy_1000_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 1000 into v_condition_met;
    when 'stock_sell_10_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10 into v_condition_met;
    when 'stock_sell_100_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100 into v_condition_met;
    when 'stock_volume_1m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 1000000 into v_condition_met;
    when 'stock_volume_10m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10000000 into v_condition_met;
    when 'stock_volume_100m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100000000 into v_condition_met;
    when 'stock_3_companies' then
      select (select count(distinct stock_id) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 3
        or (select count(distinct stock_id) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 3 into v_condition_met;
    when 'stock_6_companies' then
      select (select count(distinct stock_id) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 6
        or (select count(distinct stock_id) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 6 into v_condition_met;
    when 'stock_5_trading_days' then
      select (select count(distinct created_at::date) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 5
        or (select count(distinct created_at::date) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 5 into v_condition_met;
    when 'stock_round_trip' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_bulk_buy_100' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and original_quantity>=100 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>=100) into v_condition_met;
    when 'stock_bulk_buy_1000' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and original_quantity>=1000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>=1000) into v_condition_met;
    when 'stock_single_trade_1m' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and limit_price*original_quantity>=1000000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and total_amount>=1000000) into v_condition_met;
    when 'stock_single_trade_10m' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and limit_price*original_quantity>=10000000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and total_amount>=10000000) into v_condition_met;

    when 'attendance_7_days' then
      v_condition_met := (select count(*) >= 7 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_30_days' then
      v_condition_met := (select count(*) >= 30 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_100_days' then
      v_condition_met := (select count(*) >= 100 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_streak_7' then
      v_condition_met := (select coalesce(max(streak_count),0) >= 7 from public.user_daily_attendance where user_id=v_uid::text);

    when 'attendance_streak_30' then
      v_condition_met := (select coalesce(max(streak_count),0) >= 30 from public.user_daily_attendance where user_id=v_uid::text);

    when 'mission_10' then
      v_condition_met := (select count(*) >= 10 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_50' then
      v_condition_met := (select count(*) >= 50 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_100' then
      v_condition_met := (select count(*) >= 100 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_7_days' then
      v_condition_met := (select count(distinct mission_date) >= 7 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_30_days' then
      v_condition_met := (select count(distinct mission_date) >= 30 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'study_focus_1h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 3600 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_10h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 36000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_50h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 180000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_50' then
      v_condition_met := (select count(*) >= 50 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_exam_1' then
      v_condition_met := exists(select 1 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_exam_5' then
      v_condition_met := (select count(*) >= 5 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_time_attack_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_time_attack_50' then
      v_condition_met := (select count(*) >= 50 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_100' then
      v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 100 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'bank_account_opened' then
      v_condition_met := exists(select 1 from public.dori_bank_accounts where auth_user_id=v_uid and lower(coalesce(status,'')) not in ('closed','deleted'));

    when 'bank_transfer_1' then
      v_condition_met := exists(select 1 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_transactions_10' then
      v_condition_met := (select count(*) >= 10 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_deposit_1' then
      v_condition_met := exists(select 1 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_5' then
      v_condition_met := (select count(*) >= 5 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_matured' then
      v_condition_met := exists(select 1 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_loan_1' then
      v_condition_met := exists(select 1 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_repaid_1' then
      v_condition_met := exists(select 1 from public.dori_bank_loans where auth_user_id=v_uid and (settled_at is not null or lower(coalesce(status,'')) in ('repaid','paid','settled','completed','상환완료')));

    when 'news_survey_1' then
      v_condition_met := (select count(*) >= 1 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_5' then
      v_condition_met := (select count(*) >= 5 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_20' then
      v_condition_met := (select count(*) >= 20 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'event_participation_1' then
      v_condition_met := (select count(*) >= 1 from public.event_participations where user_id=v_uid::text);

    when 'event_participation_10' then
      v_condition_met := (select count(*) >= 10 from public.event_participations where user_id=v_uid::text);

    when 'event_quiz_1' then
      v_condition_met := exists(select 1 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'event_quiz_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'box_rare_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='RARE');

    when 'box_epic_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='EPIC');

    when 'box_legendary_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='LEGENDARY');

    when 'box_total_500' then
      v_condition_met := (select count(*) >= 500 from public.dori_box_history where user_id=v_uid);

    when 'box_total_5000' then
      v_condition_met := (select count(*) >= 5000 from public.dori_box_history where user_id=v_uid);

    when 'chess_25_win' then
      v_condition_met := (select count(*) >= 25 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_50_win' then
      v_condition_met := (select count(*) >= 50 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_250_win' then
      v_condition_met := (select count(*) >= 250 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_500_win' then
      v_condition_met := (select count(*) >= 500 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_play_100' then
      v_condition_met := (select count(*) >= 100 from public.chess_games where user_id=v_uid);

    when 'coin_1m' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=1000000;

    when 'coin_10m' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=10000000;

    when 'coin_1b' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=1000000000;

    when 'collection_5_items' then
      v_condition_met := (select count(distinct item_id) >= 5 from public.user_inventory where user_id=v_uid);

    when 'collection_10_items' then
      v_condition_met := (select count(distinct item_id) >= 10 from public.user_inventory where user_id=v_uid);

    when 'collection_25_items' then
      v_condition_met := (select count(distinct item_id) >= 25 from public.user_inventory where user_id=v_uid);

    when 'stock_dividend_1' then
      v_condition_met := exists(select 1 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_100k' then
      v_condition_met := (select coalesce(sum(amount),0) >= 100000 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_1m' then
      v_condition_met := (select coalesce(sum(amount),0) >= 1000000 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'attendance_200_days' then v_condition_met := (select count(*) >= 200 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_365_days' then v_condition_met := (select count(*) >= 365 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_streak_14' then v_condition_met := (select coalesce(max(streak_count),0) >= 14 from public.user_daily_attendance where user_id=v_uid::text);

    when 'attendance_streak_100' then v_condition_met := (select coalesce(max(streak_count),0) >= 100 from public.user_daily_attendance where user_id=v_uid::text);

    when 'mission_200' then v_condition_met := (select count(*) >= 200 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_500' then v_condition_met := (select count(*) >= 500 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_1000' then v_condition_met := (select count(*) >= 1000 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_100_days' then v_condition_met := (select count(distinct mission_date) >= 100 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_365_days' then v_condition_met := (select count(distinct mission_date) >= 365 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'study_focus_100h' then v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 360000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_200h' then v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 720000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_100' then v_condition_met := (select count(*) >= 100 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_250' then v_condition_met := (select count(*) >= 250 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_exam_10' then v_condition_met := (select count(*) >= 10 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_exam_25' then v_condition_met := (select count(*) >= 25 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_time_attack_100' then v_condition_met := (select count(*) >= 100 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_time_attack_250' then v_condition_met := (select count(*) >= 250 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_500' then v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 500 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_1000' then v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 1000 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'bank_transactions_50' then v_condition_met := (select count(*) >= 50 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_transactions_100' then v_condition_met := (select count(*) >= 100 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_transfer_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_transfer_50' then v_condition_met := (select count(*) >= 50 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_deposit_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_25' then v_condition_met := (select count(*) >= 25 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_matured_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_deposit_matured_20' then v_condition_met := (select count(*) >= 20 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_loan_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_repaid_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_loans where auth_user_id=v_uid and (settled_at is not null or lower(coalesce(status,'')) in ('repaid','paid','settled','completed','상환완료')));

    when 'news_survey_50' then v_condition_met := (select count(*) >= 50 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_100' then v_condition_met := (select count(*) >= 100 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'event_participation_25' then v_condition_met := (select count(*) >= 25 from public.event_participations where user_id=v_uid::text);

    when 'event_participation_50' then v_condition_met := (select count(*) >= 50 from public.event_participations where user_id=v_uid::text);

    when 'event_quiz_25' then v_condition_met := (select count(*) >= 25 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'event_quiz_50' then v_condition_met := (select count(*) >= 50 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'box_total_25' then v_condition_met := (select count(*) >= 25 from public.dori_box_history where user_id=v_uid);

    when 'box_total_250' then v_condition_met := (select count(*) >= 250 from public.dori_box_history where user_id=v_uid);

    when 'box_total_10000' then v_condition_met := (select count(*) >= 10000 from public.dori_box_history where user_id=v_uid);

    when 'box_rare_10' then v_condition_met := (select count(*) >= 10 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='RARE');

    when 'box_epic_10' then v_condition_met := (select count(*) >= 10 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='EPIC');

    when 'box_legendary_5' then v_condition_met := (select count(*) >= 5 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='LEGENDARY');

    when 'chess_5_win' then v_condition_met := (select count(*) >= 5 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_1000_win' then v_condition_met := (select count(*) >= 1000 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_play_500' then v_condition_met := (select count(*) >= 500 from public.chess_games where user_id=v_uid);

    when 'coin_100k' then v_condition_met := coalesce(v_user.doldolcoin,0)>=100000;

    when 'coin_100m' then v_condition_met := coalesce(v_user.doldolcoin,0)>=100000000;

    when 'coin_10b' then v_condition_met := coalesce(v_user.doldolcoin,0)>=10000000000;

    when 'collection_50_items' then v_condition_met := (select count(distinct item_id) >= 50 from public.user_inventory where user_id=v_uid);

    when 'collection_100_items' then v_condition_met := (select count(distinct item_id) >= 100 from public.user_inventory where user_id=v_uid);

    when 'stock_dividend_10' then v_condition_met := (select count(*) >= 10 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_10m' then v_condition_met := (select coalesce(sum(amount),0) >= 10000000 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'seugi_first_throw' then
      v_condition_met := (select count(*) >= 1 from public.dori_throw_game_records where user_id=v_uid);
    when 'seugi_100_throws' then
      v_condition_met := (select count(*) >= 100 from public.dori_throw_game_records where user_id=v_uid);
    when 'seugi_500_throws' then
      v_condition_met := (select count(*) >= 500 from public.dori_throw_game_records where user_id=v_uid);
    when 'seugi_1000_throws' then
      v_condition_met := (select count(*) >= 1000 from public.dori_throw_game_records where user_id=v_uid);
    when 'seugi_perfect_1' then
      v_condition_met := (select count(*) >= 1 from public.dori_throw_game_records where user_id=v_uid and is_perfect);
    when 'seugi_perfect_10' then
      v_condition_met := (select count(*) >= 10 from public.dori_throw_game_records where user_id=v_uid and is_perfect);
    when 'seugi_perfect_50' then
      v_condition_met := (select count(*) >= 50 from public.dori_throw_game_records where user_id=v_uid and is_perfect);
    when 'seugi_perfect_streak_10' then
      v_condition_met := coalesce((select best_perfect_streak >= 10 from public.dori_throw_game_progress where user_id=v_uid),false);
    when 'seugi_challenge_25' then
      v_condition_met := (select count(*) >= 25 from public.dori_throw_game_records where user_id=v_uid and mode <> 'classic');
    else
      v_condition_met := false;

  end case;

  if not v_condition_met then
    return jsonb_build_object(
      'success', false,
      'already_claimed', false,
      'achievement_id', p_achievement_id,
      'reason', 'condition_not_met'
    );
  end if;

  v_reward_coin := coalesce(v_achievement.reward_doldolcoin, 0);
  IF v_user.doldolcoin_multiplier_expires_at IS NOT NULL AND v_user.doldolcoin_multiplier_expires_at > now() THEN
    v_reward_coin := floor(v_reward_coin * coalesce(v_user.doldolcoin_multiplier, 1))::bigint;
  END IF;
  v_coupon_exp_multiplier := CASE
    WHEN coalesce(v_user.user_level,1) >= 8 THEN 1.40
    WHEN coalesce(v_user.user_level,1) >= 5 THEN 1.20
    WHEN coalesce(v_user.user_level,1) >= 2 THEN 1.05
    ELSE 1 END;
  v_reward_exp := coalesce(v_achievement.reward_exp, 0);
  IF p_achievement_id = 'quiz_correct' THEN
    v_reward_exp := floor(v_reward_exp * v_coupon_exp_multiplier)::bigint;
  END IF;
  v_new_exp := coalesce(v_user.exp, 0) + v_reward_exp;
  v_old_level := greatest(1, coalesce(v_user.exp_level, 1));

  v_new_level := case
    when v_new_exp >= 100000 then 11
    when v_new_exp >= 50000 then 10
    when v_new_exp >= 40000 then 9
    when v_new_exp >= 30000 then 8
    when v_new_exp >= 20000 then 7
    when v_new_exp >= 10000 then 6
    when v_new_exp >= 5000 then 5
    when v_new_exp >= 1000 then 4
    when v_new_exp >= 500 then 3
    when v_new_exp >= 100 then 2
    else 1
  end;

  v_achievements := jsonb_set(
    v_achievements,
    array[p_achievement_id],
    jsonb_build_object(
      'id', v_achievement.id,
      '이름', v_achievement.name,
      '설명', v_achievement.description,
      '희귀도', v_achievement.rarity,
      '보상', jsonb_build_object('돌돌코인', v_reward_coin, '경험치', v_reward_exp),
      '칭호', v_achievement.title,
      '아이콘', v_achievement.icon,
      '획득시간', now()
    ),
    true
  );

  update public.users
  set user_achievement = v_achievements,
      doldolcoin = coalesce(v_user.doldolcoin, 0) + v_reward_coin,
      exp = v_new_exp,
      exp_level = v_new_level
  where user_id = v_uid::text;

  return jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'achievement_id', v_achievement.id,
    'name', v_achievement.name,
    'description', v_achievement.description,
    'rarity', v_achievement.rarity,
    'icon', v_achievement.icon,
    'title', v_achievement.title,
    'reward_doldolcoin', v_reward_coin, 'base_reward_doldolcoin', coalesce(v_achievement.reward_doldolcoin, 0), 'coin_multiplier', CASE WHEN v_user.doldolcoin_multiplier_expires_at IS NOT NULL AND v_user.doldolcoin_multiplier_expires_at > now() THEN coalesce(v_user.doldolcoin_multiplier, 1) ELSE 1 END,
    'reward_exp', v_reward_exp,
    'exp_multiplier', CASE WHEN p_achievement_id = 'quiz_correct' THEN v_coupon_exp_multiplier ELSE 1 END,
    'old_exp', coalesce(v_user.exp, 0),
    'new_exp', v_new_exp,
    'old_level', v_old_level,
    'new_level', v_new_level
  );
end;
$function$


insert into public.achievements(id,name,description,rarity,reward_exp,reward_doldolcoin,icon,enabled,title)
values
 ('seugi_first_throw','첫 세우기','돌이 세우기에서 첫 번째 던지기를 완료했다.','Common',100,1000,'🐾',true,null),
 ('seugi_100_throws','세우기 초보 탈출','돌이 세우기에서 누적 100회 던지기를 완료했다.','Rare',300,15000,'🎯',true,null),
 ('seugi_500_throws','세우기 숙련자','돌이 세우기에서 누적 500회 던지기를 완료했다.','Epic',1200,80000,'🏅',true,null),
 ('seugi_1000_throws','세우기의 전설','돌이 세우기에서 누적 1,000회 던지기를 완료했다.','Legendary',3000,250000,'👑',true,null),
 ('seugi_perfect_1','첫 PERFECT','돌이 세우기에서 PERFECT 착지를 처음 달성했다.','Rare',250,10000,'✨',true,null),
 ('seugi_perfect_10','PERFECT 수집가','돌이 세우기에서 PERFECT 착지 10회를 달성했다.','Epic',1000,70000,'💫',true,null),
 ('seugi_perfect_50','PERFECT의 전설','돌이 세우기에서 PERFECT 착지 50회를 달성했다.','Legendary',3500,250000,'🌟',true,null),
 ('seugi_perfect_streak_10','완벽의 연속','PERFECT 착지 10회 연속을 달성했다.','Legendary',2500,180000,'🔥',true,null),
 ('seugi_challenge_25','도전 모드 정복자','타임어택·무한·정밀 모드에서 누적 25회 던졌다.','Epic',1000,80000,'🏆',true,null)
on conflict(id) do nothing;

revoke all on function public.dori_throw_game_record_result() from public,anon,authenticated;
revoke all on function public.dori_throw_game_get_daily_missions() from public,anon,authenticated;
revoke all on function public.dori_throw_game_claim_daily_mission(text) from public,anon,authenticated;
revoke all on function public.dori_throw_game_get_dashboard() from public,anon,authenticated;
revoke all on function public.dori_throw_game_throw(integer,uuid,text) from public,anon,authenticated;
grant execute on function public.dori_throw_game_get_daily_missions() to authenticated;
grant execute on function public.dori_throw_game_claim_daily_mission(text) to authenticated;
grant execute on function public.dori_throw_game_get_dashboard() to authenticated;
grant execute on function public.dori_throw_game_throw(integer,uuid,text) to authenticated;
