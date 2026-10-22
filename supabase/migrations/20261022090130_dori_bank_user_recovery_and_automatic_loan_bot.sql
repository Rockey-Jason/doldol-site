-- Consolidated Dori Bank loan system + user-profile recovery.
-- All money movement is performed by authenticated SECURITY DEFINER RPCs.
create table if not exists public.dori_bank_loan_products(
 id text primary key,
 name text not null,
 term_days integer not null check(term_days between 7 and 365),
 annual_rate_pct numeric(5,2) not null check(annual_rate_pct between 8 and 30),
 min_amount bigint not null check(min_amount>0),
 max_amount bigint not null check(max_amount>=min_amount),
 description text not null default '',
 is_active boolean not null default true,
 updated_at timestamptz not null default clock_timestamp()
);
create table if not exists public.dori_bank_loans(
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null references auth.users(id),
 account_number text not null references public.dori_bank_accounts(account_number),
 product_id text not null references public.dori_bank_loan_products(id),
 product_name text not null,
 principal bigint not null check(principal>0),
 annual_rate_pct numeric(5,2) not null check(annual_rate_pct>=8),
 term_days integer not null check(term_days between 7 and 365),
 interest_amount bigint not null check(interest_amount>=0),
 total_due bigint not null check(total_due>=principal),
 repaid_amount bigint not null default 0 check(repaid_amount>=0),
 purpose text not null default '',
 status text not null default 'pending' check(status in('pending','active','paid','rejected','overdue')),
 created_at timestamptz not null default clock_timestamp(),
 reviewed_at timestamptz,
 reviewed_by uuid,
 due_at timestamptz,
 settled_at timestamptz,
 decision_source text not null default 'bot',
 decision_score integer check(decision_score between 0 and 100),
 decision_reason text not null default '',
 decision_details jsonb not null default '{}'::jsonb,
 bot_reviewed_at timestamptz
);
alter table public.dori_bank_loans add column if not exists decision_source text not null default 'bot';
alter table public.dori_bank_loans add column if not exists decision_score integer;
alter table public.dori_bank_loans add column if not exists decision_reason text not null default '';
alter table public.dori_bank_loans add column if not exists decision_details jsonb not null default '{}'::jsonb;
alter table public.dori_bank_loans add column if not exists bot_reviewed_at timestamptz;
alter table public.dori_bank_loans drop constraint if exists dori_bank_loans_decision_score_check;
alter table public.dori_bank_loans add constraint dori_bank_loans_decision_score_check check(decision_score is null or decision_score between 0 and 100);
create index if not exists dori_bank_loans_user_created_idx on public.dori_bank_loans(auth_user_id,created_at desc);
create index if not exists dori_bank_loans_status_created_idx on public.dori_bank_loans(status,created_at);
create unique index if not exists dori_bank_loans_one_open_per_user_idx on public.dori_bank_loans(auth_user_id) where status in('pending','active','overdue');
alter table public.dori_bank_loan_products enable row level security;
alter table public.dori_bank_loans enable row level security;
revoke all on public.dori_bank_loan_products,public.dori_bank_loans from public,anon,authenticated;
insert into public.dori_bank_loan_products(id,name,term_days,annual_rate_pct,min_amount,max_amount,description,is_active) values
 ('small_personal','돌이 생활안정 대출',30,8.50,10000,1000000,'짧은 기간 동안 필요한 자금을 마련하는 기본 대출입니다. 연 8.50% 단리 기준.',true),
 ('standard_personal','돌이 플러스 신용대출',90,11.00,50000,10000000,'중간 기간 자금에 적합한 일반 신용대출입니다. 연 11.00% 단리 기준.',true),
 ('long_term_personal','돌이 장기 안심대출',180,15.00,100000,50000000,'상환 기간이 긴 대신 금리가 높은 장기 대출입니다. 연 15.00% 단리 기준.',true)
