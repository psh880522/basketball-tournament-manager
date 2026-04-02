# Auth Pages 리서치 보고서

**작성일:** 2026-04-02
**목적:** 로그인 / 회원가입 / 비밀번호 찾기 / 비밀번호 재설정 페이지 신규 구현을 위한 사전 분석
**브랜치:** develop

---

## 1. 기술 스택 요약

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16.1.6 (App Router) |
| UI 라이브러리 | React 19.2.3 |
| 언어 | TypeScript 5 (strict mode) |
| 스타일링 | Tailwind CSS v4 |
| 인증/DB | Supabase (`@supabase/supabase-js` ^2.95.3, `@supabase/ssr` ^0.8.0) |
| 폼 라이브러리 | **없음** — 순수 `useState` + `useTransition` |
| 유효성 검증 | **없음** — 서버 액션 내 수동 검증 |
| 기타 | `@dnd-kit` (드래그앤드롭), `react-day-picker` (날짜 선택) |

> **중요:** `react-hook-form`, `zod`, `yup` 등 별도 폼/유효성 검증 라이브러리가 **전혀 없다.** 프로젝트 고유의 수동 패턴을 따라야 한다.

---

## 2. 현재 인증 방식 전체 개요

### 2.1 인증 제공자

- **Supabase Auth** 단독 사용
- **이메일/비밀번호 로그인** 지원 (`signInWithPassword`)
- **SNS 로그인(OAuth provider):** 코드베이스에 구현 흔적 **없음**
  - `app/auth/callback/route.ts`가 OAuth code exchange를 처리할 수 있는 구조로 작성되어 있으나, 실제 SNS provider 버튼이나 `signInWithOAuth()` 호출부가 없음
  - 향후 SNS 로그인 추가 시 이 callback route를 재사용 가능

### 2.2 세션 관리 방식

- `@supabase/ssr` 라이브러리의 **쿠키 기반 세션** 사용
- 서버 클라이언트(`createSupabaseServerClient`)가 `next/headers`의 `cookies()`를 통해 쿠키를 읽고 씀
- React `cache()`로 래핑되어 같은 요청 내에서 중복 생성 방지
- **별도 미들웨어 없음** — `middleware.ts` 파일이 존재하지 않음

### 2.3 로그인 상태 확인 방식

모든 보호된 페이지에서 공통적으로 `getUserWithRole()`을 직접 호출하는 패턴:

```typescript
// src/lib/auth/roles.ts
export async function getUserWithRole(): Promise<UserWithRoleResult>
```

반환 status 값:
- `"unauthenticated"` — 로그인 안 된 상태
- `"error"` — 세션/프로필 조회 중 오류
- `"empty"` — 로그인은 됐지만 profiles 테이블에 행이 없음
- `"ready"` — 정상 인증 + 역할 확인 완료

---

## 3. 인증 관련 파일 전체 목록

### 3.1 Supabase 클라이언트

| 파일 | 역할 |
|------|------|
| `src/lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 생성 (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | 서버용 Supabase 클라이언트 생성 (`createServerClient` + React cache 적용) |

```typescript
// src/lib/supabase/client.ts
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// src/lib/supabase/server.ts
export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll, setAll } }
  );
});
```

### 3.2 인증 API 레이어

| 파일 | 역할 | 주요 함수 |
|------|------|-----------|
| `lib/api/auth.ts` | Supabase Auth 호출 래퍼 | `signUpWithPassword`, `signInWithPassword`, `getCurrentUserRole` |

```typescript
// lib/api/auth.ts 전체 함수 목록
export async function signUpWithPassword(email, password): Promise<AuthResult>
export async function signInWithPassword(email, password): Promise<AuthResult>
export async function getCurrentUserRole(): Promise<RoleResult>
```

> **주의:** `lib/api/auth.ts`는 **비밀번호 찾기/재설정 관련 함수가 전혀 없다.** 새로 추가해야 한다.

### 3.3 역할(Role) 시스템

| 파일 | 역할 | 주요 함수 |
|------|------|-----------|
| `src/lib/auth/roles.ts` | 역할 타입 정의 + 사용자/역할 조회 | `getUserWithRole`, `isOperationRole`, `isOrganizerRole` |
| `src/lib/auth/guards.ts` | 서버 액션용 인가 가드 | `requireOrganizer`, `requireOperationRole` |

```typescript
// src/lib/auth/roles.ts
export type Role = "organizer" | "manager" | "player";

