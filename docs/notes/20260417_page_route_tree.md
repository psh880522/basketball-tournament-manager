# 페이지 라우트 트리 & 사용자 흐름 분석

> 작성일: 2026-04-17  
> 분석 기준: 실제 소스 코드 (`app/**/page.tsx`, `layout.tsx`, `Sidebar.tsx`, Link/redirect 코드)  
> Next.js App Router, Route Group: `(public)`, `(auth)`, `(app)`

---

## 1. URL 기준 페이지 트리

```
/
├── (public)
│   └── /                           ← 홈 (공개, 역할별 분기 CTA)
│
├── (auth)
│   ├── /login
│   ├── /signup
│   ├── /forgot-password
│   └── /reset-password
│
└── (app)                           ← Sidebar 레이아웃 (로그인 시)
    ├── /dashboard
    ├── /tournaments
    ├── /tournament
    │   └── /[id]
    │       ├── (상세 페이지)
    │       ├── /apply
    │       └── /result
    ├── /onboarding
    │   ├── /profile
    │   ├── /identity
    │   ├── /team-choice
    │   └── /completion
    ├── /teams
    │   ├── /new
    │   ├── /find
    │   └── /[teamId]
    │       └── /applications
    ├── /my-applications
    │   └── /[applicationId]
    ├── /team                        ⚠️ 레거시
    │   └── /players                 ⚠️ 레거시
    └── /admin
        ├── /users
        └── /tournaments
            ├── /new
            └── /[id]
                ├── (대회 상세)
                ├── /edit
                ├── /applications
                ├── /bracket
                ├── /courts
                ├── /matches
                ├── /schedule
                ├── /result
                ├── /standings
                └── /teams
```

**레이아웃 구조:**

| Route Group | 레이아웃 | 설명 |
|---|---|---|
| `(public)` | `public/layout.tsx` | 로그인 시 Sidebar, 비로그인 시 GlobalHeader |
| `(auth)` | `auth/layout.tsx` | GlobalHeader만 (최소 레이아웃) |
| `(app)` | `app/layout.tsx` | 로그인 시 Sidebar, 비로그인 시 GlobalHeader. player 역할이면 팀/주장 여부를 preload해서 Sidebar에 전달 |

---

## 2. 사용자 흐름 기준 페이지 트리

### 2-1. 비로그인 사용자 (unauthenticated)

```
/ (홈)
├── → /login          (CTA "대회 참여하기", 대회 카드 "참가 신청" 버튼)
├── → /tournament/[id]  (대회 카드 "상세보기")
│   └── → /login      (참가 신청 클릭 시 → /login 으로 redirect)
└── → /tournament/[id]/result  (대회 카드 "현황/결과")

/login
├── → /signup
├── → /forgot-password
│   └── → /reset-password  (이메일 링크 경유)
└── ✓ 로그인 성공 시
    ├── organizer/manager → /admin
    ├── player → /dashboard
    └── user → /dashboard (→ redirect /onboarding/profile)

/signup
└── → /login
```

---

### 2-2. 일반 사용자 (role: user — 회원가입 완료, 선수 등록 미완)

**진입점:** 로그인 후 `/dashboard` → 자동 redirect → `/onboarding/profile`

```
/onboarding/profile       (이름, 연락처 등 기본 정보 입력)
└── 폼 제출 완료 →
    /onboarding/identity  (본인인증)
    └── 완료 →
        /onboarding/completion?step=player
        └── → /onboarding/team-choice  (CTA)

/tournaments              (Sidebar: 대회 목록)
└── → /tournament/[id]
    └── CTA "선수 등록 후 신청" → /onboarding/profile
```

**Sidebar 항목 (user role):**
- 대회 목록 → `/tournaments`
- 선수 등록하기 → `/onboarding/profile`

---

### 2-3. player (선수 등록 완료, 팀 없음)

**진입점:** 로그인 → `/dashboard`

```
/dashboard
├── 배너 "팀이 없습니다" → /teams/new, /teams/find
├── 최근 신청 현황 카드 → /my-applications/[applicationId]
├── "전체 보기" → /my-applications
└── "대회 둘러보기" → /tournaments

/onboarding/team-choice   (온보딩 완료 후 최초 진입)
├── → /teams/new
├── → /teams/find
└── → /dashboard  (건너뛰기)

/tournaments
└── → /tournament/[id]
    ├── status=open → /tournament/[id]/apply  (참가 신청)
    └── status=in_progress → /tournament/[id]/result

/teams/new                (팀 생성 폼)
/teams/find               (팀 찾기/합류 신청 폼)
```

