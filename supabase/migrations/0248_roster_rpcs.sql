-- 0248_roster_rpcs.sql
-- 로스터 관련 RPC 3개:
--   1) upsert_roster        — 로스터 생성 또는 기존 반환
--   2) add_roster_member    — 선수 추가 + 중복 출전 방지
--   3) remove_roster_member — 선수 제거

------------------------------------------------------------
-- 공통 상수 (주석용)
-- ACTIVE_STATUSES: ('payment_pending','paid_pending_approval','confirmed','waitlisted')
-- 편집 잠금 기준: tournaments.start_date <= CURRENT_DATE
------------------------------------------------------------


------------------------------------------------------------
-- 1) upsert_roster
--    목적: application_id에 대한 로스터가 없으면 생성, 있으면 기존 반환
--    호출자: team captain
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_roster(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      uuid;
  v_team_id      uuid;
  v_tournament_id uuid;
  v_app_status   text;
  v_roster_id    uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- application 조회
  SELECT a.team_id, a.tournament_id, a.status
  INTO v_team_id, v_tournament_id, v_app_status
  FROM public.tournament_team_applications a
  WHERE a.id = p_application_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '신청 정보를 찾을 수 없습니다');
  END IF;

  -- captain 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team_id
      AND user_id = v_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 캡틴만 로스터를 생성할 수 있습니다');
  END IF;

  -- ACTIVE_STATUSES 확인
  IF v_app_status NOT IN ('payment_pending', 'paid_pending_approval', 'confirmed', 'waitlisted') THEN
    RETURN jsonb_build_object('ok', false, 'error', '취소되거나 만료된 신청에는 로스터를 생성할 수 없습니다');
  END IF;

  -- 기존 로스터 확인
  SELECT id INTO v_roster_id
  FROM public.rosters
  WHERE application_id = p_application_id;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'roster_id', v_roster_id, 'created', false);
  END IF;

  -- 신규 생성
  INSERT INTO public.rosters (application_id, team_id, tournament_id)
  VALUES (p_application_id, v_team_id, v_tournament_id)
  RETURNING id INTO v_roster_id;

  RETURN jsonb_build_object('ok', true, 'roster_id', v_roster_id, 'created', true);
END;
$$;


------------------------------------------------------------
-- 2) add_roster_member
--    목적: 로스터에 선수 추가 + 중복 출전 방지 검사
--    호출자: team captain
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_roster_member(p_roster_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       uuid;
  v_team_id       uuid;
  v_tournament_id uuid;
  v_start_date    date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- roster 조회 + tournament start_date
  SELECT r.team_id, r.tournament_id, t.start_date
  INTO v_team_id, v_tournament_id, v_start_date
  FROM public.rosters r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.id = p_roster_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '로스터를 찾을 수 없습니다');
  END IF;

  -- captain 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team_id
      AND user_id = v_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 캡틴만 로스터를 수정할 수 있습니다');
  END IF;

  -- 대회 시작 여부 확인
  IF v_start_date <= CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'error', '대회가 이미 시작되어 로스터를 수정할 수 없습니다');
  END IF;

  -- 팀 소속 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team_id
      AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 소속 선수만 로스터에 추가할 수 있습니다');
  END IF;

  -- 중복 출전 방지: 같은 대회 다른 팀에 이미 포함된 경우
  IF EXISTS (
    SELECT 1
    FROM public.roster_members rm
    JOIN public.rosters r ON r.id = rm.roster_id
    WHERE r.tournament_id = v_tournament_id
      AND r.team_id <> v_team_id
      AND rm.user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 같은 대회 다른 팀 로스터에 포함된 선수입니다');
  END IF;

  -- 삽입 (같은 로스터 내 중복은 UNIQUE 제약으로 무시)
  INSERT INTO public.roster_members (roster_id, user_id)
  VALUES (p_roster_id, p_user_id)
  ON CONFLICT (roster_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;


------------------------------------------------------------
-- 3) remove_roster_member
--    목적: 로스터에서 선수 제거
--    호출자: team captain
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_roster_member(p_roster_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_team_id    uuid;
  v_start_date date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '인증이 필요합니다');
  END IF;

  -- roster 조회 + tournament start_date
  SELECT r.team_id, t.start_date
  INTO v_team_id, v_start_date
  FROM public.rosters r
  JOIN public.tournaments t ON t.id = r.tournament_id
  WHERE r.id = p_roster_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '로스터를 찾을 수 없습니다');
  END IF;

  -- captain 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_team_id
      AND user_id = v_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '팀 캡틴만 로스터를 수정할 수 있습니다');
  END IF;

  -- 대회 시작 여부 확인
  IF v_start_date <= CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', false, 'error', '대회가 이미 시작되어 로스터를 수정할 수 없습니다');
  END IF;

  -- 삭제
  DELETE FROM public.roster_members
  WHERE roster_id = p_roster_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
