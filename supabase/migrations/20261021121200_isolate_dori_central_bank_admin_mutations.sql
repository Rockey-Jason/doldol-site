-- Isolate administrator-only mutation implementation in a schema not exposed by the Data API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.dori_central_bank_update_policy(
  p_base_rate_pct numeric,p_inflation_target_pct numeric,p_liquidity_stance text,p_public_note text,p_reason text
) returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_before jsonb; v_after jsonb;
begin
  if not public.admin_is_authorized() then raise exception '검증된 관리자 권한이 필요합니다.' using errcode = '42501'; end if;
  if p_base_rate_pct is null or p_base_rate_pct < 0 or p_base_rate_pct > 20 then raise exception '기준금리는 0~20 사이여야 합니다.' using errcode = '22023'; end if;
  if p_inflation_target_pct is null or p_inflation_target_pct < 0 or p_inflation_target_pct > 10 then raise exception '물가 목표는 0~10 사이여야 합니다.' using errcode = '22023'; end if;
  if p_liquidity_stance not in ('easing','neutral','tightening') then raise exception '유동성 기조 값이 올바르지 않습니다.' using errcode = '22023'; end if;
  if p_public_note is null or char_length(p_public_note) > 1000 then raise exception '공개 설명은 1000자 이내로 입력해 주세요.' using errcode = '22023'; end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 or char_length(p_reason) > 500 then raise exception '정책 변경 사유를 3~500자로 입력해 주세요.' using errcode = '22023'; end if;

  select jsonb_build_object('base_rate_pct',p.base_rate_pct,'inflation_target_pct',p.inflation_target_pct,
    'liquidity_stance',p.liquidity_stance,'public_note',p.public_note,'updated_at',p.updated_at)
    into v_before from public.dori_central_bank_policy p where p.id=1 for update;
  update public.dori_central_bank_policy p set base_rate_pct=p_base_rate_pct,inflation_target_pct=p_inflation_target_pct,
    liquidity_stance=p_liquidity_stance,public_note=trim(p_public_note),updated_at=clock_timestamp(),updated_by=auth.uid()
    where p.id=1
    returning jsonb_build_object('base_rate_pct',p.base_rate_pct,'inflation_target_pct',p.inflation_target_pct,
      'liquidity_stance',p.liquidity_stance,'public_note',p.public_note,'updated_at',p.updated_at) into v_after;
  insert into public.dori_central_bank_policy_history(previous_values,new_values,reason)
    values(coalesce(v_before,'{}'::jsonb),v_after,trim(p_reason));
  insert into public.dori_central_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
    values(auth.uid(),'policy_updated','central_bank_policy','1',
      jsonb_build_object('before',coalesce(v_before,'{}'::jsonb),'after',v_after,'reason',trim(p_reason)));
  return jsonb_build_object('ok',true,'policy',v_after);
end;
$function$;
revoke all on function private.dori_central_bank_update_policy(numeric,numeric,text,text,text) from public, anon, authenticated;
grant execute on function private.dori_central_bank_update_policy(numeric,numeric,text,text,text) to authenticated;

create or replace function private.dori_central_bank_save_announcement(
  p_id bigint,p_title text,p_content text,p_category text,p_is_published boolean
) returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_record public.dori_central_bank_announcements%rowtype; v_action text;
begin
  if not public.admin_is_authorized() then raise exception '검증된 관리자 권한이 필요합니다.' using errcode = '42501'; end if;
  if p_title is null or char_length(trim(p_title)) < 4 or char_length(p_title) > 140 then raise exception '제목은 4~140자로 입력해 주세요.' using errcode = '22023'; end if;
  if p_content is null or char_length(trim(p_content)) < 10 or char_length(p_content) > 8000 then raise exception '본문은 10~8000자로 입력해 주세요.' using errcode = '22023'; end if;
  if p_category not in ('policy','economy','market','notice') then raise exception '공지 분류가 올바르지 않습니다.' using errcode = '22023'; end if;

  if p_id is null then
    insert into public.dori_central_bank_announcements(title,content,category,is_published,created_by,updated_by,published_at)
      values(trim(p_title),trim(p_content),p_category,coalesce(p_is_published,false),auth.uid(),auth.uid(),
        case when coalesce(p_is_published,false) then clock_timestamp() else null end)
      returning * into v_record;
    v_action:='announcement_created';
  else
    update public.dori_central_bank_announcements a set title=trim(p_title),content=trim(p_content),category=p_category,
      is_published=coalesce(p_is_published,false),updated_by=auth.uid(),updated_at=clock_timestamp(),
      published_at=case when coalesce(p_is_published,false) then coalesce(a.published_at,clock_timestamp()) else null end
      where a.id=p_id returning * into v_record;
    if not found then raise exception '해당 공지사항을 찾을 수 없습니다.' using errcode = 'P0002'; end if;
    v_action:='announcement_updated';
  end if;
  insert into public.dori_central_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
    values(auth.uid(),v_action,'announcement',v_record.id::text,
      jsonb_build_object('title',v_record.title,'category',v_record.category,'is_published',v_record.is_published));
  return jsonb_build_object('ok',true,'announcement',jsonb_build_object('id',v_record.id,'title',v_record.title,
    'content',v_record.content,'category',v_record.category,'is_published',v_record.is_published,
    'created_at',v_record.created_at,'updated_at',v_record.updated_at,'published_at',v_record.published_at));
end;
$function$;
revoke all on function private.dori_central_bank_save_announcement(bigint,text,text,text,boolean) from public, anon, authenticated;
grant execute on function private.dori_central_bank_save_announcement(bigint,text,text,text,boolean) to authenticated;

create or replace function public.dori_central_bank_update_policy(
  p_base_rate_pct numeric,p_inflation_target_pct numeric,p_liquidity_stance text,p_public_note text,p_reason text
) returns jsonb language sql security invoker set search_path = ''
as $function$ select private.dori_central_bank_update_policy($1,$2,$3,$4,$5); $function$;
revoke all on function public.dori_central_bank_update_policy(numeric,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.dori_central_bank_update_policy(numeric,numeric,text,text,text) to authenticated;

create or replace function public.dori_central_bank_save_announcement(
  p_id bigint,p_title text,p_content text,p_category text,p_is_published boolean
) returns jsonb language sql security invoker set search_path = ''
as $function$ select private.dori_central_bank_save_announcement($1,$2,$3,$4,$5); $function$;
revoke all on function public.dori_central_bank_save_announcement(bigint,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.dori_central_bank_save_announcement(bigint,text,text,text,boolean) to authenticated;
