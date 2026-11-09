-- DORI ECONOMY / GRAND CAPITAL
-- Additive virtual-economy foundation. Existing bank, stock and factory save systems remain authoritative.
create table if not exists public.dori_economy_catalog (
  asset_id text primary key,
  name text not null check (char_length(name) between 1 and 60),
  category text not null check (category in ('raw','component','doronium','utility')),
  unit text not null default '개',
  base_price bigint not null check (base_price > 0),
  description text not null default '',
  sort_order integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);
insert into public.dori_economy_catalog(asset_id,name,category,unit,base_price,description,sort_order) values
('wood','목재','raw','개',18,'건설과 포장에 사용하는 기초 자원',10),
('stone','석재','raw','개',16,'건설 및 산업 설비용 기초 자원',20),
('ironOre','철광석','raw','개',32,'금속 가공의 기본 원료',30),
('copperOre','구리 광석','raw','개',38,'전기 부품 생산에 사용하는 광석',40),
('coal','석탄','raw','개',24,'산업용 열원과 제련 원료',50),
('water','정제수','utility','개',8,'산업 공정용 기본 유체',60),
('ironPlate','철판','component','개',85,'기계와 구조물에 사용하는 금속 부품',70),
('wire','구리 전선','component','개',62,'전력 설비 및 회로 제작용 부품',80),
('circuit','산업 회로','component','개',240,'자동화 설비의 핵심 부품',90),
('doronium_normal','일반 도로늄','doronium','개',520,'고급 산업 연구 및 에너지 소재',100),
('doronium_blue','청색 도로늄','doronium','개',1450,'고순도 응용 연구용 희귀 소재',110)
on conflict (asset_id) do nothing;

create table if not exists public.dori_economy_inventory (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null references public.dori_economy_catalog(asset_id),
  quantity bigint not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (auth_user_id, asset_id)
);
create table if not exists public.dori_economy_companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  ticker text not null unique check (ticker ~ '^[A-Z0-9]{2,6}$'),
  sector text not null check (sector in ('semiconductor','doronium','logistics','retail','energy','construction')),
  description text not null default '' check (char_length(description) <= 280),
  paid_in_capital bigint not null check (paid_in_capital >= 10000),
  cash_balance bigint not null check (cash_balance >= 0),
  total_revenue bigint not null default 0 check (total_revenue >= 0),
  operating_cost bigint not null default 0 check (operating_cost >= 0),
  status text not null default 'active' check (status in ('active','dormant')),
  is_public boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_economy_companies_owner_idx on public.dori_economy_companies(owner_user_id, created_at desc);

