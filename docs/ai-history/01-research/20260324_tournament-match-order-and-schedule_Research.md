# Research: 토너먼트 경기 순서 및 스케줄 배치

Date: 2026-03-24

## 목표
현재 토너먼트 경기 정렬, 코트 배치, 다음 라운드 배치 로직을 분석하여 스케줄 배치 문제(코트 display_order, 시드 기반 경기 순서, 다음 라운드 배치)를 해결할 수 있도록 기반 정보를 정리한다.

## 기술 스택
- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling: Tailwind CSS 4
- Backend: Supabase (Postgres, Auth, RLS)
- Hosting: Vercel

Sources
- package.json
- README.md
- next.config.ts, tsconfig.json, tailwind.config.ts

## 구조 개요
- app/: App Router 페이지 및 서버 액션
  - admin/tournaments/[id]/bracket: 브래킷 생성, 시드 입력
  - admin/tournaments/[id]/schedule: 스케줄 슬롯 보드 및 생성
  - admin/tournaments/[id]/matches: 경기 목록
  - admin/tournaments/[id]/result: 결과 입력 및 자동 진출
- lib/api/: 서버 데이터 접근 및 도메인 로직
  - bracket.ts, matches.ts, results.ts
  - schedule.ts, schedule-slots.ts
  - courts.ts
- lib/formatters/: 경기 라벨/라운드 메타 포맷터
- components/: 공용 UI (Card, Button, Nav)
- supabase/migrations/: DB 스키마 및 RLS 이력
- docs/tickets/: 요구사항 및 규칙

## 데이터 모델 (핵심 테이블)
### matches
- 리그/토너먼트 경기 데이터.
- 주요 필드:
  - group_id (리그/토너먼트 연결)
  - seed_a, seed_b
  - team_a_id, team_b_id
  - court_id
  - scheduled_at
  - status, score_a, score_b, winner_team_id
  - slot_id (schedule_slots 연결)
- 제약 및 이력:
  - 0060/0063/0064: round 기반 토너먼트 도입 후 제거됨.
  - 0118_bracket_refactor: matches.round 제거, seed_a/seed_b 추가.

### groups
- 리그 조 및 토너먼트 라운드 표현.
- 주요 필드: name, order, type (league/tournament).
- 토너먼트 라운드 name 값: round_of_16, quarterfinal, semifinal, final, third_place.

### courts
- display_order가 코트 순서를 결정.
- 스케줄 배치 및 UI 정렬에 사용됨.

### schedule_slots
- 스케줄 보드 슬롯.
- 주요 필드: slot_type, stage_type, sort_order, start_at, end_at, match_id, court_id, division_id.
- sort_order가 섹션 내 정렬 기준으로 사용됨.

Sources
- supabase/migrations/0040_generate_bracket.sql
- supabase/migrations/0041_court_management.sql
- supabase/migrations/0042_match_court_assignment.sql
- supabase/migrations/0050_match_result_input.sql
- supabase/migrations/0060_generate_seeded_bracket.sql
- supabase/migrations/0063_add_third_place_round.sql
- supabase/migrations/0064_add_round_of_16.sql
- supabase/migrations/0113_schedule_slots.sql
- supabase/migrations/0114_schedule_slots_slot_type.sql
- supabase/migrations/0115_schedule_slots_schema_foundation.sql
- supabase/migrations/0116_schedule_slots_nullable_times.sql
- supabase/migrations/0117_schedule_slots_time_and_slot_type.sql
- supabase/migrations/0118_bracket_refactor.sql

## 토너먼트 경기 생성 및 시드
### 브래킷 생성
- lib/api/bracket.ts
  - createTournamentMatches
    - 라운드 그룹 생성 및 order 설정.
    - 각 라운드별 빈 경기 생성 (team_a_id/team_b_id null).
    - 라운드 내 정렬은 created_at 기반.
  - getBracketGenerationSummary
    - 디비전별 그룹/라운드 요약 구성.
    - groups.order로 라운드 정렬.

### 시드 입력
- app/admin/tournaments/[id]/bracket/Form.tsx
  - 경기별 seedA/seedB 수동 입력.
  - updateMatchSeedAction -> lib/api/matches.ts:updateMatchSeeds.

