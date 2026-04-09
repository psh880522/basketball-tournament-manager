-- 0227_drop_promote_to_player_v1.sql
-- promote_to_player() v1 (3-parameter) 제거
-- 이유: v2(6-parameter)가 이미 적용되어 있으나 CREATE OR REPLACE가 시그니처 불일치로
--       기존 v1을 덮어쓰지 못해 두 함수가 공존 중.
--       3개 파라미터로 RPC 호출 시 PostgreSQL이 ambiguous function call 오류를 발생시킴.
DROP FUNCTION IF EXISTS public.promote_to_player(text, text, jsonb);
