-- 0231_applications_status_expansion.sql
-- tournament_team_applications 테이블 전면 확장

------------------------------------------------------------
-- 1) 기존 status CHECK 제약 제거
------------------------------------------------------------
ALTER TABLE tournament_team_applications
  DROP CONSTRAINT IF EXISTS tournament_team_applications_status_check;

------------------------------------------------------------
-- 2) 기존 데이터 상태 변환
--    pending  → payment_pending
--    approved → confirmed
--    rejected → cancelled
------------------------------------------------------------
UPDATE tournament_team_applications
SET status = CASE
  WHEN status = 'pending'  THEN 'payment_pending'
  WHEN status = 'approved' THEN 'confirmed'
  WHEN status = 'rejected' THEN 'cancelled'
  ELSE status
END;

------------------------------------------------------------
-- 3) 새 status CHECK 제약 추가
------------------------------------------------------------
ALTER TABLE tournament_team_applications
  ADD CONSTRAINT tournament_team_applications_status_check
  CHECK (status IN (
    'payment_pending',
    'paid_pending_approval',
    'confirmed',
    'waitlisted',
    'expired',
    'cancelled'
  ));

------------------------------------------------------------
-- 4) 신규 컬럼 추가
------------------------------------------------------------
ALTER TABLE tournament_team_applications
  ADD COLUMN IF NOT EXISTS base_entry_fee   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount  integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_amount     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waitlist_position integer,
  ADD COLUMN IF NOT EXISTS payment_due_at   timestamptz,
  ADD COLUMN IF NOT EXISTS depositor_name   text,
  ADD COLUMN IF NOT EXISTS depositor_note   text,
  ADD COLUMN IF NOT EXISTS paid_marked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS admin_memo       text,
  ADD COLUMN IF NOT EXISTS submitted_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at     timestamptz,
  ADD COLUMN IF NOT EXISTS expired_at       timestamptz;

------------------------------------------------------------
-- 5) UNIQUE 제약 변경
--    기존: UNIQUE(tournament_id, team_id)
--    변경: 활성 상태에서만 division 단위 중복 방지 (partial unique index)
------------------------------------------------------------
ALTER TABLE tournament_team_applications
  DROP CONSTRAINT IF EXISTS tournament_team_applications_tournament_id_team_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS applications_active_unique
  ON tournament_team_applications (team_id, division_id)
  WHERE status IN ('payment_pending', 'paid_pending_approval', 'confirmed', 'waitlisted');

------------------------------------------------------------
-- 6) 추가 인덱스
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS applications_division_status_idx
  ON tournament_team_applications (division_id, status);

CREATE INDEX IF NOT EXISTS applications_payment_due_idx
  ON tournament_team_applications (payment_due_at)
  WHERE status = 'payment_pending';

CREATE INDEX IF NOT EXISTS applications_waitlist_idx
  ON tournament_team_applications (division_id, waitlist_position)
  WHERE status = 'waitlisted';
