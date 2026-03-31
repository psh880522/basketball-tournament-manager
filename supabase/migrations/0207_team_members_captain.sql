-- 0207_team_members_captain.sql
-- team_members.role_in_team 값 'manager' → 'captain' 변경
-- 전역 역할 'manager'(운영 스태프)와 팀 내 역할 'manager'(팀 대표) 혼동 방지

-- 1) CHECK 제약 제거
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_in_team_check;

-- 2) 기존 데이터 마이그레이션 ('manager' → 'captain')
UPDATE public.team_members
  SET role_in_team = 'captain'
  WHERE role_in_team = 'manager';

-- 3) 새 CHECK 제약 추가
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_in_team_check
  CHECK (role_in_team IN ('captain', 'player'));

-- 3) is_team_manager_for_team 함수 내 비교값 'manager' → 'captain' 업데이트
CREATE OR REPLACE FUNCTION public.is_team_manager_for_team(team_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_uuid
      AND tm.user_id = auth.uid()
      AND tm.role_in_team = 'captain'
  );
END;
$$;

-- 4) RPC: create_team_with_manager 함수도 'captain'으로 업데이트 (존재할 경우)
CREATE OR REPLACE FUNCTION public.create_team_with_captain(
  p_team_name text,
  p_contact text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.teams (team_name, contact, created_by)
  VALUES (p_team_name, p_contact, v_user_id)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, user_id, role_in_team)
  VALUES (v_team_id, v_user_id, 'captain');

  RETURN v_team_id;
END;
$$;

-- 기존 create_team_with_manager RPC도 내부 값 업데이트 (호환성 유지)
CREATE OR REPLACE FUNCTION public.create_team_with_manager(
  p_team_name text,
  p_contact text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- create_team_with_captain으로 위임 (호환성 래퍼)
  RETURN public.create_team_with_captain(p_team_name, p_contact);
END;
$$;
