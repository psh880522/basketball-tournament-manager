-- 0249_roster_read_rpcs.sql
-- 로스터 읽기 전용 RPC (SECURITY DEFINER)
-- profiles RLS가 self-only이므로, 팀 캡틴이 roster 멤버 프로필을 조회하려면
-- SECURITY DEFINER 함수가 필요함 (get_team_pending_applications 패턴 동일)
--
-- 1) get_roster_with_members    — 로스터 + 멤버 프로필 반환
-- 2) get_team_members_for_roster — 팀 전체 멤버 + 프로필 반환 (로스터 추가 UI용)

------------------------------------------------------------
-- 1) get_roster_with_members
--    호출자: team captain 또는 team member
--    반환: jsonb { ok, roster?, members? }
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_roster_with_members(p_roster_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id    uuid;
  v_team_id    uuid;
  v_result     jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- 팀 소속 확인 (team member 또는 organizer)
  SELECT r.team_id INTO v_team_id
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '로스터를 찾을 수 없습니다');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team_id AND user_id = v_user_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND role = 'organizer'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '접근 권한이 없습니다');
  END IF;

  -- 로스터 + 멤버 + 프로필 조회
  SELECT jsonb_build_object(
    'ok', true,
    'roster', jsonb_build_object(
      'id', r.id,
      'application_id', r.application_id,
      'team_id', r.team_id,
      'tournament_id', r.tournament_id,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    ),
    'members', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', rm.id,
            'roster_id', rm.roster_id,
            'user_id', rm.user_id,
            'created_at', rm.created_at,
            'display_name', p.display_name,
            'verified_name', p.verified_name,
            'player_position', pp.position
          )
          ORDER BY rm.created_at ASC
        )
        FROM public.roster_members rm
        LEFT JOIN public.profiles p ON p.id = rm.user_id
        LEFT JOIN public.player_profiles pp ON pp.id = rm.user_id
        WHERE rm.roster_id = r.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.rosters r
  WHERE r.id = p_roster_id;

  RETURN v_result;
END;
$$;


------------------------------------------------------------
-- 2) get_team_members_for_roster
--    목적: 팀 전체 멤버 목록 + 프로필 반환 (로스터 추가 UI에서 선수 선택용)
--    호출자: team captain
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_team_members_for_roster(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user_id uuid;
  v_result  jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- captain 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = v_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 캡틴만 멤버 목록을 조회할 수 있습니다');
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'members', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', tm.user_id,
            'role_in_team', tm.role_in_team,
            'display_name', p.display_name,
            'verified_name', p.verified_name,
            'player_position', pp.position,
            'career_level', pp.career_level
          )
          ORDER BY tm.created_at ASC
        )
        FROM public.team_members tm
        LEFT JOIN public.profiles p ON p.id = tm.user_id
        LEFT JOIN public.player_profiles pp ON pp.id = tm.user_id
        WHERE tm.team_id = p_team_id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result;

  RETURN v_result;
END;
$$;
