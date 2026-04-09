// lib/types/player.ts
// 선수 프로필 관련 TypeScript 타입 정의

export type Position =
  | "포인트가드"
  | "슈팅가드"
  | "스몰포워드"
  | "파워포워드"
  | "센터";

export type CareerLevel = "입문" | "아마추어" | "세미프로" | "기타";

export type Gender = "남성" | "여성";

/** player_profiles 테이블 전체 구조 */
export type PlayerProfile = {
  id: string;
  gender: Gender | null;
  position: Position | null;
  sub_position: Position | null;
  height_cm: number | null;
  weight_kg: number | null;
  career_level: CareerLevel | null;
  region: string | null;
  jersey_number: number | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

/** 사용자가 수정 가능한 선수 프로필 필드 */
export type PlayerProfileUpdateInput = {
  gender?: Gender;
  position?: Position;
  sub_position?: Position;
  height_cm?: number;
  weight_kg?: number;
  career_level?: CareerLevel;
  region?: string;
  jersey_number?: number;
  bio?: string;
};
