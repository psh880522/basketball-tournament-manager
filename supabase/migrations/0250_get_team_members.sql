-- 0250_get_team_members.sql
-- 팀 멤버 목록 조회 RPC (팀원 누구나 조회 가능)
-- profiles RLS가 self-only이므로 SECURITY DEFINER 필요
-- 기존 get_team_members_for_roster 는 captain 전용이므로
-- 팀 상세 페이지용 별도 RPC 추가

CREATE OR REPLACE FUNCTION public.get_team_members(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- 호출자가 해당 팀의 멤버인지 확인 (captain 또는 player)
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 멤버만 조회할 수 있습니다');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'members', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id',        tm.user_id,
            'role_in_team',   tm.role_in_team,
            'display_name',   p.display_name,
            'verified_name',  p.verified_name,
            'player_position', pp.position,
            'career_level',   pp.career_level,
            'joined_at',      tm.created_at
          )
          ORDER BY
            CASE WHEN tm.role_in_team = 'captain' THEN 0 ELSE 1 END,
            tm.created_at ASC
        )
        FROM public.team_members tm
        LEFT JOIN public.profiles p ON p.id = tm.user_id
        LEFT JOIN public.player_profiles pp ON pp.id = tm.user_id
        WHERE tm.team_id = p_team_id
      ),
      '[]'::jsonb
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members(uuid) TO authenticated;