on conflict(id) do nothing;
alter table public.dori_bank_transactions drop constraint if exists dori_bank_transactions_tx_type_check;
alter table public.dori_bank_transactions add constraint dori_bank_transactions_tx_type_check
 check(tx_type=any(array['account_open','transfer_in','transfer_out','deposit_open','deposit_maturity','loan_disbursement','loan_repayment']::text[]));

CREATE OR REPLACE FUNCTION public.dori_bank_ensure_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_auth uuid:=auth.uid(); v_site_user_id text; v_account public.dori_bank_accounts%rowtype; v_candidate text; v_name text;
begin
 if v_auth is null then raise exception '돌이사이트에 로그인한 뒤 이용해 주세요.' using errcode='28000'; end if;
 select m.site_user_id into v_site_user_id from public.dori_bank_identity_map m where m.auth_user_id=v_auth;
 if v_site_user_id is not null and not exists(select 1 from public.users u where u.user_id=v_site_user_id) then
   raise exception '은행 계정에 연결된 사용자 정보가 없습니다. 계정 연결을 다시 확인해야 합니다.' using errcode='P0002';
 end if;
 if v_site_user_id is null then
   select u.user_id into v_site_user_id
   from auth.users a join public.users u on (
     u.user_id=a.id::text or (
       a.email is not null and lower(trim(u.email))=lower(trim(a.email))
       and (select count(*) from public.users ux where ux.email is not null and lower(trim(ux.email))=lower(trim(a.email)))=1
     )
   )
   where a.id=v_auth order by case when u.user_id=a.id::text then 0 else 1 end limit 1;
   if v_site_user_id is null then
     raise exception '로그인 계정과 돌이사이트 사용자 정보를 연결하지 못했습니다. 돌이사이트에서 사용하는 이메일로 로그인했는지 확인해 주세요.' using errcode='42501';
   end if;
   begin
     insert into public.dori_bank_identity_map(auth_user_id,site_user_id) values(v_auth,v_site_user_id)
     on conflict(auth_user_id) do nothing;
   exception when unique_violation then
     raise exception '이 돌이사이트 사용자 정보는 이미 다른 인증 계정에 연결되어 있습니다. 관리자에게 계정 연결을 확인해 주세요.' using errcode='42501';
   end;
   select m.site_user_id into v_site_user_id from public.dori_bank_identity_map m where m.auth_user_id=v_auth;
 end if;
 select coalesce(nullif(trim(u.name),''),nullif(trim(u.login_id),''),nullif(trim(u.email),''),'돌이 은행 고객') into v_name from public.users u where u.user_id=v_site_user_id;
 if not found then raise exception '돌이사이트 사용자 정보를 찾을 수 없습니다. 계정 연결을 확인해 주세요.' using errcode='P0002'; end if;
 select * into v_account from public.dori_bank_accounts a where a.auth_user_id=v_auth;
 if not found then
   loop
     v_candidate:='DORI-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
     exit when not exists(select 1 from public.dori_bank_accounts a where a.account_number=v_candidate);
   end loop;
   insert into public.dori_bank_accounts(auth_user_id,site_user_id,account_number,account_name)
   values(v_auth,v_site_user_id,v_candidate,'돌이 생활 입출금 계좌') on conflict(auth_user_id) do nothing;
   select * into v_account from public.dori_bank_accounts a where a.auth_user_id=v_auth;
 end if;
 if v_account.site_user_id<>v_site_user_id then
   raise exception '은행 계좌와 사용자 연결 정보가 일치하지 않습니다. 관리자 확인이 필요합니다.' using errcode='42501';
 end if;
 return jsonb_build_object('account_number',v_account.account_number,'account_name',v_account.account_name,
   'status',v_account.status,'created_at',v_account.created_at,'name',v_name);
end;$function$;

CREATE OR REPLACE FUNCTION public.dori_bank_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_auth uuid:=auth.uid(); v_site_user_id text; v_account public.dori_bank_accounts%rowtype;
 v_balance bigint; v_name text; v_deposits jsonb; v_transactions jsonb; v_products jsonb;
