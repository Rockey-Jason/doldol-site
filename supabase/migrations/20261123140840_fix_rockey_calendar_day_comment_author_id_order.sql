create or replace function public.rockey_calendar_post_day_comment(p_room_id uuid,p_comment_date date,p_body text,p_mentioned_user_ids uuid[] default '{}'::uuid[])
returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_uid uuid:=auth.uid();v_comment_id uuid;v_target uuid;v_seen uuid[]:='{}'::uuid[];
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 if not public.rockey_calendar_is_member(p_room_id) then raise exception '이 캘린더의 참여자만 댓글을 작성할 수 있습니다.' using errcode='42501';end if;
 if p_comment_date is null then raise exception '댓글 날짜를 확인해 주세요.' using errcode='22023';end if;
 if char_length(btrim(coalesce(p_body,''))) not between 1 and 2000 then raise exception '댓글은 1~2000자로 입력해 주세요.' using errcode='22023';end if;
 if cardinality(coalesce(p_mentioned_user_ids,'{}'::uuid[]))>20 then raise exception '한 댓글에서 태그할 수 있는 인원은 최대 20명입니다.' using errcode='22023';end if;
 insert into public.rockey_calendar_day_comments(room_id,comment_date,author_id,body)
 values(p_room_id,p_comment_date,v_uid,btrim(p_body)) returning id into v_comment_id;
 for v_target in select distinct unnest(coalesce(p_mentioned_user_ids,'{}'::uuid[])) loop
  if v_target=v_uid or v_target=any(v_seen) then continue;end if;
  v_seen:=array_append(v_seen,v_target);
  if not exists(select 1 from public.rockey_calendar_members m where m.room_id=p_room_id and m.user_id=v_target) then raise exception '태그한 사용자가 이 캘린더 참여자가 아닙니다.' using errcode='42501';end if;
  insert into public.rockey_calendar_day_comment_mentions(comment_id,room_id,mentioned_user_id) values(v_comment_id,p_room_id,v_target);
 end loop;
 return v_comment_id;
end;
$function$;
revoke all on function public.rockey_calendar_post_day_comment(uuid,date,text,uuid[]) from public,anon;
grant execute on function public.rockey_calendar_post_day_comment(uuid,date,text,uuid[]) to authenticated;
