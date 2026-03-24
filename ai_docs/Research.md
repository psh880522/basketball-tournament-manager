
작성일: 2026-03-20
범위: 프로젝트 구조와 핵심 파일을 깊이 분석하고, admin/tournaments/new 및 admin/tournaments/[id]/edit UI 개선을 중심으로 정리.

---

## 1) 리포지토리 개요

### 루트 구조(최상위)
- app/: Next.js App Router 페이지, 레이아웃, API 라우트.
- components/: 공용 UI와 네비게이션 컴포넌트.
- lib/: Supabase 쿼리/뮤테이션 중심의 도메인 로직.
- src/: 인증/권한, Supabase 클라이언트(server/browser).
- supabase/: DB 마이그레이션과 seed SQL.
- docs/: 티켓/정책 문서.
- ai_docs/: 리서치/플랜 산출물 저장.

### 주요 기술 스택
- 프레임워크: Next.js 16.1.6 (App Router, Server Components).
- 언어: TypeScript 5.
- UI: Tailwind CSS v4 (PostCSS 플러그인 기반).
- 런타임: React 19.2.3.
- 백엔드: Supabase (Postgres/Auth/RLS) + @supabase/ssr, @supabase/supabase-js.
- 도구: ESLint 9, TypeScript, PNPM.

### 렌더링 모델
- 페이지 대부분은 Server Component.
- 폼과 상호작용은 Client Component(NewTournamentForm, TournamentEditForm 등).
- 데이터 접근은 lib/api/* 혹은 app/api/*에서 수행.

---

## 2) 전역 UI / 레이아웃

### app/layout.tsx
- GlobalHeader 포함, Space Grotesk 폰트 사용.
- 공통 헤더와 배경색은 globals.css 기반.

### app/globals.css
- CSS 변수 기반 팔레트 정의(--ui-bg, --ui-text 등).
- body 배경색 및 기본 텍스트 컬러 설정.

### components/ui
- Button: primary/secondary/ghost 변형.
- Card: default/highlight/muted 변형.
- Badge: default/success/warning/danger/info 변형.

---

## 3) admin/tournaments/new (대회 생성)

### 페이지 구조
- 파일: app/admin/tournaments/new/page.tsx
- 역할: organizer 인증 후 NewTournamentForm 렌더링.
- 현재 UI는 인라인 스타일 기반(리서치 범위에서 개선 필요).

### 폼 구조
- 파일: app/admin/tournaments/new/Form.tsx
- Client Component
- 상태: name, location, start_date, end_date, format, max_teams
- 제출 방식: fetch("/api/admin/tournaments") POST

### 데이터 흐름
1) 사용자 입력 → NewTournamentForm 상태 업데이트
2) submit 시 POST /api/admin/tournaments
3) 성공 시 /admin/tournaments로 이동 및 refresh

### 유효성/에러 처리
- 프론트: required 필드(name, start_date, end_date)
- 서버: JSON 파싱 실패, name/start/end 누락, 권한/로그인 검사
- 에러 메시지는 현재 영문 위주("Name is required.")

---

## 4) /api/admin/tournaments (대회 생성 API)

### 엔드포인트
- 파일: app/api/admin/tournaments/route.ts
- POST만 제공

### 검증 로직
- JSON 파싱 실패 → 400
- name/start_date/end_date 누락 → 400
- 인증 실패/권한 없음 → 401/403

### 데이터 저장
- Supabase insert into tournaments
- status는 "draft"로 고정
- created_by는 현재 로그인 유저 id

---

## 5) admin/tournaments/[id]/edit (대회 편집)

### 페이지 구조
- 파일: app/admin/tournaments/[id]/edit/page.tsx
- Server Component
- getTournamentForEdit + divisions + courts 로드
- Card 기반 UI, Tailwind 적용

### 폼 구조
- 파일: app/admin/tournaments/[id]/edit/Form.tsx
- Client Component
- 대회 기본 정보 수정 + DivisionsSection + CourtsSection
- 저장 시 updateTournamentAction 호출

### 대회 기본 정보
- 필드: name, location, start_date, end_date, status
- 상태 변경은 finished이면 비활성화
- 성공 시 /admin 이동 (600ms delay)

### 디비전 관리
- 추가/수정/삭제 기능 포함
- group_size, tournament_size, include_tournament_slots 지원
- Create/Update/Delete 시 서버 액션 호출 + optimistic update

### 코트 관리
- 코트 추가/수정/삭제
- display_order 및 이름 업데이트 지원

---

## 6) 관련 서버 액션

### app/admin/tournaments/[id]/edit/actions.ts
- updateTournamentAction: tournaments.update
- createDivisionAction / updateDivisionAction / deleteDivisionAction
- createCourtAction / updateCourtAction / deleteCourtAction
- 성공 시 edit 페이지 리밸리데이트

---

## 7) 인증 및 권한

### src/lib/auth/roles.ts
- getUserWithRole: Supabase Auth → profiles.role 조회
- organizer 전용 페이지/액션 대부분 여기서 차단

### src/lib/supabase/server.ts
- @supabase/ssr + cookies 기반 서버 클라이언트

---

## 8) UI/UX 관점의 현재 상태 요약

- admin/tournaments/new는 인라인 스타일로 구현되어 있으며, edit 페이지의 Card/Tailwind 기반 디자인과 일관성이 낮음.
- new 폼의 라벨 및 메시지가 영문/한글 혼재.
- edit 페이지는 구조가 명확하고, 섹션별 Card 구성으로 개선 작업 기준점 역할 가능.
- new 폼은 API 기반 POST 방식으로 구현되어 있어, UI 개선 시에도 동일 흐름 유지 필요.

---

## 9) 핵심 파일 목록 (리서치 범위)

- app/admin/tournaments/new/page.tsx
- app/admin/tournaments/new/Form.tsx
- app/api/admin/tournaments/route.ts
- app/admin/tournaments/[id]/edit/page.tsx
- app/admin/tournaments/[id]/edit/Form.tsx
- app/admin/tournaments/[id]/edit/actions.ts
- components/ui/Button.tsx
- components/ui/Card.tsx
- components/ui/Badge.tsx
- app/globals.css
- src/lib/auth/roles.ts
- src/lib/supabase/server.ts

---

## 10) 발견된 기술적 특이점

- new 페이지에는 actions.ts가 없고, fetch를 직접 호출하는 구조.
- edit 페이지는 서버 액션 기반이며, new 페이지와 구현 방식이 다름.
- tournaments API는 status를 draft로 강제해 신규 생성 상태가 고정.
- 인코딩 문제로 일부 lib/api/tournaments.ts 에러 메시지가 깨져 있음(전역 UX 품질에 영향 가능).

---

보고서 종료.
