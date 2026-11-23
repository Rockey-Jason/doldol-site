-- ROCKEY Shared Calendar initial schema.
create table if not exists public.rockey_calendar_rooms (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 2 and 50),
 description text not null default '' check(char_length(description)<=300),
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.rockey_calendar_members (
 room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','member')),
 member_color text not null default '#76B7E8',
 joined_at timestamptz not null default now(),primary key(room_id,user_id)
);
create index if not exists rockey_calendar_members_user_idx on public.rockey_calendar_members(user_id,joined_at desc);
create table if not exists public.rockey_calendar_invites (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
 invited_by uuid not null references auth.users(id) on delete cascade,
 invitee_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),responded_at timestamptz,
 constraint rockey_calendar_invite_not_self check(invited_by<>invitee_id)
);
create unique index if not exists rockey_calendar_pending_invite_unique on public.rockey_calendar_invites(room_id,invitee_id) where status='pending';
create index if not exists rockey_calendar_invitee_pending_idx on public.rockey_calendar_invites(invitee_id,created_at desc) where status='pending';

create table if not exists public.rockey_calendar_events (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
 creator_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 120),
 notes text not null default '' check(char_length(notes)<=4000),
 starts_at timestamptz not null,ends_at timestamptz not null,
 all_day boolean not null default false,
 category text not null default 'general' check(category in ('general','meeting','study','game','event','deadline','birthday','memo')),
 recurrence_frequency text not null default 'none' check(recurrence_frequency in ('none','daily','weekly','monthly','yearly','interval_days')),
 recurrence_interval integer not null default 1 check(recurrence_interval between 1 and 365),
 recurrence_weekdays smallint[] not null default '{}',
 recurrence_month_day smallint,recurrence_month smallint,recurrence_until date,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint rockey_calendar_event_valid_range check(ends_at>starts_at),
 constraint rockey_calendar_event_weekdays check(recurrence_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
 constraint rockey_calendar_event_month_day check(recurrence_month_day is null or recurrence_month_day between 1 and 31),
 constraint rockey_calendar_event_month check(recurrence_month is null or recurrence_month between 1 and 12)
);
create index if not exists rockey_calendar_events_room_start_idx on public.rockey_calendar_events(room_id,starts_at,ends_at);
create index if not exists rockey_calendar_events_creator_idx on public.rockey_calendar_events(creator_id,created_at desc);
create table if not exists public.rockey_calendar_event_comments (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.rockey_calendar_events(id) on delete cascade,
 occurrence_date date not null,user_id uuid not null references auth.users(id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists rockey_calendar_comments_event_date_idx on public.rockey_calendar_event_comments(event_id,occurrence_date,created_at);

create or replace function public.rockey_calendar_is_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $f$ select exists(select 1 from public.rockey_calendar_members m where m.room_id=p_room_id and m.user_id=auth.uid()); $f$;
create or replace function public.rockey_calendar_is_owner(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $f$ select exists(select 1 from public.rockey_calendar_members m where m.room_id=p_room_id and m.user_id=auth.uid() and m.role='owner'); $f$;
revoke all on function public.rockey_calendar_is_member(uuid) from public,anon;
revoke all on function public.rockey_calendar_is_owner(uuid) from public,anon;
grant execute on function public.rockey_calendar_is_member(uuid) to authenticated;
grant execute on function public.rockey_calendar_is_owner(uuid) to authenticated;

alter table public.rockey_calendar_rooms enable row level security;
alter table public.rockey_calendar_members enable row level security;
alter table public.rockey_calendar_invites enable row level security;
alter table public.rockey_calendar_events enable row level security;
alter table public.rockey_calendar_event_comments enable row level security;
revoke all on public.rockey_calendar_rooms from public,anon,authenticated;
revoke all on public.rockey_calendar_members from public,anon,authenticated;
revoke all on public.rockey_calendar_invites from public,anon,authenticated;
revoke all on public.rockey_calendar_events from public,anon,authenticated;
revoke all on public.rockey_calendar_event_comments from public,anon,authenticated;
grant select,update,delete on public.rockey_calendar_rooms to authenticated;
grant select on public.rockey_calendar_members to authenticated;
grant select on public.rockey_calendar_invites to authenticated;
grant select,insert,update,delete on public.rockey_calendar_events to authenticated;
grant select,insert,delete on public.rockey_calendar_event_comments to authenticated;

drop policy if exists rockey_calendar_rooms_member_read on public.rockey_calendar_rooms;
create policy rockey_calendar_rooms_member_read on public.rockey_calendar_rooms for select to authenticated using(public.rockey_calendar_is_member(id));
drop policy if exists rockey_calendar_rooms_owner_update on public.rockey_calendar_rooms;
create policy rockey_calendar_rooms_owner_update on public.rockey_calendar_rooms for update to authenticated using(public.rockey_calendar_is_owner(id)) with check(public.rockey_calendar_is_owner(id));
drop policy if exists rockey_calendar_rooms_owner_delete on public.rockey_calendar_rooms;
create policy rockey_calendar_rooms_owner_delete on public.rockey_calendar_rooms for delete to authenticated using(public.rockey_calendar_is_owner(id));
drop policy if exists rockey_calendar_members_member_read on public.rockey_calendar_members;
create policy rockey_calendar_members_member_read on public.rockey_calendar_members for select to authenticated using(public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_invites_involved_read on public.rockey_calendar_invites;
create policy rockey_calendar_invites_involved_read on public.rockey_calendar_invites for select to authenticated using(invitee_id=auth.uid() or invited_by=auth.uid());
drop policy if exists rockey_calendar_events_member_read on public.rockey_calendar_events;
create policy rockey_calendar_events_member_read on public.rockey_calendar_events for select to authenticated using(public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_events_member_insert on public.rockey_calendar_events;
create policy rockey_calendar_events_member_insert on public.rockey_calendar_events for insert to authenticated with check(creator_id=auth.uid() and public.rockey_calendar_is_member(room_id));
drop policy if exists rockey_calendar_events_author_or_owner_update on public.rockey_calendar_events;
create policy rockey_calendar_events_author_or_owner_update on public.rockey_calendar_events for update to authenticated using(creator_id=auth.uid() or public.rockey_calendar_is_owner(room_id)) with check(public.rockey_calendar_is_member(room_id) and (creator_id=auth.uid() or public.rockey_calendar_is_owner(room_id)));
drop policy if exists rockey_calendar_events_author_or_owner_delete on public.rockey_calendar_events;
create policy rockey_calendar_events_author_or_owner_delete on public.rockey_calendar_events for delete to authenticated using(creator_id=auth.uid() or public.rockey_calendar_is_owner(room_id));
drop policy if exists rockey_calendar_comments_member_read on public.rockey_calendar_event_comments;
create policy rockey_calendar_comments_member_read on public.rockey_calendar_event_comments for select to authenticated using(exists(select 1 from public.rockey_calendar_events e where e.id=event_id and public.rockey_calendar_is_member(e.room_id)));
drop policy if exists rockey_calendar_comments_member_insert on public.rockey_calendar_event_comments;
create policy rockey_calendar_comments_member_insert on public.rockey_calendar_event_comments for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.rockey_calendar_events e where e.id=event_id and public.rockey_calendar_is_member(e.room_id)));
drop policy if exists rockey_calendar_comments_author_delete on public.rockey_calendar_event_comments;
create policy rockey_calendar_comments_author_delete on public.rockey_calendar_event_comments for delete to authenticated using(user_id=auth.uid());

create or replace function public.rockey_calendar_create_room(p_name text,p_description text default '')
returns uuid language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid:=auth.uid();v_room uuid;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
 if char_length(btrim(coalesce(p_name,'')))<2 or char_length(btrim(p_name))>50 then raise exception '방 이름은 2~50자로 입력해 주세요.' using errcode='22023'; end if;
 if char_length(coalesce(p_description,''))>300 then raise exception '방 설명은 300자 이내로 입력해 주세요.' using errcode='22023'; end if;
 insert into public.rockey_calendar_rooms(name,description,owner_id) values(btrim(p_name),coalesce(p_description,''),v_uid) returning id into v_room;
 insert into public.rockey_calendar_members(room_id,user_id,role,member_color) values(v_room,v_uid,'owner','#E5C879');
 return v_room;
end; $f$;
create or replace function public.rockey_calendar_search_users(p_query text)
returns table(found_user_id uuid,display_name text,profile_image text)
language plpgsql stable security definer set search_path=''
as $f$
declare v_query text:=btrim(coalesce(p_query,''));
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
 if char_length(v_query)<2 then return; end if;
 return query select u.user_id::uuid,coalesce(nullif(btrim(u.name),''),'사용자'),u.profile_image
 from public.users u where u.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and u.user_id::uuid<>auth.uid() and coalesce(u.name,'') ilike '%'||left(v_query,40)||'%'
 order by case when u.name ilike v_query then 0 else 1 end,u.name limit 12;
end; $f$;
create or replace function public.rockey_calendar_invite_user(p_room_id uuid,p_target_user_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid:=auth.uid();v_invite uuid;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
 if not public.rockey_calendar_is_owner(p_room_id) then raise exception '방 소유자만 새 참여자를 초대할 수 있습니다.' using errcode='42501'; end if;
 if p_target_user_id=v_uid then raise exception '자기 자신은 초대할 수 없습니다.' using errcode='22023'; end if;
 if not exists(select 1 from public.users u where u.user_id=p_target_user_id::text) then raise exception '돌이사이트 사용자를 찾을 수 없습니다.' using errcode='P0002'; end if;
 if exists(select 1 from public.rockey_calendar_members m where m.room_id=p_room_id and m.user_id=p_target_user_id) then raise exception '이미 이 캘린더의 참여자입니다.' using errcode='23505'; end if;
 select i.id into v_invite from public.rockey_calendar_invites i where i.room_id=p_room_id and i.invitee_id=p_target_user_id and i.status='pending' order by i.created_at desc limit 1;
 if v_invite is not null then return v_invite; end if;
 insert into public.rockey_calendar_invites(room_id,invited_by,invitee_id) values(p_room_id,v_uid,p_target_user_id) returning id into v_invite;
 return v_invite;
end; $f$;
create or replace function public.rockey_calendar_pending_invites()
returns table(invite_id uuid,room_id uuid,room_name text,inviter_id uuid,inviter_name text,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $f$
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
 return query select i.id,i.room_id,r.name,i.invited_by,coalesce(nullif(u.name,''),'돌이사이트 사용자'),i.created_at
 from public.rockey_calendar_invites i join public.rockey_calendar_rooms r on r.id=i.room_id
 left join public.users u on u.user_id=i.invited_by::text
 where i.invitee_id=auth.uid() and i.status='pending' order by i.created_at desc;
end; $f$;
create or replace function public.rockey_calendar_respond_invite(p_invite_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid:=auth.uid();v_room uuid;v_count integer;v_palette text[]:=array['#76B7E8','#B69AF2','#70C99A','#E994AD','#68CBD0','#E9A36F','#91A9C9','#D1A7A1','#A4C77A'];
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000'; end if;
 select i.room_id into v_room from public.rockey_calendar_invites i where i.id=p_invite_id and i.invitee_id=v_uid and i.status='pending' for update;
 if v_room is null then raise exception '유효한 대기 중 초대를 찾을 수 없습니다.' using errcode='P0002'; end if;
 if coalesce(p_accept,false) then
  select count(*) into v_count from public.rockey_calendar_members m where m.room_id=v_room;
  insert into public.rockey_calendar_members(room_id,user_id,role,member_color) values(v_room,v_uid,'member',v_palette[(v_count%array_length(v_palette,1))+1]) on conflict(room_id,user_id) do nothing;
  update public.rockey_calendar_invites set status='accepted',responded_at=now() where id=p_invite_id;return true;
 else update public.rockey_calendar_invites set status='declined',responded_at=now() where id=p_invite_id;return false;end if;
end; $f$;
create or replace function public.rockey_calendar_touch_updated_at()
returns trigger language plpgsql set search_path=''
as $f$ begin new.updated_at=now();return new;end; $f$;
drop trigger if exists rockey_calendar_rooms_touch_updated_at on public.rockey_calendar_rooms;
create trigger rockey_calendar_rooms_touch_updated_at before update on public.rockey_calendar_rooms for each row execute function public.rockey_calendar_touch_updated_at();
drop trigger if exists rockey_calendar_events_touch_updated_at on public.rockey_calendar_events;
create trigger rockey_calendar_events_touch_updated_at before update on public.rockey_calendar_events for each row execute function public.rockey_calendar_touch_updated_at();
create or replace function public.rockey_calendar_notify_invitation()
returns trigger language plpgsql security definer set search_path=''
as $f$
declare v_room_name text;v_inviter_name text;
begin
 select r.name into v_room_name from public.rockey_calendar_rooms r where r.id=new.room_id;
 select coalesce(nullif(u.name,''),'돌이사이트 사용자') into v_inviter_name from public.users u where u.user_id=new.invited_by::text limit 1;
 insert into public.dori_notifications(user_id,category,title,body,target_url,metadata,dedupe_key)
 values(new.invitee_id,'system','로키 공유 캘린더 초대',coalesce(v_inviter_name,'돌이사이트 사용자')||'님이 "'||coalesce(v_room_name,'공유 캘린더')||'" 방에 초대했어요.',
 './rockey-calendar.html?invite='||new.id::text,jsonb_build_object('kind','calendar_invite','invite_id',new.id,'room_id',new.room_id,'room_name',v_room_name),'calendar-invite:'||new.id::text)
 on conflict(user_id,dedupe_key) do nothing;return new;
end; $f$;
drop trigger if exists rockey_calendar_invitation_notification on public.rockey_calendar_invites;
create trigger rockey_calendar_invitation_notification after insert on public.rockey_calendar_invites for each row execute function public.rockey_calendar_notify_invitation();
revoke all on function public.rockey_calendar_create_room(text,text) from public,anon;
revoke all on function public.rockey_calendar_search_users(text) from public,anon;
revoke all on function public.rockey_calendar_invite_user(uuid,uuid) from public,anon;
revoke all on function public.rockey_calendar_pending_invites() from public,anon;
revoke all on function public.rockey_calendar_respond_invite(uuid,boolean) from public,anon;
revoke all on function public.rockey_calendar_notify_invitation() from public,anon,authenticated;
grant execute on function public.rockey_calendar_create_room(text,text) to authenticated;
grant execute on function public.rockey_calendar_search_users(text) to authenticated;
grant execute on function public.rockey_calendar_invite_user(uuid,uuid) to authenticated;
grant execute on function public.rockey_calendar_pending_invites() to authenticated;
grant execute on function public.rockey_calendar_respond_invite(uuid,boolean) to authenticated;
do $pub$
declare v_table text;
begin
 foreach v_table in array array['rockey_calendar_rooms','rockey_calendar_members','rockey_calendar_invites','rockey_calendar_events','rockey_calendar_event_comments'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
   execute format('alter publication supabase_realtime add table public.%I',v_table);
  end if;
 end loop;
end; $pub$;
revoke all on public.rockey_shared_calendar_events from public,anon,authenticated;
