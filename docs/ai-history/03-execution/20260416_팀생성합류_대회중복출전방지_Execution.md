# 팀 생성/합류 정책 및 대회 중복 출전 방지 구현 결과

> 계획 문서: `docs/ai-history/02-plans/20260416_팀생성합류_대회중복출전방지_Plan_v3.md`
> 실행일: 2026-04-16

---

## 완료 Phase

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 0 | 팀 생성 정책 제약 제거 | 완료 |
| Phase 1 | DB 스키마 / 마이그레이션 | 완료 |
| Phase 2 | 타입 정의 | 완료 |
| Phase 3 | 서버 액션 / API | 완료 |
| Phase 4 | 프론트엔드 | 완료 |
| Phase 5 | 권한 정책 (RLS) | 완료 (Phase 1과 통합) |

---

## 신규 파일 (11개)

| 파일 | 설명 |
|------|------|
| `supabase/migrations/0246_rosters.sql` | rosters, roster_members 테이블 |
| `supabase/migrations/0247_rosters_rls.sql` | 로스터 RLS 정책 |
| `supabase/migrations/0248_roster_rpcs.sql` | upsert_roster, add_roster_member, remove_roster_member RPC |
| `supabase/migrations/0249_roster_read_rpcs.sql` | get_roster_with_members, get_team_members_for_roster RPC (profiles RLS 우회) |
| `lib/types/roster.ts` | Roster, RosterMember, RosterWithMembers 타입 |
| `lib/api/rosters.ts` | 로스터 API 함수 |
| `app/(app)/teams/page.tsx` | 내 팀 목록 페이지 |
| `app/(app)/my-applications/page.tsx` | 대회 신청 현황 목록 |
| `app/(app)/my-applications/[applicationId]/page.tsx` | 신청 상세 + 로스터 편집 |
| `app/(app)/my-applications/[applicationId]/ApplicationStatusSection.tsx` | 신청 현황 클라이언트 컴포넌트 |
| `app/(app)/my-applications/[applicationId]/RosterSection.tsx` | 로스터 편집 클라이언트 컴포넌트 |

---

## 수정 파일 (11개)

| 파일 | 수정 내용 |
|------|-----------|
| `app/(app)/teams/new/page.tsx` | captain redirect 블록 제거 (Phase 0) |
| `lib/types/team-application.ts` | TeamMembershipItem 타입 추가 |
| `lib/api/applications.ts` | MyApplicationRow에 tournament_id 추가, getApplicationById, getMyTournamentApplicationsAsCaptain, listMyApplications 추가 |
| `app/(app)/my-applications/[applicationId]/actions.ts` | markPaymentDoneAction, cancelApplicationAction, addMemberAction, removeMemberAction |
| `app/(app)/teams/[teamId]/page.tsx` | 합류신청 관리 섹션 추가 |
| `app/(app)/tournament/[id]/apply/page.tsx` | getMyTournamentApplicationsAsCaptain 호출 추가 |
| `app/(app)/tournament/[id]/apply/Form.tsx` | 중복 신청 경고 배너 추가 |
| `app/(app)/dashboard/page.tsx` | 최근 신청 현황 3건 표시 추가 |
| `app/(app)/layout.tsx` | Sidebar props hasTeam/isCaptain으로 변경 |
| `components/layout/Sidebar.tsx` | SidebarProps 재편, captain 섹션 재편 ("내 팀 목록", "내 신청 현황") |
| `app/(app)/my-applications/[applicationId]/actions.ts` | 신규 (Server Actions) |

---

## 계획 대비 변경사항

### 추가된 마이그레이션 (0249)
- **원인**: `profiles` 테이블 RLS가 `id = auth.uid() OR is_organizer()`으로 제한되어, 팀 캡틴이 다른 선수 프로필을 직접 SELECT 불가.
- **해결**: `0249_roster_read_rpcs.sql` 추가 — `get_roster_with_members`, `get_team_members_for_roster` SECURITY DEFINER RPC 생성.
- **승인**: 사용자 확인 후 진행.

### `MyApplicationRow`에 `tournament_id` 추가
- **원인**: `/my-applications/[applicationId]` 페이지에서 tournament 정보를 가져오기 위해 필요.
- **영향**: `MY_APP_SELECT` 확장, 기존 매핑 함수 3개에 `tournament_id` 필드 추가. 하위 호환 유지.

### Client Component Server Action 분리
- **원인**: `ApplicationStatusSection.tsx` (Client Component)에서 `lib/api/applications.ts` 직접 import 시 `next/headers` 오류 발생.
- **해결**: `actions.ts`에 `markPaymentDoneAction`, `cancelApplicationAction` Server Action 래퍼 추가.

---

## 추가 구현 (2026-04-16, 계획서 4-6 보완)

### 미구현 항목 완료

| 항목 | 내용 |
|------|------|
| `lib/api/applications.ts` | `applyToTournament` 반환 타입에 `applicationId` 추가 (RPC가 이미 반환하고 있었음) |
| `app/(app)/tournament/[id]/apply/actions.ts` | `ApplyResult`에 `applicationId` 추가 |
| `app/(app)/tournament/[id]/apply/page.tsx` | 관리 팀별 멤버 pre-fetch → `teamMembersMap` Form에 전달 |
| `app/(app)/tournament/[id]/apply/Form.tsx` | 팀 선택 시 팀원 목록 미리보기 테이블 표시 (읽기 전용), 신청 성공 후 `/my-applications/[applicationId]` 리다이렉트 |

### 계획서 6-6 (옵션 C) 적용
- 체크박스 선택 결과는 서버에 전달하지 않음 (미리보기만)
- 신청 성공 직후 `router.push('/my-applications/[applicationId]')` 로 이동
- 진입 시 `getOrCreateRoster()` 자동 실행 → 로스터 편집 가능

---

## 빌드 결과

- 타입 체크: 에러 0
- 빌드: 성공
- 신규 라우트: `/teams`, `/my-applications`, `/my-applications/[applicationId]`
