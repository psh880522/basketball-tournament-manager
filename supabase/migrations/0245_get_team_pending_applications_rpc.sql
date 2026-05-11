-- 0245_get_team_pending_applications_rpc.sql
-- 캡틴용 팀 합류 신청 목록 조회 RPC (SECURITY DEFINER)
-- profiles RLS가 자기 자신만 허용하므로, 캡틴이 신청자 프로필을 읽으려면 RPC 필요

CREATE OR REPLACE FUNCTION public.get_team_pending_applications(p_team_id uuid)
RETURNS TABLE (
  id            uuid,
  team_id       uuid,
  applicant_id  uuid,
  status        text,
  created_at    timestamptz,
  updated_at    timestamptz,
  display_name  text,
  verified_name text,
  player_position text,
  career_level    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();

  -- 호출자가 해당 팀의 캡틴인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.team_id = p_team_id
      AND team_members.user_id = v_uid
      AND team_members.role_in_team = 'captain'
  ) THEN
    RETURN; -- 빈 결과 반환
  END IF;

  RETURN QUERY
  SELECT
    tja.id,
    tja.team_id,
    tja.applicant_id,
    tja.status,
    tja.created_at,
    tja.updated_at,
    p.display_name,
    p.verified_name,
    pp.position,
    pp.career_level
  FROM public.team_join_applications tja
  LEFT JOIN public.profiles p       ON p.id  = tja.applicant_id
  LEFT JOIN public.player_profiles pp ON pp.id = tja.applicant_id
  WHERE tja.team_id = p_team_id
    AND tja.status  = 'pending'
  ORDER BY tja.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_pending_applications(uuid) TO authenticated;

-- 롤백:
-- DROP FUNCTION IF EXISTS public.get_team_pending_applications(uuid);
