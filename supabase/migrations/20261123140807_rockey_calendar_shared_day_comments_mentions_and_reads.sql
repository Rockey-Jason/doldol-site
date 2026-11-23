-- One shared comment thread per calendar room and calendar date, with @mentions and read receipts.
create table if not exists public.rockey_calendar_day_comments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
  comment_date date not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists rockey_calendar_day_comments_room_date_idx on public.rockey_calendar_day_comments(room_id,comment_date,created_at);

create table if not exists public.rockey_calendar_day_comment_mentions (
  comment_id uuid not null references public.rockey_calendar_day_comments(id) on delete cascade,
  room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(comment_id,mentioned_user_id)
);
create index if not exists rockey_calendar_day_comment_mentions_user_idx on public.rockey_calendar_day_comment_mentions(mentioned_user_id,created_at desc);

create table if not exists public.rockey_calendar_day_comment_reads (
  comment_id uuid not null references public.rockey_calendar_day_comments(id) on delete cascade,
  room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
  reader_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(comment_id,reader_id)
);
create index if not exists rockey_calendar_day_comment_reads_room_idx on public.rockey_calendar_day_comment_reads(room_id,comment_id,read_at);

alter table public.rockey_calendar_day_comments enable row level security;
alter table public.rockey_calendar_day_comment_mentions enable row level security;
alter table public.rockey_calendar_day_comment_reads enable row level security;
revoke all on public.rockey_calendar_day_comments from public,anon,authenticated;
revoke all on public.rockey_calendar_day_comment_mentions from public,anon,authenticated;
revoke all on public.rockey_calendar_day_comment_reads from public,anon,authenticated;
grant select,insert,delete on public.rockey_calendar_day_comments to authenticated;
grant select,insert on public.rockey_calendar_day_comment_mentions to authenticated;
grant select,insert on public.rockey_calendar_day_comment_reads to authenticated;

drop policy if exists rockey_calendar_day_comments_member_read on public.rockey_calendar_day_comments;
create policy rockey_calendar_day_comments_member_read on public.rockey_calendar_day_comments for select to authenticated using(public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_day_comments_member_insert on public.rockey_calendar_day_comments;
create policy rockey_calendar_day_comments_member_insert on public.rockey_calendar_day_comments for insert to authenticated with check(author_id=(select auth.uid()) and public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_day_comments_author_or_owner_delete on public.rockey_calendar_day_comments;
create policy rockey_calendar_day_comments_author_or_owner_delete on public.rockey_calendar_day_comments for delete to authenticated using(author_id=(select auth.uid()) or public.rockey_calendar_is_owner(room_id));

drop policy if exists rockey_calendar_day_mentions_member_read on public.rockey_calendar_day_comment_mentions;
create policy rockey_calendar_day_mentions_member_read on public.rockey_calendar_day_comment_mentions for select to authenticated using(public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_day_mentions_author_insert on public.rockey_calendar_day_comment_mentions;
create policy rockey_calendar_day_mentions_author_insert on public.rockey_calendar_day_comment_mentions for insert to authenticated with check(
 public.rockey_calendar_is_member(room_id)
 and exists(select 1 from public.rockey_calendar_day_comments c where c.id=comment_id and c.room_id=room_id and c.author_id=(select auth.uid()))
 and exists(select 1 from public.rockey_calendar_members m where m.room_id=rockey_calendar_day_comment_mentions.room_id and m.user_id=rockey_calendar_day_comment_mentions.mentioned_user_id)
);

drop policy if exists rockey_calendar_day_reads_member_read on public.rockey_calendar_day_comment_reads;
create policy rockey_calendar_day_reads_member_read on public.rockey_calendar_day_comment_reads for select to authenticated using(public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_day_reads_self_insert on public.rockey_calendar_day_comment_reads;
create policy rockey_calendar_day_reads_self_insert on public.rockey_calendar_day_comment_reads for insert to authenticated with check(
 reader_id=(select auth.uid())
 and public.rockey_calendar_is_member(room_id)
 and exists(select 1 from public.rockey_calendar_day_comments c where c.id=comment_id and c.room_id=room_id and c.author_id<>(select auth.uid()))
);

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
 values(p_room_id,p_comment_date,btrim(p_body),v_uid) returning id into v_comment_id;
 for v_target in select distinct unnest(coalesce(p_mentioned_user_ids,'{}'::uuid[])) loop
  if v_target=v_uid or v_target=any(v_seen) then continue;end if;
  v_seen:=array_append(v_seen,v_target);
  if not exists(select 1 from public.rockey_calendar_members m where m.room_id=p_room_id and m.user_id=v_target) then
   raise exception '태그한 사용자가 이 캘린더 참여자가 아닙니다.' using errcode='42501';
  end if;
  insert into public.rockey_calendar_day_comment_mentions(comment_id,room_id,mentioned_user_id) values(v_comment_id,p_room_id,v_target);
 end loop;
 return v_comment_id;
end;
$function$;
revoke all on function public.rockey_calendar_post_day_comment(uuid,date,text,uuid[]) from public,anon;
grant execute on function public.rockey_calendar_post_day_comment(uuid,date,text,uuid[]) to authenticated;

create or replace function public.rockey_calendar_notify_day_comment_mention()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_room_name text;v_date date;v_author uuid;v_body text;
begin
 select c.comment_date,c.author_id,left(c.body,170),r.name
 into v_date,v_author,v_body,v_room_name
 from public.rockey_calendar_day_comments c join public.rockey_calendar_rooms r on r.id=c.room_id
 where c.id=new.comment_id;
 insert into public.dori_notifications(user_id,category,title,body,target_url,metadata,dedupe_key)
 values(new.mentioned_user_id,'system','공유 캘린더 댓글에서 태그됐어요',
  '캘린더 참여자가 '||to_char(v_date,'YYYY.MM.DD')||' 댓글에서 회원님을 태그했어요: '||coalesce(v_body,''),
  './rockey-calendar.html?room='||new.room_id::text||'&date='||v_date::text,
  jsonb_build_object('kind','calendar_day_comment_mention','comment_id',new.comment_id,'room_id',new.room_id,'comment_date',v_date,'mentioned_by',v_author),
  'calendar-day-mention:'||new.comment_id::text||':'||new.mentioned_user_id::text)
 on conflict(user_id,dedupe_key) do nothing;
 return new;
end;
$function$;
revoke all on function public.rockey_calendar_notify_day_comment_mention() from public,anon,authenticated;
drop trigger if exists rockey_calendar_day_comment_mention_notification on public.rockey_calendar_day_comment_mentions;
create trigger rockey_calendar_day_comment_mention_notification after insert on public.rockey_calendar_day_comment_mentions for each row execute function public.rockey_calendar_notify_day_comment_mention();

insert into public.rockey_calendar_day_comments(id,room_id,comment_date,author_id,body,created_at)
select c.id,e.room_id,c.occurrence_date,c.user_id,c.body,c.created_at
from public.rockey_calendar_event_comments c join public.rockey_calendar_events e on e.id=c.event_id
on conflict(id) do nothing;

do $publication$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rockey_calendar_day_comments') then alter publication supabase_realtime add table public.rockey_calendar_day_comments;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rockey_calendar_day_comment_mentions') then alter publication supabase_realtime add table public.rockey_calendar_day_comment_mentions;end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rockey_calendar_day_comment_reads') then alter publication supabase_realtime add table public.rockey_calendar_day_comment_reads;end if;
end;
$publication$;
