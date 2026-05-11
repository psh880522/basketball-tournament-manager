# 구현 계획: user/player 화면 분기 + 선수 등록 진입 흐름 재정의 (v1)

- **작성일**: 2026-04-07
- **기반 리서치**: [20260407_권한모델재정의_Research.md](../01-research/20260407_권한모델재정의_Research.md)
- **전제 조건**: 1차 묶음(권한 코어 + 서버 보안 재정의) 구현 완료 상태
  - `Role = "organizer" | "manager" | "user" | "player"` 확정
  - `isPlayerRole()`, `isUserRole()`, `requirePlayer()` 사용 가능
  - 신규 가입자 = `user`, 선수 등록 완료자 = `player`
- **구현 방향**: 방식 X (user / player 흐름 분리) — Research 4-3 참고

---

## 1. 기능 요약

### 이번 범위에 포함되는 것

- `app/(public)/page.tsx` — 비로그인 / `user` / `player` 상태별 CTA 분기
- `components/nav/GlobalHeader.tsx` — 로그인 상태 네비 링크를 role 기반으로 분기
- `components/layout/Sidebar.tsx` — `user` 전용 메뉴 추가 (`buildMenuItems` user case)
- `app/(app)/layout.tsx` — role 전달 방식 검토 및 최소 조정
- `app/(app)/dashboard/page.tsx` — `user` 접근 시 `/` 로 redirect
- `app/(app)/team/page.tsx` — `user` 접근 시 `/onboarding/profile` 로 redirect
- `app/(app)/tournament/[id]/apply/page.tsx` — `user` 접근 시 `/onboarding/profile` 로 redirect
- `app/(app)/onboarding/profile/page.tsx` — 선수 등록 Step 1 로 문구/역할 재정의
- `app/(app)/onboarding/profile/Form.tsx` — 저장 후 redirect 대상 변경 + 완료 안내 문구

### 이번 범위에서 제외

- 외부 본인인증 UI 및 API 연동 (VS-R8, VS-R9)
- `promote_to_player()` RPC 구현 — 본인인증 완료 시 실제 승격 (VS-R5)
- `/onboarding/identity` 페이지 신규 생성 (본인인증 Step 2)
- `captain` / `member` 네이밍 정리 (VS-R13, VS-R14)
- admin/users 운영 화면 개선
- 팀 생성 / 대회 신청 서버/RLS 재보강 (1차에서 완료)
- `/profile` 내 프로필 페이지 신규 구현

### 후속 단계에서 확장될 내용

- `/onboarding/identity` — 본인인증 Step 2 (VS-R8, VS-R9)
- Step indicator 컴포넌트 — Step 1 → Step 2 시각적 진행 표시
- `promote_to_player()` RPC + 본인인증 콜백 서버 액션 (VS-R5)
- `requireIdentityVerification` 플래그 실제 활용 (`src/lib/config/env.ts`)
- `/profile` 마이 프로필 페이지

### 완료 후 사용자 이동/후속 처리 방식

- `user` 가입/로그인 후 → `/` (랜딩, 선수 등록 CTA 노출)
- `user`가 `/dashboard`, `/team`, `/tournament/[id]/apply` 직접 접근 → redirect
- `user`가 사이드바 "선수 등록하기" 클릭 → `/onboarding/profile`
- `/onboarding/profile` 저장 완료 → `/` 로 이동 + 안내 문구 (본인인증 미구현 단계)
- `player` 로그인 후 → `/dashboard` (1차에서 구현 완료)

---

## 2. 라이브러리 검토

**추가 라이브러리 불필요.**

- role 기반 분기: 기존 `getUserWithRole()`, `isPlayerRole()`, `isUserRole()` 조합으로 충분
- redirect: Next.js `redirect()` (서버 컴포넌트) / `router.push()` (클라이언트)
- UI 분기: 조건부 렌더링 — 별도 상태관리 라이브러리 불필요
- 사이드바 메뉴 분기: `buildMenuItems(role)` 내 case 추가만으로 충분

