-- 0226_promote_to_player_rpc_v2.sql
-- promote_to_player() RPC 보강 (v2)
-- 의존: 0225_profiles_verified_identity.sql (verified_* 컬럼), 0221_player_profiles.sql
-- 변경 사항:
--   1. 본인인증 확정값 파라미터 추가 (p_verified_name, p_verified_phone, p_verified_birth_date)
--   2. display_name 필수 체크 추가 (프로필 완료 사전 검증)
--   3. player_profiles 행 자동 생성 추가

CREATE OR REPLACE FUNCTION public.promote_to_player(
  p_provider            text    DEFAULT 'mock',
  p_provider_tx_id      text    DEFAULT NULL,
  p_raw_response        jsonb   DEFAULT NULL,
  -- 신규: 본인인증 확정값
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

  -- 4) [신규] display_name 필수 체크 (프로필 완료 사전 검증)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id
      AND display_name IS NOT NULL
      AND display_name <> ''
  ) THEN
    RAISE EXCEPTION 'Profile not completed: display_name is required';
  END IF;

  -- 5) 인증 이력 저장
  INSERT INTO public.identity_verifications (user_id, provider, provider_tx_id, raw_response)
  VALUES (v_user_id, p_provider, p_provider_tx_id, p_raw_response);

  -- 6) profiles 업데이트: role 승격 + 인증 타임스탬프 + 확정값 저장 [신규]
  UPDATE public.profiles
  SET role                  = 'player',
      identity_verified_at  = now(),
      verified_name         = p_verified_name,
      verified_phone        = p_verified_phone,
      verified_birth_date   = p_verified_birth_date
  WHERE id = v_user_id;

  -- 7) [신규] player_profiles 행 생성 (이미 존재하면 무시)
  INSERT INTO public.player_profiles (id)
  VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
