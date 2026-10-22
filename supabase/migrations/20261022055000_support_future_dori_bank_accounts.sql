-- Link future authenticated Dori site members to their existing site-wallet identity.
-- Bank account provisioning only succeeds after a verified auth UID can be mapped to public.users.
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
$function$

revoke all on function public.dori_bank_ensure_account() from public,anon,authenticated;
grant execute on function public.dori_bank_ensure_account() to authenticated;
