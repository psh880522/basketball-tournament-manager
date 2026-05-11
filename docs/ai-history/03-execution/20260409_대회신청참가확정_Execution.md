# 실행 기록: 대회 신청 → 참가 확정 흐름 구현

- **날짜**: 2026-04-09
- **Plan 기준**: `docs/ai-history/02-plans/20260409_대회신청참가확정_Plan_v2.md`
- **TypeScript 검사**: 통과 (pre-existing `.next/types/validator.ts` 오류 1개 — 코드 무관)

---

## Phase 1 — DB 마이그레이션 (완료)

| 파일 | 내용 |
|------|------|
| `0230_divisions_application_config.sql` | `divisions` 테이블에 `entry_fee`, `capacity`, `application_open_at`, `application_close_at` 추가 |
| `0231_applications_status_expansion.sql` | 상태 6개로 확장, 기존 데이터 마이그레이션, UNIQUE 제약 변경 (partial unique index), 신규 컬럼 15개 추가 |
| `0232_application_status_history.sql` | `application_status_history` 감사 이력 테이블 생성 |
| `0233_applications_submit_rpc.sql` | `submit_tournament_application()` SECURITY DEFINER RPC (SELECT FOR UPDATE 동시성 처리) |
| `0234_applications_transition_rpcs.sql` | 상태 전환 RPC 6개 (`mark_payment_done`, `confirm_application`, `cancel_application`, `admin_cancel_application`, `expire_overdue_applications`, `promote_next_waitlisted`) |
| `0235_applications_rls_update.sql` | `tournament_team_applications` 및 `application_status_history` RLS 재정비 |
| `0236_notifications.sql` | `notifications` 테이블 생성 + RLS |

---

## Phase 2 — 타입 정의 수정 (완료)

### `lib/api/applications.ts` (전체 재작성)
- `ApplicationStatus`: 6개 값 (`payment_pending | paid_pending_approval | confirmed | waitlisted | expired | cancelled`)
- `OCCUPYING_STATUSES`, `ACTIVE_STATUSES` 상수 추가
- `MyApplicationRow`: 12개 신규 필드 추가 (payment_due_at, depositor_name, waitlist_position, confirmed_at, cancelled_at 등)
- `TournamentApplicationRow`: 신규 필드 반영
- `ApplicationStatusHistoryRow`, `MarkPaymentInput` 타입 추가
- 신규 함수: `getOccupiedCount`, `markPaymentDone`, `cancelApplication`, `confirmApplication`, `adminCancelApplication`, `extendPaymentDue`, `listStatusHistory`
- `applyToTournament`: `submit_tournament_application` RPC 호출로 변경
- `listApprovedTeams*`: `.eq("status", "confirmed")`으로 변경

### `lib/api/divisions.ts` (수정)
- `DivisionRow`: `entry_fee`, `capacity`, `application_open_at`, `application_close_at` 추가
- `createDivision`, `updateDivision`, `updateDivisionConfig`: 신규 필드 지원 추가
- `updateDivision`: capacity 감소 유효성 검증 (dynamic import로 순환 의존 회피)

### `lib/api/notifications.ts` (신규)
- `NotificationRow` 타입
- `createNotification` (best-effort, no-throw)
- `listMyNotifications`, `markNotificationRead`, `markAllNotificationsRead`

---

## Phase 3-A — downstream 'approved' → 'confirmed' (완료)

변경된 파일:
- `lib/api/bracket.ts:138` — `.eq("status", "confirmed")`
- `lib/api/divisions.ts:220` — `listDivisionsWithStats`
- `lib/api/tournamentGuards.ts:94`
- `lib/api/tournamentProgress.ts:90`
- `lib/api/teams.ts:172` — 더미팀 INSERT 상태
- `app/(app)/tournament/[id]/page.tsx` — status 비교 전체 갱신, `getMyApplicationStatus` 사용으로 전환
- `app/(app)/tournament/[id]/apply/Form.tsx` — statusLabels 갱신
- `app/(app)/admin/tournaments/[id]/applications/Form.tsx` — statusLabel/statusBadgeClass 6개 상태로 갱신, 액션 버튼 재구성

**미변경 (의도적)**: `app/(app)/admin/tournaments/[id]/teams/` — 레거시 팀 시스템 (`teams.status`), 별도 플로우

---

## Phase 3-B/C — 서버 액션 (완료)

### `app/(app)/tournament/[id]/apply/actions.ts`
- `applyTeamToTournament` — 기존 유지
- `markPaymentDoneAction(tournamentId, MarkPaymentInput)` — 신규
- `cancelApplicationAction(applicationId, tournamentId)` — 신규

### `app/(app)/admin/tournaments/[id]/applications/actions.ts` (재작성)
- `confirmApplicationAction` — `setApplicationStatusAction` 대체
- `adminCancelApplicationAction` — 신규
- `extendPaymentDueAction` — 신규
- `createDummyTeamAction` — 유지

### `app/(app)/admin/tournaments/[id]/edit/actions.ts`
- `createDivisionAction`: `DivisionConfigInput` 객체 시그니처로 변경 (entry_fee, capacity, dates 지원)
- `updateDivisionAction`: 동일하게 갱신

---

## Phase 3-D — Edge Function (완료)

`supabase/functions/expire-applications/index.ts`
- Deno 런타임, `expire_overdue_applications()` RPC 주기적 호출
- `tsconfig.json`에 `supabase/functions` 제외 추가 (Deno 전용 코드)

---

## Phase 4 — 프론트엔드 (완료)

### `app/(app)/tournament/[id]/apply/StatusCard.tsx` (신규)
- 6-state UI 컴포넌트
- `payment_pending`: 입금 완료 신고 폼 (입금자명 + 메모)
- `paid_pending_approval`: 승인 대기 안내
- `confirmed`: 참가 확정 메시지
- `waitlisted`: 대기 순번 표시
- `expired` / `cancelled`: 상태 안내
- 신청 취소 버튼 (`payment_pending`, `paid_pending_approval` 상태에서 노출)

### `app/(app)/tournament/[id]/apply/Form.tsx` (수정)
- `ApplicationStatus` 인라인 컴포넌트 → `StatusCard` 컴포넌트로 교체
- Division 선택 시 참가비/정원/신청기간 미리보기 표시

### `app/(app)/admin/tournaments/[id]/applications/Form.tsx` (수정)
- statusLabel/statusBadgeClass: 6개 상태로 갱신
- 액션 버튼: `paid_pending_approval` → 확정/취소, `confirmed|payment_pending` → 취소만

### `app/(app)/admin/tournaments/[id]/edit/Form.tsx` (수정)
- `AddDivisionForm`: 참가비, 정원, 신청 시작/마감 필드 추가
- `DivisionItem`: 동일 필드 편집 지원, 취소 시 초기값 복원
- Division 목록 표시: 참가비·정원·순서 요약 추가

---

## 주요 설계 결정 사항

1. **동시성**: `submit_tournament_application` RPC에 `SELECT FOR UPDATE`로 capacity 체크 원자성 보장
2. **알림 신뢰성**: `createNotification`은 try/catch, 에러 무시 — 상태 전환 차단 방지
3. **순환 의존 회피**: `divisions.ts` → `applications.ts` 의존은 dynamic import 사용
4. **상태 마이그레이션**: 기존 pending→payment_pending, approved→confirmed, rejected→cancelled 변환 후 CHECK 제약 적용
5. **레거시 분리**: `teams.status` (TeamStatus)는 별도 플로우, 변경하지 않음
