-- 0214_profiles_personal_info.sql
-- profiles 테이블에 사용자 기본 정보 컬럼 추가
--
-- 목적: 회원가입 → 온보딩 → 본인인증 → 대회 참가 흐름을 지원하기 위한
--       사용자 기본 프로필 정보 저장 구조 준비 (VS-1)
--
-- 설계 결정:
--   - 모든 신규 컬럼은 DEFAULT NULL (nullable)
--     → on_auth_user_created 트리거가 INSERT INTO profiles (id)만 실행하므로
--       NOT NULL 제약을 추가하면 신규 가입 시 트리거가 실패함
--   - RLS 정책은 변경하지 않음 (아래 주석 참조)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS birth_date  date;

COMMENT ON COLUMN public.profiles.display_name IS '사용자 표시 이름 (사용자 수정 가능)';
COMMENT ON COLUMN public.profiles.phone        IS '연락처 (사용자 수정 가능)';
COMMENT ON COLUMN public.profiles.birth_date   IS '생년월일 (사용자 수정 가능)';

-- ── RLS 정책 검토 결과 ────────────────────────────────────────────────────
--
-- profiles_select_own_or_organizer (유지):
--   SELECT: id = auth.uid() OR is_organizer()
--   → 신규 컬럼(display_name, phone, birth_date)에도 동일하게 적용됨
--   → organizer가 참가자 연락처를 확인하는 것은 대회 운영 컨텍스트에서 적합
--
-- profiles_update_own (유지):
--   UPDATE: USING (id = auth.uid()) WITH CHECK (id = auth.uid())
--   → row-level 보호. 본인 행만 업데이트 가능
--   → column-level 보호는 없으므로 API 레이어(updateMyProfile)에서
--     허용 컬럼(display_name, phone, birth_date)만 명시적으로 전달하여 제한
--   → role, created_at 등 시스템 필드는 API 레이어에서 노출하지 않음
--   → 기술 부채: role 직접 UPDATE 취약점은 향후 DB 트리거로 보강 예정
--
-- is_identity_verified, identity_verified_at: VS-5에서 추가 예정
--   → SECURITY DEFINER 함수를 통해서만 업데이트 가능하도록 별도 설계
-- ─────────────────────────────────────────────────────────────────────────
