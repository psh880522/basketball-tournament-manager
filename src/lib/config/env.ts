/** Vercel 프로덕션 배포인지 여부 */
export const isProduction = process.env.VERCEL_ENV === "production";

/**
 * 본인인증 로직을 실제로 호출해야 하는지 여부
 * - true: 프로덕션 환경 — 외부 인증 업체 API 실제 호출
 * - false: 비-프로덕션 환경 — 인증 로직 스킵, 바로 승격 처리
 *
 * VS-R8/VS-R9 (본인인증 UI 구현 시) 이 플래그를 사용할 것
 */
export const requireIdentityVerification = isProduction;

/**
 * 현재 앱 환경 이름
 * - "production": Vercel 프로덕션 배포
 * - "preview": Vercel preview(staging) 배포
 * - "development": 로컬 개발 또는 Vercel development 환경
 */
export const appEnv: "production" | "preview" | "development" =
  (process.env.VERCEL_ENV as "production" | "preview" | "development") ??
  "development";
