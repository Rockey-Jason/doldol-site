-- ROCKEY Shared Calendar privacy, member identity colors, and member profile listing.
alter table public.rockey_calendar_members drop constraint if exists rockey_calendar_members_member_color_check;
alter table public.rockey_calendar_members add constraint rockey_calendar_members_member_color_check check(member_color ~ '^#[0-9A-Fa-f]{6}$');
create unique index if not exists rockey_calendar_room_member_color_unique on public.rockey_calendar_members(room_id,member_color);

drop function if exists public.rockey_calendar_search_users(text);
create function public.rockey_calendar_search_users(p_query text)
returns table(found_user_id uuid,display_name text,profile_image text)
language plpgsql stable security definer set search_path=''
as $f$
declare v_query text:=btrim(coalesce(p_query,''));
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 if char_length(v_query)<2 then return;end if;
 return query select u.user_id::uuid,coalesce(nullif(btrim(u.name),''),'사용자'),u.profile_image
 from public.users u where u.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and u.user_id::uuid<>auth.uid() and coalesce(u.name,'') ilike '%'||left(v_query,40)||'%'
 order by case when u.name ilike v_query then 0 else 1 end,u.name limit 12;
end;$f$;
revoke all on function public.rockey_calendar_search_users(text) from public,anon;
grant execute on function public.rockey_calendar_search_users(text) to authenticated;

create or replace function public.rockey_calendar_room_members(p_room_id uuid)
returns table(member_user_id uuid,display_name text,member_color text,role text,profile_image text)
language plpgsql stable security definer set search_path=''
as $f$
begin
 if auth.uid() is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 if not public.rockey_calendar_is_member(p_room_id) then raise exception '이 캘린더의 참여자가 아닙니다.' using errcode='42501';end if;
 return query select m.user_id,coalesce(nullif(btrim(u.name),''),'돌이사이트 사용자'),m.member_color,m.role,u.profile_image
 from public.rockey_calendar_members m left join public.users u on u.user_id=m.user_id::text
 where m.room_id=p_room_id order by case when m.role='owner' then 0 else 1 end,m.joined_at;
end;$f$;
revoke all on function public.rockey_calendar_room_members(uuid) from public,anon;
grant execute on function public.rockey_calendar_room_members(uuid) to authenticated;

create or replace function public.rockey_calendar_respond_invite(p_invite_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $f$
declare
 v_uid uuid:=auth.uid();v_room uuid;v_count integer;
 v_palette text[]:=array['#76B7E8','#B69AF2','#70C99A','#E994AD','#68CBD0','#E9A36F','#91A9C9','#D1A7A1','#A4C77A','#D2A0E0','#8CC6A5','#E3B45B','#7FAED6','#C48FA7','#A8C1E8','#B4D18C','#D69B72','#8AC8C0','#C4A3E8','#A5B4FC','#F0A8A8','#A3D6B3','#F1C27B','#9CC3E6','#CDB4DB','#B7D3A8','#F4B183','#89C2D9','#D5A6BD'];
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 select i.room_id into v_room from public.rockey_calendar_invites i where i.id=p_invite_id and i.invitee_id=v_uid and i.status='pending' for update;
 if v_room is null then raise exception '유효한 대기 중 초대를 찾을 수 없습니다.' using errcode='P0002';end if;
 if coalesce(p_accept,false) then
  perform 1 from public.rockey_calendar_rooms r where r.id=v_room for update;
  select count(*) into v_count from public.rockey_calendar_members m where m.room_id=v_room;
  insert into public.rockey_calendar_members(room_id,user_id,role,member_color)
  values(v_room,v_uid,'member',v_palette[(v_count%array_length(v_palette,1))+1])
  on conflict(room_id,user_id) do nothing;
  update public.rockey_calendar_invites set status='accepted',responded_at=now() where id=p_invite_id;return true;
 else update public.rockey_calendar_invites set status='declined',responded_at=now() where id=p_invite_id;return false;end if;
end;$f$;
revoke all on function public.rockey_calendar_respond_invite(uuid,boolean) from public,anon;
grant execute on function public.rockey_calendar_respond_invite(uuid,boolean) to authenticated;
