create or replace function public.rockey_calendar_notify_day_comment_mention()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_room_id uuid;v_room_name text;v_date date;v_author uuid;v_author_name text;v_body text;
begin
 select c.room_id,c.comment_date,c.author_id,left(c.body,170),r.name
 into v_room_id,v_date,v_author,v_body,v_room_name
 from public.rockey_calendar_day_comments c join public.rockey_calendar_rooms r on r.id=c.room_id
 where c.id=new.comment_id;
 select coalesce(nullif(u.name,''),'캘린더 참여자') into v_author_name
 from public.users u where u.user_id=v_author::text limit 1;
 insert into public.dori_notifications(user_id,category,title,body,target_url,metadata,dedupe_key)
 values(new.mentioned_user_id,'system','공유 캘린더 댓글에서 태그됐어요',
  coalesce(v_author_name,'캘린더 참여자')||'님이 '||to_char(v_date,'YYYY.MM.DD')||' 댓글에서 회원님을 태그했어요: '||coalesce(v_body,''),
  './rockey-calendar.html?room='||v_room_id::text||'&date='||v_date::text,
  jsonb_build_object('kind','calendar_day_comment_mention','comment_id',new.comment_id,'room_id',v_room_id,'comment_date',v_date,'mentioned_by',v_author),
  'calendar-day-mention:'||new.comment_id::text||':'||new.mentioned_user_id::text)
 on conflict(user_id,dedupe_key) do nothing;
 return new;
end;
$function$;
revoke all on function public.rockey_calendar_notify_day_comment_mention() from public,anon,authenticated;