export async function getUserWithRole(): Promise<UserWithRoleResult>
export function isOperationRole(role: Role | null): boolean  // organizer + manager
export function isOrganizerRole(role: Role | null): boolean  // organizer only

// src/lib/auth/guards.ts
export async function requireOrganizer(): Promise<ActionResult>
export async function requireOperationRole(): Promise<ActionResult>
```

### 3.4 서버 액션

| 파일 | 역할 |
|------|------|
| `app/login/actions.ts` | 로그인 처리 + 역할 기반 리다이렉트 |
| `app/signup/actions.ts` | 회원가입 처리 |
| `app/actions/auth.ts` | 로그아웃 처리 (`logoutAction`) |

### 3.5 API Routes

| 파일 | 역할 |
|------|------|
| `app/auth/callback/route.ts` | OAuth 인증 코드 → 세션 교환 처리 (PKCE flow) |

### 3.6 현재 인증 페이지

| 파일 | 현황 |
|------|------|
| `app/login/page.tsx` | 최소한의 HTML 마크업, 스타일 없음 |
| `app/login/Form.tsx` | 기본 form + inline style |
| `app/signup/page.tsx` | 최소한의 HTML 마크업, 스타일 없음 |
| `app/signup/Form.tsx` | 기본 form + inline style |

> **결론:** 현재 로그인/회원가입 페이지는 MVP 수준으로만 구현되어 있다. **전면 재구현 대상**이다.

---

## 4. 사용자/프로필 DB 스키마

### 4.1 테이블 구조

**`auth.users`** (Supabase 관리):
- `id` (uuid), `email`, `created_at` 등 — Supabase 내부 테이블

**`public.profiles`** (커스텀):
```sql
CREATE TABLE public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  role      public.app_role not null default 'player',
  created_at timestamptz not null default now()
);
```

> **중요:** `profiles` 테이블에는 현재 `id`, `role`, `created_at` **3개 컬럼만** 존재한다.
> `display_name`, `phone`, `avatar_url`, `organization` 같은 추가 프로필 컬럼이 **없다.**

### 4.2 Role Enum

```sql
-- 현재 적용된 enum (0205_role_system_v2.sql 이후)
CREATE TYPE public.app_role AS ENUM ('organizer', 'manager', 'player');
```

역할 의미:
- `organizer` — 대회 주관자. 모든 권한. 역할 변경 불가(DB 직접 처리).
- `manager` — 현장 운영자. 대회 관리 가능. 팀 신청 불가.
- `player` — 일반 참가자. 팀 생성/대회 신청 가능. **신규 가입 기본값.**

### 4.3 신규 가입 시 프로필 자동 생성 트리거

```sql
-- 0002_profiles_roles.sql에 정의
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)  -- role은 default 'player'로 자동 설정
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

> **결론:** 회원가입(`supabase.auth.signUp()`) 후 트리거가 자동으로 `profiles` 행을 생성하며, 기본 role은 **`'player'`**로 설정된다. 별도 프로필 INSERT 코드가 불필요하다.

### 4.4 user_profiles View (이메일 포함 통합 조회)

```sql
-- 0211_user_profiles_view.sql
CREATE VIEW public.user_profiles
WITH (security_invoker = true) AS
  SELECT p.id, p.role, p.created_at, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id;
```

organizer만 전체 목록 조회 가능, 일반 사용자는 본인 행만 보임.

---

## 5. RLS 정책 분석

### 5.1 profiles 테이블

```sql
-- 조회: 본인 또는 organizer만 가능
CREATE POLICY "profiles_select_own_or_organizer" ON public.profiles
FOR SELECT USING (
  id = auth.uid() OR public.is_organizer()
);

-- 수정: 본인만 가능
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

### 5.2 주요 RLS 함수

```sql
-- organizer 여부
public.is_organizer() RETURNS boolean

-- organizer 또는 manager 여부
public.is_manager() RETURNS boolean

-- 특정 팀의 captain(팀장) 여부
public.is_team_manager_for_team(team_uuid) RETURNS boolean

-- 특정 팀의 멤버 여부
public.is_team_member_for_team(team_uuid) RETURNS boolean
```

### 5.3 역할 변경 RPC

```sql
-- organizer만 호출 가능, organizer 역할은 변경 불가
public.update_user_role(target_user_id uuid, new_role text) RETURNS void
-- new_role: 'player' 또는 'manager'만 허용
```

---

## 6. 폼 처리 패턴 분석

### 6.1 핵심 패턴: useState + useTransition + Server Action

프로젝트 전체에서 일관되게 사용하는 패턴:

```typescript
"use client";

