# Research: Admin Tournament Result UI & Seeding Update

**기능명**: admin-tournament-result-ui

## 1. 프로젝트 루트 스캔 결과 (기술 스택, 구조)

### 1.1 기술 스택
- **Frontend**: Next.js App Router, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, PostCSS
- **Backend**: Supabase (Postgres, Auth, RLS) via server actions and API layer
- **Tooling**: ESLint 9

**근거 파일**
- `package.json`: Next 16.1.6, React 19.2.3, TypeScript, Tailwind 4
- `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`
- `README.md`: 프로젝트 설명, 스택, 운영 흐름

### 1.2 루트 폴더 역할 요약
- `app/`: Next.js App Router 페이지 및 라우트, 서버/클라이언트 컴포넌트
- `components/`: UI 공통 컴포넌트 (Button, Card 등)
- `lib/`: 도메인 API 및 포맷터
- `supabase/`: 마이그레이션, seed SQL
- `docs/`: 스펙/티켓/AI 히스토리 문서
- `src/`: 내부 유틸/기능 영역 (현재 탐색 범위 외)

## 2. 요구사항 영향 범위 중심 분석

### 2.1 대상 페이지: admin/tournaments/[id]/result

#### 2.1.1 페이지 진입 및 데이터 패칭
- **파일**: `app/admin/tournaments/[id]/result/page.tsx`
- **동작**
  - 인증/권한 체크: `getUserWithRole()`
  - divisions/courts 조회: `getDivisionsByTournament`, `getCourtsByTournament`
  - result 데이터 조회: 
    - 리그 순위: `getLeagueStandings`
    - 토너먼트 배치 미리보기: `getTournamentSeedingPreview`
    - 리그 경기: `listLeagueMatchesForResult`
    - 토너먼트 경기: `listTournamentMatchesByDivision`
    - 토너먼트 진행 상태: `getTournamentBracketProgress`
  - 위 결과를 `ResultForm`으로 전달

#### 2.1.2 ResultForm UI 구조 (핵심 UI 변경 대상)
- **파일**: `app/admin/tournaments/[id]/result/components/ResultForm.tsx`
- **섹션 구성**
  1) 리그 결과 입력 (리그 경기 테이블)
  2) 리그 순위 계산
  3) 토너먼트 팀 배치
  4) 토너먼트 결과 입력 (토너먼트 경기 테이블)
  5) 토너먼트 진행 상태 (라운드별 진행/배치 상태 표시)
  6) 상단 메시지 카드 (성공/오류)

- **Card 뎁스 (경기 테이블 섹션)**
  - 리그 결과 입력 섹션 내부
    - `Card` (섹션 최상위)
      - `Card` (코트별 래핑)
        - `Card` (배경용 래핑, 내부에 테이블)
  - 토너먼트 결과 입력 섹션 내부
    - 동일한 3중 구조
  - 요구사항: **경기 테이블 섹션의 최상위 Card 제거** → Card 뎁스를 3개로 낮춤 (현재 3중 구조 중 최상위 제거 시 2중 구조로 정리됨)

- **토너먼트 진행 상태 섹션**
  - `tournamentProgress`를 렌더링하여 라운드별 다음 라운드 배치 상태 표시
  - 요구사항: **섹션 제거**

#### 2.1.3 Server Actions
- **파일**: `app/admin/tournaments/[id]/result/actions.ts`
- **액션 목록**
  - `saveLeagueResultsAction` → `saveLeagueResult`
  - `calculateLeagueStandingsAction` → `calculateLeagueStandings`, `confirmLeagueStandings`
  - `confirmLeagueStandingsAction` → `confirmLeagueStandings`
  - `seedTournamentTeamsAction` → `seedTournamentTeamsFromConfirmedStandings`
  - `saveTournamentResultAction` → `saveTournamentResult`

### 2.2 토너먼트 팀 배치(Seeding) 로직

#### 2.2.1 핵심 API
- **파일**: `lib/api/results.ts`
- **함수**: `seedTournamentTeamsFromConfirmedStandings(divisionId)`

**현재 로직 요약**
1) Organizer 권한 확인
2) division 상태 조회 (`standings_dirty`, `tournament_size`, `include_tournament_slots`)
3) tournament_size 기반으로 첫 라운드 결정
   - `roundByTournamentSize`: 4 → `semifinal`, 8 → `quarterfinal`, 16 → `round_of_16`
4) standings 상위 N개 추출 (tournament_size 기준)
5) 해당 라운드 그룹(`groups.name`)의 match 목록 순서대로 seed pair 배치

**문제 지점 (요구사항과 충돌)**
- 배치 라운드가 **division의 tournament_size 고정 맵**에 의존
- 실제 DB에 생성된 토너먼트 라운드 구조를 기반으로 하지 않음
- 결과적으로 DB에 생성된 라운드가 다르거나 순서가 다른 경우, **4강만 배치되는 현상** 발생 가능

#### 2.2.2 토너먼트 라운드/그룹 생성
- **파일**: `lib/api/bracket.ts` → `createTournamentMatches`
- **동작**
  - tournament_size 값에 따라 라운드 리스트 생성
  - `groups` 테이블에 `type = 'tournament'`, `name`, `order` 생성
  - 각 라운드별 match 생성

**의미**
- DB에 라운드 구조는 이미 `groups` 테이블에 저장됨
- team seeding 시 **실제 groups 테이블 기반으로 첫 라운드 탐색**이 필요

