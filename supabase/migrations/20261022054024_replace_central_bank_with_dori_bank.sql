-- Replace Dori Central Bank with Dori Bank personal banking.
-- This is additive to the existing site wallet system: public.users.doldolcoin remains
-- the sole spendable balance. Every transfer/deposit changes that balance inside one DB transaction.
create schema if not exists private;

drop trigger if exists dori_cb_users_insert_stats on public.users;
drop trigger if exists dori_cb_users_coin_update_stats on public.users;
drop trigger if exists dori_cb_users_delete_stats on public.users;
drop trigger if exists dori_cb_stocks_insert_stats on public.dori_stocks;
drop trigger if exists dori_cb_stocks_active_update_stats on public.dori_stocks;
drop trigger if exists dori_cb_stocks_delete_stats on public.dori_stocks;
drop function if exists public.dori_central_bank_public_summary();
drop function if exists public.dori_central_bank_track_user_statistics();
drop function if exists public.dori_central_bank_track_stock_statistics();
drop function if exists public.dori_central_bank_update_policy(numeric,numeric,text,text,text);
drop function if exists public.dori_central_bank_save_announcement(bigint,text,text,text,boolean);
drop function if exists private.dori_central_bank_update_policy(numeric,numeric,text,text,text);
drop function if exists private.dori_central_bank_save_announcement(bigint,text,text,text,boolean);
drop table if exists public.dori_central_bank_audit_logs;
drop table if exists public.dori_central_bank_policy_history;
drop table if exists public.dori_central_bank_announcements;
drop table if exists public.dori_central_bank_public_statistics;
drop table if exists public.dori_central_bank_policy;