---

## 3. 변경 파일 목록

### 수정 파일

- `app/(public)/page.tsx`
- `components/nav/GlobalHeader.tsx`
- `components/layout/Sidebar.tsx`
- `app/(app)/layout.tsx` ← 미미한 변경 또는 변경 없음 (검토 후 결정)
- `app/(app)/dashboard/page.tsx`
- `app/(app)/team/page.tsx`
- `app/(app)/tournament/[id]/apply/page.tsx`
- `app/(app)/onboarding/profile/page.tsx`
- `app/(app)/onboarding/profile/Form.tsx`

### 신규 파일

없음.

> **온보딩 스텝 분리 여부**: 이번 단계에서는 단일 페이지(`/onboarding/profile`) 유지.
> 후속 Step 2(`/onboarding/identity`)는 별도 페이지로 추가 예정 — URL 구조 변경 없이 자연스럽게 확장 가능.

---

## 4. 파일별 구현 개요

---

### `app/(public)/page.tsx`

**역할**: 공개 랜딩 — 대회 목록 조회 + 상태별 CTA  
**수정 이유**: 현재 `isLoggedIn` 단일 분기로 role 구분 없음. `user`에게 선수 등록 CTA, `player`에게 대시보드 CTA를 각각 제공해야 함.

**핵심 구조**:

```typescript
// 현재: const isLoggedIn = userResult.status === "ready"
// 변경: role까지 추출

const isLoggedIn = userResult.status === "ready";
const role = userResult.role; // null | "user" | "player" | ...

// 히어로 섹션 CTA 분기
if (!isLoggedIn) → <Button href="/login">대회 참여하기</Button>
if (isUserRole(role)) → <Button href="/onboarding/profile">선수 등록하기</Button>
if (isPlayerRole(role)) → <Button href="/dashboard">대시보드 가기</Button>
if (isOperationRole(role)) → <Button href="/admin">관리자 페이지</Button>
```

**대회 카드 내 "참가 신청" 버튼 분기**:

```typescript
// 현재: isLoggedIn ? "/tournament/[id]/apply" : "/login"
// 변경:
if (!isLoggedIn) → href="/login"
if (isUserRole(role)) → href="/onboarding/profile" + title="선수 등록 후 신청 가능"
if (isPlayerRole(role)) → href="/tournament/[id]/apply"
```

---

### `components/nav/GlobalHeader.tsx`

**역할**: 공개 페이지 상단 네비게이션 — 로그인 상태/role별 링크 제공  
**수정 이유**: 현재 `isLoggedIn`이면 무조건 "대시보드" 링크 추가. `user`에게는 "대시보드"가 무의미하며, 선수 등록 유도 링크가 필요함.

**핵심 구조**:

```typescript
// 현재
if (isLoggedIn) items.push({ label: "대시보드", href: "/dashboard" });

// 변경
if (isUserRole(role)) items.push({ label: "선수 등록하기", href: "/onboarding/profile" });
else if (isPlayerRole(role)) items.push({ label: "대시보드", href: "/dashboard" });
else if (isOperationRole(role)) items.push({ label: "관리", href: "/admin" });
// 비로그인: 링크 추가 없음 (NavMenu에서 로그인 버튼 렌더링)
```

> `GlobalHeader`는 공개 페이지(`app/(public)/`)에서만 렌더링됨.  
> `app/(app)/` 내 페이지는 Sidebar가 네비게이션 역할 수행 — 중복 없음.

---

### `components/layout/Sidebar.tsx`

**역할**: 앱 내 사이드바 — role 기반 메뉴 렌더링  
**수정 이유**: 현재 `buildMenuItems`가 `player`와 operation role만 처리. `user` role 진입 시 player 메뉴가 노출되거나 빈 배열 반환.

**핵심 구조** (`buildMenuItems` 변경):

