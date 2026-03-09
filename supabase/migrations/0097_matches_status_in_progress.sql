-- matches_status_check에 'in_progress' 추가
-- 기존: scheduled | completed 만 허용
-- 변경: scheduled | in_progress | completed 허용

ALTER TABLE matches
  DROP CONSTRAINT matches_status_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
    CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text]));
