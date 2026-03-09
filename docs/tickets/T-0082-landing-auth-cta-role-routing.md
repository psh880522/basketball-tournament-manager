# Vertical Slice Ticket

## 목표

- 랜딩(`/`)에서 로그인/회원가입 CTA 제공
- 랜딩에서 “모집 중(open)”, “진행 중(in-progress)” 대회 리스트 표시
- 로그인 성공 후 **role에 따라 자동 이동**
  - organizer → Admin Console
  - team_manager / player → Dashboard (role별 UI 분기)
- Admin Console에서 “대회 관리 관련 기능” 링크/카드가 노출된다
- Dashboard에서 role에 맞는 핵심 UI/링크가 노출된다

---

## 범위 요약 (중요)

- 이번 티켓은 **진입 UX + 라우팅 + 최소한의 콘솔/대시보드 UI 노출**이 핵심이다
- DB 구조 변경은 없다
- 기존 기능 페이지는 재사용하고, 콘솔/대시보드는 “링크/요약” 중심으로 구성한다
- 복잡한 통계/리포트/실시간은 포함하지 않는다

---

## 1) 랜딩(`/`) 요구사항

### 1-1 Auth CTA
- 비로그인:
  - “로그인” → `/login`
  - “회원가입” → `/signup`
- 로그인:
  - “Dashboard” → `/dashboard`
  - organizer면 “Admin Console” → `/admin`

### 1-2 대회 리스트 섹션 2개
A. 모집 중 대회(Open)
- 조건: tournaments.status = 'open'
- 카드: 대회명/기간/장소/상태배지
- CTA:
  - “상세보기” → `/tournament/[id]`
  - (선택) “참가 신청” → 로그인 여부에 따라
    - 비로그인: `/login`
    - 로그인: `/tournament/[id]/apply`

B. 진행 중 대회(In Progress)
- 파생 규칙(최소):
  - tournaments.status = 'closed'
  - AND 해당 tournament에 matches 존재
  - AND matches 중 status != 'completed' 하나 이상 존재
- CTA:
  - “대회 보기” → `/tournament/[id]`

---

## 2) 로그인 후 Role 기반 라우팅 (핵심)

### 요구사항
- `/login`에서 로그인 성공 시 사용자의 role을 조회하고,
  아래 규칙대로 redirect한다:

- organizer → `/admin`
- team_manager → `/dashboard`
- player → `/dashboard`

> role 조회 실패/role 없음이면 기본값은 `/dashboard`

### role 조회 방식(원칙)
- 기존 프로젝트의 Profiles & Roles 구조를 따른다
- 예시:
  - profiles 테이블에 role 컬럼이 있거나
  - user_roles 테이블이 있거나
  - 역할 판정 helper가 이미 존재할 수 있음

이번 티켓에서는:
- `/lib/api/auth.ts` 또는 `/lib/api/profiles.ts`에
  `getCurrentUserRole()` helper를 만들거나 재사용한다

---

## 3) Admin Console UI 노출 (대회 관리 링크)

### 경로
- `/admin`

### 요구사항(최소 UI)
- “대회 관리” 섹션에 카드/링크로 다음 기능 진입을 제공한다:
  - 대회 생성/목록 (기존 admin tournaments list 페이지가 있으면 연결)
  - 대회 운영 대시보드 (T-0074 경로로 연결)
- “최근 대회” 3개 정도를 보여주면 좋지만(선택),
  이번 티켓에서 데이터 조회가 부담되면 링크만 제공해도 된다

> 새 기능 구현이 아니라 “기존 기능 접근성을 올리는 UI”가 목적

---

## 4) Dashboard UI (team_manager / player)

### 경로
- `/dashboard`

### 요구사항(최소 UI)
- team_manager:
  - “내 팀” 링크(`/team`)
  - “참가 신청한 대회 상태” 안내 링크(가능하면 `/tournaments` 또는 `/team` 기반)
- player:
  - 기본적으로 “대회 둘러보기”(`/tournaments`)만 제공해도 됨
  - (player가 실제로 팀/선수에 연결되는 모델이 있다면) “내 참가 정보” 섹션(선택)

> player role이 아직 실데이터로 연결되지 않았다면,
> 이번 티켓에서는 player 대시보드는 최소 링크 수준으로 유지한다.

---

## 5) UI 컴포넌트
- T-0080의 Tailwind 공통 컴포넌트 재사용:
  - Button / Card / Badge

---

## 데이터 조회

### 랜딩
- open tournaments 조회
- in-progress tournaments 조회(파생 규칙)

### role routing
- 로그인 후 current user role 조회

### admin/dashboard
- 기본은 정적 링크 UI만으로도 OK
- (선택) 최근 대회/내 팀 요약이 가능하면 추가

---

## 권한

- `/admin` 및 `/admin/**`: organizer만 접근 가능(기존 정책 유지)
- `/dashboard`: 로그인 사용자(team_manager/player) 접근 가능
- role routing은 서버에서 강제 redirect

---

## 수정 허용 범위 (필수)

- `/app/page.tsx`
- `/app/login/actions.ts` (로그인 성공 후 role 기반 redirect)
- `/lib/api/auth.ts` (getCurrentUserRole helper 추가/확장)
- `/app/admin/page.tsx` (Admin Console UI 노출)
- `/app/dashboard/page.tsx` (Dashboard role별 UI)
- `/lib/api/tournaments.ts` (랜딩 리스트 조회 helper)
- `/lib/api/matches.ts` (in-progress 판정 필요 시)
- `/components/ui/Button.tsx`
- `/components/ui/Card.tsx`
- `/components/ui/Badge.tsx`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 검색/필터/페이징
- 실시간 현황판
- 복잡한 통계/리포트
- 역할 변경 UI (role management)
- player의 완전한 참가 정보 매핑(데이터 모델 추가)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] 랜딩에서 비로그인 사용자에게 로그인/회원가입 버튼이 보이고 이동한다
- [ ] 랜딩에서 open / in-progress 대회 리스트가 표시된다(없으면 빈 상태)
- [ ] 로그인 성공 후 role 기반 redirect가 동작한다
  - organizer → /admin
  - team_manager/player → /dashboard
- [ ] /admin에 “대회 관리” 관련 UI(링크/카드)가 노출된다
- [ ] /dashboard에서 role에 맞는 최소 UI가 노출된다
- [ ] Tailwind 스타일로 레이아웃이 깨지지 않는다