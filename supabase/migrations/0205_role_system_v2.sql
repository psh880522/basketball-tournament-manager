-- 0205_role_system_v2.sql
-- app_role enum 전환: organizer/manager/player 3종으로 재편
-- team_manager → player, spectator → player 자동 변환
-- 신규 가입 기본 역할: player

-- 0) storage 정책 임시 삭제 (app_role 타입 참조로 인한 의존성 제거)
DROP POLICY IF EXISTS poster_update_organizer ON storage.objects;
DROP POLICY IF EXISTS poster_delete_organizer ON storage.objects;

-- 1) 새 enum 생성
CREATE TYPE public.app_role_v2 AS ENUM ('organizer', 'manager', 'player');

-- 2) profiles 컬럼 기본값 제거 후 타입 교체
ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.app_role_v2
  USING (
    CASE role::text
      WHEN 'organizer'    THEN 'organizer'::public.app_role_v2
      WHEN 'manager'      THEN 'manager'::public.app_role_v2
      WHEN 'team_manager' THEN 'player'::public.app_role_v2
      WHEN 'spectator'    THEN 'player'::public.app_role_v2
      ELSE                     'player'::public.app_role_v2
    END
  );

-- 3) 기본값을 'player'로 변경
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'player';

-- 4) 구 enum 제거
DROP TYPE public.app_role;

-- 5) 새 enum 이름을 원래 이름으로 변경
ALTER TYPE public.app_role_v2 RENAME TO app_role;

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
