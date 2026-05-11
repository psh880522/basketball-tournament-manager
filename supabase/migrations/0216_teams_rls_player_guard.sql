-- 0216_teams_rls_player_guard.sql
-- teams INSERT 정책 수정: is_player() 조건 추가
-- user role 사용자는 팀 생성 불가

DROP POLICY IF EXISTS "teams_insert_members" ON public.teams;

CREATE POLICY "teams_insert_player_only"
  ON public.teams
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND public.is_player()
  );
