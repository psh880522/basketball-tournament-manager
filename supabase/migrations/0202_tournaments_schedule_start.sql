-- 대회 스케줄 기본 시작시간 (datetime)
-- 스케줄 자동 생성 시 기준 시간으로 사용됨
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS schedule_start_at TIMESTAMPTZ NULL;
