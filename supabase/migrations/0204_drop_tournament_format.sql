-- tournaments.format 컬럼 제거 (사용하지 않는 필드)
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS format;