```typescript
function buildMenuItems(role: Role | null): NavItem[] {
  // operation role (변경 없음)
  if (role === "organizer" || role === "manager") { ... }

  // player (변경 없음)
  if (role === "player") {
    return [
      { label: "대시보드", href: "/dashboard", icon: <IconDashboard /> },
      { label: "대회 보기", href: "/tournaments", icon: <IconList /> },
      { label: "내 팀", href: "/team", icon: <IconTeam /> },
    ];
  }

  // user (신규 추가)
  if (role === "user") {
    return [
      { label: "대회 보기", href: "/tournaments", icon: <IconList /> },
      { label: "선수 등록하기", href: "/onboarding/profile", icon: <IconUsers /> },
    ];
  }

  return [];
}
```

---

### `app/(app)/layout.tsx`

**역할**: 앱 레이아웃 — Sidebar와 main 영역 구성  
**수정 이유**: 현재 코드가 이미 `role`을 Sidebar에 전달하고 있어 `user` case는 Sidebar 내부에서 처리 가능. **레이아웃 파일 자체 변경 최소화 또는 불필요.**

**현재 코드 확인**:
```typescript
// 현재: role을 Sidebar에 전달 → Sidebar.buildMenuItems(role)에서 분기
<Sidebar role={userResult.role} userEmail={...} />
```

- `user` role 추가로 별도 레이아웃 분기 불필요 — Sidebar가 user 메뉴를 처리함
- `isLoggedIn = status === "ready"` 판단 방식 유지
- **변경 없음** (Sidebar 내 메뉴 변경만으로 충분)

---

### `app/(app)/dashboard/page.tsx`

**역할**: 선수 대시보드 — 내 팀 현황, 대회 참가 현황  
**수정 이유**: 현재 `user` 접근 차단 없음. operation role → `/admin` redirect 있지만 user → redirect 없음.

**핵심 구조**:

```typescript
// 기존 operation role 분기 아래 추가
if (isUserRole(result.role)) {
  redirect("/");
  // 또는 redirect("/onboarding/profile") — 선수 등록 강하게 유도하는 경우
}

// 이후 기존 로직 유지 (내 팀 목록 등)
```

> `redirect("/")`를 선택하는 이유: 대시보드는 팀/참가 현황이 핵심인데 `user`에게는 표시할 데이터가 없음. 랜딩에서 선수 등록 CTA로 자연스럽게 유도하는 것이 UX상 더 명확.

-- TODO:네비게이션/ 사이드바 노출 보다는 랜딩/대시보드 페이지 상단같이 잘 보이는 곳에 카드형식으로 노출 하는게 자연스러워 보이는데 CTA/Menu로 노출되는게 더 서비스 적으로 효과적일지 고민필요.

---

### `app/(app)/team/page.tsx`

**역할**: 내 팀 페이지 — player의 팀 목록/관리  
**수정 이유**: 현재 로그인 확인만 있고 role 가드 없음. `user`가 접근 시 빈 화면 또는 의미 없는 화면 노출.

**핵심 구조**:

```typescript
// 인증 확인 후 role 가드 추가
if (result.status === "unauthenticated") redirect("/login");
// ...error/empty 처리...

// role 가드 (신규)
if (isUserRole(result.role)) {
  redirect("/onboarding/profile");
}
// player 이상만 이하 로직 진행
```

> `redirect("/onboarding/profile")`: 팀 페이지에서 차단 시 선수 등록 Step 1로 직접 유도. 랜딩보다 구체적인 다음 행동을 안내.

---

### `app/(app)/tournament/[id]/apply/page.tsx`

**역할**: 대회 참가 신청 페이지  
**수정 이유**: 현재 `unauthenticated` 확인만 있고 role 가드 없음. `user`가 직접 URL 입력 시 신청 폼이 노출되지만 실제 제출 시 서버에서 차단됨 (1차 RLS 적용) — UX 혼란 방지를 위해 페이지 진입 시점에도 차단 필요.

**핵심 구조**:

```typescript
// 인증 확인 후
if (userResult.status === "unauthenticated") redirect("/login");
// ...error/empty 처리...

// role 가드 (신규, 대회 조회 이전에 배치)
if (isUserRole(userResult.role)) {
  redirect("/onboarding/profile");
}
// player 이상만 이하 로직(대회 조회, 폼 렌더링) 진행
```

