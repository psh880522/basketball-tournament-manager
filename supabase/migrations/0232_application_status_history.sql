-- 0232_application_status_history.sql
-- 신청 상태 이력 테이블 신규 생성

CREATE TABLE IF NOT EXISTS public.application_status_history (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid        NOT NULL REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text        NOT NULL,
  changed_by     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at     timestamptz NOT NULL DEFAULT now(),
  memo           text
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS status_history_application_idx
  ON public.application_status_history (application_id, changed_at);
