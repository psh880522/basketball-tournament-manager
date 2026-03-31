-- 0213_manager_select_rls.sql
-- manager 역할에 SELECT 권한 추가
-- is_manager()는 organizer + manager 모두 포함 (0206에서 정의)
-- 쓰기 권한(INSERT/UPDATE/DELETE)은 기존 is_organizer() 유지
-- 읽기 권한(SELECT)만 is_manager()로 확장

-- tournaments: manager도 모든 대회 조회 가능 (draft 포함)
DROP POLICY IF EXISTS "tournaments_select_organizer" ON public.tournaments;
CREATE POLICY "tournaments_select_organizer"
  ON public.tournaments
  FOR SELECT
  USING (public.is_manager());

-- teams: manager도 모든 팀 조회 가능
DROP POLICY IF EXISTS "teams_select_organizer" ON public.teams;
CREATE POLICY "teams_select_organizer"
  ON public.teams
  FOR SELECT
  USING (public.is_manager());

-- tournament_team_applications: manager도 모든 신청 조회 가능
DROP POLICY IF EXISTS "tournament_team_applications_select" ON public.tournament_team_applications;
CREATE POLICY "tournament_team_applications_select"
  ON public.tournament_team_applications
  FOR SELECT
  USING (public.is_manager() OR public.is_team_member_for_team(team_id));

-- divisions: manager도 조회 가능
DROP POLICY IF EXISTS "divisions_select_organizer" ON public.divisions;
CREATE POLICY "divisions_select_organizer"
  ON public.divisions
  FOR SELECT
  USING (public.is_manager());

-- groups: manager도 조회 가능
DROP POLICY IF EXISTS "groups_select_organizer" ON public.groups;
CREATE POLICY "groups_select_organizer"
  ON public.groups
  FOR SELECT
  USING (public.is_manager());

-- group_teams: manager도 조회 가능
DROP POLICY IF EXISTS "group_teams_select_organizer" ON public.group_teams;
CREATE POLICY "group_teams_select_organizer"
  ON public.group_teams
  FOR SELECT
  USING (public.is_manager());

-- courts: manager도 조회 가능 (코트 생성/삭제는 organizer 전용 유지)
DROP POLICY IF EXISTS "courts_select_organizer" ON public.courts;
CREATE POLICY "courts_select_organizer"
  ON public.courts
  FOR SELECT
  USING (public.is_manager());

-- matches: manager도 조회 가능 (경기 결과 입력을 위해 필요)
DROP POLICY IF EXISTS "matches_select_organizer" ON public.matches;
CREATE POLICY "matches_select_organizer"
  ON public.matches
  FOR SELECT
  USING (public.is_manager());

-- standings: manager도 조회 가능 (순위 재계산을 위해 필요)
DROP POLICY IF EXISTS "standings_select_organizer" ON public.standings;
CREATE POLICY "standings_select_organizer"
  ON public.standings
  FOR SELECT
  USING (public.is_manager());