**Sidebar 항목 (player, 팀 없음):**
- 대시보드 → `/dashboard`
- 대회 목록 → `/tournaments`
- 팀 만들기 → `/teams/new`
- 팀 찾기 → `/teams/find`

---

### 2-4. player (팀 있음, 일반 선수)

**진입점:** 로그인 → `/dashboard`

```
/dashboard
├── 최근 신청 현황 → /my-applications/[applicationId]
├── "전체 보기" → /my-applications
└── "대회 둘러보기" → /tournaments

/teams                    (내 팀 목록)
├── "+ 새 팀 만들기" → /teams/new
└── 팀 카드 클릭 → /teams/[teamId]

/teams/[teamId]           (팀 상세, 선수 목록 조회만 가능)
```

**Sidebar 항목 (player, 팀 있음):**
- 대시보드 → `/dashboard`
- 대회 목록 → `/tournaments`
- 내 팀 목록 → `/teams`

---

### 2-5. player + captain (주장)

`2-4`의 모든 흐름에 추가:

```
/teams/[teamId]
└── "관리하기" 버튼 → /teams/[teamId]/applications  (합류 신청 수락/거절)

/my-applications          (Sidebar 추가 항목)
└── → /my-applications/[applicationId]  (로스터 관리)

/tournament/[id]/apply    (대회 참가 신청 폼)
```

**Sidebar 항목 (captain 추가):**
- 내 신청 현황 → `/my-applications`  ← captain만 노출

---

### 2-6. organizer / manager

**진입점:** 로그인 → `/admin` (자동 redirect)

```
/admin                              (대회 목록)
├── "대회 생성" → /admin/tournaments/new
└── 대회 카드 → /admin/tournaments/[id]
    ├── → /admin/tournaments/[id]/edit
    ├── → /admin/tournaments/[id]/applications
    ├── → /admin/tournaments/[id]/bracket
    ├── → /admin/tournaments/[id]/courts
    ├── → /admin/tournaments/[id]/matches
    ├── → /admin/tournaments/[id]/schedule
    │   └── → /admin/tournaments/[id]/edit
    ├── → /admin/tournaments/[id]/result
    ├── → /admin/tournaments/[id]/standings
    │   └── → /admin/tournaments/[id]/result
    ├── → /admin/tournaments/[id]/teams
    └── → /tournament/[id]          (공개 뷰 미리보기)

/admin/users                        (organizer 전용 — 권한 관리)
```

**Sidebar 항목 (organizer):**
- 대시보드 → `/dashboard` → (자동 redirect → `/admin`)
- 대회관리 → `/admin`
- 권한관리 → `/admin/users`

**Sidebar 항목 (manager):**
- 대시보드 → `/dashboard`
- 대회관리 → `/admin`
- (권한관리 없음)

---

## 3. 연결 분석

### 3-1. 각 페이지의 진입 버튼/링크

| 페이지 | 진입 경로 | 진입 방법 |
|--------|-----------|-----------|
| `/` | 직접 접근, Sidebar 로고 | Link (로고 `🏀 23BOARD`) |
| `/login` | `/` CTA, 보호 페이지 guard | Link, redirect |
| `/signup` | `/login` | Link |
| `/forgot-password` | `/login` | Link |
| `/reset-password` | 이메일 링크 | 외부 링크 |
| `/dashboard` | `/login` 성공 (player/user), Sidebar | redirect, Link |
| `/admin` | `/login` 성공 (organizer/manager), Sidebar, `/dashboard` redirect | redirect, Link |
| `/tournaments` | Sidebar, `/dashboard` 카드 | Link |
| `/tournament/[id]` | `/`, `/tournaments`, `/admin/tournaments/[id]` | Link |
| `/tournament/[id]/apply` | `/tournament/[id]`, `/` 대회 카드 | Link |
| `/tournament/[id]/result` | `/`, `/tournament/[id]` | Link |
| `/onboarding/profile` | `/dashboard` (user redirect), Sidebar, `/`, `tournament/[id]` CTA | redirect, Link |
| `/onboarding/identity` | `/onboarding/profile` 폼 완료 | 폼 제출 후 redirect |
| `/onboarding/team-choice` | `/onboarding/identity` 완료 | redirect |
| `/onboarding/completion` | 온보딩 각 단계 완료 | redirect |
| `/teams` | Sidebar | Link |
| `/teams/new` | Sidebar, `/dashboard` 배너, `/teams`, `/teams/find` 빈 상태, `/onboarding/team-choice` | Link |
| `/teams/find` | Sidebar, `/dashboard` 배너, `/teams` 빈 상태, `/onboarding/team-choice` | Link |
| `/teams/[teamId]` | `/teams` 카드 | Link |
| `/teams/[teamId]/applications` | `/teams/[teamId]` (captain만) | Link |
| `/my-applications` | Sidebar (captain만), `/dashboard` "전체 보기" | Link |
| `/my-applications/[applicationId]` | `/my-applications`, `/dashboard` 카드 | Link |
| `/admin/tournaments/new` | `/admin` | Link |
| `/admin/tournaments/[id]` | `/admin` 대회 카드 | Link |
| `/admin/tournaments/[id]/edit` | `/admin/tournaments/[id]`, `/admin/tournaments/[id]/schedule` | Link |
| `/admin/tournaments/[id]/applications` | `/admin/tournaments/[id]` | Link |
| `/admin/tournaments/[id]/bracket` | `/admin/tournaments/[id]` | Link |
| `/admin/tournaments/[id]/courts` | (진입 경로 없음) ⚠️ | — |
| `/admin/tournaments/[id]/matches` | `/admin/tournaments/[id]` | Link |
| `/admin/tournaments/[id]/schedule` | `/admin/tournaments/[id]` | Link |
| `/admin/tournaments/[id]/result` | `/admin/tournaments/[id]`, `/admin/tournaments/[id]/standings` | Link |
| `/admin/tournaments/[id]/standings` | `/admin/tournaments/[id]` | Link |
| `/admin/tournaments/[id]/teams` | (진입 경로 불명확) ⚠️ | — |
| `/admin/users` | Sidebar (organizer 전용) | Link |
| `/team` | `/tournament/[id]` (status=confirmed 시) ⚠️ 레거시 | Link |
| `/team/players` | (진입 경로 없음) ⚠️ 레거시 | — |