### 2.3 토너먼트 진행 상태(현재 UI 제거 대상)
- **파일**: `lib/api/results.ts` → `getTournamentBracketProgress`
- **동작**
  - `listTournamentMatchesByDivision` 결과를 group별로 묶어 진행 상태 계산
  - `nextRoundMap`으로 다음 라운드 매핑
  - 라운드별 매치, 다음 라운드 슬롯 배치 여부 표시

**UI 렌더 위치**
- `ResultForm`의 마지막 Card 섹션

### 2.4 라운드 레이블/매치 라벨 포맷터
- **파일**: `lib/formatters/matchLabel.ts`
- **역할**
  - `formatTournamentMatchLabel`: 라운드/seed/경기 번호 기반 label 생성
  - `formatRoundLabel`, `formatTournamentCategoryLabel` 사용
  - `getInitialTournamentRound`, `getPreviousTournamentRound`는 round order 기반

### 2.5 매치 및 결과 관련 타입/쿼리
- **파일**: `lib/api/matches.ts`
  - `MatchRow`: `seed_a`, `seed_b`, `group` 포함
  - `getTournamentMatchesByDivision`, `getTournamentMatchesByGroupName`: group 기반 조회
- **파일**: `lib/api/results.ts`
  - `TournamentMatchRow`: group 정보 포함
  - `listTournamentMatchesByDivision`: group.type = tournament 매치 조회

### 2.6 스케줄/슬롯 로직
- **파일**: `lib/api/schedule-slots.ts`
- **특징**
  - `groups.name` 및 `groups.order` 기반으로 슬롯/매치 정렬
  - 토너먼트/리그 구분은 `group.type` 기반

## 3. UI 변경 포인트 상세 정리

### 3.1 경기 테이블 섹션 (Card 뎁스 조정)
- **대상**: `ResultForm`에서 리그/토너먼트 경기 테이블 섹션
- **현재 구조**
  - 섹션 최상위 Card → 코트별 Card → 내부 테이블 Card
- **요구사항**
  - **최상위 Card 제거**
  - 내부 구성은 유지 (코트별 카드, 테이블 카드 유지)

### 3.2 토너먼트 진행 상태 섹션 제거
- **대상**: `ResultForm` 마지막 Card 섹션
- **요구사항**
  - 전체 섹션 삭제
  - `tournamentProgress` 데이터는 페이지 로딩 구조에 남아 있더라도 UI에서 사용하지 않음

## 4. 토너먼트 팀 배치 요구사항과 현재 로직의 차이

### 4.1 현재 배치 기준
- `division.tournament_size` 기반으로 첫 라운드 이름 결정
- 해당 라운드의 match에 seed pair 배치

### 4.2 요구사항 기준
- **division에 생성된 토너먼트 라운드(groups)** 기준으로 배치해야 함
- 즉, DB에 존재하는 첫 라운드(가장 작은 `groups.order`)를 찾아 해당 라운드 matches에 seed 배치

### 4.3 영향을 받는 파일
- `lib/api/results.ts`: `seedTournamentTeamsFromConfirmedStandings`
- `app/admin/tournaments/[id]/result/actions.ts`: `seedTournamentTeamsAction` 호출만 담당 (직접 변경 없음)
- `app/admin/tournaments/[id]/result/components/ResultForm.tsx`: 버튼 동작은 유지되지만 결과 메시지/활성화 조건은 로직에 따라 달라질 수 있음

## 5. 변경 설계 시 고려 사항

- 토너먼트 라운드 구조는 `groups` 테이블에 의해 결정됨
- 현재 seeding은 standings rank 기반으로 매칭 pair를 생성
- **정렬 기준**: `groups.order` 오름차순 → 첫 라운드 추출
- **매치 정렬 기준**: `created_at` 기준 (현재 로직 유지)
- **팀 수 검증**: standings 상위 팀 수와 match 수의 일치 확인 필요

## 6. 요약: 핵심 수정 대상 목록

### UI
- `app/admin/tournaments/[id]/result/components/ResultForm.tsx`
  - 경기 테이블 섹션의 최상위 Card 제거
  - 토너먼트 진행 상태 섹션 제거

### 로직
- `lib/api/results.ts`
  - `seedTournamentTeamsFromConfirmedStandings`: first round 탐색 기준을 `groups` 기반으로 변경
  - `roundByTournamentSize` 의존 제거 또는 보조 로직으로 축소

### 관련 타입/헬퍼
- `lib/formatters/matchLabel.ts`: 라운드/seed 표기 로직 유지 (변경 필요성 낮음)
- `lib/api/matches.ts`: seeding 로직 직접 수정 필요 없음, but 조회 형태 유지

## 7. 참고: 관련 DB 구조
- `groups` 테이블
  - `type`: `league` | `tournament`
  - `name`: 라운드 식별자 (round_of_16, quarterfinal, semifinal, final, third_place)
  - `order`: 라운드 순서
- `matches` 테이블
  - `group_id`: 라운드 그룹 참조
  - `seed_a`, `seed_b`: 시드 정보 저장

---

## Appendix: 참고 파일 목록

- UI
  - `app/admin/tournaments/[id]/result/page.tsx`
  - `app/admin/tournaments/[id]/result/components/ResultForm.tsx`
  - `components/ui/Card.tsx`
  - `components/ui/Button.tsx`
- Actions
  - `app/admin/tournaments/[id]/result/actions.ts`
- API / Domain
  - `lib/api/results.ts`
  - `lib/api/bracket.ts`
  - `lib/api/matches.ts`
  - `lib/api/divisions.ts`
  - `lib/api/schedule-slots.ts`
- Formatters
  - `lib/formatters/matchLabel.ts`
