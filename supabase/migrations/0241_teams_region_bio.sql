-- 0241_teams_region_bio.sql
-- teams 테이블에 활동 지역(region), 팀 소개(bio) 컬럼 추가
-- nullable: 기존 데이터 호환 유지

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS bio text;

-- 롤백:
-- ALTER TABLE public.teams DROP COLUMN IF EXISTS region;
-- ALTER TABLE public.teams DROP COLUMN IF EXISTS bio;
