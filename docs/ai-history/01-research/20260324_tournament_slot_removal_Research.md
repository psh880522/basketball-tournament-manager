# 연구 보고서 - 토너먼트 슬롯 포함 제거

## 1. 프로젝트 맥락 및 기술 스택

### 1.1 핵심 스택
- 프레임워크: Next.js App Router (서버 컴포넌트 + 클라이언트 컴포넌트)
- 언어: TypeScript
- UI: Tailwind CSS
- 백엔드: Supabase (Postgres + Auth + RLS)
- 호스팅 대상: Vercel

근거
- 패키지 메타데이터: [package.json](package.json)
- App Router 및 UI 구조: [app](app)
- 스타일링 파이프라인: [tailwind.config.ts](tailwind.config.ts), [postcss.config.mjs](postcss.config.mjs)
- 프로젝트 개요 및 스택 요약: [README.md](README.md)

### 1.2 도구
- ESLint로 린팅
- TypeScript strict 모드 활성화
- Next.js 타입 플러그인 설정

근거
- TypeScript 설정: [tsconfig.json](tsconfig.json)
- 린트 관련 의존성: [package.json](package.json)

## 2. 워크스페이스 구조와 책임

### 2.1 최상위 폴더
- [app](app): Next.js App Router 페이지, 레이아웃, 라우트 단위 컴포넌트.
- [components](components): 공용 UI 및 네비게이션 컴포넌트.
- [lib](lib): 도메인 API 래퍼 및 포매팅 유틸리티.
- [supabase](supabase): DB 마이그레이션과 시드 데이터.
- [docs](docs): 아키텍처, 티켓, AI 프로세스, 리서치 히스토리.
- [public](public): 정적 자산(이번 요청에서는 확장 조사하지 않음).
- [src](src): 추가 도메인 기능 및 공유 라이브러리(이번 요청에서는 확장 조사하지 않음).
- [ai_docs](ai_docs): 프로젝트 수준 AI 계획/리서치 문서.

### 2.2 App Router 영역(선정)
- 대회/디비전 관리 편집 흐름
  - [app/admin/tournaments/[id]/edit](app/admin/tournaments/[id]/edit)
- 순위 확정 및 토너먼트 시딩 결과 관리 흐름
  - [app/admin/tournaments/[id]/result](app/admin/tournaments/[id]/result)

### 2.3 API 레이어(서버 사이드)
- 디비전 및 순위 로직
  - [lib/api/divisions.ts](lib/api/divisions.ts)
  - [lib/api/results.ts](lib/api/results.ts)

### 2.4 데이터베이스
- 디비전 설정 마이그레이션
  - [supabase/migrations/0110_division_operating_config.sql](supabase/migrations/0110_division_operating_config.sql)

### 2.5 문서 / 티켓
- 디비전 운영 설정 기능
  - [docs/tickets/T-0110-division-operating-config.md](docs/tickets/T-0110-division-operating-config.md)
- 리그 순위 확정 및 토너먼트 시딩
  - [docs/tickets/T-0126-league-standings-confirmation-and-tournament-team-seeding.md](docs/tickets/T-0126-league-standings-confirmation-and-tournament-team-seeding.md)

## 3. 기능 초점: 토너먼트 슬롯 포함(include_tournament_slots)

### 3.1 데이터 모델
- `divisions.include_tournament_slots`는 기본값 `false`인 불리언 필드.
- `tournament_size`와 함께 디비전 단위 토너먼트 설정으로 추가됨.

근거
- 마이그레이션: [supabase/migrations/0110_division_operating_config.sql](supabase/migrations/0110_division_operating_config.sql)
- 디비전 타입: [lib/api/divisions.ts](lib/api/divisions.ts)

### 3.2 API 표면 및 서버 액션

#### 디비전 생성/수정
- `createDivision`이 `include_tournament_slots`를 받아 DB에 저장함(미지정 시 기본 `false`).
- `updateDivision`이 `include_tournament_slots` 토글을 허용함.
- `updateDivisionConfig`는 `updateDivision`의 얇은 래퍼.

근거
- 디비전 API: [lib/api/divisions.ts](lib/api/divisions.ts)

#### 관리자 서버 액션
- `createDivisionAction`, `updateDivisionAction`이 클라이언트 폼의 `include_tournament_slots`를 API로 전달함.

근거
- 관리자 편집 액션: [app/admin/tournaments/[id]/edit/actions.ts](app/admin/tournaments/[id]/edit/actions.ts)

#### 결과 처리 흐름
- `confirmLeagueStandings`가 `divisions.include_tournament_slots = true`로 업데이트하여 확정 상태로 표기함.
- `seedTournamentTeamsFromConfirmedStandings`가 `include_tournament_slots`가 `false`이면 시딩을 차단함.

