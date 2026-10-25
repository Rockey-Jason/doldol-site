-- Learning rewards are granted only by the server-side RPC. Users can read only their own claim history.
create table if not exists public.rockey_study_reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_code text not null check (reward_code in (
    'focus_25','focus_50','focus_120','planner_3','planner_all','time_attack',
    'streak_3','streak_7','streak_30'
  )),
  reward_date date not null,
  amount bigint not null check (amount between 1000 and 100000),
  created_at timestamptz not null default now(),
  unique (user_id, reward_code, reward_date)
);

create index if not exists rockey_study_reward_claims_user_created_idx
  on public.rockey_study_reward_claims(user_id, created_at desc);

alter table public.rockey_study_reward_claims enable row level security;

drop policy if exists "Users can read own Rockey Study reward claims" on public.rockey_study_reward_claims;
create policy "Users can read own Rockey Study reward claims"
  on public.rockey_study_reward_claims for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.rockey_study_reward_claims from anon, authenticated;
grant select on public.rockey_study_reward_claims to authenticated;

create or replace function public.claim_rockey_study_reward(p_reward_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_amount bigint := 0;
  v_message text := '';
  v_focus_seconds bigint := 0;
  v_completed_sessions integer := 0;
  v_task_total integer := 0;
  v_task_done integer := 0;
  v_days integer := 0;
  v_day date;
  v_claim_id uuid;
  v_balance bigint;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'message', '보상을 받으려면 먼저 로그인해 주세요.');
  end if;

  select coalesce(sum(actual_seconds),0), count(*)
    into v_focus_seconds, v_completed_sessions
  from public.rockey_study_focus_sessions
  where user_id = v_uid
    and session_type = 'focus'
    and status = 'completed'
    and actual_seconds >= 0
    and planned_seconds >= 60
    and actual_seconds <= planned_seconds
    and (ended_at at time zone 'Asia/Seoul')::date = v_today;

  case p_reward_code
    when 'focus_25' then
      if exists (
        select 1 from public.rockey_study_focus_sessions
        where user_id=v_uid and session_type='focus' and status='completed'
          and planned_seconds >= 1500 and actual_seconds >= 1500
          and actual_seconds <= planned_seconds
          and (ended_at at time zone 'Asia/Seoul')::date=v_today
      ) then v_amount:=1000; v_message:='25분 집중 세션 완료 보상'; else v_message:='오늘 25분 이상 집중 세션을 하나 완료하면 받을 수 있어요.'; end if;
    when 'focus_50' then
      if v_focus_seconds >= 3000 then v_amount:=5000; v_message:='오늘 누적 집중 50분 달성'; else v_message:='오늘 완료된 집중 세션이 누적 50분 이상 필요해요.'; end if;
    when 'focus_120' then
      if v_focus_seconds >= 7200 then v_amount:=20000; v_message:='오늘 누적 집중 2시간 달성'; else v_message:='오늘 완료된 집중 세션이 누적 2시간 이상 필요해요.'; end if;
    when 'planner_3' then
      select coalesce(sum(jsonb_array_length(tasks)),0),
             coalesce(sum((select count(*) from jsonb_array_elements(tasks) t where coalesce((t->>'completed')::boolean,false))),0)
        into v_task_total,v_task_done
      from public.rockey_study_planner_days
      where user_id=v_uid and plan_date=v_today;
      if v_task_done >= 3 then v_amount:=3000; v_message:='오늘 학습 계획 3개 완료'; else v_message:='오늘 플래너에서 학습 할 일을 3개 이상 완료해 주세요.'; end if;
    when 'planner_all' then
      select coalesce(sum(jsonb_array_length(tasks)),0),
             coalesce(sum((select count(*) from jsonb_array_elements(tasks) t where coalesce((t->>'completed')::boolean,false))),0)
        into v_task_total,v_task_done
      from public.rockey_study_planner_days
      where user_id=v_uid and plan_date=v_today;
      if v_task_total > 0 and v_task_done = v_task_total then v_amount:=10000; v_message:='오늘 학습 계획 전체 완료'; else v_message:='오늘 플래너에 할 일을 하나 이상 등록하고 전부 완료해 주세요.'; end if;
    when 'time_attack' then
      if exists (select 1 from public.rockey_study_time_attack_records
        where user_id=v_uid and question_count >= 5
          and (completed_at at time zone 'Asia/Seoul')::date=v_today) then
        v_amount:=5000; v_message:='타임 어택 5문제 이상 완료'; else v_message:='오늘 로키 타임 어택에서 5문제 이상 완료해 주세요.'; end if;
    when 'streak_3' then v_amount:=10000; v_days:=3; v_message:='3일 연속 집중 학습 달성';
    when 'streak_7' then v_amount:=50000; v_days:=7; v_message:='7일 연속 집중 학습 달성';
    when 'streak_30' then v_amount:=100000; v_days:=30; v_message:='30일 연속 집중 학습 달성';
    else return jsonb_build_object('success',false,'message','알 수 없는 보상 항목이에요.');
  end case;

  if p_reward_code in ('streak_3','streak_7','streak_30') then
    v_days := case p_reward_code when 'streak_3' then 3 when 'streak_7' then 7 else 30 end;
    for i in 0..v_days-1 loop
      v_day := v_today - i;
      if not exists (
        select 1 from public.rockey_study_focus_sessions
        where user_id=v_uid and session_type='focus' and status='completed'
          and planned_seconds >= 1500 and actual_seconds >= 1500
          and actual_seconds <= planned_seconds
          and (ended_at at time zone 'Asia/Seoul')::date=v_day
      ) then
        v_amount:=0;
        v_message := format('%s일 연속 보상은 오늘을 포함해 매일 25분 이상 집중 세션을 완료해야 해요. 현재 기록을 확인해 주세요.',v_days);
        exit;
      end if;
    end loop;
  end if;

  if v_amount <= 0 then
    return jsonb_build_object('success',false,'message',v_message);
  end if;

  insert into public.rockey_study_reward_claims(user_id,reward_code,reward_date,amount)
  values(v_uid,p_reward_code,v_today,v_amount)
  on conflict(user_id,reward_code,reward_date) do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    return jsonb_build_object('success',false,'duplicate',true,'message','이 보상은 오늘 이미 받았어요. 내일 다시 도전해 봐요!');
  end if;

  update public.users
    set doldolcoin = coalesce(doldolcoin,0) + v_amount
    where user_id = v_uid::text
    returning doldolcoin into v_balance;

  if not found then
    delete from public.rockey_study_reward_claims where id=v_claim_id;
    return jsonb_build_object('success',false,'message','사이트 계정 정보를 찾지 못했어요. 로그인 상태를 확인해 주세요.');
  end if;

  return jsonb_build_object('success',true,'amount',v_amount,'balance',v_balance,'message',v_message);
exception when others then
  return jsonb_build_object('success',false,'message','보상 처리 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.');
end;
$$;

revoke all on function public.claim_rockey_study_reward(text) from public, anon;
grant execute on function public.claim_rockey_study_reward(text) to authenticated;
