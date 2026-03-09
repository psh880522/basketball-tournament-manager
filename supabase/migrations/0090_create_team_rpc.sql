-- RPC: 팀 생성 + manager 멤버십을 원자적으로 처리
-- SECURITY DEFINER로 RLS를 우회하고 내부에서 auth 검증
CREATE OR REPLACE FUNCTION public.create_team_with_manager(
  p_team_name text,
  p_contact text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_team_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- 1) teams INSERT
  INSERT INTO public.teams (team_name, contact, created_by)
  VALUES (p_team_name, p_contact, v_uid)
  RETURNING id INTO v_team_id;

  -- 2) team_members INSERT (manager)
  INSERT INTO public.team_members (team_id, user_id, role_in_team)
  VALUES (v_team_id, v_uid, 'manager');

  RETURN v_team_id;
END;
$$;

-- authenticated 역할에 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.create_team_with_manager(text, text) TO authenticated;
