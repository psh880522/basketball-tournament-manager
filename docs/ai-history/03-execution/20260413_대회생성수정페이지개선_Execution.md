# 대회 생성·수정 페이지 개선 구현 결과

- **날짜**: 2026-04-13
- **기능명**: TournamentCreateEditImprovement
- **플랜 문서**: `docs/ai-history/02-plans/20260413_대회생성수정페이지개선_Plan_v1.md`

---

## 구현 결과 요약

| 항목 | 결과 |
|---|---|
| 완료된 Phase | 5개 (Phase 1~5) |
| 신규 파일 | 6개 |
| 수정 파일 | 6개 |
| 빌드 | 성공 |
| 타입 체크 에러 | 0 |

---

## Phase 완료 상태

- [완료] Phase 1: DB 스키마 / 마이그레이션 (신규 마이그레이션 없음)
- [완료] Phase 2: 타입 정의
- [완료] Phase 3: 서버 액션 / API
- [완료] Phase 4: 프론트엔드
- [완료] Phase 5: 권한 정책 (신규 RLS 없음)

---

## 신규 생성 파일 (6개)

| 파일 | 내용 |
|---|---|
| `app/(app)/admin/tournaments/[id]/edit/tabs/BasicInfoTab.tsx` | 기본정보 탭 (대회명/장소/날짜/시간/설명 폼) |
| `app/(app)/admin/tournaments/[id]/edit/tabs/DivisionsTab.tsx` | 디비전 탭 (신청 현황 표시 포함) |
| `app/(app)/admin/tournaments/[id]/edit/tabs/CourtsTab.tsx` | 코트 탭 |
| `app/(app)/admin/tournaments/[id]/edit/tabs/PosterTab.tsx` | 포스터 탭 |
| `app/(app)/admin/tournaments/[id]/edit/tabs/PublishTab.tsx` | 공개설정 탭 (상태 변경 + 최대팀수) |
| `docs/ai-history/03-execution/20260413_대회생성수정페이지개선_Execution.md` | 본 문서 |

---

## 수정 파일 (6개)

| 파일 | 변경 내용 |
|---|---|
| `lib/api/applications.ts` | `DivisionApplicationCounts` 타입 + `getDivisionApplicationCounts` 함수 추가 |
| `app/(app)/admin/tournaments/new/actions.ts` | `DivisionPayload` 타입 확장 (4개 필드) + `parseKSTDatetime` 헬퍼 + divisions INSERT에 신규 필드 전달 |
| `app/(app)/admin/tournaments/[id]/edit/actions.ts` | `changeTournamentStatus`, `TournamentStatus` import 추가 + `updateTournamentStatusAction` 추가 |
| `app/(app)/admin/tournaments/[id]/edit/page.tsx` | `getDivisionApplicationCounts` 호출 추가, `Promise.all`로 병렬 데이터 로드, `TournamentEditForm`에 전체 props 전달, `PosterSection`/`SettingsSection` 제거 |
| `app/(app)/admin/tournaments/[id]/edit/Form.tsx` | 탭 기반 진입점으로 전면 재작성 (5개 탭 컴포넌트 조합) |
| `app/(app)/admin/tournaments/new/Form.tsx` | 3단계 스텝 위저드로 전면 재작성, `DivisionDraft` 타입 확장, 생성 완료 후 편집 페이지로 리다이렉트 |

---

## 주요 구현 사항

### 생성 폼 (new/Form.tsx)
- `DivisionDraft` 타입에 `entryFee`, `capacity`, `applicationOpenAt`, `applicationCloseAt` 추가
- 3단계 스텝 위저드: Step 0(기본정보+포스터) → Step 1(디비전) → Step 2(코트+운영설정)
- 단계별 유효성 검사 함수 분리 (`validateStep0`, `validateStep1`, `validateStep2`)
- `StepIndicator` 컴포넌트로 진행 상태 시각화
- 생성 완료 후 `/admin/tournaments/${id}/edit`으로 리다이렉트

### 생성 액션 (new/actions.ts)
- `parseKSTDatetime` 헬퍼 인라인 작성: datetime-local 값을 KST(`+09:00`) 기준으로 UTC ISO 변환
- divisions INSERT에 `entry_fee`, `capacity`, `application_open_at`, `application_close_at` 포함

### 편집 폼 (edit/Form.tsx + tabs/*.tsx)
- 5탭 구조: 기본정보 / 디비전 / 코트 / 포스터 / 공개설정
- 탭 상태: `useState<ActiveTab>` (단순 state, URL 파라미터 미사용)
- 기존 섹션 컴포넌트들을 탭 파일로 이동

### 디비전 탭 (DivisionsTab.tsx)
- 디비전 카드 하단에 "확정 N팀 / 대기 N팀" 표시 추가
- `applicationCounts`를 `Map<division_id, counts>`로 변환하여 O(1) 조회

### 공개설정 탭 (PublishTab.tsx)
- 현재 상태 배지 표시 (draft/open/closed/finished)
- draft → open 전환 버튼 (divisionCount === 0이면 비활성)
- open → closed / open → draft 복귀 버튼
- closed → open 복귀 버튼
- 확정 팀이 있으면 경고 메시지 표시
- 최대 팀수 입력 + 저장 (기존 SettingsSection에서 이동)

### 편집 page.tsx
- `Promise.all`로 tournament/divisions/courts/applicationCounts 병렬 로드
- `PosterSection`, `SettingsSection` 직접 렌더링 제거
- `TournamentEditForm` 단일 컴포넌트에 모든 데이터 props 전달

---

## 특이사항

- 편집 기본정보 탭 저장 성공 시 기존 동작 유지 (600ms 후 `/admin` 리다이렉트)
- `getDivisionApplicationCounts`: status `confirmed` / `waitlisted` row만 조회 후 클라이언트 집계
- `.next/types/validator.ts` 에러는 Next.js 자동 생성 파일 관련 기존 환경 이슈이며, 우리 코드 파일 타입 체크에는 에러 없음