### 순위 기반 시딩
- lib/api/results.ts
  - seedTournamentTeamsFromConfirmedStandings
    - groups.order 기준 첫 라운드 선택.
    - matches를 created_at으로 정렬.
    - 시드 페어(1 vs N, 2 vs N-1 등) 배치.
    - seed_a/seed_b는 저장하지 않고 team_a_id/team_b_id만 설정.
  - getTournamentSeedingPreview
    - 시드 페어를 이용한 미리보기 출력.

Implication: 1라운드 경기 순서가 created_at 기준이므로, created_at이 시드 순서를 반영하지 않으면 시드 매칭과 표시가 어긋날 수 있다.

## 스케줄 생성 및 코트 배치
현재 두 가지 스케줄 경로가 존재한다.

### 1) 직접 매치 스케줄링 (legacy)
- lib/api/schedule.ts: generateSchedule
  - courts를 display_order로 정렬.
  - matches를 created_at으로 정렬.
  - division order -> group_id -> created_at 순으로 정렬.
  - 코트는 round-robin으로 배정.
  - matches.scheduled_at, matches.court_id 직접 업데이트.

### 2) 스케줄 슬롯 보드
- lib/api/schedule-slots.ts: generateScheduleSlots
  - courts를 display_order로 정렬.
  - courtOrder = [court.id] 생성.
  - 리그 경기는 조별로 가능한 한 같은 코트에 배치.
  - 토너먼트 경기
    - division order -> group order -> created_at 순 정렬.
    - match.court_id가 null이면 courtOrder로 round-robin 배정.
  - court 기준 sort_order 생성.
  - 코트별로 시간 순차 배정.

Implication
- 두 경로 모두 코트 순서는 display_order를 사용하지만, 토너먼트 경기 순서는 created_at에 의존한다.
- created_at 순서가 시드 순서와 다르면 초기 경기들이 같은 코트에 몰리는 문제가 발생할 수 있다.

## 경기 목록/결과 페이지 정렬 및 라벨
### 경기 목록 (/admin/tournaments/[id]/matches)
- listTournamentMatches (lib/api/matches.ts)
  - scheduled_at -> created_at 순 정렬.
- UI는 buildTournamentRoundMetaByRound로 roundIndex/roundTotal 계산.

### 스케줄 보드 (/admin/tournaments/[id]/schedule)
- ScheduleSlotsBoard
  - 슬롯 정렬(start_at, sort_order)로 roundIndex/roundTotal 계산.
  - formatTournamentMatchLabel은 roundIndex 기반 시드 라벨을 생성.
  - 시드는 standings rank를 사용하며 matches.seed_a/b는 사용하지 않는다.

### 결과 페이지 (/admin/tournaments/[id]/result)
- listTournamentMatchesByDivision (lib/api/results.ts)
  - created_at 기준 정렬.
- saveTournamentResult
  - created_at 기반 currentIndex를 계산.
  - currentIndex / 2로 다음 라운드 슬롯 결정.
  - 짝/홀 인덱스로 team_a_id/team_b_id 슬롯 결정.

Implication: created_at 순서가 실제 시드 기반 경기 순서와 다르면 라벨 및 자동 진출 위치가 틀어질 수 있다.

## 포맷터 및 라운드 메타
- lib/formatters/matchLabel.ts
  - formatTournamentMatchLabel
    - 실제 팀 배정 시 팀명 표시.
    - 초기 라운드는 roundIndex/roundTotal 기반 시드 라벨 생성.
    - 이후 라운드는 이전 경기 참조 라벨 생성.
  - getInitialTournamentRound는 고정 ROUND_ORDER 사용.
- lib/formatters/tournamentRoundMeta.ts
  - buildTournamentRoundMetaByRound
    - 입력된 정렬 기준을 기반으로 roundIndex/roundTotal/previousRoundTotal 계산.

Implication: 상위 정렬 기준이 잘못되면 라벨과 자동 진출 참조가 모두 틀어진다.

## 요구사항과 직접 대응되는 문제
1) 8강 1/2경기가 B코트에 배치
- generateScheduleSlots에서 created_at 순서에 따라 코트 round-robin 배정.
- created_at 순서가 시드 순서를 반영하지 않으면, 초기 경기들이 같은 코트로 몰릴 수 있다.

