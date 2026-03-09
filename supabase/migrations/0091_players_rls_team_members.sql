-- players RLS: team_members 기반으로 전환
-- SELECT: team member면 허용
DROP POLICY IF EXISTS "players_select_team_manager" ON public.players;
CREATE POLICY "players_select_team_member"
ON public.players
FOR SELECT
USING (public.is_team_member_for_team(team_id));

-- INSERT: team manager만 허용
DROP POLICY IF EXISTS "players_insert_team_manager" ON public.players;
CREATE POLICY "players_insert_team_mgr"
ON public.players
FOR INSERT
WITH CHECK (public.is_team_manager_for_team(team_id));

-- UPDATE: team manager만 허용
DROP POLICY IF EXISTS "players_update_team_manager" ON public.players;
CREATE POLICY "players_update_team_mgr"
ON public.players
FOR UPDATE
USING (public.is_team_manager_for_team(team_id))
WITH CHECK (public.is_team_manager_for_team(team_id));

-- DELETE: team manager만 허용
DROP POLICY IF EXISTS "players_delete_team_manager" ON public.players;
CREATE POLICY "players_delete_team_mgr"
ON public.players
FOR DELETE
USING (public.is_team_manager_for_team(team_id));
