-- Generate distinct pastel member colors by hue; invite acceptance serializes on the room row.
create or replace function public.rockey_calendar_color_for_index(p_index integer)
returns text language plpgsql immutable set search_path=''
as $f$
declare v_h numeric;v_c numeric;v_x numeric;v_m numeric;v_r numeric;v_g numeric;v_b numeric;
begin
 v_h:=mod(greatest(p_index,0)*137,360)::numeric;
 v_c:=(1-abs(2*0.70-1))*0.58;
 v_x:=v_c*(1-abs(mod(v_h/60,2)-1));
 v_m:=0.70-v_c/2;
 if v_h<60 then v_r:=v_c;v_g:=v_x;v_b:=0;
 elsif v_h<120 then v_r:=v_x;v_g:=v_c;v_b:=0;
 elsif v_h<180 then v_r:=0;v_g:=v_c;v_b:=v_x;
 elsif v_h<240 then v_r:=0;v_g:=v_x;v_b:=v_c;
 elsif v_h<300 then v_r:=v_x;v_g:=0;v_b:=v_c;
 else v_r:=v_c;v_g:=0;v_b:=v_x;end if;
 return '#'||lpad(to_hex(round((v_r+v_m)*255)::integer),2,'0')||lpad(to_hex(round((v_g+v_m)*255)::integer),2,'0')||lpad(to_hex(round((v_b+v_m)*255)::integer),2,'0');
end;$f$;
revoke all on function public.rockey_calendar_color_for_index(integer) from public,anon;
grant execute on function public.rockey_calendar_color_for_index(integer) to authenticated;

create or replace function public.rockey_calendar_respond_invite(p_invite_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=''
as $f$
declare v_uid uuid:=auth.uid();v_room uuid;v_count integer;v_index integer;v_color text;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.' using errcode='28000';end if;
 select i.room_id into v_room from public.rockey_calendar_invites i
 where i.id=p_invite_id and i.invitee_id=v_uid and i.status='pending' for update;
 if v_room is null then raise exception '유효한 대기 중 초대를 찾을 수 없습니다.' using errcode='P0002';end if;
 if coalesce(p_accept,false) then
  perform 1 from public.rockey_calendar_rooms r where r.id=v_room for update;
  select count(*) into v_count from public.rockey_calendar_members m where m.room_id=v_room;
  v_index:=greatest(v_count-1,0);
  loop
   v_color:=public.rockey_calendar_color_for_index(v_index);
   exit when v_color<>'#E5C879' and not exists(select 1 from public.rockey_calendar_members m where m.room_id=v_room and m.member_color=v_color);
   v_index:=v_index+1;
   if v_index>v_count+361 then raise exception '새로운 참여자 색상을 배정하지 못했습니다.' using errcode='23505';end if;
  end loop;
  insert into public.rockey_calendar_members(room_id,user_id,role,member_color) values(v_room,v_uid,'member',v_color) on conflict(room_id,user_id) do nothing;
  update public.rockey_calendar_invites set status='accepted',responded_at=now() where id=p_invite_id;return true;
 else update public.rockey_calendar_invites set status='declined',responded_at=now() where id=p_invite_id;return false;end if;
end;$f$;
revoke all on function public.rockey_calendar_respond_invite(uuid,boolean) from public,anon;
grant execute on function public.rockey_calendar_respond_invite(uuid,boolean) to authenticated;
