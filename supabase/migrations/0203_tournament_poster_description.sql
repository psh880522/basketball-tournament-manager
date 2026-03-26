-- tournaments 테이블에 설명/포스터 컬럼 추가
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS poster_url  text;

-- Storage 버킷 생성 (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-posters', 'tournament-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: organizer만 업로드/수정/삭제
-- is_organizer() 함수 대신 직접 subquery 사용 (storage RLS 컨텍스트에서 SECURITY DEFINER 함수 호환성 문제 우회)
CREATE POLICY "poster_upload_organizer"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tournament-posters'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'
  );

CREATE POLICY "poster_update_organizer"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tournament-posters'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'
  );

CREATE POLICY "poster_delete_organizer"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tournament-posters'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'organizer'
  );

-- 공개 읽기는 bucket public=true로 처리됨 (별도 SELECT 정책 불필요)