begin
 if v_auth is null then raise exception '로그인 후 돌이 은행을 이용해 주세요.' using errcode='28000'; end if;
 perform public.dori_bank_ensure_account();
 select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
 select coalesce(nullif(trim(u.name),''),nullif(trim(u.login_id),''),nullif(trim(u.email),''),'돌이 은행 고객'),
        coalesce(u.doldolcoin,0)
 into v_name,v_balance from public.users u where u.user_id=v_site_user_id;
 if not found then raise exception '돌이사이트 사용자 정보를 불러오지 못했습니다. 계정 연결을 확인해 주세요.' using errcode='P0002'; end if;
 select * into v_account from public.dori_bank_accounts a where a.auth_user_id=v_auth;
 if v_account.status<>'active' then raise exception '계좌 이용이 제한되어 있습니다.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_transactions
 from (select t.id::text as id,t.transaction_ref::text as transaction_ref,t.transfer_ref::text as transfer_ref,
   t.tx_type,t.direction,t.amount::text as amount,t.balance_after::text as balance_after,
   t.counterparty_account,t.counterparty_name,t.description,t.created_at
   from public.dori_bank_transactions t where t.account_number=v_account.account_number
   order by t.created_at desc,t.id desc limit 50) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.opened_at desc),'[]'::jsonb) into v_deposits
 from (select d.id::text as id,d.product_id,d.product_name,d.term_days,d.annual_rate_pct::text as annual_rate_pct,
   d.principal::text as principal,d.interest_amount::text as interest_amount,d.opened_at,d.maturity_at,
   d.status,(d.status='active' and d.maturity_at<=clock_timestamp()) as is_mature
   from public.dori_bank_deposits d where d.auth_user_id=v_auth
   order by d.opened_at desc limit 30) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.term_days),'[]'::jsonb) into v_products
 from (select p.id,p.name,p.term_days,p.annual_rate_pct::text as annual_rate_pct,
   p.min_amount::text as min_amount,p.max_amount::text as max_amount,p.description
   from public.dori_bank_deposit_products p where p.is_active is true) x;
 update public.dori_bank_accounts set last_activity_at=clock_timestamp() where auth_user_id=v_auth;
 return jsonb_build_object(
   'account',jsonb_build_object('account_number',v_account.account_number,'account_name',v_account.account_name,
     'status',v_account.status,'created_at',v_account.created_at,'name',v_name),
   'balance',v_balance::text,
   'deposit_principal_total',(select coalesce(sum(d.principal),0)::text from public.dori_bank_deposits d
      where d.auth_user_id=v_auth and d.status='active'),
   'deposits',v_deposits,'transactions',v_transactions,'products',v_products);
end;$function$;

