-- 0228_player_profiles_bio.sql
-- player_profiles에 자기소개(bio) 컬럼 추가
-- 역할: 선수 등록 폼에서 수집하는 자기소개 텍스트 저장

ALTER TABLE public.player_profiles
  ADD COLUMN bio text DEFAULT NULL;

COMMENT ON COLUMN public.player_profiles.bio IS '자기소개 (선택)';
