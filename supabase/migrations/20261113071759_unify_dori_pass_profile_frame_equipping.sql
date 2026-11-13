CREATE OR REPLACE FUNCTION public.dori_pass_equip_cosmetic(p_cosmetic_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_item public.dori_pass_cosmetics%rowtype;
  v_info jsonb;
begin
  if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
  select * into v_item
  from public.dori_pass_cosmetics
  where user_id=v_uid and cosmetic_key=p_cosmetic_key;

  if not found then
    return jsonb_build_object('ok',false,'reason','not_owned');
  end if;

  -- Profile frames have one authoritative equipment state:
  -- public.dori_site_customization.equipped_frame, managed from Settings.
  if v_item.kind='profile_frame' then
    return jsonb_build_object(
      'ok',false,
      'reason','use_profile_frame_archive',
      'message','프로필 프레임은 설정의 통합 프레임 보관함에서 장착하세요.'
    );
  end if;

  update public.dori_pass_cosmetics
  set is_equipped=false
  where user_id=v_uid and kind=v_item.kind and is_equipped;

  update public.dori_pass_cosmetics
  set is_equipped=true
  where user_id=v_uid and cosmetic_key=p_cosmetic_key;

  v_info:=jsonb_build_object(
    'key',v_item.cosmetic_key,
    'name',v_item.display_name,
    'kind',v_item.kind,
    'icon',v_item.icon,
    'rarity',v_item.rarity,
    'season_key',v_item.season_key,
    'tier',v_item.tier
  );

  if v_item.kind='title' then
    update public.users
    set equipped_title=v_item.display_name
    where user_id=v_uid::text;
    if not found then
      raise exception '사용자 계정 정보를 찾을 수 없습니다.';
    end if;
  end if;

  insert into public.user_customization(user_id,customization,updated_at)
  values(
    v_uid,
    jsonb_build_object('dori_pass_equipped',jsonb_build_object(v_item.kind,v_info)),
    now()
  )
  on conflict(user_id) do update
  set customization=coalesce(public.user_customization.customization,'{}'::jsonb)
      ||jsonb_build_object(
        'dori_pass_equipped',
        coalesce(public.user_customization.customization->'dori_pass_equipped','{}'::jsonb)
          ||jsonb_build_object(v_item.kind,v_info)
      ),
      updated_at=now();

  return jsonb_build_object('ok',true,'equipped',v_info);
end
$function$;
