-- Correct the public project key used by pg_net to reach a JWT-disabled, token-guarded Edge Function.
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
  from vault.decrypted_secrets
  where name = 'dori_bank_push_trigger_token'
  limit 1;

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
