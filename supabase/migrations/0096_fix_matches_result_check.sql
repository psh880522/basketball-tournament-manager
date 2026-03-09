-- 기존 제약: scheduled=전부 null / completed=전부 not null (2가지만 허용)
-- → completed일 때만 score/winner 필수, 나머지 status는 자유롭게 완화
ALTER TABLE matches
  DROP CONSTRAINT matches_result_completion_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_result_completion_check CHECK (
    (status = 'completed' AND score_a IS NOT NULL AND score_b IS NOT NULL AND winner_team_id IS NOT NULL)
    OR
    (status != 'completed')
  );
