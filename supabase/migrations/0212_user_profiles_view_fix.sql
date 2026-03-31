-- 0212_user_profiles_view_fix.sql
-- user_profiles 뷰 수정:
-- security_invoker=true 제거 → 뷰 소유자(postgres)로 실행하여 auth.users 접근 가능
-- 대신 뷰 내부에서 organizer 또는 본인만 조회하도록 직접 필터링

CREATE OR REPLACE VIEW public.user_profiles AS
  SELECT
    p.id,
    p.role,
    p.created_at,
    u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'::public.app_role
    OR p.id = auth.uid();