import { useState, useTransition } from "react";

type Message = {
  tone: "error" | "success";
  text: string;
};

export default function SomeForm() {
  const [fieldValue, setFieldValue] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await someServerAction({ fieldValue });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "성공 메시지" });
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={fieldValue} onChange={e => setFieldValue(e.target.value)} />
      <button type="submit" disabled={isPending}>
        {isPending ? "처리 중..." : "제출"}
      </button>
      {message && (
        <p style={{ color: message.tone === "error" ? "crimson" : "green" }}>
          {message.text}
        </p>
      )}
    </form>
  );
}
```

### 6.2 서버 액션 패턴

```typescript
"use server";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function someAction(input: SomeInput): Promise<ActionResult> {
  // 1. 입력 유효성 검증
  if (!input.field.trim()) {
    return { ok: false, error: "필드를 입력하세요." };
  }

  // 2. 인가 확인 (필요한 경우)
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready") { ... }

  // 3. DB 작업
  const result = await someApiCall(input);
  if (result.error) {
    return { ok: false, error: result.error };
  }

  // 4. 성공 처리 (redirect 또는 ok: true 반환)
  return { ok: true };
}
```

### 6.3 공통 타입 (lib/types/api.ts)

```typescript
export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };
```

### 6.4 에러 메시지 표시 현황

- 현재: 인라인 `style={{ color: "crimson" }}`으로 빨간색 표시
- Tailwind 클래스 기반 에러 UI 컴포넌트 **없음** (새로 만들어야 함)
- `FieldHint` 컴포넌트(`components/ui/FieldHint.tsx`)가 있으나 힌트 텍스트용 (에러 전용이 아님)

---

## 7. 라우팅 구조 분석

### 7.1 App Router 사용 여부

**Next.js App Router** 사용. `app/` 디렉토리 기반.

### 7.2 전체 라우트 구조

```
app/
├── layout.tsx                    # 루트 레이아웃 (로그인 상태에 따라 Sidebar/GlobalHeader 분기)
├── page.tsx                      # 홈 (공개 - 대회 목록)
├── login/                        # 로그인 페이지 (현재 스타일 없음)
│   ├── page.tsx
│   ├── Form.tsx
│   └── actions.ts
├── signup/                       # 회원가입 페이지 (현재 스타일 없음)
│   ├── page.tsx
│   ├── Form.tsx
│   └── actions.ts
├── actions/
│   └── auth.ts                   # logoutAction (서버 액션)
├── auth/
│   └── callback/route.ts         # OAuth 콜백 처리
├── dashboard/                    # 보호됨 (player용)
├── team/                         # 보호됨
├── teams/[teamId]/               # 보호됨
├── tournament/[id]/              # 공개 (apply는 보호됨)
├── admin/                        # 보호됨 (organizer/manager)
│   ├── users/                    # organizer 전용
│   └── tournaments/
└── (auth), (public) 폴더        # Route Group 형태로 존재하나 현재 비어있음
```

> **주의:** `app/(auth)/`, `app/(public)/` Route Group 폴더가 존재하지만 현재 비어있다. 인증 페이지를 `(auth)` 그룹 아래로 이동 가능하나, 현재는 최상위 `app/login/`, `app/signup/`에 위치.

### 7.3 공개 vs 보호 페이지 구분 방식

**별도 미들웨어 없음.** 각 Server Component 페이지에서 직접 처리:

```typescript
// 보호된 페이지 공통 패턴 (예: app/dashboard/page.tsx)
export default async function DashboardPage() {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "error") { /* 에러 UI */ }
  if (result.status === "empty") { /* 프로필 없음 UI */ }

  // 역할 분기
  if (isOperationRole(result.role)) redirect("/admin");

  // 실제 컨텐츠 렌더링
}
```

### 7.4 로그인 후 리다이렉트 처리

`app/login/actions.ts`:

```typescript
const nextPath = isOperationRole(roleResult.role) ? "/admin" : "/dashboard";
redirect(nextPath);
```

| 역할 | 로그인 후 이동 |
|------|---------------|
| organizer | `/admin` |
| manager | `/admin` |
| player | `/dashboard` |

### 7.5 루트 레이아웃 인증 분기

`app/layout.tsx`:

```typescript
const userResult = await getUserWithRole();
const isLoggedIn = userResult.status === "ready";

