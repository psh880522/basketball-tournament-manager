-- 0218_update_user_role_add_user.sql
-- update_user_role RPC에 'user' 값 허용 추가
-- 기존: player | manager만 허용
-- 변경: user | player | manager 허용 (본인인증 미구현 기간 admin 수동 승격 지원)

CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 호출자가 organizer인지 확인
  IF NOT public.is_organizer() THEN
    RAISE EXCEPTION 'Forbidden: only organizer can change roles';
  END IF;

  -- 허용 값: user, player, manager (organizer 승격은 DB 직접 처리)
  IF new_role NOT IN ('user', 'player', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: only user, player or manager allowed';
  END IF;

  -- organizer 역할 사용자는 변경 불가 (organizer 보호)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_user_id AND role = 'organizer'
  ) THEN
    RAISE EXCEPTION 'Cannot change organizer role';
  END IF;

  UPDATE public.profiles
  SET role = new_role::public.app_role
  WHERE id = target_user_id;
END;
$$;