---

### `app/(app)/onboarding/profile/page.tsx`

**역할**: 선수 등록 Step 1 — 기본 정보 입력  
**수정 이유**: 현재 헤더 문구가 "프로필 입력"으로 일반적. 이번 단계에서 "선수 등록 Step 1"로 문구와 역할을 명확히 재정의.

**핵심 구조** (변경 부분):

```typescript
// 헤더 문구 변경
<h1>선수 등록 — 기본 정보 입력</h1>
<p>이름, 연락처를 입력하면 선수 등록을 진행할 수 있습니다.</p>

// player가 접근 시 처리 (이미 등록 완료)
// 옵션 A: 그냥 허용 (프로필 수정 용도)
// 옵션 B: player → redirect("/dashboard")
// → 옵션 A 권장: player도 정보 수정이 필요할 수 있음

// 인증 가드 유지 (변경 없음)
if (userResult.status === "unauthenticated") redirect("/login");
if (userResult.status === "empty") redirect("/login");
```

**Step indicator (간단하게)**:
- 이번 단계: "1단계 / 2단계" 텍스트 표시 (컴포넌트 불필요, 인라인으로 충분)
- 2단계는 `본인인증` — "(2단계: 본인인증은 추후 추가 예정)" 안내 또는 생략

---

### `app/(app)/onboarding/profile/Form.tsx`

**역할**: 선수 등록 Step 1 폼  
**수정 이유**: 현재 저장 완료 시 `router.push("/dashboard")`로 이동. `user`에게 `/dashboard`는 접근 차단 대상 → 저장 후 redirect 대상 변경 필요. 완료 후 안내 문구도 추가.

**핵심 변경**:

```typescript
// 현재
router.push("/dashboard");

// 변경
// 저장 완료 후 → 랜딩으로 이동 (본인인증 미구현 단계)
router.push("/");

// 또는: 완료 상태를 페이지 내에서 보여준 뒤 이동
// setCompleted(true) → "정보가 저장되었습니다. 선수 등록을 완료하려면 본인인증이 필요합니다." + "/" 이동 버튼
```

**권장**: 저장 후 즉시 `router.push("/")` + toast 또는 쿼리파라미터로 안내  
- toast: 기존 프로젝트에 toast 컴포넌트 없으면 생략 (쿼리파라미터 방식 대신 Form 내 상태로 처리)
- `setCompleted(true)` 후 인라인 안내 텍스트 표시 → 사용자가 "확인" 클릭 시 `/` 이동

--TODO:toast 컴포넌트 없으면 구현

**완료 안내 문구 (임시)**:
```
기본 정보가 저장되었습니다.
선수 등록은 본인인증 완료 후 확정됩니다. (추후 안내)
```

---

## 5. 구현 시 고려사항

### user와 player를 같은 페이지에서 조건부 렌더링할지, 분리된 흐름으로 가져갈지

**분리된 흐름** 선택 (Research 4-3 방식 X).

- `user`: 랜딩 + 선수 등록 진입 경로만 허용
- `player`: 대시보드 + 팀 + 대회 신청 흐름
- 같은 dashboard 페이지에 두 상태를 조건부 렌더링하면 컴포넌트 복잡도 증가 + "팀이 없습니다" 빈 화면보다 명확한 분기가 UX 우수

### 공개 랜딩과 app 레이아웃의 역할 분리 기준

- `app/(public)/page.tsx` (랜딩): GlobalHeader + 대회 조회 + CTA. 모든 상태에서 접근 가능.
- `app/(app)/` (앱 영역): Sidebar 레이아웃. 로그인 시 접근. user도 포함 (사이드바 user 메뉴 표시).
- GlobalHeader는 공개 페이지 전용. Sidebar는 앱 페이지 전용. 중복 없음.

### player 전용 페이지에 user가 직접 URL 접근했을 때 UX 처리 방식

