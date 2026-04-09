# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 5차 라우팅 가드 및 온보딩 완료 후 마감 Plan

> 작성일: 2026-04-08  
> 범위: 온보딩 관련 라우팅 가드 정리 + 권한별 접근 제어 + 온보딩 완료 후 이동 흐름 마감  
> 전제: 1~4차 묶음(DB/API/약관/프로필개편/본인인증) 완료  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`

---

## 0. 현재 상태 요약 (코드 기준)

5차 작업 전 **이미 구현 완료**된 항목:

| 파일 | 가드 현황 |
|------|-----------|
| `onboarding/identity/page.tsx` | `isPlayerRole → /dashboard` ✅, `!isUserRole → /` ✅ |
| `dashboard/page.tsx` | `isOperationRole → /admin` ✅, `isUserRole → /` ✅ |
| `team/page.tsx` | `isUserRole → /onboarding/profile` ✅ |
| `tournament/[id]/apply/page.tsx` | `isUserRole → /onboarding/profile` ✅ |
| `login/actions.ts` | `player → /dashboard`, `organizer/manager → /admin`, `user → /` ✅ |
| `Sidebar.tsx` | role별 메뉴 분기 ✅ |
| `(public)/page.tsx` | role-aware CTA (user: 선수등록 안내카드) ✅ |

**5차에서 실제로 구현할 항목은 좁다.** 가드 구조 대부분이 이미 동작 중이며, 누락된 가드 1건 + redirect 정책 결정 + 일관성 정리가 핵심이다.

---

## 1. 기능 상세 설명

### 1.1 구현 항목

| # | 항목 | 상태 | 비고 |
|---|------|------|------|
| 1 | `onboarding/profile/page.tsx` player 재진입 가드 추가 | **누락** → 구현 필요 | player가 `/onboarding/profile` 진입 시 `/dashboard`로 차단 |
| 2 | `dashboard/page.tsx` user redirect 정책 변경 | 검토 후 결정 | 현재 `/` → `/onboarding/profile`로 변경 여부 |
| 3 | `(app)/layout.tsx` 온보딩 중 사이드바 노출 정책 확인 | 유지 판단 | user도 사이드바 노출 중 → 선수등록 메뉴 있으므로 현행 유지 |
| 4 | `Sidebar.tsx` user 상태 메뉴 확정 | 유지 판단 | 이미 `user`: 대회보기 + 선수등록하기 → 현행 유지 |
| 5 | 전체 접근 매트릭스 정리 및 누락 가드 확인 | 문서화 | 아래 섹션 1.3 참고 |

### 1.2 포함 범위 / 제외 범위

**포함**
- `onboarding/profile/page.tsx` player 재진입 가드 추가 (1건 코드 수정)
- `dashboard/page.tsx` user redirect 목적지 결정 및 반영
- 전체 페이지별 접근 매트릭스 문서화 (아래)
- 온보딩 흐름 진입/탈출 경로 정리

**제외**
- 회원가입 약관 동의 구현 (2차)
- 선수등록 폼 개편 구현 (3차)
- 본인인증 provider 연동 (4차)
- 관리자 기능 확장
- player 이후 프로필 편집 기능

### 1.3 전체 접근 매트릭스

| 페이지 | 비로그인 | `user` | `player` | `organizer/manager` |
|--------|---------|--------|----------|---------------------|
| `/` (public 홈) | 허용 (로그인 CTA) | 허용 (선수등록 안내 카드 노출) | 허용 (대시보드 CTA) | 허용 |
| `/dashboard` | → `/login` | → `/` (또는 `/onboarding/profile`) | 허용 | → `/admin` |
| `/team` | → `/login` | → `/onboarding/profile` | 허용 | 허용(?) |
| `/tournament/[id]/apply` | → `/login` | → `/onboarding/profile` | 허용 | 허용 |
| `/onboarding/profile` | → `/login` | 허용 | **→ `/dashboard`** (추가 필요) | → `/` |
| `/onboarding/identity` | → `/login` | 허용 | → `/dashboard` ✅ | → `/` ✅ |
| `/admin` | → `/login` | → `/` | → `/` | 허용 |

> **굵게 표시된 항목이 5차에서 구현해야 할 가드**  
> 나머지는 이미 구현 완료

### 1.4 상태별 사용자 이동 흐름

```
[신규 가입] user 로그인
  → login/actions.ts: redirect("/")
  → (public)/page.tsx: 선수등록 안내 카드 + "지금 선수 등록하기" 버튼
  → /onboarding/profile (1단계)
  → 저장 성공 → router.push("/onboarding/identity")
  → /onboarding/identity (2단계)
  → 본인인증 완료 → promote_to_player() → router.push("/dashboard")
  → 이후: player role로 /dashboard 접근

