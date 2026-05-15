-- 대회 장소 위도/경도 컬럼 추가
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS location_lat double precision NULL,
  ADD COLUMN IF NOT EXISTS location_lng double precision NULL;
