-- 0215_role_add_user.sql
-- app_role enum에 'user' 추가 (4종: organizer | manager | user | player)
-- 신규 가입 기본값: 'user'
-- 기존 player 중 프로필 미완료자(display_name IS NULL OR phone IS NULL) → 'user'로 downgrade
-- is_player() DB 함수 신규 추가

-- 0) storage 정책 임시 삭제 (app_role 타입 참조 의존성 제거)
DROP POLICY IF EXISTS poster_update_organizer ON storage.objects;
DROP POLICY IF EXISTS poster_delete_organizer ON storage.objects;

-- 1) 신규 enum 생성 (4종)
CREATE TYPE public.app_role_v3 AS ENUM ('organizer', 'manager', 'user', 'player');

-- 2) profiles.role DEFAULT 제거 후 타입 교체
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.app_role_v3
  USING (role::text::public.app_role_v3);

-- 3) backfill: 기존 player 중 프로필 미완료자 → user로 downgrade
--    기준: display_name IS NULL OR phone IS NULL
UPDATE public.profiles
  SET role = 'user'
  WHERE role = 'player'
    AND (display_name IS NULL OR phone IS NULL);

-- 4) 신규 기본값 설정
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

-- 5) 구 enum 제거 및 이름 교체
DROP TYPE public.app_role;
ALTER TYPE public.app_role_v3 RENAME TO app_role;

-- 6) storage 정책 재생성
CREATE POLICY poster_update_organizer ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tournament-posters'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'::public.app_role
  );

CREATE POLICY poster_delete_organizer ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tournament-posters'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'::public.app_role
  );

-- 7) is_organizer(), is_manager() — 변경 없음 (app_role enum 참조 없이 text 비교 방식이므로 재생성 불필요)

-- 8) is_player() 신규 추가
CREATE OR REPLACE FUNCTION public.is_player()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'player'
  )
$$;
