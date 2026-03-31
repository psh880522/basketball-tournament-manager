-- 0210_manager_operation_rls.sql
-- 운영 기능 RLS에 manager 추가
-- matches: manager도 UPDATE 가능 (경기 결과 입력/상태 변경)
-- standings: manager도 업데이트 가능 (순위 재계산)
-- courts: organizer 전용 유지 (manager 불가 — 코트는 대회 인프라 설정)

-- matches: manager도 결과 입력/수정 가능
-- (기존 정책 이름 확인 후 교체 — is_manager()는 organizer + manager 포함)
DROP POLICY IF EXISTS "matches_update_organizer" ON public.matches;
DROP POLICY IF EXISTS "matches_update_organizer_manager" ON public.matches;
CREATE POLICY "matches_update_organizer_manager"
  ON public.matches FOR UPDATE
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- standings: manager도 순위 계산/저장 가능
DROP POLICY IF EXISTS "standings_upsert_organizer" ON public.standings;
DROP POLICY IF EXISTS "standings_upsert_manager" ON public.standings;
CREATE POLICY "standings_upsert_manager"
  ON public.standings FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- courts: 변경 없음 — organizer 전용 유지
-- (기존 courts RLS 정책 현행 유지)
