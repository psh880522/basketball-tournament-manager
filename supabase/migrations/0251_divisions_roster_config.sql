-- 0251_divisions_roster_config.sql
-- divisions 테이블에 로스터 인원 설정 컬럼 추가
-- 참가 신청 시 최소/최대 로스터 인원 강제 기반 마련

ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS min_roster_size integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_roster_size integer;

ALTER TABLE divisions
  ADD CONSTRAINT divisions_min_roster_size_check
    CHECK (min_roster_size >= 1),
  ADD CONSTRAINT divisions_max_roster_size_check
    CHECK (max_roster_size IS NULL OR max_roster_size >= min_roster_size);

COMMENT ON COLUMN divisions.min_roster_size IS '참가 신청 시 필수 최소 선수 수. 기본 3명.';
COMMENT ON COLUMN divisions.max_roster_size IS '로스터 최대 인원. NULL이면 제한 없음.';

-- 롤백:
-- ALTER TABLE divisions
--   DROP CONSTRAINT IF EXISTS divisions_min_roster_size_check,
--   DROP CONSTRAINT IF EXISTS divisions_max_roster_size_check,
--   DROP COLUMN IF EXISTS min_roster_size,
--   DROP COLUMN IF EXISTS max_roster_size;