CREATE OR REPLACE FUNCTION public.dori_bank_loans_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_auth uuid:=auth.uid(); v_account public.dori_bank_accounts%rowtype; v_uid text; v_name text; v_level bigint; v_exp bigint; v_balance bigint; v_products jsonb; v_loans jsonb;
begin
 if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
 perform public.dori_bank_ensure_account();
 select * into v_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active';
 if not found then raise exception '계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
 select site_user_id into v_uid from public.dori_bank_identity_map where auth_user_id=v_auth;
 select coalesce(nullif(trim(u.name),''),nullif(trim(u.login_id),''),nullif(trim(u.email),''),'돌이 은행 고객'),
        coalesce(u.user_level,1),coalesce(u.exp,0),coalesce(u.doldolcoin,0)
 into v_name,v_level,v_exp,v_balance from public.users u where u.user_id=v_uid;
 if not found then raise exception '로그인 사용자 정보를 불러오지 못했습니다. 계정 연결을 확인해 주세요.' using errcode='P0002'; end if;
 update public.dori_bank_loans set status='overdue'
 where auth_user_id=v_auth and status='active' and due_at<clock_timestamp() and repaid_amount<total_due;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'term_days',p.term_days,
   'annual_rate_pct',p.annual_rate_pct::text,'min_amount',p.min_amount::text,'max_amount',p.max_amount::text,
   'description',p.description) order by p.term_days),'[]'::jsonb)
 into v_products from public.dori_bank_loan_products p where p.is_active is true;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id::text,'product_id',l.product_id,'product_name',l.product_name,
   'principal',l.principal::text,'annual_rate_pct',l.annual_rate_pct::text,'term_days',l.term_days,
   'interest_amount',l.interest_amount::text,'total_due',l.total_due::text,'repaid_amount',l.repaid_amount::text,
   'remaining_due',(l.total_due-l.repaid_amount)::text,'purpose',l.purpose,'status',l.status,'created_at',l.created_at,
   'due_at',l.due_at,'reviewed_at',l.reviewed_at,'decision_source',l.decision_source,
   'decision_score',l.decision_score,'decision_reason',l.decision_reason,'decision_details',l.decision_details,
   'bot_reviewed_at',l.bot_reviewed_at) order by l.created_at desc),'[]'::jsonb)
 into v_loans from public.dori_bank_loans l where l.auth_user_id=v_auth;
 return jsonb_build_object('user',jsonb_build_object('name',v_name,'user_level',v_level,'exp',v_exp),
   'account',jsonb_build_object('account_number',v_account.account_number,'account_name',v_account.account_name,
   'status',v_account.status,'created_at',v_account.created_at,'name',v_name),
   'balance',v_balance::text,'products',v_products,'loans',v_loans);
end;$function$;

