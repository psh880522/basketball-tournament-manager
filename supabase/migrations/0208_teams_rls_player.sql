-- 0208_teams_rls_player.sql
-- teams 테이블 RLS 정책 정리
-- 구 team_manager role 기반 정책 제거
-- created_by 기반 SELECT 허용 추가

-- 1) team_manager role 기반 구 정책 제거 (0020에서 정의된 것)
DROP POLICY IF EXISTS "teams_select_team_manager" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_team_manager" ON public.teams;

-- 2) created_by 기반 SELECT 허용
--    팀 생성 직후 team_members 추가 전 본인 팀 조회 허용
DROP POLICY IF EXISTS "teams_select_created_by" ON public.teams;
CREATE POLICY "teams_select_created_by"
  ON public.teams FOR SELECT
  USING (created_by = auth.uid());

-- 3) 기존 teams_insert_members (0088: created_by = auth.uid()) 확인
--    인증된 모든 사용자가 팀 생성 가능하므로 별도 INSERT 정책 추가 불필요.
--    teams_insert_members 정책이 이미 created_by = auth.uid()로 존재.
