-- 0234_applications_transition_rpcs.sql
-- 상태 전환 RPC 묶음

------------------------------------------------------------
-- 함수 1: promote_next_waitlisted
-- 대기열 상위 팀을 payment_pending으로 승격
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promote_next_waitlisted(
  p_division_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_app_id    uuid;
  v_user_id   uuid;
BEGIN
  SELECT id, applied_by INTO v_app_id, v_user_id
  FROM tournament_team_applications
  WHERE division_id = p_division_id AND status = 'waitlisted'
  ORDER BY waitlist_position ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE tournament_team_applications
  SET
    status            = 'payment_pending',
    waitlist_position = NULL,
    payment_due_at    = now() + interval '12 hours'
  WHERE id = v_app_id;

  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
  VALUES (v_app_id, 'waitlisted', 'payment_pending', v_user_id);
END;
$$;

------------------------------------------------------------
-- 함수 2: mark_payment_done
-- 사용자가 입금 완료 의사를 표시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_payment_done(
  p_application_id uuid,
  p_user_id        uuid,
  p_depositor_name text,
  p_depositor_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_app tournament_team_applications%ROWTYPE;
BEGIN
  SELECT * INTO v_app
  FROM tournament_team_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없습니다.');
  END IF;

  IF v_app.status != 'payment_pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', '입금 대기 상태가 아닙니다.');
  END IF;

  IF v_app.applied_by != p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', '본인 신청만 처리 가능합니다.');
  END IF;

  UPDATE tournament_team_applications
  SET
    status          = 'paid_pending_approval',
    depositor_name  = p_depositor_name,
    depositor_note  = p_depositor_note,
    paid_marked_at  = now()
  WHERE id = p_application_id;

  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
  VALUES (p_application_id, 'payment_pending', 'paid_pending_approval', p_user_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

------------------------------------------------------------
-- 함수 3: cancel_application
-- 사용자(팀 매니저)가 신청 취소
------------------------------------------------------------
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

  -- 팀 매니저 확인
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = v_app.team_id
      AND user_id = p_user_id
      AND role_in_team = 'manager'
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

------------------------------------------------------------
-- 함수 4: confirm_application
-- 운영자가 입금 확인 완료 (confirmed 전환)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_application(
  p_application_id  uuid,
  p_admin_user_id   uuid,
  p_memo            text DEFAULT NULL
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

  IF v_app.status NOT IN ('payment_pending', 'paid_pending_approval') THEN
    RETURN jsonb_build_object('ok', false, 'error', '확인 가능한 상태가 아닙니다.');
  END IF;

  v_prev_status := v_app.status;

  UPDATE tournament_team_applications
  SET
    status        = 'confirmed',
    confirmed_at  = now(),
    approved_by   = p_admin_user_id,
    approved_at   = now(),
    admin_memo    = p_memo
  WHERE id = p_application_id;

  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, memo)
  VALUES (p_application_id, v_prev_status, 'confirmed', p_admin_user_id, p_memo);

  RETURN jsonb_build_object('ok', true);
END;
$$;

------------------------------------------------------------
-- 함수 5: admin_cancel_application
-- 운영자가 신청 취소
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_cancel_application(
  p_application_id  uuid,
  p_admin_user_id   uuid,
  p_memo            text DEFAULT NULL
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

  IF v_app.status IN ('expired', 'cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 종료된 신청입니다.');
  END IF;

  v_prev_status := v_app.status;

  UPDATE tournament_team_applications
  SET
    status       = 'cancelled',
    cancelled_at = now(),
    admin_memo   = p_memo
  WHERE id = p_application_id;

  INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, memo)
  VALUES (p_application_id, v_prev_status, 'cancelled', p_admin_user_id, p_memo);

  -- 자리 반환 시 대기열 승격
  IF v_prev_status IN ('payment_pending', 'paid_pending_approval', 'confirmed') THEN
    PERFORM promote_next_waitlisted(v_app.division_id);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

------------------------------------------------------------
-- 함수 6: expire_overdue_applications
-- 입금 기한 초과 신청 일괄 만료 처리 (Edge Function에서 호출)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_overdue_applications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_app    tournament_team_applications%ROWTYPE;
  v_count  integer := 0;
BEGIN
  FOR v_app IN
    SELECT *
    FROM tournament_team_applications
    WHERE status = 'payment_pending'
      AND payment_due_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE tournament_team_applications
    SET
      status     = 'expired',
      expired_at = now()
    WHERE id = v_app.id;

    INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
    VALUES (v_app.id, 'payment_pending', 'expired', v_app.applied_by);

    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_app.applied_by,
      'application_expired',
      '입금 기한이 만료되었습니다',
      '입금 기한이 지나 신청이 자동 취소되었습니다. 재신청하시려면 신청 페이지를 확인해 주세요.',
      jsonb_build_object('application_id', v_app.id, 'tournament_id', v_app.tournament_id)
    );

    PERFORM promote_next_waitlisted(v_app.division_id);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
