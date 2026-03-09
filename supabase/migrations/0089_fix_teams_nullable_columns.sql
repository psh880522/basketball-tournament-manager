-- tournament_id: 독립 팀(대회 미배정)을 허용하기 위해 nullable로 변경
ALTER TABLE public.teams ALTER COLUMN tournament_id DROP NOT NULL;

-- captain_user_id: 새 모델에서는 created_by + team_members로 대체
ALTER TABLE public.teams ALTER COLUMN captain_user_id DROP NOT NULL;