| 페이지 | user 접근 시 | redirect 대상 |
|--------|-------------|--------------|
| `/dashboard` | redirect | `/` (랜딩) |
| `/team` | redirect | `/onboarding/profile` |
| `/tournament/[id]/apply` | redirect | `/onboarding/profile` |

- 차단 레이어: 페이지 서버 컴포넌트 내 role 가드 (redirect)
- 최종 보호: 서버 액션의 `requirePlayer()` + DB RLS (1차 완료)
- 클라이언트 버튼 숨김은 UX 편의용 — 보안 역할 없음

### `/onboarding/profile` 완료 후 다음 단계 연결 방식

- **이번 단계**: 저장 완료 → `/` 이동 + 인라인 안내 문구 ("본인인증은 추후 안내")
- **후속 단계 추가 시**: 저장 완료 → `/onboarding/identity` (Step 2)로 이동
  - Form.tsx의 `router.push("/")` → `router.push("/onboarding/identity")`로만 변경하면 됨
  - 구조 변경 없음, 단일 라인 수정으로 연결

### 본인인증 도입 전 임시 UX와, 추후 본인인증 Step 추가 시 구조 변경 최소화 방안

- 임시 UX: `/onboarding/profile` 저장 후 `"본인인증 완료 후 선수 등록이 확정됩니다"` 안내 + `/` 이동
- 본인인증 추가 시 변경 파일: `Form.tsx` (redirect 대상 변경) + `page.tsx` (Step indicator 텍스트)
- `/onboarding/identity` 신규 페이지 추가 — 기존 파일 구조 변경 없음
- `requireIdentityVerification` 플래그(`src/lib/config/env.ts`)는 `/onboarding/identity` 서버 액션에서 활용

### 기존 구조 유지 vs 공통화

- `isPlayerRole()` / `isUserRole()` 호출을 각 페이지에서 직접 사용 (현재 패턴과 일관)
- `requirePlayer()` 가드는 서버 **액션**용 — 페이지 서버 컴포넌트에서는 직접 role 체크 + redirect 사용
- 공용 `PlayerGuard` 서버 컴포넌트 불필요 — 3개 페이지에만 적용, 추상화 과도

### 클라이언트/서버 검증 위치

- 페이지 진입 차단: 서버 컴포넌트에서 `redirect()` (이번 단계 신규)
- 실제 데이터 변경 차단: 서버 액션 `requirePlayer()` + RLS (1차 완료)
- 클라이언트 버튼 가시성: 사이드바 메뉴 분기 + 랜딩 CTA 분기로 자연스럽게 처리

### 기존 라우팅/레이아웃 충돌 가능성

- `app/(app)/layout.tsx` 변경 없음 → layout 충돌 없음
- `app/(public)/page.tsx`는 `app/(app)/layout.tsx`와 무관 → 충돌 없음
- `app/(app)/onboarding/profile/`은 현재 untracked 상태이므로 기존 동작 변경에 주의

---

## 6. 구현 순서 (권장)

1. `components/layout/Sidebar.tsx` — user 메뉴 추가 (`buildMenuItems` user case)
2. `app/(public)/page.tsx` — role 기반 CTA 분기
3. `components/nav/GlobalHeader.tsx` — user/player 링크 분기
4. `app/(app)/dashboard/page.tsx` — user redirect 추가
5. `app/(app)/team/page.tsx` — user redirect 추가
6. `app/(app)/tournament/[id]/apply/page.tsx` — user redirect 추가
7. `app/(app)/onboarding/profile/page.tsx` — 문구/역할 재정의
8. `app/(app)/onboarding/profile/Form.tsx` — 저장 후 redirect 변경

- DB 변경 없음 — 전부 TypeScript/UI 변경
- 각 단계 독립적으로 구현 가능 (의존성 없음)
- 1~3을 먼저 완료하면 사용자가 자연스럽게 올바른 경로로 유도됨
- 4~6은 직접 URL 접근 차단 — 보안 레이어 완성