근거
- 결과 API: [lib/api/results.ts](lib/api/results.ts)
- 결과 액션: [app/admin/tournaments/[id]/result/actions.ts](app/admin/tournaments/[id]/result/actions.ts)

### 3.3 UI 표면

#### 디비전 관리(관리자 편집)
- 디비전 추가 폼에서 `include_tournament_slots` 체크박스를 제공함.
- 디비전 인라인 편집 폼에서 체크박스를 토글 가능.
- 디비전 리스트에서 현재 값을 “포함/미포함”으로 표시.

근거
- 관리자 편집 UI: [app/admin/tournaments/[id]/edit/Form.tsx](app/admin/tournaments/[id]/edit/Form.tsx)

#### 결과 관리
- 결과 페이지가 `division.include_tournament_slots`를 `isConfirmed`로 ResultForm에 전달함.

근거
- 결과 페이지: [app/admin/tournaments/[id]/result/page.tsx](app/admin/tournaments/[id]/result/page.tsx)
- 결과 폼: [app/admin/tournaments/[id]/result/components/ResultForm.tsx](app/admin/tournaments/[id]/result/components/ResultForm.tsx)

### 3.4 티켓의 설계 의도
- 초기에는 디비전 설정의 “토너먼트 슬롯 자동 생성” 플래그로 도입됨.
- 이후 리그 순위 확정 워크플로우의 확인 상태로 재사용됨.

근거
- 디비전 운영 설정: [docs/tickets/T-0110-division-operating-config.md](docs/tickets/T-0110-division-operating-config.md)
- 순위 확정 및 시딩: [docs/tickets/T-0126-league-standings-confirmation-and-tournament-team-seeding.md](docs/tickets/T-0126-league-standings-confirmation-and-tournament-team-seeding.md)

## 4. 요청된 제거와 직접 관련된 파일

### 4.1 UI 및 클라이언트 상태
- 디비전 생성/편집 체크박스 상태 및 표시
  - [app/admin/tournaments/[id]/edit/Form.tsx](app/admin/tournaments/[id]/edit/Form.tsx)

### 4.2 서버 액션
- 디비전 생성/수정 액션이 `include_tournament_slots`를 전달
  - [app/admin/tournaments/[id]/edit/actions.ts](app/admin/tournaments/[id]/edit/actions.ts)

### 4.3 API 및 데이터 접근
- 디비전 타입이 해당 필드를 포함
- 생성/수정이 해당 필드를 수용
  - [lib/api/divisions.ts](lib/api/divisions.ts)

### 4.4 결과 흐름 및 확정
- `include_tournament_slots`를 확정 게이트로 사용
- `confirmLeagueStandings`가 필드를 true로 설정
- `seedTournamentTeamsFromConfirmedStandings`가 필드를 읽어 시딩 허용
  - [lib/api/results.ts](lib/api/results.ts)

### 4.5 데이터베이스
- 스키마 마이그레이션에 컬럼 정의가 존재
  - [supabase/migrations/0110_division_operating_config.sql](supabase/migrations/0110_division_operating_config.sql)

## 5. 기능 결합 요약(제거가 단순하지 않은 이유)

- 해당 필드는 **디비전 설정 토글**과 **결과 확정 상태**로 동시에 사용됨.
- 관리자 편집 페이지의 체크박스를 제거하는 것은 UI 레이어만의 변경이며, 백엔드는 동일 플래그로 시딩을 차단하고 있음.
- 필드를 완전히 제거하면 다음에 영향:
  - 디비전 CRUD 검증 및 페이로드
  - 결과 확정 흐름
  - 토너먼트 시딩 자격 체크
  - DB 스키마

따라서 제거 시 결정해야 할 사항:
- 확정 흐름이 `include_tournament_slots`를 대체할 새 플래그(예: `standings_confirmed`)가 필요한지, 또는
- 시딩 흐름이 기존 `standings_dirty`나 다른 규칙에 의존하도록 바꿀지.

## 6. 구현 계획을 위한 추가 메모

- `include_tournament_slots`는 디비전 리스트 UI에 저장되고 표시됨. 제거 시 표시도 함께 제거하거나 대체해야 함.
- `confirmLeagueStandings`는 독립적인 “확정” 필드가 없고, 오직 `include_tournament_slots`만 토글함.
- `seedTournamentTeamsFromConfirmedStandings`는 confirm-before-seed 제약을 위해 해당 플래그를 사용함.

이 위치들이 “토너먼트 슬롯 포함 체크 제거” 요구사항을 해결하기 위한 주요 의존 체인이다.
