-- 0246_rosters.sql
-- rosters: 팀의 대회별 로스터 (상태 없음 — 대회 시작일 기준 잠금)
-- roster_members: 로스터에 포함된 선수 목록

------------------------------------------------------------
-- 1) rosters 테이블
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rosters (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE,
  team_id        uuid        NOT NULL REFERENCES public.teams(id) ON DELETE RESTRICT,
  tournament_id  uuid        NOT NULL REFERENCES public.tournaments(id) ON DELETE RESTRICT,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rosters_application_id_unique UNIQUE (application_id)
);

------------------------------------------------------------
-- 2) roster_members 테이블
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id  uuid        NOT NULL REFERENCES public.rosters(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT roster_members_unique UNIQUE (roster_id, user_id)
);

------------------------------------------------------------
-- 3) 인덱스
------------------------------------------------------------
-- 중복 출전 검사용 (add_roster_member 성능)
CREATE INDEX IF NOT EXISTS idx_roster_members_user
  ON public.roster_members(user_id) INCLUDE (roster_id);

-- 로스터 조회용 (대회별 필터)
CREATE INDEX IF NOT EXISTS idx_rosters_tournament
  ON public.rosters(tournament_id);

------------------------------------------------------------
-- 롤백 메모
-- DROP TABLE IF EXISTS public.roster_members;
-- DROP TABLE IF EXISTS public.rosters;
------------------------------------------------------------
