-- Authenticated, owner-scoped compare-and-swap for Doronium Factory cloud saves.
-- The function is SECURITY INVOKER: table RLS remains the authorization boundary.
create or replace function public.save_doronium_factory_state(
  p_storage_key text,
  p_storage_value jsonb,
  p_expected_revision bigint
)
returns table(saved boolean, revision bigint, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid;
  v_revision bigint;
  v_updated_at timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '28000';
  end if;
  if p_storage_key is distinct from 'doronium_factory_infinite_industry_v1' then
    raise exception 'INVALID_STORAGE_KEY' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION' using errcode = '22023';
  end if;
  if p_storage_value is null or pg_catalog.pg_column_size(p_storage_value) > 5242880 then
    raise exception 'SAVE_PAYLOAD_INVALID_OR_TOO_LARGE' using errcode = '22023';
  end if;

  insert into public.dori_cloud_storage as current_save
    (user_id, storage_key, storage_value, is_deleted, updated_at, save_revision)
  values
    (v_user_id, p_storage_key, p_storage_value, false, pg_catalog.now(), 1)
  on conflict (user_id, storage_key)
  do update set
    storage_value = excluded.storage_value,
    is_deleted = false,
    save_revision = current_save.save_revision + 1
  where current_save.save_revision = p_expected_revision
  returning current_save.save_revision, current_save.updated_at
  into v_revision, v_updated_at;

  if v_revision is null then
    select s.save_revision, s.updated_at
      into v_revision, v_updated_at
      from public.dori_cloud_storage as s
     where s.user_id = v_user_id
       and s.storage_key = p_storage_key;
    return query select false, coalesce(v_revision, -1), v_updated_at;
    return;
  end if;

  return query select true, v_revision, v_updated_at;
end;
$function$;

revoke all on function public.save_doronium_factory_state(text, jsonb, bigint) from public;
revoke all on function public.save_doronium_factory_state(text, jsonb, bigint) from anon;
grant execute on function public.save_doronium_factory_state(text, jsonb, bigint) to authenticated;
