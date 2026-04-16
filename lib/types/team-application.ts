// lib/types/team-application.ts
// 팀 합류 신청 관련 TypeScript 타입 정의

export type TeamJoinApplicationStatus = "pending" | "approved" | "rejected";

export type TeamJoinApplication = {
  id: string;
  team_id: string;
  applicant_id: string;
  status: TeamJoinApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type TeamJoinApplicationWithTeam = TeamJoinApplication & {
  teams: { team_name: string; contact: string | null };
};

/** 대시보드 / 온보딩 흐름에서 사용하는 사용자 팀 상태 */
export type UserTeamStatus =
  | "no_team"      // 팀 미가입, 신청도 없음
  | "join_pending" // 합류 신청 중 (승인 대기)
  | "team_member"  // 일반 팀원
  | "captain";     // 팀 주장
