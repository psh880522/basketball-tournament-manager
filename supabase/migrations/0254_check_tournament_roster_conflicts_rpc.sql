-- 0254_check_tournament_roster_conflicts_rpc.sql
-- 신청 전 로스터 충돌 선수 사전 조회 RPC
-- 선택한 선수 중 같은 대회 다른 팀 로스터에 이미 등록된 선수 반환

CREATE OR REPLACE FUNCTION check_tournament_roster_conflicts(
  p_tournament_id uuid,
  p_user_ids      uuid[]
)
RETURNS TABLE (user_id uuid, display_name text, verified_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    rm.user_id,
    pr.display_name,
    pr.verified_name
  FROM roster_members rm
  JOIN rosters r ON r.id = rm.roster_id
  JOIN tournament_team_applications a ON a.id = r.application_id
  LEFT JOIN profiles pr ON pr.id = rm.user_id
  WHERE r.tournament_id = p_tournament_id
    AND a.status IN ('payment_pending', 'paid_pending_approval', 'confirmed', 'waitlisted')
    AND rm.user_id = ANY(p_user_ids);
$$;

-- 롤백:
-- DROP FUNCTION IF EXISTS check_tournament_roster_conflicts(uuid, uuid[]);
