-- 0219_identity_verifications.sql
-- 본인인증 이력 테이블 신규 생성
-- profiles.identity_verified_at 컬럼 추가 (인증 상태 빠른 조회용)

-- 1) identity_verifications 테이블 생성
CREATE TABLE public.identity_verifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at    timestamptz NOT NULL DEFAULT now(),
  provider       text        NOT NULL DEFAULT 'mock',
  provider_tx_id text,
  raw_response   jsonb
);

-- 2) RLS 활성화
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- 본인만 자신의 인증 이력 조회 가능
CREATE POLICY "identity_verifications_select_own"
  ON public.identity_verifications
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT는 promote_to_player() SECURITY DEFINER RPC를 통해서만 처리
-- (직접 INSERT 정책 없음 → 클라이언트 직접 삽입 차단)

-- 3) profiles.identity_verified_at 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz DEFAULT NULL;
