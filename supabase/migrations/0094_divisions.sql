-- 0094_divisions.sql
-- divisions 테이블 보강 + tournament_team_applications에 division_id 추가

------------------------------------------------------------
-- 1) divisions: sort_order 컬럼 추가
------------------------------------------------------------
ALTER TABLE divisions
ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

------------------------------------------------------------
-- 2) divisions: 인덱스 추가
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_divisions_tournament_id
  ON divisions (tournament_id);

CREATE INDEX IF NOT EXISTS idx_divisions_tournament_sort
  ON divisions (tournament_id, sort_order);

------------------------------------------------------------
-- 3) divisions: RLS 정책 정리 (public SELECT, organizer CRUD)
------------------------------------------------------------
DROP POLICY IF EXISTS divisions_select_organizer ON divisions;
DROP POLICY IF EXISTS divisions_select_public_closed ON divisions;
DROP POLICY IF EXISTS divisions_select_team_manager ON divisions;

CREATE POLICY divisions_select_public
  ON divisions FOR SELECT
  USING (true);

CREATE POLICY divisions_update_organizer
  ON divisions FOR UPDATE
  USING (is_organizer())
  WITH CHECK (is_organizer());

CREATE POLICY divisions_delete_organizer
  ON divisions FOR DELETE
  USING (is_organizer());

-- divisions_insert_organizer는 기존 마이그레이션에서 이미 생성됨

------------------------------------------------------------
-- 4) tournament_team_applications: division_id 추가
------------------------------------------------------------
ALTER TABLE tournament_team_applications
ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES divisions(id) ON DELETE RESTRICT;

-- 기존 행 백필: 같은 tournament의 첫 division으로 할당
UPDATE tournament_team_applications a
SET division_id = d.id
FROM divisions d
WHERE d.tournament_id = a.tournament_id
  AND a.division_id IS NULL;

-- NOT NULL 제약 적용
ALTER TABLE tournament_team_applications
ALTER COLUMN division_id SET NOT NULL;
