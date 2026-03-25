# 20260325 Schedule Management Research

## 0) 조사 범위 및 근거
- 조사 대상: 스케줄 관리 요구사항에 직접 연결된 UI, 서버 액션, 도메인 API, DB 스키마/마이그레이션, 그리고 프로젝트 기술 스택.
- 주요 파일: app/admin/tournaments/[id]/schedule/*, lib/api/schedule-slots.ts, lib/api/schedule.ts, lib/api/scheduleSlots.ts, supabase/migrations/0113~0117, package.json, README.md, tsconfig.json, tailwind.config.ts, eslint.config.mjs, next.config.ts.
- 프로젝트 구조는 workspace tree 기준으로 상위 폴더 역할을 정리함.

## 1) 기술 스택 요약
- Frontend: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4.
- Backend: Supabase (Postgres, Auth, RLS), 서버 액션 기반 API 호출.
- Tooling: ESLint 9, PostCSS, pnpm.

근거 파일
- package.json: Next/React/TS/Tailwind/ESLint 버전 확인.
- README.md: 시스템 구성 및 도메인 설명.

## 2) 폴더/파일 역할 요약
- app/: Next App Router 페이지 및 서버 컴포넌트, 클라이언트 폼/컴포넌트.
- components/: 공용 UI 컴포넌트(Button/Card/FieldHint/Nav).
- lib/: 도메인 API 및 포매터/상수. DB 접근 로직이 집중됨.
- supabase/: 마이그레이션 및 DB 스키마 변경 이력.
- docs/: 티켓, 규칙, AI 히스토리.
- public/: 정적 리소스.
- src/: 일부 기능/라이브러리 분리 구조(현재 주요 스케줄 로직은 lib에 집중).

## 3) 스케줄 관리 UI 및 흐름
### 3.1 Schedule 페이지 (Admin)
- 파일: app/admin/tournaments/[id]/schedule/page.tsx
- 역할: 스케줄 관리 진입점. organizer/비-organizer 분기.
  - organizer: 생성 액션(ScheduleGenerateActions) + 동기화(ScheduleSyncActions) + 스케줄 보드.
  - non-organizer: 읽기 전용 보드 표시.
- 데이터 로딩: getCourtsByTournament + getScheduleSlots + getStandingsByDivision.

### 3.2 ScheduleGenerateActions
- 파일: app/admin/tournaments/[id]/schedule/components/ScheduleGenerateActions.tsx
- 역할: 스케줄  생성, 재생성, 초기화 UI.
- 입력: startTime, matchMinutes, breakMinutes.
- 동작:
  - generateScheduleSlotsAction 호출
  - regenerateScheduleBoardAction 호출
  - clearGeneratedScheduleSlotsAction 호출
- 현재 버튼: "스케줄 생성" / "스케줄 재생성" / "스케줄 초기화".

### 3.3 ScheduleSyncActions
- 파일: app/admin/tournaments/[id]/schedule/components/ScheduleSyncActions.tsx
- 역할: 스케줄 검증 + 저장(매치 반영) + 초기화.
- 검증: validateScheduleBeforeSyncAction 호출.
- 저장: syncScheduleToMatchesAction 호출.
- 현재 버튼: "검증", "동기화 저장", "동기화 초기화".

### 3.4 ScheduleSlotsBoard + ScheduleTable
- 파일: app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx
- 구조:
  - Court -> Division -> (Group slots + Tournament slots)로 렌더링.
  - Table 2개: "리그" 테이블과 "토너먼트" 테이블 분리.
- 주요 기능:
  - Drag & Drop: 같은 sectionId(코트+디비전+stage_type) 안에서 match 슬롯 이동.
  - 코트 변경: select 변경 시 updateSlotCourtAction 호출.
  - 시간 표시는 start_at/end_at 기반(읽기 전용).
  - 라벨링: formatLeagueMatchLabel/formatTournamentMatchLabel + tournamentRoundMeta 계산.
- 제한:
  - DnD는 match 슬롯만, 동일 섹션 내에서만 가능.
  - 순서 변경 시 start_at/end_at 자동 재계산 없음.

### 3.5 기타 스케줄 관련 UI
- ScheduleTimeActions: 시간 자동 배정 전용(입력: startTime/matchMinutes/breakMinutes). 현재 schedule page에서 직접 사용되지 않음.
- ScheduleForm: 구버전 형태의 시간 자동 배정 + 저장/초기화. schedule page에서 직접 사용되지 않음.
- ScheduleSeedActions / ScheduleBreakActions: 리그/토너먼트 슬롯 시드 생성 및 휴식 슬롯 생성(현재 schedule page에서 직접 사용되지 않음).

## 4) 스케줄 관련 서버 액션
- 파일: app/admin/tournaments/[id]/schedule/actions.ts
- 역할: UI에서 호출하는 서버 액션 래퍼.
- 주요 액션:
  - generateScheduleSlotsAction / regenerateScheduleBoardAction / clearGeneratedScheduleSlotsAction
  - generateScheduleTimesAction (시간 자동 배정)
  - validateScheduleBeforeSyncAction / syncScheduleToMatchesAction / clearScheduleSyncAction
  - updateSlotCourtAction / swapSlotMatchAssignmentsAction / assignMatchToEmptySlotAction
  - reorderGroupSlotsAction / reorderTournamentSlotsAction
  - seedGroupMatchSlotsAction / seedTournamentMatchSlotsAction / seedBreakSlotsAction
- 재검증: 대부분 성공 시 revalidatePath로 schedule 페이지 갱신.

## 5) 도메인 로직: schedule slots
### 5.1 schedule-slots.ts (핵심)
- 파일: lib/api/schedule-slots.ts
- 핵심 타입:
  - ScheduleSlot, ScheduleSlotMatch, ScheduleSlotCourtGroup
- getScheduleSlots:
  - schedule_slots + divisions + courts + matches 조인.
  - 코트 -> 디비전 -> 그룹/토너먼트 구조로 재구성.
  - 그룹/휴식 슬롯의 group_key 추론(라벨 파싱 + 주변 매치 기반 추정).
  - 정렬: start_at, sort_order, id 순.
- generateScheduleSlots:
  - 전제: tournament 존재, courts 존재, matches 존재, schedule_slots 비어있음.
  - divisions 정렬(sort_order, name) + courts 정렬(display_order, name).
  - group matches와 tournament matches를 분리하고 순서를 계산.
  - court별로 group/tournament match를 배치하고, 마지막에 break 슬롯 추가.
  - start_at/end_at은 자동 계산(입력된 startTime + match/break duration).
- generateScheduleTimes:
  - 기존 schedule_slots에서 court_id가 있는 슬롯을 가져옴.
  - court/ division/ stage/ group 정렬 기준으로 순서를 정렬.
  - 각 코트 기준으로 start_at/end_at을 연속 계산.
- validateScheduleBeforeSync:
  - match_id, court_id, start_at/end_at 누락, 시간 역전, 코트 겹침, 중복 매치, sort_order 연속성 검사.
  - errors 배열 반환. warnings는 현재 미사용.
- updateSlotCourt:
  - slot과 court가 해당 tournament에 속하는지 검증 후 court_id 업데이트.
- reorderGroupSlots / reorderTournamentSlots:
  - 그룹/토너먼트별 slot_id 순서 검증 후 sort_order 재정렬.
- swapSlotMatchAssignments / assignMatchToEmptySlot / unassignMatchFromSlot:
  - 슬롯 간 match_id 교체/이동/해제 + matches.slot_id 동기화.

### 5.2 schedule.ts (구 스케줄 API)
- 파일: lib/api/schedule.ts
- 기능:
  - matches 테이블 직접 기반 스케줄 자동 배정(generateSchedule).
  - bulkSaveSchedule: matches의 scheduled_at/court_id 저장.
- 현재 schedule page는 schedule-slots 기반으로 동작하며, schedule.ts는 별도/레거시 성격.

### 5.3 scheduleSlots.ts (구 schedule_slots CRUD)
- 파일: lib/api/scheduleSlots.ts
- 기능:
  - schedule_slots 테이블의 단순 list/create/update.
  - slot_type에 break/maintenance/buffer/match/tournament_placeholder 포함.
- schedule-slots.ts와 중복 영역이 존재.

## 6) DB 스키마 및 마이그레이션
- 파일: supabase/migrations/0113~0117
- 핵심 요약:
  - schedule_slots 테이블 생성(0113) 후 slot_type 제약 확장(0114).
  - stage_type, start_time/end_time, matches.slot_id 추가(0115) 후 time check 조정.
  - start_at/end_at nullable 허용(0116), start_time/end_time 컬럼 제거 및 slot_type 확장(0117).
- 현재 사용 필드: start_at/end_at, stage_type, slot_type(match/break/buffer/maintenance/tournament/tournament_placeholder).
- RLS: schedule_slots select는 로그인 사용자, insert/update/delete는 organizer 전용.

## 7) 요구사항별 영향 범위 추적
### 7.1 UI/UX 및 버튼 기능 변경
- "동기화 저장" -> "저장": ScheduleSyncActions 버튼 텍스트.
- "동기화 초기화" -> "초기화": ScheduleSyncActions 버튼 텍스트.
- 검증(Validation) 기능 제거:
  - ScheduleSyncActions: handleValidate, handleSave의 validateScheduleBeforeSyncAction 호출 제거 필요.
  - validateScheduleBeforeSyncAction 자체는 다른 곳에서 쓰는지 확인 필요(현재 ScheduleSyncActions만 사용).
- "스케줄 재생성" 버튼 제거:
  - ScheduleGenerateActions: handleRegenerate 및 버튼 제거.
  - regenerateScheduleBoardAction은 server action 레벨에서 미사용 가능.
- 입력란 제거(대회 설정 내 시작시간, 휴식시간):
  - Tournament edit/new form에는 해당 입력이 없음.
  - 현재 입력은 schedule 페이지의 Generate/Time 액션 컴포넌트에 존재.
  - 요구사항이 "대회 설정"이라면 별도 UI 위치 확인 필요(현재 조사 범위 내에는 없음).

### 7.2 스케줄 리스트 구조 통합
- 현재:
  - ScheduleSlotsBoard가 리그/토너먼트 테이블 분리 렌더.
  - 코트/디비전 단위로 그룹화된 구조.
- 변경 필요:
  - 단일 테이블로 통합, Group/Tournament/Break 타입을 한 테이블에서 표시.
  - 기존 group/tournament 분리 로직 정리 필요.

### 7.3 스케줄 자동 생성 로직
- 현재:
  - generateScheduleSlots는 전체 슬롯 생성 + 시간 자동 할당 + break 슬롯 추가.
  - generateScheduleTimes는 기존 슬롯에 시간만 재계산.
- 요구사항:
  - 각 경기별 소요시간 입력 후 자동 생성 버튼.
  - 생성 이후 row 단위 수정 가능.
- 영향:
  - 입력 방식(UI)와 API 파라미터 구조 재설계 필요.

### 7.4 개별 스케줄(행 단위) 편집
- 현재:
  - DnD: match 슬롯 간 이동(동일 섹션, 동일 stage_type)
  - 코트 변경 가능, 시간 직접 수정 불가
- 요구사항:
  - Drag & Drop으로 순서 변경
  - 타입 변경: Group/Tournament/Break
  - 코트 변경
  - 시간은 읽기 전용, 소요시간 입력 가능
  - 저장 버튼(행/전체)
  - 순서/시간 변경 시 자동 시간 재계산
- 영향:
  - ScheduleSlotsBoard 구조 변경, slot_type/stage_type 업데이트 API 추가 필요.
  - generateScheduleTimes를 재사용하거나 새로운 재계산 로직 필요.

// TODO:저장 버튼(행/전체) 제거

### 7.5 정렬 및 데이터 정합성 체크
- 현재 validateScheduleBeforeSync는 sort_order 연속성, 코트 겹침 검사만 제공.
- 요구사항:
  - 코트 순서 정합성 체크
  - 디비전 순서 정합성 체크
- 영향:
  - validateScheduleBeforeSync 확장 또는 별도 검증 로직 필요.

## 8) 추가 관찰 및 리스크
- schedule-slots 기반 UI와 schedule.ts 기반 로직이 병존.
- ScheduleForm / ScheduleTimeActions / ScheduleSeedActions는 사용 여부가 불명확(페이지에서 직접 호출되지 않음).
- sort_order는 sectionId 단위가 아니라 court 단위로 검증하는 구조. 통합 테이블 전환 시 검증 기준 재검토 필요.
- start_at/end_at은 schedule_slots에 저장되며, match에 반영하려면 syncScheduleToMatches 필요.

## 9) 변경 시 우선 확인 질문(후속 작업용)
- "대회 설정"에서 제거해야 하는 시작시간/휴식시간 입력은 별도 페이지/컴포넌트가 존재하는지 확인 필요.
- 통합 테이블 기준(코트/디비전/스테이지 순서)와 정렬 우선순위 정의 필요.
- 자동 생성 시 "소요시간"을 개별 경기별로 입력하는 UI 설계 범위(매치별 입력 UI 위치) 정의 필요.
