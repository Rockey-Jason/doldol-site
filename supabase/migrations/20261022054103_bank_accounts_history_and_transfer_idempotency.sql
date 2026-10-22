-- Keep transfer retries safe and allow old transaction pages to be browsed.
create table if not exists public.dori_bank_transfer_requests (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  transfer_ref uuid not null unique,
  amount bigint not null check (amount > 0),
  recipient_account text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(auth_user_id,request_id)
);
alter table public.dori_bank_transfer_requests enable row level security;
revoke all on table public.dori_bank_transfer_requests from public,anon,authenticated;
drop function if exists public.dori_bank_transfer(text,numeric,text);
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
$function$

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
$function$

revoke all on function public.dori_bank_transfer(text,numeric,text,uuid) from public,anon,authenticated;
grant execute on function public.dori_bank_transfer(text,numeric,text,uuid) to authenticated;
revoke all on function public.dori_bank_transactions_page(integer,integer) from public,anon,authenticated;
grant execute on function public.dori_bank_transactions_page(integer,integer) to authenticated;
