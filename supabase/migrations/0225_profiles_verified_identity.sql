-- 0225_profiles_verified_identity.sql
-- profiles 테이블에 본인인증 확정값 컬럼 추가
-- 역할: 실명/생년월일/휴대폰번호를 본인인증 단계 확정값으로 저장
-- 주의: 기존 phone, birth_date 컬럼은 즉시 DROP 금지 (기존 코드 영향 최소화)
--       verified_* 컬럼을 신규 추가하고, 기존 컬럼은 deprecated 처리

ALTER TABLE public.profiles
  ADD COLUMN verified_name       text DEFAULT NULL,  -- 실명 (본인인증 확정)
  ADD COLUMN verified_phone      text DEFAULT NULL,  -- 휴대폰 (본인인증 확정)
  ADD COLUMN verified_birth_date date DEFAULT NULL;  -- 생년월일 (본인인증 확정)

COMMENT ON COLUMN public.profiles.verified_name IS '본인인증으로 확정된 실명. promote_to_player() RPC를 통해서만 기록됨.';
COMMENT ON COLUMN public.profiles.verified_phone IS '본인인증으로 확정된 휴대폰번호. promote_to_player() RPC를 통해서만 기록됨.';
COMMENT ON COLUMN public.profiles.verified_birth_date IS '본인인증으로 확정된 생년월일. promote_to_player() RPC를 통해서만 기록됨.';

-- 기존 컬럼 deprecated 표시 (즉시 DROP은 하지 않음)
COMMENT ON COLUMN public.profiles.phone IS 'DEPRECATED: 본인인증 확정값은 verified_phone 사용. 향후 제거 예정.';
COMMENT ON COLUMN public.profiles.birth_date IS 'DEPRECATED: 본인인증 확정값은 verified_birth_date 사용. 향후 제거 예정.';
