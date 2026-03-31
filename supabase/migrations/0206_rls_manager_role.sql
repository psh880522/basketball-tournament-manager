-- 0206_rls_manager_role.sql
-- is_manager() RLS 함수 추가 (organizer + manager 포함)
-- 구 is_team_manager() 함수 제거 (profiles.role='team_manager' 기반, 불필요)

-- 1) manager 체크 함수 신규 추가
--    is_manager()는 organizer + manager 포함
--    organizer는 manager의 모든 권한을 가지므로 함께 처리
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('organizer', 'manager')
  );
END;
$$;

-- 2) 구 is_team_manager() 함수 제거
--    대체: is_team_manager_for_team(team_uuid) 함수가 0088에 존재
--    단, 해당 함수 내부의 role_in_team = 'manager' 비교는 0207에서 'captain'으로 변경
DROP FUNCTION IF EXISTS public.is_team_manager() CASCADE;