CREATE OR REPLACE FUNCTION public.dori_bank_request_loan(p_product_id text, p_amount numeric, p_purpose text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_auth uuid:=auth.uid(); v_account public.dori_bank_accounts%rowtype; v_product public.dori_bank_loan_products%rowtype;
 v_loan public.dori_bank_loans%rowtype; v_site_user_id text; v_amount bigint; v_balance bigint; v_exp bigint; v_level bigint;
 v_restricted boolean:=false; v_joined_at timestamptz; v_paid_loans integer:=0; v_score integer:=0; v_factors jsonb:='[]'::jsonb;
 v_reason text; v_decision text; v_interest numeric; v_purpose text:=left(trim(coalesce(p_purpose,'')),160); v_new_balance bigint;
begin
 if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>trunc(p_amount) or p_amount>9223372036854775807::numeric then
   raise exception '대출 신청 금액은 1 이상의 정수여야 합니다.' using errcode='22023'; end if;
 v_amount:=p_amount::bigint;
 if length(v_purpose)<3 then raise exception '대출 목적을 3자 이상 입력해 주세요.' using errcode='22023'; end if;
 perform public.dori_bank_ensure_account();
 select * into v_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active' for update;
 if not found then raise exception '계좌를 사용할 수 없습니다.' using errcode='42501'; end if;
 select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
 perform 1 from public.users where user_id=v_site_user_id for update;
 select coalesce(doldolcoin,0),coalesce(user_level,1),coalesce(exp,0),coalesce(permanently_banned,false)
       or (suspended_until is not null and suspended_until>clock_timestamp())
 into v_balance,v_level,v_exp,v_restricted from public.users where user_id=v_site_user_id;
 if not found then raise exception '로그인 사용자 정보를 불러오지 못했습니다. 계정 연결을 확인해 주세요.' using errcode='P0002'; end if;
 select created_at into v_joined_at from public.dori_bank_accounts where auth_user_id=v_auth;
 if exists(select 1 from public.dori_bank_loans where auth_user_id=v_auth and status in ('pending','active','overdue')) then
   raise exception '이미 심사 중이거나 상환 중인 대출이 있습니다. 기존 대출을 먼저 정리해 주세요.' using errcode='22023'; end if;
 select * into v_product from public.dori_bank_loan_products where id=p_product_id and is_active is true;
 if not found then raise exception '현재 신청할 수 없는 대출 상품입니다.' using errcode='P0002'; end if;
 if v_amount<v_product.min_amount or v_amount>v_product.max_amount then
   raise exception '신청 금액이 상품의 한도를 벗어났습니다.' using errcode='22023'; end if;
 v_interest:=floor(v_amount::numeric*v_product.annual_rate_pct/100*v_product.term_days/365);
 if v_interest+v_amount>9223372036854775807::numeric then raise exception '상환 예정액이 시스템 한도를 초과합니다.' using errcode='22003'; end if;

 if v_balance>=v_amount then
   v_score:=v_score+25; v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','보유 코인 대비 신청액','points',25,'note','현재 잔액이 신청 원금 이상입니다.'));
 elsif v_balance::numeric*2>=v_amount then
   v_score:=v_score+18; v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','보유 코인 대비 신청액','points',18,'note','현재 잔액이 신청액의 절반 이상입니다.'));
 elsif v_balance::numeric*5>=v_amount then
   v_score:=v_score+10; v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','보유 코인 대비 신청액','points',10,'note','현재 잔액이 신청액의 20% 이상입니다.'));
 else
   v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','보유 코인 대비 신청액','points',0,'note','신청 원금에 비해 현재 잔액이 적습니다.'));
 end if;
 v_score:=v_score+least(15,greatest(0,v_level)*2);
 v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','사이트 활동 등급','points',least(15,greatest(0,v_level)*2),'note','계정 등급을 반영했습니다.'));
 if v_exp>=10000 then v_score:=v_score+10;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','누적 경험치','points',10,'note','누적 경험치 10,000 이상.'));
 elsif v_exp>=5000 then v_score:=v_score+7;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','누적 경험치','points',7,'note','누적 경험치 5,000 이상.'));
 elsif v_exp>=1000 then v_score:=v_score+4;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','누적 경험치','points',4,'note','누적 경험치 1,000 이상.'));
 else v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','누적 경험치','points',0,'note','누적 경험치가 아직 낮습니다.')); end if;
 select count(*)::integer into v_paid_loans from public.dori_bank_loans where auth_user_id=v_auth and status='paid';
 v_score:=v_score+least(15,v_paid_loans*5);
 v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','과거 상환 이력','points',least(15,v_paid_loans*5),'note',case when v_paid_loans>0 then '완료된 대출 상환 이력을 확인했습니다.' else '완료된 대출 상환 이력이 없습니다.' end));
 if v_joined_at<=clock_timestamp()-interval '90 days' then v_score:=v_score+15;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','계정 이용 기간','points',15,'note','이용 기간 90일 이상.'));
 elsif v_joined_at<=clock_timestamp()-interval '30 days' then v_score:=v_score+10;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','계정 이용 기간','points',10,'note','이용 기간 30일 이상.'));
 elsif v_joined_at<=clock_timestamp()-interval '7 days' then v_score:=v_score+5;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','계정 이용 기간','points',5,'note','이용 기간 7일 이상.'));
 else v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','계정 이용 기간','points',0,'note','신규 은행 계정이라 이용 기간 점수는 없습니다.')); end if;
 if length(v_purpose)>=30 then v_score:=v_score+10;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','신청 목적의 구체성','points',10,'note','대출 목적이 구체적입니다.'));
 elsif length(v_purpose)>=12 then v_score:=v_score+5;v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','신청 목적의 구체성','points',5,'note','신청 목적을 확인했습니다.'));
 else v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','신청 목적의 구체성','points',0,'note','대출 목적 설명이 짧습니다.')); end if;

 v_score:=least(100,v_score);
 if v_restricted then v_decision:='rejected';v_reason:='돌이사이트 계정이 이용 제한 상태라 자동 심사에서 거절되었습니다.';
 elsif v_score>=40 then v_decision:='approved';v_reason:='자동 심사 점수 '||v_score::text||'/100으로 승인 기준 40점을 충족했습니다.';
 else v_decision:='rejected';v_reason:='자동 심사 점수 '||v_score::text||'/100으로 승인 기준 40점에 미달했습니다.'; end if;
 v_factors:=v_factors||jsonb_build_array(jsonb_build_object('label','최종 판정','points',0,'note',v_reason));

 insert into public.dori_bank_loans(auth_user_id,account_number,product_id,product_name,principal,annual_rate_pct,term_days,
   interest_amount,total_due,purpose,status,reviewed_at,decision_source,decision_score,decision_reason,decision_details,bot_reviewed_at,due_at)
 values(v_auth,v_account.account_number,v_product.id,v_product.name,v_amount,v_product.annual_rate_pct,v_product.term_days,
   v_interest::bigint,(v_amount+v_interest)::bigint,v_purpose,case when v_decision='approved' then 'active' else 'rejected' end,
   clock_timestamp(),'dori_bot',v_score,v_reason,
   jsonb_build_object('score',v_score,'threshold',40,'factors',v_factors,'model','Dori Bank rule-based underwriting v1'),
   clock_timestamp(),case when v_decision='approved' then clock_timestamp()+make_interval(days=>v_product.term_days) else null end)
 returning * into v_loan;

 if v_decision='approved' then
   if v_balance::numeric+v_amount>9223372036854775807::numeric then raise exception '대출금 지급 후 지갑 잔액 한도를 초과합니다.' using errcode='22003'; end if;
   update public.users set doldolcoin=doldolcoin+v_amount where user_id=v_site_user_id returning doldolcoin into v_new_balance;
   insert into public.dori_bank_transactions(account_number,tx_type,direction,amount,balance_after,counterparty_name,description)
   values(v_account.account_number,'loan_disbursement','credit',v_amount,v_new_balance,'돌이 은행 대출',v_product.name||' 자동 심사 승인 · 대출금 지급');
   insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
   values(v_auth,'loan_bot_approved','loan',v_loan.id::text,jsonb_build_object('score',v_score,'reason',v_reason,'principal',v_amount::text,'total_due',(v_amount+v_interest)::text,'factors',v_factors));
 else
   insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
   values(v_auth,'loan_bot_rejected','loan',v_loan.id::text,jsonb_build_object('score',v_score,'reason',v_reason,'principal',v_amount::text,'factors',v_factors));
 end if;
 return jsonb_build_object('ok',true,'loan_id',v_loan.id::text,'decision',v_decision,'status',v_loan.status,
  'decision_score',v_score,'decision_reason',v_reason,'decision_details',v_loan.decision_details,
  'principal',v_amount::text,'interest_amount',v_interest::bigint::text,'total_due',(v_amount+v_interest)::bigint::text,
  'balance',case when v_decision='approved' then v_new_balance::text else v_balance::text end);
end;$function$;

CREATE OR REPLACE FUNCTION public.dori_bank_repay_loan(p_loan_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_auth uuid:=auth.uid(); v_loan public.dori_bank_loans%rowtype; v_account public.dori_bank_accounts%rowtype; v_site_user_id text; v_balance bigint; v_amount bigint; v_due bigint; v_new_balance bigint; v_new_repaid bigint; v_status text;
begin
 if v_auth is null then raise exception '로그인 후 이용해 주세요.' using errcode='28000'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>trunc(p_amount) or p_amount>9223372036854775807::numeric then raise exception '상환 금액은 1 이상의 정수여야 합니다.' using errcode='22023'; end if;
 v_amount:=p_amount::bigint;
 perform public.dori_bank_ensure_account();
 select * into v_loan from public.dori_bank_loans where id=p_loan_id and auth_user_id=v_auth for update;
 if not found then raise exception '대출 정보를 찾을 수 없습니다.' using errcode='P0002'; end if;
 if v_loan.status not in ('active','overdue') then raise exception '현재 상환할 수 있는 대출이 아닙니다.' using errcode='22023'; end if;
 v_due:=v_loan.total_due-v_loan.repaid_amount;
 if v_amount>v_due then raise exception '남은 상환 예정액보다 큰 금액은 입력할 수 없습니다.' using errcode='22023'; end if;
 select * into v_account from public.dori_bank_accounts where auth_user_id=v_auth and status='active';
 select site_user_id into v_site_user_id from public.dori_bank_identity_map where auth_user_id=v_auth;
 perform 1 from public.users where user_id=v_site_user_id for update;
 select coalesce(doldolcoin,0) into v_balance from public.users where user_id=v_site_user_id;
 if v_balance<v_amount then raise exception '지갑의 사용 가능 돌돌코인이 부족합니다.' using errcode='22023'; end if;
 update public.users set doldolcoin=doldolcoin-v_amount where user_id=v_site_user_id returning doldolcoin into v_new_balance;
 v_new_repaid:=v_loan.repaid_amount+v_amount;
 v_status:=case when v_new_repaid>=v_loan.total_due then 'paid' when v_loan.due_at<clock_timestamp() then 'overdue' else 'active' end;
 update public.dori_bank_loans set repaid_amount=v_new_repaid,status=v_status,settled_at=case when v_status='paid' then clock_timestamp() else settled_at end where id=v_loan.id;
 insert into public.dori_bank_transactions(account_number,tx_type,direction,amount,balance_after,counterparty_name,description)
 values(v_account.account_number,'loan_repayment','debit',v_amount,v_new_balance,'돌이 은행 대출',v_loan.product_name||' 상환');
 insert into public.dori_bank_audit_logs(actor_user_id,action,target_type,target_id,details)
 values(v_auth,'loan_repaid','loan',v_loan.id::text,jsonb_build_object('amount',v_amount::text,'remaining',(v_loan.total_due-v_new_repaid)::text,'status',v_status));
 return jsonb_build_object('ok',true,'repaid',v_amount::text,'remaining_due',(v_loan.total_due-v_new_repaid)::text,'balance',v_new_balance::text,'status',v_status);
end;$function$;

CREATE OR REPLACE FUNCTION public.dori_bank_admin_loan_applications()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_rows jsonb;
begin
 if not public.admin_is_authorized() then raise exception '은행 운영 권한이 없습니다.' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id::text,'account_number',l.account_number,'product_name',l.product_name,
   'principal',l.principal::text,'annual_rate_pct',l.annual_rate_pct::text,'term_days',l.term_days,
   'interest_amount',l.interest_amount::text,'total_due',l.total_due::text,'purpose',l.purpose,'status',l.status,
   'created_at',l.created_at,'due_at',l.due_at,'repaid_amount',l.repaid_amount::text,
   'remaining_due',(l.total_due-l.repaid_amount)::text,'account_owner',u.name,
   'decision_source',l.decision_source,'decision_score',l.decision_score,'decision_reason',l.decision_reason,
   'decision_details',l.decision_details,'bot_reviewed_at',l.bot_reviewed_at) order by l.created_at desc),'[]'::jsonb)
 into v_rows from public.dori_bank_loans l
 left join public.dori_bank_accounts a on a.account_number=l.account_number
 left join public.users u on u.user_id=a.site_user_id;
 return v_rows;
end;$function$;

revoke all on function public.dori_bank_loans_dashboard() from public,anon;
revoke all on function public.dori_bank_request_loan(text,numeric,text) from public,anon;
revoke all on function public.dori_bank_repay_loan(uuid,numeric) from public,anon;
revoke all on function public.dori_bank_admin_loan_applications() from public,anon,authenticated;
grant execute on function public.dori_bank_dashboard() to authenticated;
grant execute on function public.dori_bank_loans_dashboard() to authenticated;
grant execute on function public.dori_bank_request_loan(text,numeric,text) to authenticated;
grant execute on function public.dori_bank_repay_loan(uuid,numeric) to authenticated;
grant execute on function public.dori_bank_admin_loan_applications() to authenticated;
drop function if exists public.dori_bank_admin_review_loan(uuid,boolean);