create table if not exists public.dori_economy_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null default '돌이 월드 사용자',
  asset_id text not null references public.dori_economy_catalog(asset_id),
  quantity bigint not null check (quantity > 0),
  remaining_quantity bigint not null check (remaining_quantity >= 0 and remaining_quantity <= quantity),
  unit_price bigint not null check (unit_price > 0),
  status text not null default 'active' check (status in ('active','filled','cancelled')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_economy_listings_active_idx on public.dori_economy_listings(status, created_at desc) where status = 'active';
create index if not exists dori_economy_listings_seller_idx on public.dori_economy_listings(seller_user_id, created_at desc);

create table if not exists public.dori_economy_ledger (
  id bigint generated always as identity primary key,
  event_id uuid not null,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('supply_purchase','company_capital','market_purchase','market_sale','market_fee','listing_refund')),
  direction text not null check (direction in ('debit','credit','memo')),
  amount bigint not null default 0 check (amount >= 0),
  balance_after bigint,
  asset_id text references public.dori_economy_catalog(asset_id),
  quantity bigint check (quantity is null or quantity >= 0),
  reference_id text,
  description text not null default '',
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_economy_ledger_owner_idx on public.dori_economy_ledger(auth_user_id, created_at desc);
create table if not exists public.dori_economy_requests (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  action text not null,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default clock_timestamp(),
  primary key(auth_user_id, request_id)
);
create table if not exists public.dori_economy_treasury (
  id smallint primary key check (id = 1),
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default clock_timestamp()
);
insert into public.dori_economy_treasury(id,balance) values (1,0) on conflict (id) do nothing;

alter table public.dori_economy_catalog enable row level security;
alter table public.dori_economy_inventory enable row level security;
alter table public.dori_economy_companies enable row level security;
alter table public.dori_economy_listings enable row level security;
alter table public.dori_economy_ledger enable row level security;
alter table public.dori_economy_requests enable row level security;
alter table public.dori_economy_treasury enable row level security;

drop policy if exists dori_economy_catalog_read on public.dori_economy_catalog;
create policy dori_economy_catalog_read on public.dori_economy_catalog for select to anon, authenticated using (enabled = true);
drop policy if exists dori_economy_inventory_own_read on public.dori_economy_inventory;
create policy dori_economy_inventory_own_read on public.dori_economy_inventory for select to authenticated using (auth.uid() = auth_user_id);
drop policy if exists dori_economy_companies_public_read on public.dori_economy_companies;
create policy dori_economy_companies_public_read on public.dori_economy_companies for select to anon, authenticated using (is_public = true or auth.uid() = owner_user_id);
drop policy if exists dori_economy_listings_public_read on public.dori_economy_listings;
create policy dori_economy_listings_public_read on public.dori_economy_listings for select to anon, authenticated using (status = 'active' or auth.uid() = seller_user_id);
drop policy if exists dori_economy_ledger_own_read on public.dori_economy_ledger;
create policy dori_economy_ledger_own_read on public.dori_economy_ledger for select to authenticated using (auth.uid() = auth_user_id);

revoke all on table public.dori_economy_catalog, public.dori_economy_inventory, public.dori_economy_companies, public.dori_economy_listings, public.dori_economy_ledger, public.dori_economy_requests, public.dori_economy_treasury from public, anon, authenticated;
grant select on public.dori_economy_catalog, public.dori_economy_companies, public.dori_economy_listings to anon, authenticated;
grant select on public.dori_economy_inventory, public.dori_economy_ledger to authenticated;

create or replace function public.dori_economy_buy_supply(p_asset_id text, p_quantity integer, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users%rowtype;
  v_asset public.dori_economy_catalog%rowtype;
  v_request public.dori_economy_requests%rowtype;
  v_payload jsonb;
  v_total numeric;
  v_balance bigint;
  v_result jsonb;
begin
  if v_uid is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 1000000 then raise exception '구매 수량 또는 요청 식별자가 올바르지 않습니다.' using errcode='22023'; end if;
  v_payload := jsonb_build_object('asset_id',p_asset_id,'quantity',p_quantity);
  insert into public.dori_economy_requests(auth_user_id,request_id,action,payload) values(v_uid,p_request_id,'buy_supply',v_payload) on conflict do nothing;
  select * into v_request from public.dori_economy_requests where auth_user_id=v_uid and request_id=p_request_id for update;
  if v_request.action <> 'buy_supply' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_asset from public.dori_economy_catalog where asset_id=p_asset_id and enabled=true;
  if not found then raise exception '구매할 수 없는 자원입니다.'; end if;
  v_total := v_asset.base_price::numeric * p_quantity::numeric;
  if v_total > 9223372036854775807::numeric then raise exception '구매 금액이 허용 한도를 초과했습니다.'; end if;
  select * into v_user from public.users where user_id=v_uid::text for update;
  if not found then raise exception '사용자 계정을 찾을 수 없습니다.'; end if;
  if coalesce(v_user.doldolcoin,0)::numeric < v_total then raise exception '돌돌코인이 부족합니다.'; end if;
  update public.users set doldolcoin=doldolcoin-v_total::bigint where user_id=v_uid::text returning doldolcoin into v_balance;
  insert into public.dori_economy_inventory(auth_user_id,asset_id,quantity) values(v_uid,p_asset_id,p_quantity)
    on conflict(auth_user_id,asset_id) do update set quantity=public.dori_economy_inventory.quantity+excluded.quantity,updated_at=clock_timestamp();
  update public.dori_economy_treasury set balance=balance+v_total::bigint,updated_at=clock_timestamp() where id=1;
  insert into public.dori_economy_ledger(event_id,auth_user_id,entry_type,direction,amount,balance_after,asset_id,quantity,description)
    values(p_request_id,v_uid,'supply_purchase','debit',v_total::bigint,v_balance,p_asset_id,p_quantity,v_asset.name||' 공급처 구매');
  v_result := jsonb_build_object('ok',true,'balance',v_balance::text,'asset_id',p_asset_id,'quantity',p_quantity,'total',v_total::text);
  update public.dori_economy_requests set result=v_result where auth_user_id=v_uid and request_id=p_request_id;
  return v_result;
end; $$;

create or replace function public.dori_economy_create_company(p_name text,p_ticker text,p_sector text,p_description text,p_capital bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_user public.users%rowtype; v_request public.dori_economy_requests%rowtype;
  v_payload jsonb; v_balance bigint; v_company public.dori_economy_companies%rowtype; v_result jsonb; v_count integer;
begin
  if v_uid is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null or p_name is null or char_length(trim(p_name)) not between 2 and 40 or p_ticker is null or p_ticker !~ '^[A-Z0-9]{2,6}$'
    or p_sector not in ('semiconductor','doronium','logistics','retail','energy','construction') or p_description is null or char_length(p_description)>280
    or p_capital is null or p_capital < 10000 or p_capital > 1000000000000 then raise exception '기업 정보 또는 설립 자본금이 올바르지 않습니다.' using errcode='22023'; end if;
  v_payload := jsonb_build_object('name',trim(p_name),'ticker',p_ticker,'sector',p_sector,'description',p_description,'capital',p_capital);
  insert into public.dori_economy_requests(auth_user_id,request_id,action,payload) values(v_uid,p_request_id,'create_company',v_payload) on conflict do nothing;
  select * into v_request from public.dori_economy_requests where auth_user_id=v_uid and request_id=p_request_id for update;
  if v_request.action <> 'create_company' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_user from public.users where user_id=v_uid::text for update;
  if not found then raise exception '사용자 계정을 찾을 수 없습니다.'; end if;
  select count(*) into v_count from public.dori_economy_companies where owner_user_id=v_uid;
  if v_count >= 5 then raise exception '한 계정은 최대 5개 기업까지 설립할 수 있습니다.'; end if;
  if coalesce(v_user.doldolcoin,0) < p_capital then raise exception '설립 자본금보다 보유 돌돌코인이 부족합니다.'; end if;
  update public.users set doldolcoin=doldolcoin-p_capital where user_id=v_uid::text returning doldolcoin into v_balance;
  insert into public.dori_economy_companies(owner_user_id,name,ticker,sector,description,paid_in_capital,cash_balance)
    values(v_uid,trim(p_name),p_ticker,p_sector,p_description,p_capital,p_capital) returning * into v_company;
  insert into public.dori_economy_ledger(event_id,auth_user_id,entry_type,direction,amount,balance_after,reference_id,description)
    values(p_request_id,v_uid,'company_capital','debit',p_capital,v_balance,v_company.id::text,'기업 설립 자본금 출자');
  v_result := jsonb_build_object('ok',true,'company_id',v_company.id,'ticker',v_company.ticker,'balance',v_balance::text,'capital',p_capital::text);
  update public.dori_economy_requests set result=v_result where auth_user_id=v_uid and request_id=p_request_id;
  return v_result;
end; $$;

create or replace function public.dori_economy_create_listing(p_asset_id text,p_quantity bigint,p_unit_price bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_inventory public.dori_economy_inventory%rowtype; v_request public.dori_economy_requests%rowtype;
  v_payload jsonb; v_profile public.users%rowtype; v_listing public.dori_economy_listings%rowtype; v_result jsonb;
begin
  if v_uid is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null or p_quantity is null or p_quantity < 1 or p_unit_price is null or p_unit_price < 1 then raise exception '판매 수량과 가격을 확인해 주세요.' using errcode='22023'; end if;
  v_payload := jsonb_build_object('asset_id',p_asset_id,'quantity',p_quantity,'unit_price',p_unit_price);
  insert into public.dori_economy_requests(auth_user_id,request_id,action,payload) values(v_uid,p_request_id,'create_listing',v_payload) on conflict do nothing;
  select * into v_request from public.dori_economy_requests where auth_user_id=v_uid and request_id=p_request_id for update;
  if v_request.action <> 'create_listing' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_inventory from public.dori_economy_inventory where auth_user_id=v_uid and asset_id=p_asset_id for update;
  if not found or v_inventory.quantity < p_quantity then raise exception '판매 가능한 보유 수량이 부족합니다.'; end if;
  select * into v_profile from public.users where user_id=v_uid::text;
  update public.dori_economy_inventory set quantity=quantity-p_quantity,updated_at=clock_timestamp() where auth_user_id=v_uid and asset_id=p_asset_id;
  insert into public.dori_economy_listings(seller_user_id,seller_name,asset_id,quantity,remaining_quantity,unit_price)
    values(v_uid,coalesce(nullif(trim(v_profile.name),''),'돌이 월드 사용자'),p_asset_id,p_quantity,p_quantity,p_unit_price) returning * into v_listing;
  v_result := jsonb_build_object('ok',true,'listing_id',v_listing.id,'quantity',p_quantity,'unit_price',p_unit_price);
  update public.dori_economy_requests set result=v_result where auth_user_id=v_uid and request_id=p_request_id;
  return v_result;
end; $$;

create or replace function public.dori_economy_buy_listing(p_listing_id uuid,p_quantity bigint,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_listing public.dori_economy_listings%rowtype; v_request public.dori_economy_requests%rowtype;
  v_payload jsonb; v_buyer public.users%rowtype; v_seller public.users%rowtype;
  v_gross numeric; v_fee numeric; v_net numeric; v_buyer_balance bigint; v_seller_balance bigint; v_result jsonb;
begin
  if v_uid is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null or p_listing_id is null or p_quantity is null or p_quantity < 1 then raise exception '거래 수량 또는 요청 식별자가 올바르지 않습니다.' using errcode='22023'; end if;
  v_payload := jsonb_build_object('listing_id',p_listing_id,'quantity',p_quantity);
  insert into public.dori_economy_requests(auth_user_id,request_id,action,payload) values(v_uid,p_request_id,'buy_listing',v_payload) on conflict do nothing;
  select * into v_request from public.dori_economy_requests where auth_user_id=v_uid and request_id=p_request_id for update;
  if v_request.action <> 'buy_listing' or v_request.payload <> v_payload then raise exception '이미 다른 내용으로 사용된 요청 식별자입니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_listing from public.dori_economy_listings where id=p_listing_id for update;
  if not found or v_listing.status <> 'active' or v_listing.remaining_quantity < p_quantity then raise exception '판매 중인 상품이 아니거나 남은 수량이 부족합니다.'; end if;
  if v_listing.seller_user_id = v_uid then raise exception '자신의 상품은 구매할 수 없습니다.'; end if;
  v_gross := v_listing.unit_price::numeric * p_quantity::numeric; v_fee := floor(v_gross * 200 / 10000); v_net := v_gross - v_fee;
  if v_gross > 9223372036854775807::numeric or v_net < 0 then raise exception '거래 금액이 허용 한도를 초과했습니다.'; end if;
  perform 1 from public.users u where u.user_id in (v_uid::text,v_listing.seller_user_id::text) order by u.user_id for update;
  select * into v_buyer from public.users where user_id=v_uid::text;
  select * into v_seller from public.users where user_id=v_listing.seller_user_id::text;
  if v_buyer.user_id is null or v_seller.user_id is null then raise exception '거래 계정을 확인할 수 없습니다.'; end if;
  if coalesce(v_buyer.doldolcoin,0)::numeric < v_gross then raise exception '구매자의 돌돌코인이 부족합니다.'; end if;
  if coalesce(v_seller.doldolcoin,0)::numeric + v_net > 9223372036854775807::numeric then raise exception '판매자 잔액이 허용 한도를 초과합니다.'; end if;
  update public.users set doldolcoin=doldolcoin-v_gross::bigint where user_id=v_uid::text returning doldolcoin into v_buyer_balance;
  update public.users set doldolcoin=doldolcoin+v_net::bigint where user_id=v_listing.seller_user_id::text returning doldolcoin into v_seller_balance;
  insert into public.dori_economy_inventory(auth_user_id,asset_id,quantity) values(v_uid,v_listing.asset_id,p_quantity)
    on conflict(auth_user_id,asset_id) do update set quantity=public.dori_economy_inventory.quantity+excluded.quantity,updated_at=clock_timestamp();
  update public.dori_economy_listings set remaining_quantity=remaining_quantity-p_quantity,status=case when remaining_quantity-p_quantity=0 then 'filled' else 'active' end,updated_at=clock_timestamp() where id=p_listing_id;
  update public.dori_economy_treasury set balance=balance+v_fee::bigint,updated_at=clock_timestamp() where id=1;
  insert into public.dori_economy_ledger(event_id,auth_user_id,entry_type,direction,amount,balance_after,asset_id,quantity,reference_id,description) values
    (p_request_id,v_uid,'market_purchase','debit',v_gross::bigint,v_buyer_balance,v_listing.asset_id,p_quantity,p_listing_id::text,'사용자 마켓 상품 구매'),
    (p_request_id,v_listing.seller_user_id,'market_sale','credit',v_net::bigint,v_seller_balance,v_listing.asset_id,p_quantity,p_listing_id::text,'사용자 마켓 상품 판매');
  if v_fee > 0 then
    insert into public.dori_economy_ledger(event_id,auth_user_id,entry_type,direction,amount,balance_after,asset_id,quantity,reference_id,description)
      values(p_request_id,v_uid,'market_fee','memo',v_fee::bigint,v_buyer_balance,v_listing.asset_id,p_quantity,p_listing_id::text,'마켓 거래 수수료 2%');
  end if;
  v_result := jsonb_build_object('ok',true,'balance',v_buyer_balance::text,'seller_balance',v_seller_balance::text,'gross',v_gross::text,'fee',v_fee::text,'seller_net',v_net::text,'asset_id',v_listing.asset_id,'quantity',p_quantity);
  update public.dori_economy_requests set result=v_result where auth_user_id=v_uid and request_id=p_request_id;
  return v_result;
end; $$;

create or replace function public.dori_economy_cancel_listing(p_listing_id uuid,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_listing public.dori_economy_listings%rowtype; v_request public.dori_economy_requests%rowtype;
  v_payload jsonb := jsonb_build_object('listing_id',p_listing_id); v_result jsonb;
begin
  if v_uid is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
  if p_request_id is null or p_listing_id is null then raise exception '요청 식별자가 없습니다.'; end if;
  insert into public.dori_economy_requests(auth_user_id,request_id,action,payload) values(v_uid,p_request_id,'cancel_listing',v_payload) on conflict do nothing;
  select * into v_request from public.dori_economy_requests where auth_user_id=v_uid and request_id=p_request_id for update;
  if v_request.action <> 'cancel_listing' or v_request.payload <> v_payload then raise exception '요청 식별자가 이미 사용되었습니다.'; end if;
  if v_request.result is not null then return v_request.result; end if;
  select * into v_listing from public.dori_economy_listings where id=p_listing_id and seller_user_id=v_uid for update;
  if not found or v_listing.status <> 'active' then raise exception '취소할 수 있는 판매글이 아닙니다.'; end if;
  if v_listing.remaining_quantity > 0 then
    insert into public.dori_economy_inventory(auth_user_id,asset_id,quantity) values(v_uid,v_listing.asset_id,v_listing.remaining_quantity)
      on conflict(auth_user_id,asset_id) do update set quantity=public.dori_economy_inventory.quantity+excluded.quantity,updated_at=clock_timestamp();
  end if;
  update public.dori_economy_listings set remaining_quantity=0,status='cancelled',updated_at=clock_timestamp() where id=p_listing_id;
  v_result := jsonb_build_object('ok',true,'returned_quantity',v_listing.remaining_quantity);
  update public.dori_economy_requests set result=v_result where auth_user_id=v_uid and request_id=p_request_id;
  return v_result;
end; $$;

revoke all on function public.dori_economy_buy_supply(text,integer,uuid) from public, anon;
revoke all on function public.dori_economy_create_company(text,text,text,text,bigint,uuid) from public, anon;
revoke all on function public.dori_economy_create_listing(text,bigint,bigint,uuid) from public, anon;
revoke all on function public.dori_economy_buy_listing(uuid,bigint,uuid) from public, anon;
revoke all on function public.dori_economy_cancel_listing(uuid,uuid) from public, anon;
grant execute on function public.dori_economy_buy_supply(text,integer,uuid) to authenticated;
grant execute on function public.dori_economy_create_company(text,text,text,text,bigint,uuid) to authenticated;
grant execute on function public.dori_economy_create_listing(text,bigint,bigint,uuid) to authenticated;
grant execute on function public.dori_economy_buy_listing(uuid,bigint,uuid) to authenticated;
grant execute on function public.dori_economy_cancel_listing(uuid,uuid) to authenticated;

comment on table public.dori_economy_ledger is 'DORI ECONOMY immutable transaction journal for virtual Doldolcoin economy';
comment on table public.dori_economy_inventory is 'DORI ECONOMY user-owned virtual resource inventory; mutations are RPC-only';
