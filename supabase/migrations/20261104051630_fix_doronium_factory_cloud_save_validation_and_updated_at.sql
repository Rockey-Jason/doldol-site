-- Tighten the owner-scoped Doronium Factory cloud-save RPC.
-- Keep SECURITY INVOKER so table RLS remains the authorization boundary.
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
  v_state jsonb;
  v_schema_text text;
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

  if p_storage_value is null
     or pg_catalog.jsonb_typeof(p_storage_value) is distinct from 'object'
     or pg_catalog.pg_column_size(p_storage_value) > 5242880 then
    raise exception 'SAVE_PAYLOAD_INVALID_OR_TOO_LARGE' using errcode = '22023';
  end if;

  if p_storage_value ? 'game'
     and p_storage_value->>'game' is distinct from 'doronium-factory' then
    raise exception 'INVALID_SAVE_GAME' using errcode = '22023';
  end if;

  v_schema_text := p_storage_value->>'schemaVersion';
  if v_schema_text is not null
     and (v_schema_text !~ '^[1-4]$') then
    raise exception 'UNSUPPORTED_SAVE_SCHEMA' using errcode = '22023';
  end if;

  if p_storage_value ? 'checksum'
     and coalesce(p_storage_value->>'checksum', '') !~ '^[0-9a-fA-F]{8}$' then
    raise exception 'INVALID_SAVE_CHECKSUM_FORMAT' using errcode = '22023';
  end if;

  v_state := p_storage_value->'state';
  if pg_catalog.jsonb_typeof(v_state) is distinct from 'object'
     or (
       pg_catalog.jsonb_typeof(v_state->'player') is distinct from 'object'
       and pg_catalog.jsonb_typeof(v_state->'inventory') is distinct from 'object'
     ) then
    raise exception 'INVALID_SAVE_STATE_SHAPE' using errcode = '22023';
  end if;

  if v_state ? 'player'
     and pg_catalog.jsonb_typeof(v_state->'player') is distinct from 'object' then
    raise exception 'INVALID_SAVE_PLAYER_STATE' using errcode = '22023';
  end if;
  if v_state ? 'inventory'
     and pg_catalog.jsonb_typeof(v_state->'inventory') is distinct from 'object' then
    raise exception 'INVALID_SAVE_INVENTORY' using errcode = '22023';
  end if;
  if v_state ? 'buildings'
     and pg_catalog.jsonb_typeof(v_state->'buildings') is distinct from 'array' then
    raise exception 'INVALID_SAVE_BUILDINGS' using errcode = '22023';
  end if;
  if v_state ? 'runtime'
     and pg_catalog.jsonb_typeof(v_state->'runtime') is distinct from 'object' then
    raise exception 'INVALID_SAVE_RUNTIME' using errcode = '22023';
  end if;

  insert into public.dori_cloud_storage as current_save
    (user_id, storage_key, storage_value, is_deleted, updated_at, save_revision)
  values
    (v_user_id, p_storage_key, p_storage_value, false, pg_catalog.now(), 1)
  on conflict (user_id, storage_key)
  do update set
    storage_value = excluded.storage_value,
    is_deleted = false,
    updated_at = pg_catalog.now(),
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
