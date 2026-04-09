-- 0222_player_profiles_rls.sql
-- player_profiles 테이블 RLS 정책
-- 의존: 0221_player_profiles.sql

-- SELECT: 본인 또는 organizer만 조회 가능
CREATE POLICY "player_profiles_select_own_or_organizer"
  ON public.player_profiles
  FOR SELECT
  USING (id = auth.uid() OR public.is_organizer());

-- INSERT: 본인만 가능 (promote_to_player() RPC에서 생성)
CREATE POLICY "player_profiles_insert_own"
  ON public.player_profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: 본인만 가능
CREATE POLICY "player_profiles_update_own"
  ON public.player_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: 금지 (auth.users cascade로만 삭제)