---

### 3-2. redirect / guard 목록

| 트리거 | 조건 | redirect 대상 |
|--------|------|---------------|
| `/login` 성공 | organizer/manager | `/admin` |
| `/login` 성공 | player/user | `/dashboard` |
| `/login`, `/signup`, `/forgot-password` 접근 | 이미 로그인 (organizer) | `/admin` |
| `/login`, `/signup`, `/forgot-password` 접근 | 이미 로그인 (player) | `/dashboard` |
| `/reset-password` 접근 | recovery session 없음 | `/forgot-password?error=link_expired` |
| `/dashboard` 접근 | organizer/manager | `/admin` |
| `/dashboard` 접근 | user | `/onboarding/profile` |
| `/dashboard` 접근 | unauthenticated | `/login` |
| `/onboarding/profile` 접근 | player | `/dashboard` |
| `/onboarding/profile` 접근 | organizer/manager | `/` |
| `/onboarding/identity` 접근 | player 이미 있음 | `/dashboard` |
| `/onboarding/identity` 접근 | 프로필 없음 | `/onboarding/profile` |
| `/onboarding/team-choice` 접근 | 이미 팀 있음 | `/dashboard` |
| `/onboarding/team-choice` 접근 | user/organizer | `/dashboard` or `/` |
| `/teams`, `/teams/new`, `/teams/find` 접근 | user | `/onboarding/profile` |
| `/teams`, `/teams/new`, `/teams/find` 접근 | unauthenticated | `/login` |
| `/teams`, `/teams/new`, `/teams/find` 접근 | organizer/manager | `/` |
| `/teams/[teamId]` 접근 | unauthenticated | `/login` |
| `/my-applications` 접근 | user | `/onboarding/profile` |
| `/my-applications` 접근 | unauthenticated | `/login` |
| `/my-applications` 접근 | organizer/manager | `/` |
| `/tournament/[id]/apply` 접근 | unauthenticated | `/login` |
| `/tournament/[id]/apply` 접근 | user | `/onboarding/profile` |
| `/team` 접근 | user | `/onboarding/profile` |
| `/team` 접근 | unauthenticated | `/login` |
| `/admin` 접근 | player | `/dashboard` |
| `/admin` 접근 | unauthenticated | `/login` |

**middleware.ts:** 존재하지 않음. 모든 인증/권한 가드는 각 `page.tsx` 내부에서 서버 컴포넌트 `redirect()`로 처리.

---

### 3-3. Dead End 페이지 (나가는 링크 없음)

| 페이지 | 이유 |
|--------|------|
| `/tournament/[id]/apply` | 폼 제출 후 이동 경로 불명확 (server action 확인 필요) |
| `/teams/new` | 폼 제출 후 이동 경로 불명확 |
| `/teams/find` | 폼 제출 후 이동 경로 불명확 |
| `/teams/[teamId]/applications` | 폼 액션만 존재, 나가는 Link 없음 |
| `/admin/tournaments/new` | 폼 제출 후 이동 경로 불명확 |
| `/admin/tournaments/[id]/bracket` | 폼/버튼만, 나가는 Link 없음 |
| `/admin/tournaments/[id]/courts` | 폼/버튼만, 나가는 Link 없음 |
| `/admin/tournaments/[id]/teams` | 폼/버튼만, 나가는 Link 없음 |
| `/admin/users` | 폼 액션만, 나가는 Link 없음 |

