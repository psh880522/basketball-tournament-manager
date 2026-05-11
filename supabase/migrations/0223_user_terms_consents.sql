-- 0223_user_terms_consents.sql
-- 약관 동의 이력 테이블 생성 (버전형)
-- 역할: 서비스 이용약관, 개인정보처리방침, 마케팅 동의를 버전별 이력으로 관리
-- 설계: 동의/철회 모두 INSERT로 기록 (UPDATE 금지, 이력 보존)

CREATE TABLE public.user_terms_consents (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_type    text         NOT NULL,  -- 'service' | 'privacy' | 'marketing'
  terms_version text         NOT NULL,  -- 예: '2026-01', '1.0'
  agreed        boolean      NOT NULL,
  consented_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_terms_consents IS '약관 동의 이력. 동의/철회 모두 INSERT로 기록하며 UPDATE/DELETE는 금지.';
COMMENT ON COLUMN public.user_terms_consents.terms_type IS '약관 타입: service(서비스 이용약관) | privacy(개인정보처리방침) | marketing(마케팅 동의)';
COMMENT ON COLUMN public.user_terms_consents.terms_version IS '약관 버전 식별자 (예: 2026-01, 1.0)';
COMMENT ON COLUMN public.user_terms_consents.agreed IS 'true=동의, false=철회';

-- 특정 사용자의 타입별 최신 동의 상태 조회를 위한 인덱스
CREATE INDEX idx_user_terms_consents_user_type_time
  ON public.user_terms_consents (user_id, terms_type, consented_at DESC);

ALTER TABLE public.user_terms_consents ENABLE ROW LEVEL SECURITY;
