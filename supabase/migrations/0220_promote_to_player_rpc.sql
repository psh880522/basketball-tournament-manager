-- 0220_promote_to_player_rpc.sql
-- promote_to_player() SECURITY DEFINER RPC
-- 역할: 인증 이력 저장 + profiles.role 승격을 단일 트랜잭션으로 처리
-- 호출 경로: app/(app)/onboarding/identity/actions.ts 서버 액션에서만 호출

CREATE OR REPLACE FUNCTION public.promote_to_player(
  p_provider       text    DEFAULT 'mock',
  p_provider_tx_id text    DEFAULT NULL,
  p_raw_response   jsonb   DEFAULT NULL
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

  -- 3) user 상태가 아니면 거부 (organizer, manager 등은 승격 대상 아님)
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Only user role can be promoted to player';
  END IF;

  -- 4) 인증 이력 저장
  INSERT INTO public.identity_verifications (user_id, provider, provider_tx_id, raw_response)
  VALUES (v_user_id, p_provider, p_provider_tx_id, p_raw_response);

  -- 5) profiles 업데이트: role 승격 + 인증 타임스탬프
  UPDATE public.profiles
  SET role                  = 'player',
      identity_verified_at  = now()
  WHERE id = v_user_id;
END;
$$;
