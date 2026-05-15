-- 0255_team_attendance.sql
-- 참가팀 출석 체크 테이블

CREATE TABLE IF NOT EXISTS public.team_attendance (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  attended      boolean NOT NULL DEFAULT false,
  checked_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at    timestamptz,
  PRIMARY KEY (tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_attendance_tournament
  ON public.team_attendance(tournament_id);

ALTER TABLE public.team_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_organizer" ON public.team_attendance
  FOR SELECT USING (public.is_organizer());

CREATE POLICY "attendance_insert_organizer" ON public.team_attendance
  FOR INSERT WITH CHECK (public.is_organizer());

CREATE POLICY "attendance_update_organizer" ON public.team_attendance
  FOR UPDATE USING (public.is_organizer()) WITH CHECK (public.is_organizer());

CREATE POLICY "attendance_delete_organizer" ON public.team_attendance
  FOR DELETE USING (public.is_organizer());
