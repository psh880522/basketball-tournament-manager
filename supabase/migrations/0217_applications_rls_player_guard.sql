-- 0217_applications_rls_player_guard.sql
-- tournament_team_applications INSERT 정책 수정: is_player() 조건 추가
-- user role 사용자는 대회 참가 신청 불가
-- 기반 정책: 0112_applications_insert_organizer.sql (organizer OR captain)

DROP POLICY IF EXISTS "tournament_team_applications_insert" ON public.tournament_team_applications;

CREATE POLICY "tournament_team_applications_insert"
  ON public.tournament_team_applications
  FOR INSERT
  WITH CHECK (
    public.is_organizer()
    OR (
      public.is_team_manager_for_team(team_id)
      AND applied_by = auth.uid()
      AND public.is_player()
    )
  );