---

### 3-4. 연결 안 된 페이지 (Orphan — 진입 경로 없음)

| 페이지 | 상태 | 설명 |
|--------|------|------|
| `/team/players` | ⚠️ 레거시 | Sidebar에도 없고 어떤 페이지에서도 Link 없음 |
| `/admin/tournaments/[id]/courts` | ⚠️ 미연결 | `admin/tournaments/[id]` 상세 페이지에서 Link 없음 |
| `/admin/tournaments/[id]/teams` | ⚠️ 미연결 | 동일. 직접 URL 입력으로만 접근 가능 |

---

### 3-5. 중복 역할 페이지

| 페이지 쌍 | 중복 내용 | 비고 |
|-----------|-----------|------|
| `/team` vs `/teams/[teamId]` | 둘 다 "내 팀 정보" 조회 | `/team`은 레거시. `/tournament/[id]`에서 confirmed 상태면 `/team`으로 연결됨 ⚠️ 신규 경로(`/teams/[teamId]`)와 불일치 |
| `/teams/new` (Sidebar) vs `/onboarding/team-choice` (온보딩 완료 후) | 둘 다 팀 생성 진입점 | 온보딩과 일반 진입 두 경로가 동일한 폼으로 수렴 (정상) |
| `/my-applications` (Sidebar) vs `/dashboard` 최근 신청 카드 | 신청 목록 표시 | 대시보드는 최근 3건만, `/my-applications`는 전체. 정상 분리 |

---

## 4. 문제점 및 개선 제안

### P1 — 레거시 `/team` 경로가 신규 경로와 불일치

- **문제:** `/tournament/[id]` 에서 `status === "confirmed"` 이면 `/team`으로 이동시킴. 그런데 팀 관련 신규 경로는 `/teams/[teamId]`임.
- **개선:** `/tournament/[id]` 상세 페이지의 "내 팀 보기" 버튼 href를 `/teams`(또는 해당 teamId를 알고 있다면 `/teams/[teamId]`)로 수정.

### P2 — `/admin/tournaments/[id]/courts` 진입 경로 없음

- **문제:** `/admin/tournaments/[id]` 상세 페이지에서 `courts` 탭/링크가 없음. URL 직접 입력으로만 접근 가능.
- **개선:** 대회 상세 어드민 페이지에 코트 관리 링크 추가.

### P3 — `/admin/tournaments/[id]/teams` 진입 경로 없음

- **문제:** 동일하게 상세 어드민 페이지에서 연결 없음.
- **개선:** 대회 상세 어드민 페이지 내비게이션에 팀 관리 링크 추가.

### P4 — `/team/players` 완전 미연결 레거시

- **문제:** Sidebar에도, 어떤 페이지에도 진입 링크 없음. captain 전용 기능인데 신규 `/teams/[teamId]/applications`와 역할 중복 가능성.
- **개선:** 실제 사용 여부 확인 후 제거 또는 Sidebar 연결.

### P5 — middleware.ts 부재

- **문제:** 인증 가드가 각 페이지에 분산되어 있어 일관성 보장이 어려움. 새 페이지 추가 시 가드를 빠뜨릴 위험 있음.
- **개선 (선택):** `middleware.ts`에서 `/admin/*`, `/dashboard`, `/teams/*`, `/my-applications/*` 등 주요 경로에 대해 세션 유무만 1차 검증하고, 역할 기반 세부 가드는 page.tsx에 유지하는 하이브리드 방식 고려.

### P6 — user role 사용자의 `/dashboard` 즉시 redirect

- **문제:** user role로 로그인하면 `/dashboard`에 잠깐 렌더링 시도 후 `/onboarding/profile`로 redirect. 깜빡임 발생 가능.
- **개선:** 로그인 성공 시 role에 따라 바로 최종 경로로 redirect (`/login` server action에서 처리).

### P7 — `/onboarding/completion` 도달 경로 불명확

- **현황:** `?step=signup` / `?step=player` 두 가지 쿼리 파라미터로 다른 화면을 보여줌. 그런데 각 온보딩 단계 폼에서 이 페이지로 실제로 redirect되는지 코드 확인 필요 (Server Action 레벨).
- **개선:** Server Action 내 redirect 경로를 문서화하고, completion 화면에서 나가는 다음 CTA 경로가 명확히 연결되었는지 확인.
