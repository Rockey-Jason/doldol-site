-- Mark every comment in a day thread as read for the current member.
create or replace function public.rockey_calendar_mark_day_comments_read(p_room_id uuid,p_comment_date date)
returns integer language plpgsql security invoker set search_path=''
as $function$
declare v_uid uuid:=auth.uid();v_count integer:=0;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 if not public.rockey_calendar_is_member(p_room_id) then raise exception '이 캘린더의 참여자가 아닙니다.' using errcode='42501';end if;
 insert into public.rockey_calendar_day_comment_reads(comment_id,room_id,reader_id)
 select c.id,c.room_id,v_uid from public.rockey_calendar_day_comments c
 where c.room_id=p_room_id and c.comment_date=p_comment_date and c.author_id<>v_uid
 on conflict(comment_id,reader_id) do nothing;
 get diagnostics v_count=row_count;return v_count;
end;
$function$;
revoke all on function public.rockey_calendar_mark_day_comments_read(uuid,date) from public,anon;
grant execute on function public.rockey_calendar_mark_day_comments_read(uuid,date) to authenticated;

drop policy if exists rockey_calendar_day_mentions_author_insert on public.rockey_calendar_day_comment_mentions;
create policy rockey_calendar_day_mentions_author_insert on public.rockey_calendar_day_comment_mentions
 for insert to authenticated with check(
  public.rockey_calendar_is_member(rockey_calendar_day_comment_mentions.room_id)
  and exists(
   select 1 from public.rockey_calendar_day_comments c
   where c.id=rockey_calendar_day_comment_mentions.comment_id
     and c.room_id=rockey_calendar_day_comment_mentions.room_id
     and c.author_id=(select auth.uid())
  )
  and exists(
   select 1 from public.rockey_calendar_members m
   where m.room_id=rockey_calendar_day_comment_mentions.room_id
     and m.user_id=rockey_calendar_day_comment_mentions.mentioned_user_id
  )
 );

drop policy if exists rockey_calendar_day_reads_self_insert on public.rockey_calendar_day_comment_reads;
create policy rockey_calendar_day_reads_self_insert on public.rockey_calendar_day_comment_reads
 for insert to authenticated with check(
  rockey_calendar_day_comment_reads.reader_id=(select auth.uid())
  and public.rockey_calendar_is_member(rockey_calendar_day_comment_reads.room_id)
  and exists(
   select 1 from public.rockey_calendar_day_comments c
   where c.id=rockey_calendar_day_comment_reads.comment_id
     and c.room_id=rockey_calendar_day_comment_reads.room_id
     and c.author_id<>(select auth.uid())
  )
 );
