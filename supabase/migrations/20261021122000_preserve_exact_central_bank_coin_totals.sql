-- Preserve exact integer precision in the public aggregate API.
create or replace function public.dori_central_bank_public_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'registered_users', s.registered_users,
    'user_held_doldolcoin', s.user_held_doldolcoin::text,
    'active_stocks', s.active_stocks,
    'as_of', s.updated_at
  )
  from public.dori_central_bank_public_statistics s
  where s.id = 1;
$function$;
revoke all on function public.dori_central_bank_public_summary() from public, anon, authenticated;
grant execute on function public.dori_central_bank_public_summary() to anon, authenticated;
