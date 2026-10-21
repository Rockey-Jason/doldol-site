-- Dori Central Bank: additive, non-destructive schema.
create table if not exists public.dori_central_bank_policy (
  id smallint primary key default 1 check (id = 1),
  base_rate_pct numeric(5,2) not null default 5.00 check (base_rate_pct >= 0 and base_rate_pct <= 20),
  inflation_target_pct numeric(5,2) not null default 2.00 check (inflation_target_pct >= 0 and inflation_target_pct <= 10),
  liquidity_stance text not null default 'neutral' check (liquidity_stance in ('easing','neutral','tightening')),
  public_note text not null default '돌이 경제권의 안정과 투명성을 최우선으로 합니다.' check (char_length(public_note) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.dori_central_bank_policy (id) values (1) on conflict (id) do nothing;

create table if not exists public.dori_central_bank_announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 4 and 140),
  content text not null check (char_length(content) between 10 and 8000),
  category text not null default 'notice' check (category in ('policy','economy','market','notice')),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists dori_central_bank_announcements_public_idx
  on public.dori_central_bank_announcements (published_at desc, id desc)
  where is_published = true;

create table if not exists public.dori_central_bank_policy_history (
  id bigint generated always as identity primary key,
  previous_values jsonb not null,
  new_values jsonb not null,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);
create index if not exists dori_central_bank_policy_history_created_idx
  on public.dori_central_bank_policy_history (created_at desc, id desc);

create table if not exists public.dori_central_bank_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists dori_central_bank_audit_created_idx
  on public.dori_central_bank_audit_logs (created_at desc, id desc);

alter table public.dori_central_bank_policy enable row level security;
alter table public.dori_central_bank_announcements enable row level security;
alter table public.dori_central_bank_policy_history enable row level security;
alter table public.dori_central_bank_audit_logs enable row level security;

drop policy if exists "central bank policy is public read only" on public.dori_central_bank_policy;
create policy "central bank policy is public read only"
  on public.dori_central_bank_policy for select to anon, authenticated using (true);
drop policy if exists "published central bank announcements are public" on public.dori_central_bank_announcements;
create policy "published central bank announcements are public"
  on public.dori_central_bank_announcements for select to anon, authenticated
  using (is_published = true or (select public.admin_is_authorized()));
drop policy if exists "central bank policy history is public read only" on public.dori_central_bank_policy_history;
create policy "central bank policy history is public read only"
  on public.dori_central_bank_policy_history for select to anon, authenticated using (true);
drop policy if exists "verified admins can read central bank audit logs" on public.dori_central_bank_audit_logs;
create policy "verified admins can read central bank audit logs"
  on public.dori_central_bank_audit_logs for select to authenticated
  using ((select public.admin_is_authorized()));

revoke all on table public.dori_central_bank_policy from anon, authenticated;
revoke all on table public.dori_central_bank_announcements from anon, authenticated;
revoke all on table public.dori_central_bank_policy_history from anon, authenticated;
revoke all on table public.dori_central_bank_audit_logs from anon, authenticated;
grant select on table public.dori_central_bank_policy to anon, authenticated;
grant select on table public.dori_central_bank_announcements to anon, authenticated;
grant select on table public.dori_central_bank_policy_history to anon, authenticated;
grant select on table public.dori_central_bank_audit_logs to authenticated;

create or replace function public.dori_central_bank_public_summary()
returns jsonb language sql stable security definer set search_path = ''
as $function$
  select jsonb_build_object(
    'registered_users', (select count(*) from public.users),
    'user_held_doldolcoin', (select coalesce(sum(coalesce(u.doldolcoin, 0)), 0)::numeric(30,0) from public.users u),
    'active_stocks', (select count(*) from public.dori_stocks s where s.is_active is true),
    'as_of', statement_timestamp()
  );
$function$;
revoke all on function public.dori_central_bank_public_summary() from public, anon, authenticated;
grant execute on function public.dori_central_bank_public_summary() to anon, authenticated;

create or replace function public.dori_central_bank_update_policy(
  p_base_rate_pct numeric, p_inflation_target_pct numeric, p_liquidity_stance text,
  p_public_note text, p_reason text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_before jsonb; v_after jsonb;
begin
  if not public.admin_is_authorized() then
    raise exception '검증된 관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  if p_base_rate_pct is null or p_base_rate_pct < 0 or p_base_rate_pct > 20 then
    raise exception '기준금리는 0~20 사이여야 합니다.' using errcode = '22023';
  end if;
  if p_inflation_target_pct is null or p_inflation_target_pct < 0 or p_inflation_target_pct > 10 then
    raise exception '물가 목표는 0~10 사이여야 합니다.' using errcode = '22023';
  end if;
  if p_liquidity_stance not in ('easing','neutral','tightening') then
    raise exception '유동성 기조 값이 올바르지 않습니다.' using errcode = '22023';
  end if;
  if p_public_note is null or char_length(p_public_note) > 1000 then
    raise exception '공개 설명은 1000자 이내로 입력해 주세요.' using errcode = '22023';
  end if;
  if p_reason is null or char_length(trim(p_reason)) < 3 or char_length(p_reason) > 500 then
    raise exception '정책 변경 사유를 3~500자로 입력해 주세요.' using errcode = '22023';
  end if;

  select jsonb_build_object('base_rate_pct',p.base_rate_pct,'inflation_target_pct',p.inflation_target_pct,
    'liquidity_stance',p.liquidity_stance,'public_note',p.public_note,'updated_at',p.updated_at)
    into v_before from public.dori_central_bank_policy p where p.id=1 for update;

  update public.dori_central_bank_policy p
  set base_rate_pct=p_base_rate_pct, inflation_target_pct=p_inflation_target_pct,
      liquidity_stance=p_liquidity_stance, public_note=trim(p_public_note),
      updated_at=clock_timestamp(), updated_by=auth.uid()
  where p.id=1
  returning jsonb_build_object('base_rate_pct',p.base_rate_pct,'inflation_target_pct',p.inflation_target_pct,
    'liquidity_stance',p.liquidity_stance,'public_note',p.public_note,'updated_at',p.updated_at)
  into v_after;

  insert into public.dori_central_bank_policy_history(previous_values,new_values,reason)
    values(coalesce(v_before,'{}'::jsonb),v_after,trim(p_reason));
  insert into public.dori_central_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
    values(auth.uid(),'policy_updated','central_bank_policy','1',
      jsonb_build_object('before',coalesce(v_before,'{}'::jsonb),'after',v_after,'reason',trim(p_reason)));
  return jsonb_build_object('ok',true,'policy',v_after);
end;
$function$;
revoke all on function public.dori_central_bank_update_policy(numeric,numeric,text,text,text) from public, anon, authenticated;
grant execute on function public.dori_central_bank_update_policy(numeric,numeric,text,text,text) to authenticated;

create or replace function public.dori_central_bank_save_announcement(
  p_id bigint,p_title text,p_content text,p_category text,p_is_published boolean
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_record public.dori_central_bank_announcements%rowtype; v_action text;
begin
  if not public.admin_is_authorized() then
    raise exception '검증된 관리자 권한이 필요합니다.' using errcode = '42501';
  end if;
  if p_title is null or char_length(trim(p_title)) < 4 or char_length(p_title) > 140 then
    raise exception '제목은 4~140자로 입력해 주세요.' using errcode = '22023';
  end if;
  if p_content is null or char_length(trim(p_content)) < 10 or char_length(p_content) > 8000 then
    raise exception '본문은 10~8000자로 입력해 주세요.' using errcode = '22023';
  end if;
  if p_category not in ('policy','economy','market','notice') then
    raise exception '공지 분류가 올바르지 않습니다.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.dori_central_bank_announcements(title,content,category,is_published,created_by,updated_by,published_at)
      values(trim(p_title),trim(p_content),p_category,coalesce(p_is_published,false),auth.uid(),auth.uid(),
      case when coalesce(p_is_published,false) then clock_timestamp() else null end)
      returning * into v_record;
    v_action:='announcement_created';
  else
    update public.dori_central_bank_announcements a
    set title=trim(p_title),content=trim(p_content),category=p_category,
      is_published=coalesce(p_is_published,false),updated_by=auth.uid(),updated_at=clock_timestamp(),
      published_at=case when coalesce(p_is_published,false) then coalesce(a.published_at,clock_timestamp()) else null end
    where a.id=p_id returning * into v_record;
    if not found then raise exception '해당 공지사항을 찾을 수 없습니다.' using errcode = 'P0002'; end if;
    v_action:='announcement_updated';
  end if;

  insert into public.dori_central_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
    values(auth.uid(),v_action,'announcement',v_record.id::text,
      jsonb_build_object('title',v_record.title,'category',v_record.category,'is_published',v_record.is_published));
  return jsonb_build_object('ok',true,'announcement',jsonb_build_object(
    'id',v_record.id,'title',v_record.title,'content',v_record.content,'category',v_record.category,
    'is_published',v_record.is_published,'created_at',v_record.created_at,'updated_at',v_record.updated_at,
    'published_at',v_record.published_at));
end;
$function$;
revoke all on function public.dori_central_bank_save_announcement(bigint,text,text,text,boolean) from public, anon, authenticated;
grant execute on function public.dori_central_bank_save_announcement(bigint,text,text,text,boolean) to authenticated;

comment on table public.dori_central_bank_policy is '공개 중앙은행 정책 기준. 현재 돌돌증권 가격이나 사용자 코인 잔액을 직접 변경하지 않는다.';
comment on table public.dori_central_bank_announcements is '돌이 중앙은행 공지와 정책 성명. 공개는 is_published=true 행만 허용한다.';
comment on table public.dori_central_bank_policy_history is '공개 가능한 중앙은행 정책 변경 이력. 변경 사유와 공개 정책 값만 저장한다.';
comment on table public.dori_central_bank_audit_logs is '검증된 관리자 작업의 내부 감사 로그. 일반 사용자에게 공개하지 않는다.';
