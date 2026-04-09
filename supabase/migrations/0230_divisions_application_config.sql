-- 0230_divisions_application_config.sql
-- divisions 테이블에 신청 관련 컬럼 추가

ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS entry_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS application_open_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_close_at timestamptz;

ALTER TABLE divisions
  ADD CONSTRAINT divisions_capacity_check
  CHECK (capacity IS NULL OR capacity >= 0);

ALTER TABLE divisions
  ADD CONSTRAINT divisions_entry_fee_check
  CHECK (entry_fee >= 0);
