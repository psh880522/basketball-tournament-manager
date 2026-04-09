import type { TermsType } from "@/lib/types/terms";

// 현재 약관 버전 (버전 변경 시 이 파일만 수정)
export const TERMS_VERSIONS = {
  service:                 '2026-04',
  privacy:                 '2026-04',
  marketing:               '2026-04',
  player_registration:     '2026-04',
  tournament_notification: '2026-04',
  basic_info_usage:        '2026-04',
} as const satisfies Record<TermsType, string>;
