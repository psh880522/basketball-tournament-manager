-- tournaments 테이블에서 max_teams 컬럼 제거
-- max_teams는 실제 신청 제한 로직(RPC)에서 사용되지 않으며,
-- 디비전별 capacity로 정원을 관리하는 방식으로 전환됨

alter table public.tournaments drop column if exists max_teams;
