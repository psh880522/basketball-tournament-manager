-- 0244_fix_createteam_rpc_deprecate.sql
-- create_team_with_captain RPC에 region, bio 파라미터 추가
-- create_team_with_manager는 호환성 래퍼로 유지 (deprecated)

CREATE OR REPLACE FUNCTION public.create_team_with_captain(
  p_team_name text,
  p_contact   text    DEFAULT '',
  p_region    text    DEFAULT NULL,
  p_bio       text    DEFAULT NULL
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

  INSERT INTO public.teams (team_name, contact, region, bio, created_by)
  VALUES (p_team_name, p_contact, p_region, p_bio, v_user_id)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, user_id, role_in_team)
  VALUES (v_team_id, v_user_id, 'captain');

  RETURN v_team_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_team_with_captain(text, text, text, text) TO authenticated;

-- create_team_with_manager: deprecated, 호환성 래퍼 유지
-- 신규 코드에서는 create_team_with_captain 직접 호출 권장
CREATE OR REPLACE FUNCTION public.create_team_with_manager(
  p_team_name text,
  p_contact   text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_team_with_captain(p_team_name, p_contact);
END;
$$;
