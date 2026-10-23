-- Use the human-readable mission title in notification copy.
create or replace function public.dori_notify_daily_mission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_newly_completed boolean := false;
  v_mission_title text;
begin
  if tg_op = 'INSERT' then
    v_newly_completed := new.completed_at is not null;
  else
    v_newly_completed := old.completed_at is null and new.completed_at is not null;
  end if;
  if not v_newly_completed then return new; end if;

  select title into v_mission_title
  from public.daily_mission_definitions
  where mission_key = new.mission_key
  limit 1;
  v_mission_title := coalesce(nullif(btrim(v_mission_title), ''), '오늘의 미션');

  insert into public.dori_notifications(
    user_id, category, title, body, target_url, metadata, dedupe_key
  )
  values (
    new.user_id,
    'mission',
    '일일 미션 완료',
    '「' || left(v_mission_title, 120) || '」 미션을 완료했어요. 오늘의 미션 진행도를 확인해 보세요.',
    './daily-missions.html',
    jsonb_build_object('mission_key', new.mission_key, 'mission_date', new.mission_date),
    'mission:' || new.mission_date::text || ':' || new.mission_key
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$function$;
