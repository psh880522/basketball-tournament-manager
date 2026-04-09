-- 0235_applications_rls_update.sql
-- RLS 정책 재정비

------------------------------------------------------------
-- tournament_team_applications RLS 갱신
------------------------------------------------------------
DROP POLICY IF EXISTS "tournament_team_applications_select" ON public.tournament_team_applications;
CREATE POLICY "tournament_team_applications_select"
  ON public.tournament_team_applications FOR SELECT
  USING (public.is_organizer() OR public.is_team_member_for_team(team_id));

DROP POLICY IF EXISTS "tournament_team_applications_insert" ON public.tournament_team_applications;
CREATE POLICY "tournament_team_applications_insert"
  ON public.tournament_team_applications FOR INSERT
  WITH CHECK (
    public.is_organizer()
    OR (
      public.is_team_manager_for_team(team_id)
      AND applied_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tournament_team_applications_update" ON public.tournament_team_applications;
CREATE POLICY "tournament_team_applications_update"
  ON public.tournament_team_applications FOR UPDATE
  USING (public.is_organizer())
  WITH CHECK (public.is_organizer());

------------------------------------------------------------
-- application_status_history RLS
------------------------------------------------------------
CREATE POLICY "history_select_organizer"
  ON public.application_status_history FOR SELECT
  USING (public.is_organizer());

CREATE POLICY "history_select_team_member"
  ON public.application_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_team_applications a
      JOIN public.team_members tm ON tm.team_id = a.team_id
      WHERE a.id = application_status_history.application_id
        AND tm.user_id = auth.uid()
    )
  );
