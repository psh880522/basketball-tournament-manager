-- 0237_fix_submit_rpc_captain_role.sql
-- submit_tournament_application RPC에서 role_in_team 비교값 'manager' → 'captain' 수정
-- 0207_team_members_captain 마이그레이션으로 team_members.role_in_team이 'captain'으로 변경됐으나
-- 0233에서 생성된 RPC는 여전히 'manager'를 참조하고 있었음

CREATE OR REPLACE FUNCTION public.submit_tournament_application(
  p_tournament_id uuid,
  p_team_id       uuid,
  p_division_id   uuid,
  p_user_id       uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_tournament_status text;
  v_division          divisions%ROWTYPE;
  v_occupied          integer;
  v_position          integer;
  v_status            text;
  v_due_at            timestamptz;
  v_app_id            uuid;
BEGIN
  -- 1차 게이트: tournament.status 확인
  SELECT status INTO v_tournament_status
  FROM tournaments
  WHERE id = p_tournament_id;

  IF NOT FOUND OR v_tournament_status != 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', '현재 신청 가능한 대회가 아닙니다.');
  END IF;

  -- 팀 captain 확인 (role_in_team = 'captain')
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '이 팀의 캡틴만 신청할 수 있습니다.');
  END IF;

  -- division 조회 + 행 잠금 (동시 신청 방지)
  SELECT * INTO v_division
  FROM divisions
  WHERE id = p_division_id AND tournament_id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '유효하지 않은 division입니다.');
  END IF;

  -- 2차 게이트: division별 신청 기간 (NULL이면 스킵)
  IF v_division.application_open_at IS NOT NULL AND now() < v_division.application_open_at THEN
    RETURN jsonb_build_object('ok', false, 'error', '이 부문의 신청이 아직 시작되지 않았습니다.');
  END IF;

  IF v_division.application_close_at IS NOT NULL AND now() > v_division.application_close_at THEN
    RETURN jsonb_build_object('ok', false, 'error', '이 부문의 신청이 마감되었습니다.');
  END IF;

  -- 현재 점유 수 계산
  SELECT COUNT(*) INTO v_occupied
  FROM tournament_team_applications
  WHERE division_id = p_division_id
    AND status IN ('payment_pending', 'paid_pending_approval', 'confirmed');

  -- 자리 여부 판단
  IF v_division.capacity IS NULL OR v_occupied < v_division.capacity THEN
    v_status  := 'payment_pending';
    v_due_at  := now() + interval '24 hours';
    v_position := NULL;
  ELSE
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_position
    FROM tournament_team_applications
    WHERE division_id = p_division_id AND status = 'waitlisted';

    v_status := 'waitlisted';
    v_due_at := NULL;
  END IF;

  -- 신청 INSERT
  INSERT INTO tournament_team_applications (
    tournament_id,
    team_id,
    division_id,
    applied_by,
    status,
    base_entry_fee,
    discount_amount,
    final_amount,
    waitlist_position,
    payment_due_at,
    submitted_at
  ) VALUES (
    p_tournament_id,
    p_team_id,
    p_division_id,
    p_user_id,
    v_status,
    v_division.entry_fee,
    0,
    v_division.entry_fee,
    v_position,
    v_due_at,
    now()
  )
  RETURNING id INTO v_app_id;

  -- 이력 기록
  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
  VALUES (v_app_id, NULL, v_status, p_user_id);

  RETURN jsonb_build_object('ok', true, 'status', v_status, 'application_id', v_app_id);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 이 디비전에 신청이 존재합니다.');
END;
$$;