// 로그인 상태: Sidebar + main 레이아웃
// 비로그인 상태: GlobalHeader + children
```

> **중요:** 로그인 상태이면 Sidebar가 표시되고, 비로그인 상태이면 GlobalHeader가 표시된다. 즉 **로그인/회원가입 페이지에는 GlobalHeader가 자동으로 표시된다.** 별도 레이아웃 설정 없이도 내비게이션이 있다.

---

## 8. 재사용 가능한 UI 컴포넌트

### 8.1 Button (`components/ui/Button.tsx`)

```typescript
type ButtonVariant = "primary" | "secondary" | "ghost";

// primary: bg-amber-400 text-slate-900 hover:bg-amber-300
// secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50
// ghost: px-3 py-2 text-slate-600 hover:bg-slate-100

<Button variant="primary" disabled={isPending}>로그인</Button>
<Button variant="secondary">회원가입</Button>
```

### 8.2 Card (`components/ui/Card.tsx`)

```typescript
type CardVariant = "default" | "highlight" | "muted";

// default: border-slate-200 bg-white
// highlight: border-amber-200 bg-amber-50
// muted: border-slate-200 bg-slate-50

// 기본 스타일: rounded-xl border p-5 shadow-sm

<Card variant="default">...</Card>
```

### 8.3 FieldHint (`components/ui/FieldHint.tsx`)

```typescript
// text-xs text-gray-500
<FieldHint>이메일 형식으로 입력하세요.</FieldHint>
```

### 8.4 없는 컴포넌트 (새로 만들어야 함)

| 컴포넌트 | 필요 이유 |
|----------|-----------|
| `<Input />` | 스타일된 input 컴포넌트 없음. 현재 native `<input>` + inline style 사용 중 |
| `<FormField />` | label + input + error 묶음 컴포넌트 없음 |
| `<AuthCard />` | 인증 페이지 전용 카드 레이아웃 없음 |
| `<ErrorMessage />` | 에러 메시지 전용 컴포넌트 없음 |
| `<PasswordInput />` | 비밀번호 표시/숨기기 토글 없음 |

---

## 9. 비밀번호 찾기/재설정 관련 현황

### 9.1 현재 구현 상태

**비밀번호 찾기/재설정 기능이 전혀 구현되어 있지 않다.**

- 관련 페이지 없음
- 관련 서버 액션 없음
- 관련 API 함수 없음

### 9.2 Supabase가 지원하는 기능

Supabase Auth에서 제공하는 비밀번호 재설정 메서드:

```typescript
// 1. 재설정 이메일 발송
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "https://your-app.com/auth/reset-password"
});

