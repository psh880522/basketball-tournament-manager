-- 0238_fix_cancel_rpc_captain_role.sql
-- cancel_application RPC에서 role_in_team 비교값 'manager' → 'captain' 수정

CREATE OR REPLACE FUNCTION public.cancel_application(
  p_application_id uuid,
  p_user_id        uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_app       tournament_team_applications%ROWTYPE;
  v_prev_status text;
BEGIN
  SELECT * INTO v_app
  FROM tournament_team_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없습니다.');
  END IF;

  -- 팀 캡틴 확인
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_app.team_id
      AND user_id = p_user_id
      AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '취소 권한이 없습니다.');
  END IF;

  IF v_app.status NOT IN ('payment_pending', 'paid_pending_approval', 'confirmed', 'waitlisted') THEN
    RETURN jsonb_build_object('ok', false, 'error', '취소할 수 없는 상태입니다.');
  END IF;

  v_prev_status := v_app.status;

  UPDATE tournament_team_applications
  SET
    status       = 'cancelled',
    cancelled_at = now()
  WHERE id = p_application_id;

  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
  VALUES (p_application_id, v_prev_status, 'cancelled', p_user_id);

  -- 자리 반환 시 대기열 승격
  IF v_prev_status IN ('payment_pending', 'paid_pending_approval', 'confirmed') THEN
    PERFORM promote_next_waitlisted(v_app.division_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
