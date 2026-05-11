-- 0247_rosters_rls.sql
-- rosters, roster_members 테이블 RLS 정책
-- 헬퍼 함수 재사용: is_organizer(), is_team_member_for_team(), is_team_manager_for_team()

------------------------------------------------------------
-- 1) RLS 활성화
------------------------------------------------------------
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_members ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- 2) rosters 정책
------------------------------------------------------------

-- SELECT: 팀 멤버 또는 organizer
DROP POLICY IF EXISTS "rosters_select" ON public.rosters;
CREATE POLICY "rosters_select"
  ON public.rosters FOR SELECT
  USING (
    public.is_team_member_for_team(team_id)
    OR public.is_organizer()
  );

-- INSERT: 팀 captain만 (RPC upsert_roster 경유 권장)
DROP POLICY IF EXISTS "rosters_insert" ON public.rosters;
CREATE POLICY "rosters_insert"
  ON public.rosters FOR INSERT
  WITH CHECK (
    public.is_team_manager_for_team(team_id)
  );

-- UPDATE: 팀 captain 또는 organizer
DROP POLICY IF EXISTS "rosters_update" ON public.rosters;
CREATE POLICY "rosters_update"
  ON public.rosters FOR UPDATE
  USING (
    public.is_team_manager_for_team(team_id)
    OR public.is_organizer()
  )
  WITH CHECK (
    public.is_team_manager_for_team(team_id)
    OR public.is_organizer()
  );

-- DELETE: 팀 captain 또는 organizer
DROP POLICY IF EXISTS "rosters_delete" ON public.rosters;
CREATE POLICY "rosters_delete"
  ON public.rosters FOR DELETE
  USING (
    public.is_team_manager_for_team(team_id)
    OR public.is_organizer()
  );

------------------------------------------------------------
-- 3) roster_members 정책
------------------------------------------------------------

-- SELECT: 해당 팀 멤버 또는 organizer
DROP POLICY IF EXISTS "roster_members_select" ON public.roster_members;
CREATE POLICY "roster_members_select"
  ON public.roster_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rosters r
      WHERE r.id = roster_id
        AND (
          public.is_team_member_for_team(r.team_id)
          OR public.is_organizer()
        )
    )
  );

-- INSERT: 팀 captain만 (RPC add_roster_member 경유 권장 — tournament start 체크는 RPC에서)
DROP POLICY IF EXISTS "roster_members_insert" ON public.roster_members;
CREATE POLICY "roster_members_insert"
  ON public.roster_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rosters r
      WHERE r.id = roster_id
        AND public.is_team_manager_for_team(r.team_id)
    )
  );

-- DELETE: 팀 captain만 (RPC remove_roster_member 경유 권장)
DROP POLICY IF EXISTS "roster_members_delete" ON public.roster_members;
CREATE POLICY "roster_members_delete"
  ON public.roster_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rosters r
      WHERE r.id = roster_id
        AND public.is_team_manager_for_team(r.team_id)
    )
  );

------------------------------------------------------------
-- 롤백 메모
-- DROP POLICY IF EXISTS "rosters_select" ON public.rosters;
-- DROP POLICY IF EXISTS "rosters_insert" ON public.rosters;
-- DROP POLICY IF EXISTS "rosters_update" ON public.rosters;
-- DROP POLICY IF EXISTS "rosters_delete" ON public.rosters;
-- DROP POLICY IF EXISTS "roster_members_select" ON public.roster_members;
-- DROP POLICY IF EXISTS "roster_members_insert" ON public.roster_members;
-- DROP POLICY IF EXISTS "roster_members_delete" ON public.roster_members;
-- ALTER TABLE public.rosters DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.roster_members DISABLE ROW LEVEL SECURITY;
------------------------------------------------------------
