# 온보딩 선수등록/팀등록 플로우 구현 결과

**작성일**: 2026-04-15  
**기반 플랜**: `docs/ai-history/02-plans/20260415_온보딩_선수등록_팀등록_플로우_Plan_v2.md`

---

## 완료 상태

| Phase | 상태 | 비고 |
|-------|------|------|
| Phase 1: DB 마이그레이션 | ✅ 완료 | 4개 파일 생성 |
| Phase 2: 타입 정의 | ✅ 완료 | 1개 신규, 1개 수정 |
| Phase 3: 서버 액션 / API | ✅ 완료 | 1개 신규, 2개 수정 |
| Phase 4: 프론트엔드 | ✅ 완료 | 14개 신규, 5개 수정 |
| Phase 5: RLS 검증 | ✅ 완료 | 0243 마이그레이션에 포함 |

---

## 신규 생성 파일

### DB 마이그레이션
| 파일 | 내용 |
|------|------|
| `supabase/migrations/0241_teams_region_bio.sql` | teams 테이블에 region, bio 컬럼 추가 |
| `supabase/migrations/0242_team_join_applications.sql` | team_join_applications 테이블 + RPC 4종 (apply_for_team, approve_team_application, reject_team_application, get_teams_for_join) |
| `supabase/migrations/0243_team_join_applications_rls.sql` | RLS 정책 (SELECT, INSERT, DELETE) |
| `supabase/migrations/0244_fix_createteam_rpc_deprecate.sql` | create_team_with_captain RPC에 region/bio 파라미터 추가, create_team_with_manager deprecated 래퍼 유지 |

### 타입 / API
| 파일 | 내용 |
|------|------|
| `lib/types/team-application.ts` | TeamJoinApplication, UserTeamStatus 타입 |
| `lib/api/team-applications.ts` | getUserTeamStatus, getTeamsForJoin, applyForTeam, getTeamApplicationsForCaptain, approveTeamApplication, rejectTeamApplication |

### 프론트엔드
| 파일 | 내용 |
|------|------|
| `components/onboarding/OnboardingStepIndicator.tsx` | 온보딩 스텝 인디케이터 공통 컴포넌트 |
| `app/(app)/onboarding/completion/page.tsx` | 회원가입 완료 화면 |
| `app/(app)/onboarding/team-choice/page.tsx` | 팀 선택 분기 화면 |
| `app/(app)/teams/new/page.tsx` | 팀 생성 페이지 |
| `app/(app)/teams/new/Form.tsx` | 팀 생성 폼 (팀명+지역 필수, 소개+연락처 선택) |
| `app/(app)/teams/new/actions.ts` | createTeamAction |
| `app/(app)/teams/find/page.tsx` | 팀 찾기 페이지 |
| `app/(app)/teams/find/SearchSection.tsx` | 팀 검색 + 합류 신청 클라이언트 컴포넌트 |
| `app/(app)/teams/find/actions.ts` | applyForTeamAction |
| `app/(app)/teams/[teamId]/applications/page.tsx` | 합류 신청 관리 (캡틴용) |
| `app/(app)/teams/[teamId]/applications/ApplicationCard.tsx` | 신청 카드 컴포넌트 |
| `app/(app)/teams/[teamId]/applications/actions.ts` | approveApplicationAction, rejectApplicationAction |

---

## 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `lib/api/teams.ts` | TeamDetail에 region/bio 추가, createTeam() 입력 타입 확장 및 RPC 호출명 create_team_with_captain으로 변경 |
| `app/(app)/onboarding/identity/actions.ts` | VerifyResult 타입 정의, 성공 시 `{ ok: true, redirectTo: '/onboarding/team-choice' }` 반환 |
| `app/(app)/onboarding/identity/page.tsx` | OnboardingStepIndicator currentStep="identity" 추가 |
| `app/(app)/onboarding/identity/IdentityForm.tsx` | 성공 후 result.redirectTo 경로로 이동 |
| `app/(app)/onboarding/profile/page.tsx` | OnboardingStepIndicator currentStep="profile" 추가 |
| `app/(app)/onboarding/profile/Form.tsx` | 저장 성공 후 "다음: 본인인증 →" CTA 버튼 표시 |
| `app/(app)/dashboard/page.tsx` | getUserTeamStatus() 병렬 호출 + 온보딩 배너 (no_team / join_pending) |
| `app/(app)/teams/[teamId]/page.tsx` | isManager 비교값 "manager" → "captain" 수정, Badge "매니저" → "주장" |

---

## 타입 체크 결과

- 이번 구현 파일: **에러 없음**
- 기존 파일 에러 (기구현 범위 외):
  - `app/(app)/tournament/[id]/apply/Form.tsx` — `application_open_at`, `application_close_at` 참조 (0240 마이그레이션으로 삭제된 컬럼, 이번 플랜 범위 외)

---

## 빌드 결과

- **빌드 실패** — 위 기존 파일 에러 동일 원인
- 이번 구현 코드 자체는 타입 에러 없음

---

## 특이사항

1. **기존 빌드 에러**: `app/(app)/tournament/[id]/apply/Form.tsx`의 `application_open_at` / `application_close_at` 참조가 빌드를 막음. 이전 마이그레이션(0240)에서 해당 컬럼이 삭제되었으나 UI 코드가 미업데이트 상태. 별도 수정 필요.

2. **onboarding/profile/Form.tsx의 useRouter 제거**: 성공 후 CTA Link 방식으로 전환하면서 useRouter 의존성 제거.

3. **identity/actions.ts 반환 타입 분리**: `ActionResult` 타입 대신 `VerifyResult` (`{ ok: true; redirectTo: string } | { ok: false; error: string }`)로 분리. `IdentityForm.tsx`에서 `result.redirectTo`를 직접 사용.

4. **teams/find/page.tsx**: `getUserTeamStatus()` 별도 호출 없이 Supabase 직접 쿼리로 `pendingTeamIds` 조회 — 불필요한 전체 팀 상태 계산을 피하고 신청 중인 팀 ID만 효율적으로 조회.
