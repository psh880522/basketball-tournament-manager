-- 0224_user_terms_consents_rls.sql
-- user_terms_consents 테이블 RLS 정책
-- 의존: 0223_user_terms_consents.sql

-- SELECT: 본인만 조회 가능
CREATE POLICY "user_terms_consents_select_own"
  ON public.user_terms_consents
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 본인만 가능 (동의/철회 모두 INSERT로 기록)
CREATE POLICY "user_terms_consents_insert_own"
  ON public.user_terms_consents
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: 금지 (이력 보존)
-- DELETE: 금지 (이력 보존)
