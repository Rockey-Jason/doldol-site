-- Dori Bank web-push notifications.
-- Provision dori_bank_vapid_private_key and dori_bank_push_trigger_token
-- in Supabase Vault before enabling this trigger. Never store either secret in Git.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.dori_bank_push_subscriptions (
  endpoint text primary key
    check (
      length(endpoint) between 16 and 2048
      and endpoint ~* '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|webpush\.googleapis\.com|notify\.windows\.com|push\.services\.mozilla\.com|web\.push\.apple\.com)(/|$)'
    ),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null check (length(p256dh) between 20 and 200 and p256dh ~ '^[A-Za-z0-9_-]+$'),
  auth_key text not null check (length(auth_key) between 8 and 200 and auth_key ~ '^[A-Za-z0-9_-]+$'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index if not exists dori_bank_push_subscriptions_user_idx
  on public.dori_bank_push_subscriptions(auth_user_id);
alter table public.dori_bank_push_subscriptions enable row level security;
revoke all on table public.dori_bank_push_subscriptions from public, anon, authenticated;
grant select, delete on table public.dori_bank_push_subscriptions to service_role;

create or replace function public.dori_bank_save_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_auth uuid := auth.uid();
begin
  if v_auth is null then
    raise exception '로그인 후 푸시 알림을 설정해 주세요.' using errcode = '28000';
  end if;
  if p_endpoint is null or length(p_endpoint) < 16 or length(p_endpoint) > 2048
     or p_endpoint !~* '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|webpush\.googleapis\.com|notify\.windows\.com|push\.services\.mozilla\.com|web\.push\.apple\.com)(/|$)'
     or p_p256dh is null or length(p_p256dh) not between 20 and 200 or p_p256dh !~ '^[A-Za-z0-9_-]+$'
     or p_auth is null or length(p_auth) not between 8 and 200 or p_auth !~ '^[A-Za-z0-9_-]+$' then
    raise exception '브라우저 푸시 구독 정보가 올바르지 않습니다.' using errcode = '22023';
  end if;
  insert into public.dori_bank_push_subscriptions(endpoint, auth_user_id, p256dh, auth_key)
  values (p_endpoint, v_auth, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set auth_user_id = excluded.auth_user_id,
        p256dh = excluded.p256dh,
        auth_key = excluded.auth_key,
        updated_at = clock_timestamp();
  return jsonb_build_object('ok', true);
end;
$function$;

create or replace function public.dori_bank_delete_push_subscription(p_endpoint text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_auth uuid := auth.uid();
  v_deleted integer := 0;
begin
  if v_auth is null then
    raise exception '로그인 후 이용해 주세요.' using errcode = '28000';
  end if;
  if p_endpoint is null or length(p_endpoint) > 2048 then
    raise exception '푸시 구독 정보가 올바르지 않습니다.' using errcode = '22023';
  end if;
  delete from public.dori_bank_push_subscriptions
  where auth_user_id = v_auth and endpoint = p_endpoint;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('ok', true, 'removed', v_deleted > 0);
end;
$function$;

-- Only the trusted Edge Function's service_role can read delivery secrets.
create or replace function public.dori_bank_get_push_config()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_private text;
  v_token text;
begin
  if v_role is null and v_claims is not null then
    v_role := (v_claims::jsonb ->> 'role');
  end if;
  if coalesce(v_role, '') <> 'service_role' then
    raise exception 'Not authorized.' using errcode = '42501';
  end if;
  select decrypted_secret into v_private
    from vault.decrypted_secrets where name = 'dori_bank_vapid_private_key' limit 1;
  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'dori_bank_push_trigger_token' limit 1;
  if coalesce(v_private, '') = '' or coalesce(v_token, '') = '' then
    raise exception 'Dori Bank push secrets are not configured.' using errcode = '55000';
  end if;
  return jsonb_build_object('vapid_private_key', v_private, 'trigger_token', v_token);
end;
$function$;

revoke all on function public.dori_bank_save_push_subscription(text, text, text) from public, anon, authenticated;
grant execute on function public.dori_bank_save_push_subscription(text, text, text) to authenticated;
revoke all on function public.dori_bank_delete_push_subscription(text) from public, anon, authenticated;
grant execute on function public.dori_bank_delete_push_subscription(text) to authenticated;
revoke all on function public.dori_bank_get_push_config() from public, anon, authenticated;
grant execute on function public.dori_bank_get_push_config() to service_role;

-- The trigger sends only a committed transfer reference. The Edge Function reloads
-- the receiver-side transaction from the DB and derives its sender and amount there.
create or replace function public.dori_bank_enqueue_transfer_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_trigger_token text;
begin
  if new.tx_type <> 'transfer_in' or new.direction <> 'credit' or new.transfer_ref is null then
    return new;
  end if;
  select decrypted_secret into v_trigger_token
    from vault.decrypted_secrets where name = 'dori_bank_push_trigger_token' limit 1;
  if coalesce(v_trigger_token, '') = '' then
    raise warning 'Dori Bank push token is missing; transfer was recorded without push.';
    return new;
  end if;
  perform net.http_post(
    url := 'https://scttowfhygcpdirrekqm.supabase.co/functions/v1/dori-bank-push',
    body := jsonb_build_object('transfer_ref', new.transfer_ref::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdHRvd2ZoeWdjcGRpcnJla3FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg0MjYsImV4cCI6MjA5NTc3NDQyNn0.XwdQhJ4Ku_C61yXz0k65AztMF9Rfe7Qzn3Av7iWRBqY',
      'x-dori-bank-push-token', v_trigger_token
    ),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  raise warning 'Dori Bank push enqueue failed: %', sqlerrm;
  return new;
end;
$function$;
revoke all on function public.dori_bank_enqueue_transfer_push() from public, anon, authenticated;

drop trigger if exists dori_bank_transfer_push_trigger on public.dori_bank_transactions;
create trigger dori_bank_transfer_push_trigger
after insert on public.dori_bank_transactions
for each row
when (new.tx_type = 'transfer_in' and new.direction = 'credit')
execute function public.dori_bank_enqueue_transfer_push();

comment on table public.dori_bank_push_subscriptions is
  'Private web-push subscriptions for notifying Dori Bank recipients; clients access through authenticated RPCs only.';
