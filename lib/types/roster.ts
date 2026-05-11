// lib/types/roster.ts
// 로스터 관련 TypeScript 타입 정의
// v3: RosterStatus 없음 — 편집 가능 여부는 tournament.start_date 기준

export type Roster = {
  id: string;
  application_id: string;
  team_id: string;
  tournament_id: string;
  created_at: string;
  updated_at: string;
};

export type RosterMember = {
  id: string;
  roster_id: string;
  user_id: string;
  created_at: string;
};

/** 신청 상세 페이지용 — 로스터 + 멤버 프로필 조합 타입 */
export type RosterWithMembers = Roster & {
  roster_members: (RosterMember & {
    display_name: string | null;
    verified_name: string | null;
    player_position: string | null;
  })[];
};
