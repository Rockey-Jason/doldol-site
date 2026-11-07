CREATE OR REPLACE FUNCTION public.purchase_vip_lounge_music(p_music_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_level integer;
  v_is_admin boolean;
  v_balance bigint;
  v_price bigint;
  v_music_name text;
  v_new_balance bigint;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.' USING errcode = '42501';
  END IF;

  SELECT coalesce(u.user_level, 1)::integer,
         coalesce(u.is_admin, false),
         coalesce(u.doldolcoin, 0)::bigint
    INTO v_level, v_is_admin, v_balance
    FROM public.users AS u
   WHERE u.user_id = v_uid::text
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '회원 정보를 찾을 수 없습니다.' USING errcode = 'P0002';
  END IF;

  IF NOT v_is_admin AND v_level < 2 THEN
    RAISE EXCEPTION 'VIP 회원 전용 음악 상점입니다.' USING errcode = '42501';
  END IF;

  CASE p_music_id
    WHEN 'lounge_music_velvet_jazz' THEN
      v_music_name := '벨벳 재즈 라운지'; v_price := 18000;
    WHEN 'lounge_music_rainy_library' THEN
      v_music_name := '비 내리는 로열 서재'; v_price := 14000;
    WHEN 'lounge_music_midnight_gold' THEN
      v_music_name := '미드나이트 골드'; v_price := 32000;
    WHEN 'lounge_music_crystal_atrium' THEN
      v_music_name := '크리스탈 아트리움'; v_price := 28000;
    WHEN 'lounge_music_garden_terrace' THEN
      v_music_name := '가든 테라스'; v_price := 22000;
    WHEN 'lounge_music_christmas_hotel' THEN
      v_music_name := '눈 내리는 크리스마스 호텔'; v_price := 36000;
    ELSE
      RAISE EXCEPTION '존재하지 않는 라운지 음악입니다.' USING errcode = '22023';
  END CASE;

  IF EXISTS (
    SELECT 1
      FROM public.user_inventory AS i
     WHERE i.user_id = v_uid
       AND i.item_id = p_music_id
  ) THEN
    RAISE EXCEPTION '이미 보유한 음악입니다.' USING errcode = '23505';
  END IF;

  IF v_balance < v_price THEN
    RAISE EXCEPTION '돌돌코인이 부족합니다.' USING errcode = '22023';
  END IF;

  v_new_balance := v_balance - v_price;

  UPDATE public.users
     SET doldolcoin = v_new_balance
   WHERE user_id = v_uid::text;

  INSERT INTO public.user_inventory(user_id, item_id, purchased_at)
  VALUES (v_uid, p_music_id, now());

  RETURN jsonb_build_object(
    'success', true,
    'item_id', p_music_id,
    'item_name', v_music_name,
    'price', v_price::text,
    'doldolcoin', v_new_balance::text
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purchase_vip_lounge_music(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_vip_lounge_music(text) TO authenticated;
