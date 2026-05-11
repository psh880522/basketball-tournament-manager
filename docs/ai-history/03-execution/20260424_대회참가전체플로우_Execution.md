# 대회 참가 전체 플로우 구현 결과

**기준 계획서**: `docs/ai-history/02-plans/20260424_대회참가전체플로우_Plan_v1.md`  
**구현일**: 2026-04-24

---

## Phase 완료 현황

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | DB 스키마 / 마이그레이션 | [완료] |
| Phase 2 | 타입 정의 | [완료] |
| Phase 3 | 서버 액션 / API | [완료] |
| Phase 4 | 프론트엔드 | [완료] |
| Phase 5 | 권한 정책 (RLS) | [완료] — 변경 없음 |

---

## 신규 파일 (8개)

| 파일 경로 |
|---|
| `supabase/migrations/0251_divisions_roster_config.sql` |
| `app/(app)/tournament/[id]/_components/TournamentStickyPanel.tsx` |
| `app/(app)/tournament/[id]/_components/MobileApplyBar.tsx` |
| `app/(app)/tournament/[id]/_components/DivisionBottomSheet.tsx` |
| `app/(app)/tournament/[id]/apply/_components/DivisionSummaryCard.tsx` |
| `app/(app)/tournament/[id]/apply/_components/RosterCounter.tsx` |
| `app/(app)/my-applications/[applicationId]/CompletionBanner.tsx` |
| `app/(app)/my-applications/[applicationId]/PaymentDueCountdown.tsx` |

---

## 수정 파일 (8개)

| 파일 경로 | 주요 변경 |
|---|---|
| `lib/api/divisions.ts` | `DivisionRow`에 `min_roster_size`, `max_roster_size` 추가. `getDivisionById()` 신규 추가. |
| `lib/api/profiles.ts` | `getProfileVerification(userId)` 신규 추가. |
| `app/(app)/tournament/[id]/page.tsx` | Hero 전체너비 섹션 제거. 좌측 포스터+소개, 우측 `TournamentStickyPanel`. `pb-16 md:pb-0` 추가. |
| `app/(app)/tournament/[id]/apply/page.tsx` | `searchParams` 추가. `divisionId` 없으면 redirect. `identity_verified_at` 서버 체크. `division` 단일 객체 전달. |
| `app/(app)/tournament/[id]/apply/Form.tsx` | `division` 단일 객체 수신. 드롭다운 제거. `DivisionSummaryCard` + `RosterCounter` 추가. `min_roster_size` canSubmit 조건. `?from=apply` 추가. |
| `app/(app)/tournament/[id]/apply/actions.ts` | `getDivisionById()`로 `min_roster_size` 서버 검증 추가. |
| `app/(app)/my-applications/[applicationId]/page.tsx` | `searchParams` 추가. `from === 'apply'`이면 `CompletionBanner` 렌더링. |
| `app/(app)/my-applications/[applicationId]/ApplicationStatusSection.tsx` | `id="payment-section"` 추가. `PaymentDueCountdown` 추가. `<input>` → `Input` 컴포넌트 교체. |

---

## 계획 대비 실제 구현 차이

| 항목 | 계획 | 실제 |
|---|---|---|
| `TournamentStickyPanel` Props | `isLoggedIn`, `isOrganizer` 미포함 | `isOrganizer` 추가 (Risk 6-4 — 관리자 CTA 분기 유지 필요) |
| `MobileApplyBar` Props | `isSingleDivision` 미명시 | `isSingleDivision` 추가 (단일/다중 division 분기 필요) |
| `apply/page.tsx` — division 미존재 처리 | 에러 UI 표시 안내 | `redirect(\`/tournament/${tournamentId}\`)` 처리 (에러 UI 대신 redirect가 더 자연스러움) |

---

## 빌드 검증

- TypeScript 타입 체크: 통과 (오류 없음)
- `npm run build`: 성공 — 전체 라우트 정상 빌드 확인
