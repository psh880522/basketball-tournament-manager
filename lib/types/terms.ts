// lib/types/terms.ts
// 약관 동의 관련 TypeScript 타입 정의

export type TermsType =
  | "service"
  | "privacy"
  | "marketing"
  | "player_registration"      // 선수 등록 정보 입력 및 활용 동의
  | "tournament_notification"  // 대회 운영 관련 안내 수신 동의
  | "basic_info_usage";        // 대회 참가를 위한 기본 정보 활용 동의

/** user_terms_consents 테이블 전체 구조 */
export type UserTermsConsent = {
  id: string;
  user_id: string;
  terms_type: TermsType;
  terms_version: string;
  agreed: boolean;
  consented_at: string;
};

/** 최신 동의 상태 요약 (UI에서 현재 동의 여부 표시용) */
export type TermsConsentStatus = {
  service: boolean;                  // 서비스 이용약관 동의 여부
  privacy: boolean;                  // 개인정보처리방침 동의 여부
  marketing: boolean;                // 마케팅 동의 여부
  player_registration: boolean;      // 선수 등록 정보 입력 및 활용 동의 여부
  tournament_notification: boolean;  // 대회 운영 관련 안내 수신 동의 여부
  basic_info_usage: boolean;         // 대회 참가를 위한 기본 정보 활용 동의 여부
};

/** 약관 동의 기록 저장 입력값 (단건) */
export type TermsConsentInput = {
  terms_type: TermsType;
  terms_version: string;
  agreed: boolean;
};