create table if not exists public.dori_bank_identity_map (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  site_user_id text not null unique,
  linked_at timestamptz not null default clock_timestamp()
);
create table if not exists public.dori_bank_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  site_user_id text not null unique,
  account_number text not null unique,
  account_name text not null default '돌이 생활 입출금 계좌',
  status text not null default 'active' check (status in ('active','frozen')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  last_activity_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_bank_accounts_site_user_idx on public.dori_bank_accounts(site_user_id);

create table if not exists public.dori_bank_deposit_products (
  id text primary key,
  name text not null check (char_length(name) between 2 and 80),
  term_days integer not null check (term_days between 1 and 365),
  annual_rate_pct numeric(5,2) not null check (annual_rate_pct between 0 and 20),
  min_amount bigint not null default 10000 check (min_amount > 0),
  max_amount bigint not null default 9223372036854775807 check (max_amount >= min_amount),
  description text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default clock_timestamp()
);
insert into public.dori_bank_deposit_products(id,name,term_days,annual_rate_pct,min_amount,max_amount,description,is_active)
values
 ('dori_saver_7','도토리 스마트 저축',7,2.00,10000,9223372036854775807,'짧은 기간 동안 안전하게 맡기고 만기에 원금과 이자를 받는 7일 상품입니다.',true),
 ('dori_saver_30','도토리 플러스 정기예금',30,3.50,10000,9223372036854775807,'한 달 동안 자금을 묶어 두고 약정 금리에 따른 이자를 받는 상품입니다.',true),
 ('dori_saver_90','도로늄 프리미엄 정기예금',90,5.00,10000,9223372036854775807,'여유 자금을 90일 동안 예치하는 장기 상품입니다. 만기 전에는 찾을 수 없습니다.',true)
on conflict (id) do nothing;

create table if not exists public.dori_bank_deposits (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  account_number text not null references public.dori_bank_accounts(account_number),
  product_id text not null references public.dori_bank_deposit_products(id),
  product_name text not null,
  term_days integer not null check (term_days between 1 and 365),
  annual_rate_pct numeric(5,2) not null check (annual_rate_pct between 0 and 20),
  principal bigint not null check (principal > 0),
  interest_amount bigint not null default 0 check (interest_amount >= 0),
  opened_at timestamptz not null default clock_timestamp(),
  maturity_at timestamptz not null,
  status text not null default 'active' check (status in ('active','matured')),
  settled_at timestamptz
);
create index if not exists dori_bank_deposits_owner_idx on public.dori_bank_deposits(auth_user_id,opened_at desc);
create index if not exists dori_bank_deposits_maturity_idx on public.dori_bank_deposits(auth_user_id,maturity_at) where status='active';

create table if not exists public.dori_bank_transactions (
  id bigint generated always as identity primary key,
  account_number text not null references public.dori_bank_accounts(account_number),
  transaction_ref uuid not null default gen_random_uuid(),
  transfer_ref uuid,
  tx_type text not null check (tx_type in ('account_open','transfer_in','transfer_out','deposit_open','deposit_maturity')),
  direction text not null check (direction in ('credit','debit')),
  amount bigint not null check (amount > 0),
  balance_after bigint not null check (balance_after >= 0),
  counterparty_account text,
  counterparty_name text,
  description text not null default '',
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_bank_transactions_account_created_idx on public.dori_bank_transactions(account_number,created_at desc,id desc);
create index if not exists dori_bank_transactions_transfer_idx on public.dori_bank_transactions(transfer_ref) where transfer_ref is not null;

create table if not exists public.dori_bank_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_bank_audit_created_idx on public.dori_bank_audit_logs(created_at desc,id desc);

create table if not exists public.dori_bank_transfer_requests (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  transfer_ref uuid not null unique,
  amount bigint not null check (amount > 0),
  recipient_account text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(auth_user_id,request_id)
);

insert into public.dori_bank_identity_map(auth_user_id,site_user_id)
select a.id,u.user_id from auth.users a
join public.users u on u.user_id=a.id::text
on conflict do nothing;
insert into public.dori_bank_identity_map(auth_user_id,site_user_id)
select a.id,u.user_id from auth.users a
join public.users u on u.login_id=a.raw_user_meta_data ->> 'login_id'
where not exists(select 1 from public.dori_bank_identity_map m where m.auth_user_id=a.id)
on conflict do nothing;

insert into public.dori_bank_accounts(auth_user_id,site_user_id,account_number,account_name)
select m.auth_user_id,m.site_user_id,'DORI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),'돌이 생활 입출금 계좌'
from public.dori_bank_identity_map m
where exists(select 1 from public.users u where u.user_id=m.site_user_id)
  and not exists(select 1 from public.dori_bank_accounts a where a.auth_user_id=m.auth_user_id)
on conflict do nothing;

alter table public.dori_bank_identity_map enable row level security;
alter table public.dori_bank_accounts enable row level security;
alter table public.dori_bank_deposit_products enable row level security;
alter table public.dori_bank_deposits enable row level security;
alter table public.dori_bank_transactions enable row level security;
alter table public.dori_bank_transfer_requests enable row level security;
alter table public.dori_bank_audit_logs enable row level security;
revoke all on table public.dori_bank_identity_map,public.dori_bank_accounts,public.dori_bank_deposit_products,
  public.dori_bank_deposits,public.dori_bank_transactions,public.dori_bank_transfer_requests,public.dori_bank_audit_logs
  from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.dori_bank_admin_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_products jsonb; v_transactions jsonb;
begin
  if not public.admin_is_authorized() then raise exception '검증된 관리자 권한이 필요합니다.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.term_days),'[]'::jsonb) into v_products
  from (
    select p.id,p.name,p.term_days,p.annual_rate_pct::text as annual_rate_pct,p.min_amount::text as min_amount,
      p.max_amount::text as max_amount,p.description,p.is_active,p.updated_at
    from public.dori_bank_deposit_products p
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into v_transactions
  from (
    select t.id::text as id,t.tx_type,t.direction,t.amount::text as amount,t.created_at,
      t.account_number,t.counterparty_account,t.counterparty_name,t.description
    from public.dori_bank_transactions t order by t.created_at desc,t.id desc limit 30
  ) x;
  return jsonb_build_object(
    'active_accounts',(select count(*) from public.dori_bank_accounts where status='active'),
    'today_transactions',(select count(*) from public.dori_bank_transactions where created_at >= (date_trunc('day',clock_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')),
    'active_deposits',(select count(*) from public.dori_bank_deposits where status='active'),
    'products',v_products,'transactions',v_transactions
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_admin_save_product(p_id text, p_name text, p_term_days integer, p_annual_rate_pct numeric, p_min_amount bigint, p_max_amount bigint, p_description text, p_is_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_row public.dori_bank_deposit_products%rowtype;
begin
  if not public.admin_is_authorized() then raise exception '검증된 관리자 권한이 필요합니다.' using errcode='42501'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_]{3,40}$' then raise exception '상품 식별자가 올바르지 않습니다.' using errcode='22023'; end if;
  if p_name is null or char_length(trim(p_name))<2 or char_length(p_name)>80 then raise exception '상품명은 2~80자로 입력해 주세요.' using errcode='22023'; end if;
  if p_term_days is null or p_term_days<1 or p_term_days>365 then raise exception '예치 기간은 1~365일이어야 합니다.' using errcode='22023'; end if;
  if p_annual_rate_pct is null or p_annual_rate_pct<0 or p_annual_rate_pct>20 then
    raise exception '연 이율은 0~20%% 범위여야 합니다.' using errcode='22023';
  end if;
  if p_min_amount is null or p_min_amount<1 or p_max_amount is null or p_max_amount<p_min_amount then raise exception '가입 한도 설정을 확인해 주세요.' using errcode='22023'; end if;
  if p_description is null or char_length(p_description)>1000 then raise exception '상품 설명은 1000자 이내로 입력해 주세요.' using errcode='22023'; end if;
  insert into public.dori_bank_deposit_products(id,name,term_days,annual_rate_pct,min_amount,max_amount,description,is_active,updated_at)
  values(p_id,trim(p_name),p_term_days,p_annual_rate_pct,p_min_amount,p_max_amount,trim(p_description),coalesce(p_is_active,false),clock_timestamp())
  on conflict(id) do update set name=excluded.name,term_days=excluded.term_days,annual_rate_pct=excluded.annual_rate_pct,
    min_amount=excluded.min_amount,max_amount=excluded.max_amount,description=excluded.description,
    is_active=excluded.is_active,updated_at=clock_timestamp()
  returning * into v_row;
  insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
  values(auth.uid(),'deposit_product_saved','deposit_product',v_row.id,
    jsonb_build_object('name',v_row.name,'term_days',v_row.term_days,'annual_rate_pct',v_row.annual_rate_pct::text,'active',v_row.is_active));
  return jsonb_build_object('ok',true,'id',v_row.id,'name',v_row.name);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_claim_deposit(p_deposit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid:=auth.uid(); v_site_user_id text; v_account public.dori_bank_accounts%rowtype;
  v_deposit public.dori_bank_deposits%rowtype; v_balance bigint; v_payout numeric; v_new_balance bigint;
begin
  if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  perform public.dori_bank_ensure_account();
  select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
  select * into v_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active';
  if not found then raise exception '계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
  select * into v_deposit from public.dori_bank_deposits where id=p_deposit_id and auth_user_id=v_auth for update;
  if not found then raise exception '예금 정보를 찾을 수 없습니다.' using errcode='P0002'; end if;
  if v_deposit.status<>'active' then raise exception '이미 정산된 예금입니다.' using errcode='22023'; end if;
  if v_deposit.maturity_at>clock_timestamp() then raise exception '아직 만기일이 아닙니다.' using errcode='22023'; end if;
  v_payout:=v_deposit.principal::numeric+v_deposit.interest_amount::numeric;
  perform 1 from public.users u where u.user_id=v_site_user_id for update;
  select coalesce(doldolcoin,0) into v_balance from public.users where user_id=v_site_user_id;
  if v_balance::numeric+v_payout>9223372036854775807::numeric then
    raise exception '현재 지갑 잔액 한도를 초과하여 수령할 수 없습니다.' using errcode='22003';
  end if;
  update public.users set doldolcoin=doldolcoin+v_payout::bigint where user_id=v_site_user_id returning doldolcoin into v_new_balance;
  update public.dori_bank_deposits set status='matured',settled_at=clock_timestamp() where id=v_deposit.id;
  insert into public.dori_bank_transactions(account_number,tx_type,direction,amount,balance_after,counterparty_name,description)
  values(v_account.account_number,'deposit_maturity','credit',v_payout::bigint,v_new_balance,'돌이 은행 예금',
    v_deposit.product_name||' 만기 수령 (원금 + 이자)');
  insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
  values(v_auth,'deposit_matured','deposit',v_deposit.id::text,
    jsonb_build_object('principal',v_deposit.principal::text,'interest',v_deposit.interest_amount::text,'payout',v_payout::text));
  return jsonb_build_object('ok',true,'principal',v_deposit.principal::text,
    'interest_amount',v_deposit.interest_amount::text,'payout',v_payout::text,'balance',v_new_balance::text);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_create_deposit(p_product_id text, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid:=auth.uid(); v_site_user_id text; v_account public.dori_bank_accounts%rowtype;
  v_product public.dori_bank_deposit_products%rowtype; v_balance bigint; v_amount bigint;
  v_interest_numeric numeric; v_interest bigint; v_deposit public.dori_bank_deposits%rowtype;
begin
  if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_amount is null or p_amount<=0 or p_amount<>trunc(p_amount) or p_amount>9223372036854775807::numeric then
    raise exception '예치 금액은 1 이상의 정수여야 합니다.' using errcode='22023';
  end if;
  v_amount:=p_amount::bigint;
  perform public.dori_bank_ensure_account();
  select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
  select * into v_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active';
  if not found then raise exception '계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
  select * into v_product from public.dori_bank_deposit_products where id=p_product_id and is_active is true;
  if not found then raise exception '현재 가입할 수 없는 예금 상품입니다.' using errcode='P0002'; end if;
  if v_amount<v_product.min_amount or v_amount>v_product.max_amount then
    raise exception '예치 금액이 상품의 가입 한도를 벗어났습니다.' using errcode='22023';
  end if;
  perform 1 from public.users u where u.user_id=v_site_user_id for update;
  select coalesce(doldolcoin,0) into v_balance from public.users where user_id=v_site_user_id;
  if v_balance<v_amount then raise exception '입출금 계좌 잔액이 부족합니다.' using errcode='22023'; end if;
  v_interest_numeric:=floor(v_amount::numeric*v_product.annual_rate_pct/100*v_product.term_days/365);
  if v_interest_numeric>9223372036854775807::numeric-v_amount::numeric then
    raise exception '예상 이자와 원금의 합계가 계좌 한도를 초과합니다.' using errcode='22003';
  end if;
  v_interest:=v_interest_numeric::bigint;
  update public.users set doldolcoin=doldolcoin-v_amount where user_id=v_site_user_id returning doldolcoin into v_balance;
  insert into public.dori_bank_deposits(auth_user_id,account_number,product_id,product_name,term_days,annual_rate_pct,
    principal,interest_amount,opened_at,maturity_at)
  values(v_auth,v_account.account_number,v_product.id,v_product.name,v_product.term_days,v_product.annual_rate_pct,
    v_amount,v_interest,clock_timestamp(),clock_timestamp()+make_interval(days=>v_product.term_days))
  returning * into v_deposit;
  insert into public.dori_bank_transactions(account_number,tx_type,direction,amount,balance_after,counterparty_name,description)
  values(v_account.account_number,'deposit_open','debit',v_amount,v_balance,'돌이 은행 예금',
    v_product.name||' 가입 · 만기 '||to_char(v_deposit.maturity_at at time zone 'Asia/Seoul','YYYY-MM-DD'));
  insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
  values(v_auth,'deposit_opened','deposit',v_deposit.id::text,jsonb_build_object('principal',v_amount::text,'product_id',v_product.id));
  return jsonb_build_object('ok',true,'deposit_id',v_deposit.id::text,'principal',v_amount::text,
    'interest_amount',v_interest::text,'maturity_at',v_deposit.maturity_at,'balance',v_balance::text);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid := auth.uid(); v_site_user_id text; v_account public.dori_bank_accounts%rowtype;
  v_balance bigint; v_name text; v_deposits jsonb; v_transactions jsonb; v_products jsonb;
begin
  if v_auth is null then raise exception '로그인 후 돌이 은행을 이용해 주세요.' using errcode='28000'; end if;
  perform public.dori_bank_ensure_account();
  select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
  select u.name, coalesce(u.doldolcoin,0) into v_name,v_balance from public.users u where u.user_id=v_site_user_id;
  if not found then raise exception '계좌 소유자 정보를 찾을 수 없습니다.' using errcode='P0002'; end if;
  select * into v_account from public.dori_bank_accounts a where a.auth_user_id=v_auth;
  if v_account.status <> 'active' then raise exception '계좌 이용이 제한되어 있습니다.' using errcode='42501'; end if;

  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_transactions
  from (
    select t.id::text as id,t.transaction_ref::text as transaction_ref,t.transfer_ref::text as transfer_ref,
      t.tx_type,t.direction,t.amount::text as amount,t.balance_after::text as balance_after,
      t.counterparty_account,t.counterparty_name,t.description,t.created_at
    from public.dori_bank_transactions t where t.account_number=v_account.account_number
    order by t.created_at desc,t.id desc limit 50
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.opened_at desc),'[]'::jsonb) into v_deposits
  from (
    select d.id::text as id,d.product_id,d.product_name,d.term_days,d.annual_rate_pct::text as annual_rate_pct,
      d.principal::text as principal,d.interest_amount::text as interest_amount,d.opened_at,d.maturity_at,
      d.status,(d.status='active' and d.maturity_at<=clock_timestamp()) as is_mature
    from public.dori_bank_deposits d where d.auth_user_id=v_auth order by d.opened_at desc limit 30
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.term_days),'[]'::jsonb) into v_products
  from (
    select p.id,p.name,p.term_days,p.annual_rate_pct::text as annual_rate_pct,p.min_amount::text as min_amount,
      p.max_amount::text as max_amount,p.description
    from public.dori_bank_deposit_products p where p.is_active is true
  ) x;
  update public.dori_bank_accounts set last_activity_at=clock_timestamp() where auth_user_id=v_auth;
  return jsonb_build_object(
    'account',jsonb_build_object('account_number',v_account.account_number,'account_name',v_account.account_name,
      'status',v_account.status,'created_at',v_account.created_at,'name',v_name),
    'balance',v_balance::text,
    'deposit_principal_total',(select coalesce(sum(d.principal),0)::text from public.dori_bank_deposits d where d.auth_user_id=v_auth and d.status='active'),
    'deposits',v_deposits,'transactions',v_transactions,'products',v_products
  );
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_ensure_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid := auth.uid();
  v_site_user_id text;
  v_account public.dori_bank_accounts%rowtype;
  v_candidate text;
  v_name text;
begin
  if v_auth is null then
    raise exception '돌이사이트에 로그인한 뒤 이용해 주세요.' using errcode='28000';
  end if;

  select m.site_user_id into v_site_user_id
  from public.dori_bank_identity_map m
  where m.auth_user_id = v_auth;

  -- Safely link future accounts using the authenticated UUID or immutable site login metadata.
  if v_site_user_id is null then
    select u.user_id into v_site_user_id
    from auth.users a
    join public.users u on (
      u.user_id = a.id::text
      or (nullif(a.raw_user_meta_data ->> 'login_id','') is not null
          and u.login_id = a.raw_user_meta_data ->> 'login_id')
      or (nullif(a.raw_user_meta_data ->> 'user_id','') is not null
          and (u.user_id = a.raw_user_meta_data ->> 'user_id'
               or u.login_id = a.raw_user_meta_data ->> 'user_id'))
    )
    where a.id = v_auth
    order by case when u.user_id = a.id::text then 0
      when u.login_id = a.raw_user_meta_data ->> 'login_id' then 1 else 2 end
    limit 1;

    if v_site_user_id is null then
      raise exception '돌이사이트 계정을 찾을 수 없습니다. 먼저 돌이사이트 계정을 만들어 주세요.' using errcode='42501';
    end if;

    begin
      insert into public.dori_bank_identity_map(auth_user_id,site_user_id)
      values(v_auth,v_site_user_id)
      on conflict(auth_user_id) do update set site_user_id=excluded.site_user_id;
    exception when unique_violation then
      raise exception '이 돌이사이트 계정은 이미 다른 인증 계정에 연결되어 있습니다.' using errcode='42501';
    end;
  end if;

  select u.name into v_name from public.users u where u.user_id = v_site_user_id;
  if not found then
    raise exception '돌이사이트 사용자 정보를 찾을 수 없습니다.' using errcode='P0002';
  end if;

  if exists(select 1 from public.dori_bank_accounts a where a.auth_user_id = v_auth) then
    select * into v_account from public.dori_bank_accounts a where a.auth_user_id = v_auth;
  else
    loop
      v_candidate := 'DORI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      exit when not exists(select 1 from public.dori_bank_accounts a where a.account_number = v_candidate);
    end loop;

    insert into public.dori_bank_accounts(auth_user_id,site_user_id,account_number,account_name)
    values(v_auth,v_site_user_id,v_candidate,'돌이 생활 입출금 계좌')
    on conflict(auth_user_id) do nothing;
    select * into v_account from public.dori_bank_accounts a where a.auth_user_id = v_auth;
  end if;

  return jsonb_build_object('account_number',v_account.account_number,'account_name',v_account.account_name,
    'status',v_account.status,'created_at',v_account.created_at,'name',v_name);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_lookup_recipient(p_account_number text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_auth uuid:=auth.uid(); v_recipient_auth uuid; v_recipient_site_id text; v_name text; v_account_number text;
begin
  if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_account_number is null or p_account_number !~ '^DORI-[A-F0-9]{10}$' then
    raise exception '계좌번호 형식이 올바르지 않습니다.' using errcode='22023';
  end if;
  perform public.dori_bank_ensure_account();
  select a.auth_user_id,a.site_user_id,a.account_number into v_recipient_auth,v_recipient_site_id,v_account_number
  from public.dori_bank_accounts a where a.account_number=upper(trim(p_account_number)) and a.status='active';
  if not found then raise exception '해당 계좌를 찾을 수 없습니다.' using errcode='P0002'; end if;
  if v_recipient_auth=v_auth then raise exception '내 계좌로는 송금할 수 없습니다.' using errcode='22023'; end if;
  select u.name into v_name from public.users u where u.user_id=v_recipient_site_id;
  if v_name is null then v_name:='돌이 사용자'; end if;
  return jsonb_build_object('account_number',v_account_number,'recipient_name',v_name);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_transactions_page(p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_auth uuid:=auth.uid(); v_account public.dori_bank_accounts%rowtype; v_rows jsonb; v_total bigint;
begin
  if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_limit is null or p_limit<1 or p_limit>50 or p_offset is null or p_offset<0 or p_offset>1000000 then
    raise exception '거래 내역 페이지 범위가 올바르지 않습니다.' using errcode='22023';
  end if;
  perform public.dori_bank_ensure_account();
  select * into v_account from public.dori_bank_accounts a where a.auth_user_id=v_auth and a.status='active';
  if not found then raise exception '계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
  select count(*) into v_total from public.dori_bank_transactions t where t.account_number=v_account.account_number;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into v_rows
  from (
    select t.id::text as id,t.transaction_ref::text as transaction_ref,t.transfer_ref::text as transfer_ref,
      t.tx_type,t.direction,t.amount::text as amount,t.balance_after::text as balance_after,
      t.counterparty_account,t.counterparty_name,t.description,t.created_at
    from public.dori_bank_transactions t where t.account_number=v_account.account_number
    order by t.created_at desc,t.id desc limit p_limit offset p_offset
  ) x;
  return jsonb_build_object('transactions',v_rows,'total_count',v_total::text,'offset',p_offset,
    'limit',p_limit,'has_more',(p_offset+p_limit)<v_total);
end;
$function$;


CREATE OR REPLACE FUNCTION public.dori_bank_transfer(p_account_number text, p_amount numeric, p_memo text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_auth uuid:=auth.uid(); v_sender_id text; v_recipient_auth uuid; v_recipient_id text;
  v_sender_account public.dori_bank_accounts%rowtype; v_recipient_account public.dori_bank_accounts%rowtype;
  v_sender_name text; v_recipient_name text; v_sender_balance bigint; v_recipient_balance bigint;
  v_amount bigint; v_transfer_ref uuid:=gen_random_uuid(); v_description text;
  v_old public.dori_bank_transfer_requests%rowtype; v_old_balance text;
begin
  if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null then raise exception '거래 요청 식별자가 없습니다. 다시 시도해 주세요.' using errcode='22023'; end if;
  if p_amount is null or p_amount<=0 or p_amount<>trunc(p_amount) or p_amount>9223372036854775807::numeric then
    raise exception '송금액은 1 이상의 정수여야 합니다.' using errcode='22023';
  end if;
  if coalesce(char_length(trim(p_memo)),0)>100 then raise exception '메모는 100자 이내로 입력해 주세요.' using errcode='22023'; end if;
  v_amount:=p_amount::bigint;
  perform public.dori_bank_ensure_account();
  select * into v_old from public.dori_bank_transfer_requests r
    where r.auth_user_id=v_auth and r.request_id=p_request_id;
  if found then
    select t.balance_after::text into v_old_balance from public.dori_bank_transactions t
      where t.transfer_ref=v_old.transfer_ref and t.tx_type='transfer_out' and t.account_number in
        (select a.account_number from public.dori_bank_accounts a where a.auth_user_id=v_auth)
      order by t.id desc limit 1;
    return jsonb_build_object('ok',true,'duplicate',true,'transfer_ref',v_old.transfer_ref::text,
      'amount',v_old.amount::text,'balance',coalesce(v_old_balance,'0'),
      'recipient_account',v_old.recipient_account,'message','이 거래 요청은 이미 처리되었습니다.');
  end if;
  select site_user_id into v_sender_id from public.dori_bank_identity_map where auth_user_id=v_auth;
  select * into v_sender_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active';
  if not found then raise exception '송금 계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
  select * into v_recipient_account from public.dori_bank_accounts
    where account_number=upper(trim(p_account_number)) and status='active';
  if not found then raise exception '받는 분의 계좌를 찾을 수 없습니다.' using errcode='P0002'; end if;
  if v_recipient_account.auth_user_id=v_auth then raise exception '내 계좌로는 송금할 수 없습니다.' using errcode='22023'; end if;
  v_recipient_auth:=v_recipient_account.auth_user_id; v_recipient_id:=v_recipient_account.site_user_id;
  perform u.user_number from public.users u where u.user_id in (v_sender_id,v_recipient_id) order by u.user_number for update;
  select u.name,coalesce(u.doldolcoin,0) into v_sender_name,v_sender_balance from public.users u where u.user_id=v_sender_id;
  if not found then raise exception '보내는 분의 지갑을 찾을 수 없습니다.' using errcode='P0002'; end if;
  select u.name,coalesce(u.doldolcoin,0) into v_recipient_name,v_recipient_balance from public.users u where u.user_id=v_recipient_id;
  if not found then raise exception '받는 분의 지갑을 찾을 수 없습니다.' using errcode='P0002'; end if;
  if v_sender_balance<v_amount then raise exception '잔액이 부족합니다.' using errcode='22023'; end if;
  if v_recipient_balance::numeric+v_amount::numeric>9223372036854775807::numeric then
    raise exception '받는 분의 잔액 한도를 초과합니다.' using errcode='22003';
  end if;

  insert into public.dori_bank_transfer_requests(auth_user_id,request_id,transfer_ref,amount,recipient_account)
  values(v_auth,p_request_id,v_transfer_ref,v_amount,v_recipient_account.account_number);

  update public.users set doldolcoin=doldolcoin-v_amount where user_id=v_sender_id returning doldolcoin into v_sender_balance;
  update public.users set doldolcoin=doldolcoin+v_amount where user_id=v_recipient_id returning doldolcoin into v_recipient_balance;
  v_description:=case when trim(coalesce(p_memo,''))='' then '돌이 은행 계좌이체' else trim(p_memo) end;
  insert into public.dori_bank_transactions(account_number,transfer_ref,tx_type,direction,amount,balance_after,
    counterparty_account,counterparty_name,description)
  values(v_sender_account.account_number,v_transfer_ref,'transfer_out','debit',v_amount,v_sender_balance,
    v_recipient_account.account_number,v_recipient_name,v_description);
  insert into public.dori_bank_transactions(account_number,transfer_ref,tx_type,direction,amount,balance_after,
    counterparty_account,counterparty_name,description)
  values(v_recipient_account.account_number,v_transfer_ref,'transfer_in','credit',v_amount,v_recipient_balance,
    v_sender_account.account_number,v_sender_name,v_description);
  update public.dori_bank_accounts set last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
    where auth_user_id in (v_auth,v_recipient_auth);
  insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
  values(v_auth,'transfer_completed','transfer',v_transfer_ref::text,
    jsonb_build_object('amount',v_amount::text,'from',v_sender_account.account_number,'to',v_recipient_account.account_number));
  return jsonb_build_object('ok',true,'transfer_ref',v_transfer_ref::text,'amount',v_amount::text,
    'balance',v_sender_balance::text,'recipient_name',v_recipient_name,'recipient_account',v_recipient_account.account_number);
end;
$function$;


revoke all on function public.dori_bank_ensure_account() from public,anon,authenticated;
grant execute on function public.dori_bank_ensure_account() to authenticated;
revoke all on function public.dori_bank_dashboard() from public,anon,authenticated;
grant execute on function public.dori_bank_dashboard() to authenticated;
revoke all on function public.dori_bank_lookup_recipient(text) from public,anon,authenticated;
grant execute on function public.dori_bank_lookup_recipient(text) to authenticated;
revoke all on function public.dori_bank_transfer(text,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.dori_bank_transfer(text,numeric,text,uuid) to authenticated;
revoke all on function public.dori_bank_create_deposit(text,numeric) from public,anon,authenticated;
grant execute on function public.dori_bank_create_deposit(text,numeric) to authenticated;
revoke all on function public.dori_bank_claim_deposit(uuid) from public,anon,authenticated;
grant execute on function public.dori_bank_claim_deposit(uuid) to authenticated;
revoke all on function public.dori_bank_transactions_page(integer,integer) from public,anon,authenticated;
grant execute on function public.dori_bank_transactions_page(integer,integer) to authenticated;
revoke all on function public.dori_bank_admin_dashboard() from public,anon,authenticated;
grant execute on function public.dori_bank_admin_dashboard() to authenticated;
revoke all on function public.dori_bank_admin_save_product(text,text,integer,numeric,bigint,bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.dori_bank_admin_save_product(text,text,integer,numeric,bigint,bigint,text,boolean) to authenticated;

comment on table public.dori_bank_accounts is '돌이 은행 계좌 번호 및 상태. 잔액은 기존 public.users.doldolcoin과 단일 원장으로 관리한다.';
comment on table public.dori_bank_transactions is '돌이 은행의 서버 처리 완료 거래 원장. 클라이언트 직접 쓰기를 허용하지 않는다.';
comment on table public.dori_bank_deposits is '돌이 은행 정기예금 계약 및 만기 지급 기록.';
comment on table public.dori_bank_deposit_products is '관리자 승인형 정기예금 상품과 약정 조건.';
comment on table public.dori_bank_audit_logs is '은행의 송금, 예금 및 관리자 변경 작업에 대한 감사 로그.';