2) 8강 1경기가 3위 vs 6위로 표시
- formatTournamentMatchLabel은 roundIndex 기반으로 시드를 계산.
- roundIndex는 created_at/slot 정렬 결과에 따라 결정되므로 순서가 틀리면 라벨이 틀어진다.

3) 8강 결과 입력 후 4강 배치 미반영 또는 라벨 미변경
- saveTournamentResult는 created_at 순서로 currentIndex를 계산해 다음 라운드 슬롯을 결정.
- 경기 순서가 틀리면 승자가 잘못된 경기로 배치될 수 있다.
- 다음 라운드 라벨도 roundIndex/previousRoundTotal 기반이어서 틀어진다.

## 관련 파일 목록
### API/로직
- lib/api/bracket.ts
- lib/api/matches.ts
- lib/api/results.ts
- lib/api/schedule.ts
- lib/api/schedule-slots.ts
- lib/api/courts.ts

### UI
- app/admin/tournaments/[id]/bracket/page.tsx
- app/admin/tournaments/[id]/bracket/Form.tsx
- app/admin/tournaments/[id]/schedule/page.tsx
- app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx
- app/admin/tournaments/[id]/matches/page.tsx
- app/admin/tournaments/[id]/result/page.tsx
- app/admin/tournaments/[id]/result/components/ResultForm.tsx

### 포맷터
- lib/formatters/matchLabel.ts
- lib/formatters/tournamentRoundMeta.ts

### 스키마
- supabase/migrations/0118_bracket_refactor.sql
- supabase/migrations/0041_court_management.sql
- supabase/migrations/0115_schedule_slots_schema_foundation.sql
- supabase/migrations/0117_schedule_slots_time_and_slot_type.sql

### 관련 티켓
- docs/tickets/T-0133-tournament-unassigned-match-seed-based-display-rules.md
- docs/tickets/T-0127-tournament-result-entry-and-next-round-auto-advance.md
- docs/tickets/T-0123-group-court-affinity-in-schedule-generation.md
- docs/tickets/T-0117-schedule-generation-and-break-insertion.md
- docs/tickets/T-0119-schedule-sync-to-matches.md
- docs/tickets/T-0113-group-and-tournament-slot-seeding.md

## 발견된 리스크 및 갭
1) 여러 핵심 경로에서 created_at 정렬에 의존
- 시드 라벨, 코트 배치, 다음 라운드 배치 모두에 영향을 줌.
- 현재 문제의 핵심 원인일 가능성이 높다.

2) seed_a/seed_b는 저장되어 있으나 정렬에 사용되지 않음
- listTournamentMatches에서 seed 필드를 조회하지 않음.
- 스케줄/결과 정렬에 seed가 반영되지 않음.

3) schedule.ts가 matches.round를 여전히 조회
- 0118에서 round 컬럼이 제거됨.
- 레거시 로직이 남아 있을 수 있으므로 확인 필요.

4) 스케줄 보드는 standings rank를 기준으로 라벨링
- roundIndex 기반 라벨 + standings rank 조합.
- 스케줄 순서가 틀리면 시드 라벨도 틀어진다.

## 구현 계획을 위한 메모
- 코트 순서는 이미 display_order 기반이므로, 경기 순서를 시드 기준으로 맞추는 것이 핵심이다.
- 정렬 키를 다음 경로에 일관되게 적용해야 한다:
  - 스케줄 생성
  - 경기 목록 라운드 메타
  - 결과 입력의 다음 라운드 배치
- 후보 정렬 키:
  - 초기 라운드: seed_a, seed_b
  - group.order + 라운드 내 매치 인덱스
  - schedule slot sort_order

## 요약
현재 경기 정렬 로직이 created_at 기반으로 되어 있어, 시드 기반 경기 순서를 보장하지 못한다. 그 결과 코트 배치, 라벨 표시, 다음 라운드 배치가 모두 틀어질 수 있다. 해결을 위해서는 seed_a/seed_b 또는 라운드별 고정 매치 인덱스를 기준으로 한 결정적 정렬 키를 도입하고, 스케줄 생성/표시/자동 진출 로직에 일관되게 적용해야 한다.
