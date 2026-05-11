-- 0243_team_join_applications_rls.sql
-- team_join_applications 테이블 RLS 정책

-- SELECT: 본인 신청 OR 해당 팀 captain
DROP POLICY IF EXISTS "team_join_applications_select" ON public.team_join_applications;
CREATE POLICY "team_join_applications_select"
ON public.team_join_applications
FOR SELECT
USING (
  applicant_id = auth.uid()
  OR public.is_team_manager_for_team(team_id)
);

-- INSERT: 직접 신청 허용 (applicant_id = 본인, status = 'pending')
-- apply_for_team RPC가 주 경로이나 직접 INSERT도 허용
DROP POLICY IF EXISTS "team_join_applications_insert" ON public.team_join_applications;
CREATE POLICY "team_join_applications_insert"
ON public.team_join_applications
FOR INSERT
WITH CHECK (
  applicant_id = auth.uid()
  AND status = 'pending'
);

-- UPDATE: RPC(SECURITY DEFINER)를 통해서만 처리 → 직접 UPDATE 정책 없음

-- DELETE: 본인이 pending 신청만 철회 가능
DROP POLICY IF EXISTS "team_join_applications_delete" ON public.team_join_applications;
CREATE POLICY "team_join_applications_delete"
ON public.team_join_applications
FOR DELETE
USING (
  applicant_id = auth.uid()
  AND status = 'pending'
);
