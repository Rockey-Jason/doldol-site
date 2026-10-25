-- Return uncapped measured values; progress percentage remains capped in the dashboard response.
CREATE OR REPLACE FUNCTION public.get_rockey_study_reward_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_week_start date := date_trunc('week', (now() at time zone 'Asia/Seoul'))::date;
  v_focus_today bigint := 0;
  v_sessions_today integer := 0;
  v_focus_week bigint := 0;
  v_focus_all bigint := 0;
  v_sessions_all integer := 0;
  v_days_all integer := 0;
  v_streak integer := 0;
  v_task_today integer := 0;
  v_done_today integer := 0;
  v_done_all integer := 0;
  v_time_max integer := 0;
  v_time_all integer := 0;
  v_rewards jsonb := '[]'::jsonb;
  v_achievements jsonb := '[]'::jsonb;
  v_item jsonb;
  v_result jsonb;
  v_reward_result jsonb := '[]'::jsonb;
  v_achievement_result jsonb := '[]'::jsonb;
  v_claimed boolean;
  v_period text;
  v_date date;
  v_arr jsonb;
  v_day date;
  i integer;
begin
  if v_uid is null then
    return jsonb_build_object('success',false,'message','로그인 후 개인 학습 보상을 확인해 주세요.');
  end if;

  select coalesce(sum(actual_seconds),0), count(*)
    into v_focus_today,v_sessions_today
  from public.rockey_study_focus_sessions
  where user_id=v_uid and session_type='focus' and status='completed'
    and actual_seconds between 0 and planned_seconds and planned_seconds >= 60
    and (ended_at at time zone 'Asia/Seoul')::date=v_today;

  select coalesce(sum(actual_seconds),0)
    into v_focus_week
  from public.rockey_study_focus_sessions
  where user_id=v_uid and session_type='focus' and status='completed'
    and actual_seconds between 0 and planned_seconds and planned_seconds >= 60
    and (ended_at at time zone 'Asia/Seoul')::date between v_week_start and v_today;

  select coalesce(sum(actual_seconds),0),count(*),
         count(distinct (ended_at at time zone 'Asia/Seoul')::date)
    into v_focus_all,v_sessions_all,v_days_all
  from public.rockey_study_focus_sessions
  where user_id=v_uid and session_type='focus' and status='completed'
    and actual_seconds between 0 and planned_seconds and planned_seconds >= 60;

  select coalesce(sum(jsonb_array_length(tasks)),0),
         coalesce(sum((select count(*) from jsonb_array_elements(tasks) t where coalesce((t->>'completed')::boolean,false))),0)
    into v_task_today,v_done_today
  from public.rockey_study_planner_days
  where user_id=v_uid and plan_date=v_today;

  select coalesce(sum(jsonb_array_length(tasks)),0),
         coalesce(sum((select count(*) from jsonb_array_elements(tasks) t where coalesce((t->>'completed')::boolean,false))),0)
    into i,v_done_all
  from public.rockey_study_planner_days where user_id=v_uid;

  select coalesce(max(question_count),0),count(*)
    into v_time_max,v_time_all
  from public.rockey_study_time_attack_records where user_id=v_uid;

  for i in 0..29 loop
    v_day := v_today-i;
    if exists (
      select 1 from public.rockey_study_focus_sessions
      where user_id=v_uid and session_type='focus' and status='completed'
        and actual_seconds >= 1500 and actual_seconds <= planned_seconds
        and planned_seconds >= 1500
        and (ended_at at time zone 'Asia/Seoul')::date=v_day
    ) then
      v_streak:=v_streak+1;
    else
      exit;
    end if;
  end loop;

  v_rewards := jsonb_build_array(
    jsonb_build_object('code','focus_15','name','워밍업 성공','description','오늘 집중 세션 누적 15분','amount',2500,'current',v_focus_today,'target',900,'period','daily','category','focus'),
    jsonb_build_object('code','focus_25','name','몰입의 시작','description','오늘 25분 이상 집중 세션 하나 완료','amount',5000,'current',greatest(case when exists(select 1 from public.rockey_study_focus_sessions where user_id=v_uid and session_type='focus' and status='completed' and actual_seconds>=1500 and actual_seconds<=planned_seconds and planned_seconds>=1500 and (ended_at at time zone 'Asia/Seoul')::date=v_today) then 1 else 0 end,0),'target',1,'period','daily','category','focus'),
    jsonb_build_object('code','focus_50','name','집중 50분','description','오늘 집중 누적 50분','amount',12000,'current',v_focus_today,'target',3000,'period','daily','category','focus'),
    jsonb_build_object('code','focus_90','name','딥 워크 90분','description','오늘 집중 누적 90분','amount',25000,'current',v_focus_today,'target',5400,'period','daily','category','focus'),
    jsonb_build_object('code','focus_120','name','두 시간의 몰입','description','오늘 집중 누적 2시간','amount',40000,'current',v_focus_today,'target',7200,'period','daily','category','focus'),
    jsonb_build_object('code','focus_180','name','오늘의 공부왕','description','오늘 집중 누적 3시간','amount',65000,'current',v_focus_today,'target',10800,'period','daily','category','focus'),
    jsonb_build_object('code','focus_sessions_3','name','세션 3연속','description','오늘 집중 세션 3개 완료','amount',10000,'current',v_sessions_today,'target',3,'period','daily','category','focus'),
    jsonb_build_object('code','planner_1','name','계획 실행','description','오늘 할 일 하나 완료','amount',3000,'current',v_done_today,'target',1,'period','daily','category','planner'),
    jsonb_build_object('code','planner_3','name','체크리스트 정복','description','오늘 할 일 3개 완료','amount',10000,'current',v_done_today,'target',3,'period','daily','category','planner'),
    jsonb_build_object('code','planner_5','name','오늘의 실행가','description','오늘 할 일 5개 완료','amount',25000,'current',v_done_today,'target',5,'period','daily','category','planner'),
    jsonb_build_object('code','planner_all','name','플래너 올클리어','description','오늘 등록한 할 일을 전부 완료','amount',30000,'current',case when v_task_today>0 then v_done_today else 0 end,'target',greatest(v_task_today,1),'period','daily','category','planner','requires_tasks',true),
    jsonb_build_object('code','time_attack_5','name','스피드 입문','description','오늘 타임 어택 5문제 이상 한 판 완료','amount',10000,'current',coalesce((select max(question_count) from public.rockey_study_time_attack_records where user_id=v_uid and (completed_at at time zone 'Asia/Seoul')::date=v_today),0),'target',5,'period','daily','category','time_attack'),
    jsonb_build_object('code','time_attack_10','name','스피드 러너','description','오늘 타임 어택 10문제 이상 한 판 완료','amount',25000,'current',coalesce((select max(question_count) from public.rockey_study_time_attack_records where user_id=v_uid and (completed_at at time zone 'Asia/Seoul')::date=v_today),0),'target',10,'period','daily','category','time_attack'),
    jsonb_build_object('code','time_attack_20','name','퀴즈 돌파왕','description','오늘 타임 어택 20문제 이상 한 판 완료','amount',50000,'current',coalesce((select max(question_count) from public.rockey_study_time_attack_records where user_id=v_uid and (completed_at at time zone 'Asia/Seoul')::date=v_today),0),'target',20,'period','daily','category','time_attack'),
    jsonb_build_object('code','time_attack_50','name','타임 어택 전설','description','오늘 타임 어택 50문제 이상 한 판 완료','amount',100000,'current',coalesce((select max(question_count) from public.rockey_study_time_attack_records where user_id=v_uid and (completed_at at time zone 'Asia/Seoul')::date=v_today),0),'target',50,'period','daily','category','time_attack'),
    jsonb_build_object('code','weekly_focus_600','name','주간 집중 10시간','description','이번 주 월요일부터 오늘까지 집중 10시간','amount',50000,'current',v_focus_week,'target',36000,'period','weekly','category','weekly'),
    jsonb_build_object('code','weekly_focus_1200','name','주간 집중 20시간','description','이번 주 집중 20시간','amount',100000,'current',v_focus_week,'target',72000,'period','weekly','category','weekly'),
    jsonb_build_object('code','streak_3','name','3일 연속 불꽃','description','오늘 포함 3일 연속 매일 25분 집중','amount',30000,'current',v_streak,'target',3,'period','milestone','category','streak'),
    jsonb_build_object('code','streak_7','name','7일 연속 챔피언','description','오늘 포함 7일 연속 매일 25분 집중','amount',100000,'current',v_streak,'target',7,'period','milestone','category','streak'),
    jsonb_build_object('code','streak_30','name','30일 연속 레전드','description','오늘 포함 30일 연속 매일 25분 집중','amount',100000,'current',v_streak,'target',30,'period','milestone','category','streak')
  );

  v_reward_result := '[]'::jsonb;
  for v_item in select value from jsonb_array_elements(v_rewards) loop
    v_period := v_item->>'period';
    v_date := case when v_period='weekly' then v_week_start when v_period='milestone' then date '2000-01-01' else v_today end;
    select exists(select 1 from public.rockey_study_reward_claims c
      where c.user_id=v_uid and c.reward_code=v_item->>'code' and c.reward_date=v_date)
      into v_claimed;
    v_reward_result := v_reward_result || jsonb_build_array(v_item || jsonb_build_object(
      'claimed',v_claimed,
      'eligible',((v_item->>'current')::numeric >= (v_item->>'target')::numeric)
        and (coalesce((v_item->>'requires_tasks')::boolean,false)=false or v_task_today>0),
      'progress',case when (v_item->>'target')::numeric<=0 then 0 else least(100,round(((v_item->>'current')::numeric/(v_item->>'target')::numeric)*100)) end
    ));
  end loop;

  v_achievements := jsonb_build_array(
    jsonb_build_object('code','ach_first_focus','name','첫 발걸음','description','집중 세션 1개 완료','amount',5000,'current',v_sessions_all,'target',1),
    jsonb_build_object('code','ach_focus_10','name','몰입 습관','description','누적 집중 세션 10개 완료','amount',15000,'current',v_sessions_all,'target',10),
    jsonb_build_object('code','ach_focus_50','name','집중 전문가','description','누적 집중 세션 50개 완료','amount',50000,'current',v_sessions_all,'target',50),
    jsonb_build_object('code','ach_focus_100','name','집중의 전설','description','누적 집중 세션 100개 완료','amount',100000,'current',v_sessions_all,'target',100),
    jsonb_build_object('code','ach_planner_20','name','계획 실천가','description','플래너 할 일 20개 완료','amount',20000,'current',v_done_all,'target',20),
    jsonb_build_object('code','ach_planner_100','name','계획 마스터','description','플래너 할 일 100개 완료','amount',100000,'current',v_done_all,'target',100),
    jsonb_build_object('code','ach_time_attack_10','name','속도 감각','description','타임 어택 10판 완료','amount',25000,'current',v_time_all,'target',10),
    jsonb_build_object('code','ach_time_attack_50','name','타임 어택 마스터','description','타임 어택 50판 완료','amount',100000,'current',v_time_all,'target',50),
    jsonb_build_object('code','ach_study_7days','name','일주일 개근','description','집중 세션 기록이 있는 날짜 7일','amount',50000,'current',v_days_all,'target',7),
    jsonb_build_object('code','ach_study_30days','name','한 달의 성실함','description','집중 세션 기록이 있는 날짜 30일','amount',100000,'current',v_days_all,'target',30)
  );
  v_achievement_result := '[]'::jsonb;
  for v_item in select value from jsonb_array_elements(v_achievements) loop
    select exists(select 1 from public.rockey_study_reward_claims c
      where c.user_id=v_uid and c.reward_code=v_item->>'code' and c.reward_date=date '2000-01-01')
      into v_claimed;
    v_achievement_result := v_achievement_result || jsonb_build_array(v_item || jsonb_build_object(
      'claimed',v_claimed,
      'eligible',((v_item->>'current')::numeric >= (v_item->>'target')::numeric),
      'progress',case when (v_item->>'target')::numeric<=0 then 0 else least(100,round(((v_item->>'current')::numeric/(v_item->>'target')::numeric)*100)) end,
      'period','achievement','category','achievement'
    ));
  end loop;

  return jsonb_build_object('success',true,'rewards',(
    select coalesce(jsonb_agg(value order by case value->>'category' when 'focus' then 1 when 'planner' then 2 when 'time_attack' then 3 when 'weekly' then 4 else 5 end), '[]'::jsonb)
    from jsonb_array_elements(v_reward_result) value
  ),'achievements',(
    select coalesce(jsonb_agg(value), '[]'::jsonb) from jsonb_array_elements(v_achievement_result) value
  ),'stats',jsonb_build_object('focus_today_seconds',v_focus_today,'focus_week_seconds',v_focus_week,'focus_all_seconds',v_focus_all,'sessions_today',v_sessions_today,'sessions_all',v_sessions_all,'tasks_today',v_task_today,'tasks_done_today',v_done_today,'tasks_done_all',v_done_all,'time_attack_today_best',coalesce((select max(question_count) from public.rockey_study_time_attack_records where user_id=v_uid and (completed_at at time zone 'Asia/Seoul')::date=v_today),0),'time_attack_all',v_time_all,'streak',v_streak,'active_days',v_days_all));
end;
$function$


revoke all on function public.get_rockey_study_reward_dashboard() from public, anon;
grant execute on function public.get_rockey_study_reward_dashboard() to authenticated;
revoke all on function public.claim_rockey_study_reward(text) from public, anon;
grant execute on function public.claim_rockey_study_reward(text) to authenticated;
