CREATE OR REPLACE FUNCTION public.dori_set_profile_frame(p_frame jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_frame jsonb;
  v_item_name text;
  v_rarity text;
  v_source text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  v_code := nullif(btrim(p_frame->>'item_code'), '');

  IF p_frame IS NULL OR p_frame = 'null'::jsonb OR v_code IS NULL THEN
    v_frame := NULL;
  ELSE
    IF v_code !~ '^[A-Za-z0-9_-]{2,100}$' THEN
      RAISE EXCEPTION '올바르지 않은 프레임 코드입니다.';
    END IF;

    IF NOT (
      EXISTS (
        SELECT 1 FROM public.dori_box_inventory
        WHERE user_id = v_uid AND item_code = v_code AND quantity > 0
      )
      OR EXISTS (
        SELECT 1 FROM public.dori_pass_cosmetics
        WHERE user_id = v_uid AND cosmetic_key = v_code AND kind = 'profile_frame'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_items
        WHERE user_id = v_uid AND item_code = v_code AND quantity > 0
      )
      OR EXISTS (
        SELECT 1 FROM public.rockey_season_reward_claims
        WHERE auth_user_id = v_uid AND item_code = v_code
      )
      OR EXISTS (
        SELECT 1 FROM public.user_inventory
        WHERE user_id = v_uid AND item_id = v_code
      )
    ) THEN
      RAISE EXCEPTION '보유하지 않은 프레임은 장착할 수 없습니다.';
    END IF;

    v_item_name := left(coalesce(nullif(btrim(p_frame->>'item_name'), ''), v_code), 100);
    v_rarity := left(coalesce(nullif(btrim(p_frame->>'rarity'), ''), '일반'), 24);
    v_source := left(coalesce(nullif(btrim(p_frame->>'source'), ''), '기타'), 40);

    v_frame := jsonb_build_object(
      'item_code', v_code,
      'item_name', v_item_name,
      'rarity', v_rarity,
      'source', v_source,
      'season_key', nullif(left(coalesce(p_frame->>'season_key', ''), 12), ''),
      'tier', CASE
        WHEN coalesce(p_frame->>'tier', '') ~ '^[0-9]{1,3}$'
          THEN (p_frame->>'tier')::integer
        ELSE NULL
      END
    );
  END IF;

  INSERT INTO public.dori_site_customization(user_id, equipped_frame, updated_at)
  VALUES (v_uid, v_frame, now())
  ON CONFLICT (user_id) DO UPDATE
    SET equipped_frame = EXCLUDED.equipped_frame,
        updated_at = now();

  -- The site customization row is the single authoritative equipped-frame state.
  UPDATE public.dori_pass_cosmetics
  SET is_equipped = false
  WHERE user_id = v_uid AND kind = 'profile_frame' AND is_equipped;

  -- Remove only the obsolete pass-frame mirror; preserve saved title/icon data.
  UPDATE public.user_customization
  SET customization = CASE
    WHEN (coalesce(customization->'dori_pass_equipped', '{}'::jsonb) - 'profile_frame') = '{}'::jsonb
      THEN customization - 'dori_pass_equipped'
    ELSE jsonb_set(
      customization,
      '{dori_pass_equipped}',
      coalesce(customization->'dori_pass_equipped', '{}'::jsonb) - 'profile_frame',
      true
    )
  END,
  updated_at = now()
  WHERE user_id = v_uid
    AND customization ? 'dori_pass_equipped'
    AND customization->'dori_pass_equipped' ? 'profile_frame';

  RETURN jsonb_build_object('ok', true, 'equipped_frame', v_frame);
END
$function$;

REVOKE ALL ON FUNCTION public.dori_set_profile_frame(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dori_set_profile_frame(jsonb) TO authenticated;

-- Remove legacy duplicate equipment markers. The site frame value has already
-- been checked against all pass-equipped rows before this migration.
UPDATE public.dori_pass_cosmetics
SET is_equipped = false
WHERE kind = 'profile_frame' AND is_equipped;

UPDATE public.user_customization
SET customization = CASE
  WHEN (coalesce(customization->'dori_pass_equipped', '{}'::jsonb) - 'profile_frame') = '{}'::jsonb
    THEN customization - 'dori_pass_equipped'
  ELSE jsonb_set(
    customization,
    '{dori_pass_equipped}',
    coalesce(customization->'dori_pass_equipped', '{}'::jsonb) - 'profile_frame',
    true
  )
END,
updated_at = now()
WHERE customization ? 'dori_pass_equipped'
  AND customization->'dori_pass_equipped' ? 'profile_frame';