[이미 player인 사용자 로그인]
  → login/actions.ts: isPlayerRole → redirect("/dashboard")
  → /dashboard 바로 진입

[player가 온보딩 재진입 시도]
  → /onboarding/profile: isPlayerRole → redirect("/dashboard")  ← 5차 추가
  → /onboarding/identity: isPlayerRole → redirect("/dashboard") ✅ 이미 됨

[user가 player 전용 페이지 진입 시도]
  → /dashboard: isUserRole → redirect("/onboarding/profile")  ← 정책 변경
  → /team: isUserRole → redirect("/onboarding/profile") ✅ 이미 됨
  → /tournament/[id]/apply: isUserRole → redirect("/onboarding/profile") ✅ 이미 됨
```

### 1.5 온보딩 완료 후 처리 방식

`IdentityForm.tsx`에서 이미 처리됨:
```
본인인증 성공
  → setToastMessage("본인인증이 완료되었습니다. 선수로 등록되었습니다.")
  → router.refresh()  ← role 변경 세션 반영
  → setTimeout(() => router.push("/dashboard"), 1500)
```

추가 처리 불필요. 단, `router.refresh()` 이후 layout이 새 role을 반영하므로 사이드바 메뉴도 `player` 기준으로 자동 전환됨.

### 1.6 예외 케이스와 접근 차단 기준

| 케이스 | 처리 방식 |
|--------|-----------|
| player가 `/onboarding/profile` 직접 접근 | → `/dashboard` (5차 추가) |
| player가 `/onboarding/identity` 직접 접근 | → `/dashboard` (이미 됨) |
| user가 `/dashboard` 접근 | → `/onboarding/profile` (정책 변경) or `/` (현행 유지) |
| organizer가 온보딩 페이지 직접 접근 | → `/` (identity 페이지는 이미 처리, profile 페이지는 5차 추가) |
| 비로그인이 모든 `/app/*` 접근 | → `/login` (각 페이지 개별 처리 중) |
| promote_to_player() 이미 player면 멱등 | RPC 레벨에서 조용히 무시 (이미 됨) |

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 |
|------|------|
| 미들웨어 도입 | 불필요. 페이지 단위 가드로 충분, 현재 구조 유지 |
| 역할 헬퍼 함수 | `isPlayerRole()`, `isUserRole()`, `isOperationRole()` 기존 함수로 충분 |
| 새 가드 추상화 | 불필요. 페이지 2개에 if문 추가로 처리 가능 |

---

## 3. 변경 파일 목록

### 수정 파일

| 파일 | 이유 |
|------|------|
| `app/(app)/onboarding/profile/page.tsx` | player 재진입 시 `/dashboard` 차단 가드 추가 (누락된 유일한 가드) |
| `app/(app)/dashboard/page.tsx` | user redirect 목적지를 `/` → `/onboarding/profile`로 변경 (정책 결정에 따라) |

### 신규 파일

**없음** — 새 파일 생성 불필요

### 변경 불필요 (유지)

| 파일 | 판단 근거 |
|------|-----------|
| `src/lib/auth/roles.ts` | 헬퍼 함수 그대로 사용 |
| `src/lib/auth/guards.ts` | 현재 사용처 없음, 유지 |
| `components/layout/Sidebar.tsx` | role별 메뉴 이미 분기됨 |
| `app/(app)/layout.tsx` | user도 사이드바 노출이 UX상 맞음 (선수등록 메뉴 접근 필요) |
| `app/(app)/onboarding/identity/page.tsx` | 가드 완비됨 |
| `app/(auth)/login/actions.ts` | role별 redirect 완비됨 |
| `app/(public)/page.tsx` | role-aware CTA 완비됨 |
| `app/(app)/team/page.tsx` | user 가드 완비됨 |
| `app/(app)/tournament/[id]/apply/page.tsx` | user 가드 완비됨 |

---

## 4. 파일별 구현 구조

### 4.1 `app/(app)/onboarding/profile/page.tsx` — player 가드 추가

**역할**: 온보딩 1단계 (선수 프로필 입력) 페이지  
**왜 필요한지**: 현재 `player` role 사용자가 이 페이지에 접근해도 아무 차단이 없음. 온보딩 완료 사용자가 다시 온보딩으로 들어오지 않도록 막아야 함  
**핵심 구조**:

```
현재 가드 순서:
  1. unauthenticated → /login ✅
  2. empty → /login ✅
  3. (error는 에러 UI 표시) ✅

추가할 가드:
  4. isPlayerRole(result.role) → redirect("/dashboard")   ← 추가
  5. isOperationRole(result.role) → redirect("/")          ← 추가

기존 흐름 유지:
  6. 데이터 로드 (profiles + player_profiles)
  7. ProfileForm 렌더링
```

> organizer/manager가 `/onboarding/profile`에 접근하는 경우는 비정상 시나리오이므로 홈으로 보냄  
> 기존 `isUserRole` 체크 없이 `user`만 통과시키는 구조로 전환

---

### 4.2 `app/(app)/dashboard/page.tsx` — user redirect 정책 변경

**역할**: player 전용 대시보드 페이지  
**왜 필요한지**: 현재 `isUserRole → redirect("/")` 인데, 홈(`/`)은 한 번 더 탐색해야 선수등록 진입 가능. user 입장에서는 대시보드 접근 시도 → 온보딩으로 바로 보내는 게 더 명확한 안내  
**정책 결정**:

```
변경 전: isUserRole → redirect("/")
변경 후: isUserRole → redirect("/onboarding/profile")
```

**근거**:
- user가 `/dashboard`를 직접 입력하거나 오래된 북마크로 접근하는 경우, 홈을 경유하지 않고 바로 온보딩으로 안내하는 것이 UX상 더 직접적
- 홈(`/`)도 선수등록 CTA를 잘 안내하고 있으므로 어느 쪽이든 동작은 하지만, `/onboarding/profile`로의 직접 리다이렉트가 의도를 더 명확히 표현

> 단, 이 결정은 트레이드오프 섹션 5.3 참고

---

## 5. 고려 사항 / 트레이드오프

### 5.1 미들웨어 없이 페이지 단위 가드를 유지할지

**결론: 페이지 단위 가드 유지**

| 기준 | 미들웨어 | 페이지 단위 가드 |
|------|----------|-----------------|
| 현재 구조와 일관성 | 불일치 (신규 도입) | 일치 (기존 패턴) |
| Supabase SSR 쿠키 처리 | 별도 미들웨어 세션 설정 필요 | `createSupabaseServerClient()` 그대로 사용 |
| 가드 로직 세밀도 | 경로 패턴 기반 (조건 복잡해질 수 있음) | 각 페이지별 맞춤 처리 |
| 성능 | 모든 요청마다 실행 | 해당 페이지 요청 시만 실행 |
| 향후 확장 | 경로 규칙 관리 복잡 | 개별 파일 수정 |

현재 프로젝트 규모에서 미들웨어 도입 이득 없음. 기존 방식 유지.

---

### 5.2 `user`와 `player`의 메뉴/대시보드 분리를 어디까지 할지

**현재 구현 상태 (이미 완료):**

| role | 사이드바 메뉴 |
|------|-------------|
| `user` | 대회 보기(`/tournaments`), 선수 등록하기(`/onboarding/profile`) |
| `player` | 대시보드(`/dashboard`), 대회 보기(`/tournaments`), 내 팀(`/team`) |
| `organizer/manager` | 대시보드, 대회관리, 권한관리(organizer only) |

**결론: 현재 분리 수준으로 충분**

- `user`에게는 player 전용 메뉴(대시보드, 내 팀)를 숨기고 있으므로 UI 혼란 없음
- 대시보드 페이지 자체는 서버 가드로 이중 차단
- 이 이상의 분리(예: 별도 레이아웃, 별도 route group)는 현재 단계에서 불필요

---

### 5.3 온보딩 미완료 사용자를 어느 시점에 어디로 보낼지

**시나리오별 정책:**

| 진입 경로 | 현재 | 5차 변경 후 |
|-----------|------|------------|
| 로그인 직후 | `user → /` | 유지 (홈에서 CTA 안내) |
| `/dashboard` 직접 접근 | `user → /` | `user → /onboarding/profile` (변경) |
| `/team` 직접 접근 | `user → /onboarding/profile` | 유지 |
| `/tournament/[id]/apply` | `user → /onboarding/profile` | 유지 |
| `/onboarding/profile` | (가드 없음) | player → `/dashboard` 추가 |

**로그인 후 redirect 목적지는 `/`를 유지하는 이유:**
- 홈이 "선수로 참가하려면 등록이 필요합니다" 안내 카드를 보여주고 있어 설명 맥락이 있음
- 반면, `/onboarding/profile`로 바로 보내면 맥락 없이 폼 화면이 나타남
- 따라서 로그인 후 리다이렉트는 `/` 유지, 중간 진입 시도에서만 직접 가드

---

### 5.4 이미 `player`인 사용자의 온보딩 재진입을 어떻게 막을지

**결론: 서버 가드 2곳으로 완전 차단**

```
/onboarding/profile  → isPlayerRole → redirect("/dashboard")  ← 5차 추가
/onboarding/identity → isPlayerRole → redirect("/dashboard")  ✅ 이미 됨
```

- 사이드바에서 user 상태일 때만 "선수 등록하기" 메뉴가 노출되므로 player는 사이드바로 접근 불가
- URL 직접 입력 시도는 서버 가드로 차단
- DB 레벨에서도 `promote_to_player()` RPC가 멱등성 보장 (이미 player면 no-op)

---

### 5.5 서버 가드와 클라이언트 리다이렉트 책임을 어떻게 나눌지

**원칙: 서버 가드 우선, 클라이언트 보조**

| 역할 | 담당 |
|------|------|
| 페이지 접근 차단 | Server Component (`page.tsx`) + `redirect()` — 주된 보안 경계 |
| 완료 후 이동 | Client Component (`Form.tsx`) + `router.push()` — UX 흐름 |
| 세션 갱신 후 이동 | `router.refresh()` + `setTimeout()` — role 변경 반영 |

클라이언트에서 role을 확인하는 별도 로직은 도입하지 않음. 서버 가드를 통과한 페이지 내에서는 role에 대한 추가 클라이언트 검증 불필요.

---

### 5.6 향후 `manager` / `organizer` 흐름과 충돌 없는지

**결론: 충돌 없음**

- `organizer/manager`는 이미 login 시 `/admin`으로 분기됨
- 온보딩 페이지에서 `!isUserRole → redirect("/")` 또는 `isOperationRole → redirect("/")`로 차단됨
- 사이드바에서도 operation role은 별도 메뉴 구성을 사용 중
- 향후 `manager` 전용 페이지 추가 시 `isOperationRole()` 또는 `isOrganizerRole()` 헬퍼 재사용 가능
- 새 role(`coach`, `referee` 등) 추가 시 `Role` 타입과 `buildMenuItems()` 분기만 확장하면 됨

---

## 6. 구현 상세 — 파일별 핵심 스니펫 (pseudocode)

### 6.1 `onboarding/profile/page.tsx` — 가드 추가

```
export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  const userResult = await getUserWithRole();

  // 기존 가드
  if (unauthenticated or empty) → redirect("/login")
  if (error) → 에러 UI

  // 5차 추가: player 재진입 차단
  if (isPlayerRole(userResult.role)) → redirect("/dashboard")

  // 5차 추가: 운영 역할 차단
  if (isOperationRole(userResult.role)) → redirect("/")

  // 이후: 기존 데이터 로드 + ProfileForm 렌더링 유지
}
```

### 6.2 `dashboard/page.tsx` — user redirect 변경

```
// 변경 전
if (isUserRole(result.role)) redirect("/")

// 변경 후
if (isUserRole(result.role)) redirect("/onboarding/profile")
```

---

## 7. 전체 온보딩 흐름 최종 정리

```
회원가입
  └─ email + password → profiles.role = 'user'

로그인 (user)
  └─ login/actions.ts → redirect("/")
       └─ 홈: 선수등록 안내 카드 + CTA 버튼

/onboarding/profile [1단계]
  가드: unauthenticated → /login
        isPlayerRole → /dashboard        ← 5차 추가
        isOperationRole → /             ← 5차 추가
  완료: saveOnboardingProfile() → router.push("/onboarding/identity")

/onboarding/identity [2단계]
  가드: unauthenticated → /login
        isPlayerRole → /dashboard       ✅ 이미 됨
        !isUserRole → /                 ✅ 이미 됨
  완료: verifyIdentityAndPromote()
         → promote_to_player() RPC
         → profiles.role = 'player'
         → router.refresh() + router.push("/dashboard")

/dashboard [player 홈]
  가드: unauthenticated → /login
        isOperationRole → /admin        ✅ 이미 됨
        isUserRole → /onboarding/profile ← 5차 변경 (현재: → /)
  player 전용 대시보드 렌더링
```

---

## 8. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_5차라우팅가드_온보딩완료후마감_Plan_v1.md
```