// 2. 비밀번호 업데이트 (재설정 링크 클릭 후 세션이 생긴 상태에서)
await supabase.auth.updateUser({ password: newPassword });
```

### 9.3 구현에 필요한 인프라 분석

**이메일 발송 방식:**
- Supabase Auth가 직접 이메일을 발송 (설정에서 SMTP 또는 Supabase 기본 SMTP 사용)
- `resetPasswordForEmail()` 호출 시 자동 처리됨

**redirect URL 처리:**
- `redirectTo` 파라미터로 재설정 완료 후 돌아올 URL 지정
- 현재 `app/auth/callback/route.ts`가 이미 code exchange를 처리할 수 있음
- 그러나 비밀번호 재설정은 `type=recovery` 형태의 특수 URL이므로 **별도 처리가 필요할 수 있음**

**토큰/세션 검증 방식:**
- Supabase가 이메일 링크에 포함된 토큰을 자동 처리
- 링크 클릭 시 Supabase가 세션을 생성하고 `redirectTo` URL로 이동
- 클라이언트에서 `supabase.auth.onAuthStateChange`로 `PASSWORD_RECOVERY` 이벤트를 감지하거나, URL hash의 access_token을 처리해야 함

**현재 callback route 재사용 가능성:**
```typescript
// app/auth/callback/route.ts - 현재 구조
// code 파라미터를 받아서 세션으로 교환하는 흐름만 처리함
// 비밀번호 재설정의 경우 별도 /auth/reset-password 등의 경로가 필요할 수 있음
```

### 9.4 구현 방향 제안

```
비밀번호 찾기 흐름:
1. /forgot-password 페이지에서 이메일 입력
2. supabase.auth.resetPasswordForEmail(email, { redirectTo: "/auth/callback?next=/reset-password" }) 호출
3. 이메일의 링크 클릭 → /auth/callback → /reset-password로 이동
4. /reset-password 페이지에서 새 비밀번호 입력
5. supabase.auth.updateUser({ password }) 호출 (클라이언트 측)
6. 완료 후 /login 또는 /dashboard로 이동
```

---

## 10. SNS 로그인 분석

### 10.1 현재 상태

SNS(OAuth) 로그인이 **구현되어 있지 않다.**

- `signInWithOAuth()` 호출 코드 없음
- provider 버튼(Google, Kakao 등) UI 없음
- 단, `app/auth/callback/route.ts`는 OAuth code exchange를 처리할 수 있는 구조로 작성됨

### 10.2 요구사항 판단

현재 요구사항("로그인/회원가입/비밀번호 찾기/재설정")에는 SNS 로그인이 명시되어 있지 않다.
기존 코드베이스에도 SNS 로그인 흔적이 없으므로, **이번 구현 범위에서 제외한다.**

---

## 11. 회원가입 후 추가 프로필 입력 분석

### 11.1 현재 프로필 구조

`profiles` 테이블에는 `id`, `role`, `created_at`만 존재한다.
추가 프로필 필드가 **없다:**

- `display_name` — 없음
- `avatar_url` — 없음
- `phone` — 없음
- `organization` / `team` / `school` — 없음
- 약관 동의 저장 — 없음

### 11.2 결론

회원가입 시 추가 프로필 입력 단계가 **불필요하다.** 이메일/비밀번호 입력 후 가입 완료로 처리한다.
(향후 프로필 확장 시 마이그레이션 추가 필요)

---

## 12. 역할 기반 접근 제어 및 메뉴 분기

### 12.1 로그인 후 landing 페이지

| 역할 | 로그인 후 이동 | 이유 |
|------|---------------|------|
| organizer | `/admin` | `isOperationRole()` true → admin redirect |
| manager | `/admin` | `isOperationRole()` true → admin redirect |
| player | `/dashboard` | 기본 redirect |

### 12.2 Sidebar 메뉴 분기

```typescript
// components/layout/Sidebar.tsx
function buildMenuItems(role: Role | null): NavItem[] {
  if (role === "organizer" || role === "manager") {
    const items = [
      { label: "대시보드", href: "/dashboard" },
      { label: "대회관리", href: "/admin" },
    ];
    if (role === "organizer") {
      items.push({ label: "권한관리", href: "/admin/users" });
    }
    return items;
  }
  // player
  return [
    { label: "대시보드", href: "/dashboard" },
    { label: "내팀", href: "/team" },
  ];
}
```

### 12.3 GlobalHeader 분기 (비로그인 상태)

```typescript
// components/nav/GlobalHeader.tsx
const items = [{ label: "대회", href: "/" }];
if (isLoggedIn) items.push({ label: "대시보드", href: "/dashboard" });
if (role === "organizer") items.push({ label: "Admin", href: "/admin" });
```

---

## 13. 인증 흐름 전체 요약

### 13.1 로그인 흐름

```
[사용자] → /login 방문
    → LoginForm에서 이메일/비밀번호 입력
    → form submit → useTransition
    → signInWithPassword(server action) 호출
        → 입력 유효성 검증 (빈 값 체크)
        → lib/api/auth.ts > signInWithPassword() 호출
            → supabase.auth.signInWithPassword({ email, password })
        → getCurrentUserRole() 호출 (profiles 테이블에서 role 조회)
        → isOperationRole(role) 판단
        → redirect("/admin") 또는 redirect("/dashboard")
    → 성공: 역할에 따른 페이지로 이동
    → 실패: error 메시지 표시
```

### 13.2 회원가입 흐름

```
[사용자] → /signup 방문
    → SignupForm에서 이메일/비밀번호 입력
    → form submit → useTransition
    → signUpWithPassword(server action) 호출
        → 입력 유효성 검증
        → lib/api/auth.ts > signUpWithPassword() 호출
            → supabase.auth.signUp({ email, password })
        → DB 트리거 자동 실행: handle_new_user()
            → profiles 테이블에 { id, role: 'player' } INSERT
    → 성공: ok: true 반환
    → 클라이언트에서 router.push("/dashboard")
    → 실패: error 메시지 표시

※ 현재 signup action은 redirect를 하지 않고 ok: true만 반환 → Form에서 router.push("/dashboard")
   (login action과 다름 — 일관성 있는 방향으로 수정 필요)
```

### 13.3 비밀번호 찾기 흐름 (현재 미구현)

```
[사용자] → /forgot-password (신규 생성 필요)
    → 이메일 입력
    → forgotPasswordAction(server action, 신규 생성 필요) 호출
        → supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })
    → 성공: "이메일을 전송했습니다" 메시지
    → 실패: error 메시지

