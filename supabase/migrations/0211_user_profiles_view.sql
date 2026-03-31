-- 0211_user_profiles_view.sql
-- auth.users와 profiles를 JOIN한 View 생성
-- 사용자 관리 UI에서 이메일 표시용
-- security_invoker=true: 호출자 권한(RLS)으로 실행되므로
--   organizer만 전체 목록 조회 가능, 일반 사용자는 본인 행만 조회

CREATE OR REPLACE VIEW public.user_profiles
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.role,
    p.created_at,
    u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id;
