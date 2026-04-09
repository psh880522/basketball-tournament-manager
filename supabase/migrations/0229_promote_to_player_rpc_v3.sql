-- 0229_promote_to_player_rpc_v3.sql
-- promote_to_player() RPC v3
-- 변경 사항: display_name 필수 체크 제거
-- 이유: display_name이 선택 항목으로 변경됨.
--       필수 항목(gender, position, height_cm, career_level, region) 검증은 Server Action에서 담당.
--       RPC는 role 적격성(user 여부, 멱등)만 체크하는 역할로 분리.
-- 주의: 시그니처 불일치 오버로드 방지를 위해 DROP 후 CREATE

DROP FUNCTION IF EXISTS public.promote_to_player(text, text, jsonb, text, text, date);

CREATE OR REPLACE FUNCTION public.promote_to_player(
  p_provider            text    DEFAULT 'mock',
  p_provider_tx_id      text    DEFAULT NULL,
  p_raw_response        jsonb   DEFAULT NULL,
  p_verified_name       text    DEFAULT NULL,
  p_verified_phone      text    DEFAULT NULL,
  p_verified_birth_date date    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 1) 인증 확인
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 2) 이미 player이면 멱등 처리 (오류 없이 종료)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'player'
  ) THEN
    RETURN;
  END IF;

  -- 3) user 상태가 아니면 거부
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Only user role can be promoted to player';
  END IF;

  -- 4) 인증 이력 저장
  INSERT INTO public.identity_verifications (user_id, provider, provider_tx_id, raw_response)
  VALUES (v_user_id, p_provider, p_provider_tx_id, p_raw_response);

  -- 5) profiles 업데이트: role 승격 + 인증 타임스탬프 + 확정값 저장
  UPDATE public.profiles
  SET role                  = 'player',
      identity_verified_at  = now(),
      verified_name         = p_verified_name,
      verified_phone        = p_verified_phone,
      verified_birth_date   = p_verified_birth_date
  WHERE id = v_user_id;

  -- 6) player_profiles 행 생성 (이미 존재하면 무시)
  INSERT INTO public.player_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
