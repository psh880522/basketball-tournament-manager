-- 0242_team_join_applications.sql
-- 팀 합류 신청 테이블 생성 + 관련 RPC 4종

-- ────────────────────────────────────────────────
-- 1. team_join_applications 테이블
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_join_applications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  applicant_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS team_join_applications_team_id_idx
  ON public.team_join_applications (team_id);

CREATE INDEX IF NOT EXISTS team_join_applications_applicant_id_idx
  ON public.team_join_applications (applicant_id);

CREATE INDEX IF NOT EXISTS team_join_applications_team_status_idx
  ON public.team_join_applications (team_id, status);

ALTER TABLE public.team_join_applications ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────
-- 2. RPC: apply_for_team
--    신청자가 팀에 합류 신청
--    rejected 이력이 있으면 pending으로 upsert
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.apply_for_team(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_existing record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '로그인이 필요합니다.');
  END IF;

  -- 이미 해당 팀의 멤버인지 확인
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 이 팀의 멤버입니다.');
  END IF;

  -- 기존 신청 이력 조회
  SELECT * INTO v_existing
  FROM public.team_join_applications
  WHERE team_id = p_team_id AND applicant_id = v_uid;

  IF FOUND THEN
    IF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('ok', false, 'error', '이미 신청 중입니다.');
    ELSIF v_existing.status = 'approved' THEN
      RETURN jsonb_build_object('ok', false, 'error', '이미 승인된 신청입니다.');
    ELSIF v_existing.status = 'rejected' THEN
      -- 거절된 경우 재신청: pending으로 복구
      UPDATE public.team_join_applications
        SET status = 'pending', updated_at = now()
      WHERE team_id = p_team_id AND applicant_id = v_uid;
      RETURN jsonb_build_object('ok', true);
    END IF;
  END IF;

  -- 신규 신청
  INSERT INTO public.team_join_applications (team_id, applicant_id, status)
  VALUES (p_team_id, v_uid, 'pending');

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_for_team(uuid) TO authenticated;

-- ────────────────────────────────────────────────
-- 3. RPC: approve_team_application
--    캡틴이 합류 신청을 승인 → team_members INSERT
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_team_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid  uuid;
  v_app  record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '로그인이 필요합니다.');
  END IF;

  -- 신청 행 잠금
  SELECT * INTO v_app
  FROM public.team_join_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없습니다.');
  END IF;

  IF v_app.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 처리된 신청입니다.');
  END IF;

  -- 호출자가 해당 팀의 captain인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_app.team_id AND user_id = v_uid AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '이 팀의 캡틴만 승인할 수 있습니다.');
  END IF;

  -- 신청 상태 업데이트
  UPDATE public.team_join_applications
    SET status = 'approved', updated_at = now()
  WHERE id = p_application_id;

  -- team_members 에 player로 추가
  INSERT INTO public.team_members (team_id, user_id, role_in_team)
  VALUES (v_app.team_id, v_app.applicant_id, 'player')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_team_application(uuid) TO authenticated;

-- ────────────────────────────────────────────────
-- 4. RPC: reject_team_application
--    캡틴이 합류 신청을 거절
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_team_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid uuid;
  v_app record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', '로그인이 필요합니다.');
  END IF;

  SELECT * INTO v_app
  FROM public.team_join_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', '신청을 찾을 수 없습니다.');
  END IF;

  IF v_app.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', '이미 처리된 신청입니다.');
  END IF;

  -- 호출자가 해당 팀의 captain인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = v_app.team_id AND user_id = v_uid AND role_in_team = 'captain'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', '이 팀의 캡틴만 거절할 수 있습니다.');
  END IF;

  UPDATE public.team_join_applications
    SET status = 'rejected', updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_team_application(uuid) TO authenticated;

-- ────────────────────────────────────────────────
-- 5. RPC: get_teams_for_join
--    자신이 멤버가 아닌 팀 목록 반환 (팀 찾기 페이지용)
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teams_for_join(p_user_id uuid)
RETURNS TABLE (
  id           uuid,
  team_name    text,
  region       text,
  bio          text,
  contact      text,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.team_name,
    t.region,
    t.bio,
    t.contact,
    COUNT(tm.user_id) AS member_count
  FROM public.teams t
  LEFT JOIN public.team_members tm ON tm.team_id = t.id
  WHERE
    (t.is_dummy IS NULL OR t.is_dummy = false)
    AND NOT EXISTS (
      SELECT 1 FROM public.team_members tm2
      WHERE tm2.team_id = t.id AND tm2.user_id = p_user_id
    )
  GROUP BY t.id
  ORDER BY t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teams_for_join(uuid) TO authenticated;

-- 롤백:
-- DROP TABLE IF EXISTS public.team_join_applications CASCADE;
-- DROP FUNCTION IF EXISTS public.apply_for_team(uuid);
-- DROP FUNCTION IF EXISTS public.approve_team_application(uuid);
-- DROP FUNCTION IF EXISTS public.reject_team_application(uuid);
-- DROP FUNCTION IF EXISTS public.get_teams_for_join(uuid);