[사용자] → 이메일 링크 클릭
    → /auth/callback?code=XXX&next=/reset-password (또는 Supabase의 hash-based 방식)
    → 세션 교환 후 /reset-password로 이동
```

### 13.4 비밀번호 재설정 흐름 (현재 미구현)

```
[사용자] → /reset-password (신규 생성 필요)
    → 새 비밀번호 입력
    → resetPasswordAction(server action, 신규 생성 필요) 호출
        → supabase.auth.updateUser({ password: newPassword })
    → 성공: /login으로 이동 (또는 자동 로그인 후 /dashboard)
    → 실패: error 메시지
```

> **주의:** `updateUser`는 활성 세션이 있어야 동작한다. 이메일 링크 클릭 후 Supabase가 세션을 생성하므로, 해당 세션이 유효한 상태에서 호출해야 한다.
> `supabase.auth.updateUser()`는 **클라이언트 컴포넌트** 또는 **서버 액션** 어디서든 호출 가능하다.

---

## 14. 파일별 역할 및 수정 가능성 정리

| 파일 | 역할 | 수정 가능성 |
|------|------|-------------|
| `lib/api/auth.ts` | Supabase Auth 호출 래퍼 | **높음** — `resetPasswordForEmail`, `updateUserPassword` 함수 추가 필요 |
| `app/login/page.tsx` | 로그인 페이지 | **높음** — 전면 재구현 (스타일 적용) |
| `app/login/Form.tsx` | 로그인 폼 컴포넌트 | **높음** — 전면 재구현 (UI 컴포넌트 활용) |
| `app/login/actions.ts` | 로그인 서버 액션 | **낮음** — 로직은 충분, 비밀번호 찾기 링크 처리 등 소폭 수정 가능 |
| `app/signup/page.tsx` | 회원가입 페이지 | **높음** — 전면 재구현 |
| `app/signup/Form.tsx` | 회원가입 폼 컴포넌트 | **높음** — 전면 재구현 |
| `app/signup/actions.ts` | 회원가입 서버 액션 | **낮음** — redirect 추가 정도만 필요 |
| `app/actions/auth.ts` | 로그아웃 서버 액션 | **없음** — 건드릴 필요 없음 |
| `app/auth/callback/route.ts` | OAuth/PKCE 콜백 | **낮음** — 비밀번호 재설정 콜백 지원 확인 필요 |
| `src/lib/auth/roles.ts` | 역할 관련 함수 | **없음** — 건드릴 필요 없음 |
| `src/lib/auth/guards.ts` | 인가 가드 | **없음** — 건드릴 필요 없음 |
| `src/lib/supabase/client.ts` | 브라우저 Supabase 클라이언트 | **낮음** — 비밀번호 재설정 페이지에서 사용 가능 |
| `src/lib/supabase/server.ts` | 서버 Supabase 클라이언트 | **없음** — 건드릴 필요 없음 |
| `components/ui/Button.tsx` | 버튼 UI | **없음** — 그대로 재사용 |
| `components/ui/Card.tsx` | 카드 UI | **없음** — 그대로 재사용 |
| `components/ui/FieldHint.tsx` | 힌트 텍스트 UI | **없음** — 그대로 재사용 |
| `app/layout.tsx` | 루트 레이아웃 | **없음** — 인증 상태에 따른 레이아웃 분기 이미 처리됨 |
| `components/layout/Sidebar.tsx` | 사이드바 | **없음** — 건드릴 필요 없음 |
| `components/nav/GlobalHeader.tsx` | 퍼블릭 헤더 | **없음** — 로그인/회원가입 페이지에 자동으로 표시됨 |

---

## 15. 신규 생성이 필요한 파일 목록

### 15.1 페이지 (Page Components)

| 파일 경로 | 설명 |
|-----------|------|
| `app/forgot-password/page.tsx` | 비밀번호 찾기 페이지 |
| `app/forgot-password/Form.tsx` | 이메일 입력 폼 |
| `app/forgot-password/actions.ts` | `forgotPasswordAction` 서버 액션 |
| `app/reset-password/page.tsx` | 비밀번호 재설정 페이지 |
| `app/reset-password/Form.tsx` | 새 비밀번호 입력 폼 (클라이언트 컴포넌트) |

> **주의:** 비밀번호 재설정 폼은 `supabase.auth.updateUser()`를 직접 호출해야 하므로, 클라이언트 컴포넌트에서 `createSupabaseBrowserClient()`를 사용하는 방식을 고려해야 한다.

### 15.2 UI 컴포넌트 (Components)

| 파일 경로 | 설명 |
|-----------|------|
| `components/ui/Input.tsx` | 스타일된 input 컴포넌트 (label, error 표시 포함 또는 별도) |
| `components/ui/FormField.tsx` | label + input + error 묶음 (선택적) |
| `components/auth/AuthCard.tsx` | 인증 페이지 전용 카드 래퍼 레이아웃 (선택적) |

> **주의:** 새 컴포넌트는 기존 패턴(Tailwind 클래스, slate/amber 팔레트)에 맞춰야 한다.

### 15.3 API 함수 (lib/api/auth.ts 추가)

```typescript
// 추가할 함수들
export async function resetPasswordForEmail(email: string, redirectTo: string): Promise<AuthResult>
export async function updateUserPassword(newPassword: string): Promise<AuthResult>
```

---

## 16. 구현 시 주의해야 할 제약사항

### 16.1 폼 처리 패턴 준수

- `react-hook-form`, `zod` 사용 **금지** — 프로젝트에 설치되어 있지 않음
- `useState` + `useTransition` + Server Action 패턴을 따를 것
- `ActionResult` 타입(`lib/types/api.ts`)을 재사용할 것

### 16.2 레이아웃 주의사항

- 로그인/회원가입 페이지는 `app/layout.tsx`에 의해 **자동으로 GlobalHeader가 표시**된다
- 비로그인 상태이므로 Sidebar는 표시되지 않음
- 페이지 자체에서 헤더를 중복 구현하지 말 것

### 16.3 비밀번호 재설정 세션 처리

- `supabase.auth.updateUser()`는 활성 세션이 필요하다
- 이메일 링크 → callback 처리 → 세션 생성 순서를 정확히 따라야 한다
- Supabase의 이메일 링크 방식이 **PKCE (code exchange)** 인지 **hash-based** 인지 환경 설정에 따라 다를 수 있음
  - `@supabase/ssr`은 기본적으로 PKCE를 사용하므로 `app/auth/callback/route.ts`에서 처리 가능할 것
- 재설정 링크 클릭 후 세션이 만료되기 전에 처리해야 함

### 16.4 에러 메시지 한국어화

- Supabase가 반환하는 에러 메시지는 영어임 (예: "Invalid login credentials")
- 현재 `app/login/actions.ts`에서 에러를 그대로 전달하고 있음
- 사용자에게 보여주기 전에 한국어로 변환하는 로직 추가를 고려할 것

### 16.5 회원가입 후 리다이렉트 불일치

- `app/login/actions.ts`: 서버 액션에서 `redirect()` 호출
- `app/signup/actions.ts`: `ok: true`만 반환 → 클라이언트에서 `router.push("/dashboard")`
- 일관성을 위해 signup도 서버 액션에서 `redirect()` 호출하는 방향으로 수정하거나, 역할 기반 리다이렉트 로직 추가 고려

### 16.6 프로필 미생성(empty) 상태 처리

- `getUserWithRole()`이 `"empty"` 상태를 반환할 수 있음 (DB 트리거 실패 시)
- 현재 `dashboard/page.tsx`와 `admin/page.tsx`에서 "No profile found" 메시지를 표시하지만, 인증 페이지에서도 이 경우를 고려해야 함

---

## 17. 프론트엔드 / 백엔드 / Supabase / 타입 / 정책 영향 범위

### 17.1 프론트엔드 영향 범위

| 영역 | 내용 |
|------|------|
| 신규 페이지 | `app/login/`, `app/signup/`, `app/forgot-password/`, `app/reset-password/` |
| 재사용 컴포넌트 | `Button`, `Card`, `FieldHint` |
| 신규 컴포넌트 | `Input` (또는 인라인 스타일), 에러 표시 패턴 |
| 레이아웃 | 변경 불필요 (루트 레이아웃이 자동 처리) |

### 17.2 백엔드(Server Action) 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `app/login/actions.ts` | 최소 변경 (에러 메시지 한국어화 정도) |
| `app/signup/actions.ts` | redirect 로직 추가 검토 |
| `app/forgot-password/actions.ts` | **신규 생성** |
| `lib/api/auth.ts` | `resetPasswordForEmail`, `updateUserPassword` 함수 추가 |

### 17.3 Supabase 영향 범위

| 항목 | 내용 |
|------|------|
| Auth 설정 | 이메일 템플릿 커스터마이징 필요 (한국어 이메일) |
| Redirect URL 허용 | Supabase 대시보드 > Authentication > URL Configuration에 사이트 URL 등록 필요 |
| RLS 정책 | 변경 불필요 |
| DB 스키마 | 변경 불필요 (profiles 트리거가 이미 player 기본값으로 처리) |

### 17.4 타입 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `lib/types/api.ts` | 변경 불필요 (`ActionResult` 재사용) |
| `src/lib/auth/roles.ts` | 변경 불필요 |
| `lib/api/auth.ts` 타입 | `AuthResult` 타입 재사용 |

### 17.5 RLS 정책 영향 범위

인증 관련 RLS 정책은 변경이 필요 없다.
- `profiles_select_own_or_organizer` — 유지
- `profiles_update_own` — 유지
- `handle_new_user` 트리거 — 유지 (신규 가입 시 player 자동 생성)

---

## 18. 재사용 가능한 기존 파일 요약

### 18.1 로그인 페이지 구현 시 재사용 가능한 파일

| 파일 | 재사용 방식 |
|------|-------------|
| `app/login/actions.ts` | 그대로 유지 (로직 변경 없음) |
| `lib/api/auth.ts` | `signInWithPassword` 함수 그대로 사용 |
| `src/lib/auth/roles.ts` | `isOperationRole` 함수 그대로 사용 |
| `components/ui/Button.tsx` | 제출 버튼 |
| `components/ui/Card.tsx` | 로그인 폼 카드 래퍼 |
| `components/ui/FieldHint.tsx` | 이메일/비밀번호 힌트 텍스트 |
| `lib/types/api.ts` | `ActionResult` 타입 |

### 18.2 회원가입 페이지 구현 시 재사용 가능한 파일

| 파일 | 재사용 방식 |
|------|-------------|
| `app/signup/actions.ts` | redirect 추가 후 유지 |
| `lib/api/auth.ts` | `signUpWithPassword` 함수 그대로 사용 |
| `components/ui/Button.tsx` | 제출 버튼 |
| `components/ui/Card.tsx` | 폼 카드 래퍼 |
| `components/ui/FieldHint.tsx` | 힌트 텍스트 |
| `lib/types/api.ts` | `ActionResult` 타입 |

### 18.3 비밀번호 찾기 구현 시 참고해야 할 파일

| 파일 | 참고 내용 |
|------|-----------|
| `app/signup/Form.tsx` | 폼 컴포넌트 패턴 참고 |
| `app/signup/actions.ts` | 서버 액션 패턴 참고 |
| `app/auth/callback/route.ts` | 콜백 처리 구조 참고 및 재사용 |
| `lib/api/auth.ts` | 신규 함수 추가 위치 |
| `src/lib/supabase/server.ts` | 서버 클라이언트 사용 |

### 18.4 비밀번호 재설정 구현 시 참고해야 할 파일

| 파일 | 참고 내용 |
|------|-----------|
| `app/auth/callback/route.ts` | 세션 교환 후 /reset-password로 리다이렉트 |
| `src/lib/supabase/client.ts` | 클라이언트 측 `updateUser()` 호출을 위한 브라우저 클라이언트 |
| `app/signup/Form.tsx` | 클라이언트 컴포넌트 패턴 참고 |
| `lib/api/auth.ts` | 신규 `updateUserPassword()` 함수 추가 위치 |

---

## 19. 기타 발견 사항

### 19.1 구글 폰트

`app/layout.tsx`에서 `Space_Grotesk` 폰트 사용 (라틴 서브셋만). 한글 폰트 미설정 상태.

### 19.2 Tailwind CSS v4 사용

Tailwind CSS v4는 PostCSS 플러그인 방식으로 동작하며, v3과 설정 방식이 다를 수 있다. `tailwind.config.ts`가 존재하지만 v4는 `@import "tailwindcss"` 방식을 선호한다.

### 19.3 서버 컴포넌트 기본값

`app/layout.tsx`, `app/admin/page.tsx`, `app/dashboard/page.tsx` 등 주요 페이지가 Server Component로 작성되어 있다. Form 컴포넌트들만 `"use client"` 지시어를 사용한다.

### 19.4 dynamic = "force-dynamic"

`app/admin/page.tsx`, `app/dashboard/page.tsx`에 `export const dynamic = "force-dynamic"`이 설정되어 있다. 인증이 필요한 페이지에서 캐시를 방지하기 위한 설정이다.
