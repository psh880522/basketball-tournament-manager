# 비밀번호 찾기 / 비밀번호 재설정 페이지 구현 계획

**작성일:** 2026-04-02
**버전:** v1
**참조 리서치:** `docs/ai-history/01-research/20260402_auth-pages_Research.md`
**브랜치:** develop
**상태:** 검토 대기 (미승인)

---

## 1. 구현 개요

### 1.1 목표

현재 미구현된 비밀번호 찾기/재설정 흐름을 Supabase Auth의 PKCE 기반 recovery 흐름으로 구현한다.
기존 프로젝트의 인증 구조(`getUserWithRole`, `createSupabaseServerClient`), UI 패턴(`useState` + `useTransition` + Server Action), 컴포넌트 스타일(amber/slate 팔레트)을 그대로 따른다.

### 1.2 구현 범위 및 제외 항목

| 항목 | 포함 여부 |
|------|-----------|
| 이메일로 재설정 링크 발송 | ✅ 포함 |
| 재설정 링크 클릭 후 새 비밀번호 입력 | ✅ 포함 |
| 만료/무효 링크 예외 처리 | ✅ 포함 |
| SNS 계정 비밀번호 복구 | ❌ 제외 |
| 휴대폰 인증, 보안 질문 등 대체 복구 수단 | ❌ 제외 |
| 관리자 강제 초기화 | ❌ 제외 |
| 계정 정보 수정 (이름, 이메일 변경 등) | ❌ 제외 |

---

## 2. 전체 인증 흐름 설계

### 2.1 비밀번호 찾기 흐름

```
[사용자] /forgot-password 방문
    → 이메일 입력
    → forgotPasswordAction(server action) 호출
        → supabase.auth.resetPasswordForEmail(email, { redirectTo })
          redirectTo = "{origin}/auth/callback?next=/reset-password"
        → 성공/실패 여부와 무관하게 "이메일을 발송했습니다" 표시
          (보안: 이메일 존재 여부 노출 방지 — Supabase도 동일 동작)
    → 이메일 내 링크 클릭
        → Supabase가 "https://app.com/auth/callback?code=XXX" 형태로 redirect
          (현재 @supabase/ssr은 PKCE 방식 사용 → code 파라미터 방식)
```

### 2.2 콜백 처리 흐름

```
[app/auth/callback/route.ts] GET /auth/callback?code=XXX&next=/reset-password
    → code 유효성 확인
    → supabase.auth.exchangeCodeForSession(code)
        → recovery 세션 생성 → 쿠키에 저장
    → next 파라미터("/reset-password")로 redirect
```

> **핵심:** `app/auth/callback/route.ts`는 **수정 없이 그대로 재사용**한다. `resetPasswordForEmail`의 `redirectTo`에 `?next=/reset-password`를 포함시키는 것만으로 충분하다.

### 2.3 비밀번호 재설정 흐름

```
[사용자] /reset-password 방문 (쿠키에 recovery 세션 있음)
    → page.tsx에서 getUserWithRole() 호출
    → 세션 없음 → /forgot-password?error=link_expired 로 redirect
    → 세션 있음 → ResetPasswordForm 렌더링
    → 새 비밀번호 입력
    → resetPasswordAction(server action) 호출
        → supabase.auth.updateUser({ password: newPassword })
        → 성공: redirect("/dashboard")
        → 실패: 한국어 에러 메시지 반환
```

---

## 3. 추가 설치 라이브러리 검토

**결론: 추가 설치 없음.**

| 고려 대상 | 판단 | 근거 |
|-----------|------|------|
| `react-hook-form` | 불필요 | 비밀번호 찾기는 필드 1개(email), 재설정은 2개(password, passwordConfirm). 기존 `useState` + `useTransition` 패턴으로 충분하다. 기존 로그인/회원가입 폼과 일관성 유지 필요. |
| `zod` / `yup` | 불필요 | 클라이언트 유효성은 `required`, `type="email"` + 비밀번호 길이/일치 조건 비교로 처리한다. 서버 액션에서 추가 검증은 수동 조건문으로 처리. |
| 비밀번호 입력 UI 라이브러리 | 불필요 | 로그인/회원가입에서 구현한 `Input.tsx`의 `rightElement` prop을 재사용. |

---

## 4. 파일 목록

### 4.1 신규 파일

| 파일 | 역할 |
|------|------|
| `app/forgot-password/page.tsx` | 비밀번호 찾기 페이지 (Server Component) |
| `app/forgot-password/Form.tsx` | 이메일 입력 폼 (Client Component) |
| `app/forgot-password/actions.ts` | 재설정 메일 발송 서버 액션 |
| `app/reset-password/page.tsx` | 비밀번호 재설정 페이지 (Server Component, 세션 검증) |
| `app/reset-password/Form.tsx` | 새 비밀번호 입력 폼 (Client Component) |
| `app/reset-password/actions.ts` | 비밀번호 업데이트 서버 액션 |

### 4.2 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `lib/api/auth.ts` | `resetPasswordForEmail()`, `updateUserPassword()` 함수 추가 |

### 4.3 수정 없이 재사용하는 파일

| 파일 | 재사용 방식 |
|------|-------------|
| `app/auth/callback/route.ts` | `next=/reset-password` 파라미터로 그대로 재사용 |
| `src/lib/supabase/server.ts` | 서버 액션에서 서버 클라이언트 생성 |
| `src/lib/auth/roles.ts` | `getUserWithRole()` — reset-password page.tsx에서 세션 확인용 |
| `components/ui/Input.tsx` | 이메일/비밀번호/비밀번호 확인 입력 필드 |
| `components/ui/Button.tsx` | 제출 버튼 |
| `components/ui/Card.tsx` | 폼 카드 래퍼 |
| `components/ui/FieldHint.tsx` | 비밀번호 조건 힌트 텍스트 |
| `lib/types/api.ts` | `ActionResult` 타입 참조 |

### 4.4 신규 UI 컴포넌트 불필요 이유

- `Input.tsx` — 이미 `rightElement` prop 포함. 비밀번호 토글까지 지원하므로 추가 컴포넌트 불필요.
- `ErrorMessage.tsx` — 에러 박스는 로그인/회원가입과 동일하게 Form 내 인라인 처리.
- `PasswordInput.tsx` — 별도 추출 불필요. 이전 판단과 동일.

---

## 5. 파일별 역할 및 핵심 코드 구조

### 5.1 `lib/api/auth.ts` (수정)

**역할:** Supabase Auth 호출 래퍼. 비밀번호 찾기/재설정에 필요한 2개 함수를 추가한다.

**추가할 함수:**

```typescript
// 비밀번호 찾기: 재설정 이메일 발송
type ResetPasswordResult = {
  error: string | null;
};

export async function resetPasswordForEmail(
  email: string,
  redirectTo: string
): Promise<ResetPasswordResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error: error ? error.message : null };
}

// 비밀번호 재설정: 새 비밀번호 저장 (recovery 세션 필요)
export async function updateUserPassword(
  newPassword: string
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error ? error.message : null };
}
```

**`updateUser`를 서버 액션에서 처리하는 이유:**
- `createSupabaseServerClient()`는 쿠키를 읽어 세션을 복원한다.
- 콜백(`/auth/callback`)에서 `exchangeCodeForSession(code)`로 recovery 세션이 쿠키에 저장됐으므로, 서버 클라이언트에서도 해당 세션을 그대로 사용할 수 있다.
- 브라우저 클라이언트(`createSupabaseBrowserClient()`)를 쓰는 것보다 기존 server action 패턴에 일관성이 있다.

---

### 5.2 `app/forgot-password/actions.ts` (신규)

**역할:** 비밀번호 재설정 메일 발송 서버 액션.

**핵심 로직:**
```typescript
"use server";

import { headers } from "next/headers";

function translateForgotPasswordError(message: string): string {
  const map: Record<string, string> = {
    "Email rate limit exceeded": "잠시 후 다시 시도해주세요.",
    "Unable to validate email address: invalid format": "올바른 이메일 형식을 입력하세요.",
  };
  return map[message] ?? "메일 발송 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function forgotPasswordAction(
  input: { email: string }
): Promise<ActionResult> {
  if (!input.email.trim()) {
    return { ok: false, error: "이메일을 입력하세요." };
  }

  // origin 동적 구성 (NEXT_PUBLIC_SITE_URL 환경변수 없이 처리)
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = `${protocol}://${host}`;
  const redirectTo = `${origin}/auth/callback?next=/reset-password`;

  const result = await resetPasswordForEmail(input.email.trim(), redirectTo);

  if (result.error) {
    return { ok: false, error: translateForgotPasswordError(result.error) };
  }

  // 성공 시에도 이메일 존재 여부를 직접 노출하지 않음
  // Supabase도 가입되지 않은 이메일에 대해 동일하게 성공 응답 반환
  return { ok: true };
}
```

**이메일 존재 여부 비노출 정책:**
- Supabase는 가입되지 않은 이메일에 대해서도 `resetPasswordForEmail()`이 에러를 반환하지 않는다 (보안 설계).
- 따라서 클라이언트/서버 어디서도 "이메일이 존재하지 않습니다"와 같은 메시지를 표시하지 않는다.
- 성공 응답 메시지: "이메일이 존재한다면 재설정 링크가 발송됩니다."

---

### 5.3 `app/forgot-password/Form.tsx` (신규)

**역할:** 이메일 입력 폼 Client Component. 필드 1개, 단순한 상태 관리.

**상태 관리:**
```typescript
const [email, setEmail] = useState("");
const [message, setMessage] = useState<Message | null>(null);
const [emailSent, setEmailSent] = useState(false); // 발송 완료 상태
const [isPending, startTransition] = useTransition();
```

**제출 흐름:**
```typescript
const handleSubmit = (e) => {
  e.preventDefault();
  setMessage(null);

  startTransition(async () => {
    const result = await forgotPasswordAction({ email });

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }

    setEmailSent(true); // 발송 완료 UI로 전환
  });
};
```

**발송 완료 UI:**
```tsx
if (emailSent) {
  return (
    <div className="space-y-4 py-2 text-center">
      {/* 이메일/체크 아이콘 */}
      <h2>메일을 발송했습니다</h2>
      <p>
        이메일이 존재한다면 <br />
        <span className="font-medium">{email}</span>으로<br />
        재설정 링크가 발송됩니다.
      </p>
      <p className="text-xs text-slate-400">
        메일이 오지 않는다면 스팸 폴더를 확인해주세요.
      </p>
      <Link href="/login">
        <Button variant="secondary" className="w-full">
          로그인 페이지로 이동
        </Button>
      </Link>
    </div>
  );
}
```

**폼 렌더링:**
```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  {/* 에러 박스 */}
  {message?.tone === "error" && (...)}

  <Input
    id="email"
    label="이메일"
    type="email"
    required
    autoComplete="email"
    disabled={isPending}
    value={email}
    onChange={e => setEmail(e.target.value)}
    placeholder="가입하신 이메일을 입력하세요"
  />

  <Button type="submit" className="w-full" disabled={isPending}>
    {isPending ? "발송 중..." : "재설정 링크 발송"}
  </Button>
</form>
```

---

### 5.4 `app/forgot-password/page.tsx` (신규)

**역할:** 비밀번호 찾기 페이지 Server Component.

**처리 사항:**
- 이미 로그인된 사용자 → 적절한 페이지로 redirect
- 비로그인 사용자 → 이메일 입력 폼 렌더링

```tsx
export default async function ForgotPasswordPage() {
  const result = await getUserWithRole();

  if (result.status === "ready") {
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1>비밀번호 찾기</h1>
          <p>가입하신 이메일로 재설정 링크를 보내드립니다.</p>
        </div>

        <Card>
          <ForgotPasswordForm />
        </Card>

        <p className="text-center text-sm text-slate-500">
          <Link href="/login">로그인으로 돌아가기</Link>
        </p>
      </div>
    </main>
  );
}
```

---

### 5.5 `app/reset-password/actions.ts` (신규)

**역할:** 새 비밀번호 저장 서버 액션. recovery 세션이 쿠키에 있다는 전제 하에 `updateUser()`를 호출한다.

**핵심 로직:**
```typescript
"use server";

import { redirect } from "next/navigation";
import { updateUserPassword } from "@/lib/api/auth";

function translateResetPasswordError(message: string): string {
  const map: Record<string, string> = {
    "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
    "Auth session missing!": "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 시도해주세요.",
    "New password should be different from the old password":
      "새 비밀번호는 기존 비밀번호와 달라야 합니다.",
  };
  return map[message] ?? "비밀번호 변경 중 오류가 발생했습니다. 다시 시도해주세요.";
}

export async function resetPasswordAction(
  input: { password: string }
): Promise<ActionResult> {
  if (!input.password.trim()) {
    return { ok: false, error: "새 비밀번호를 입력하세요." };
  }

  if (input.password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  const result = await updateUserPassword(input.password);

  if (result.error) {
    return { ok: false, error: translateResetPasswordError(result.error) };
  }

  // 성공: 비밀번호 변경 완료 → 대시보드로 이동 (세션 유지됨)
  redirect("/dashboard");
  return { ok: true };
}
```

---

### 5.6 `app/reset-password/Form.tsx` (신규)

**역할:** 새 비밀번호 입력 폼 Client Component. 회원가입 폼과 유사한 구조(비밀번호 + 비밀번호 확인).

**상태 관리:**
```typescript
const [password, setPassword] = useState("");
const [passwordConfirm, setPasswordConfirm] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
const [message, setMessage] = useState<Message | null>(null);
const [isPending, startTransition] = useTransition();
```

**제출 흐름 (클라이언트 유효성 검증 포함):**
```typescript
const handleSubmit = (e) => {
  e.preventDefault();
  setMessage(null);

  if (password.length < 6) {
    setMessage({ tone: "error", text: "비밀번호는 6자 이상이어야 합니다." });
    return;
  }

  if (password !== passwordConfirm) {
    setMessage({ tone: "error", text: "비밀번호가 일치하지 않습니다." });
    return;
  }

  startTransition(async () => {
    const result = await resetPasswordAction({ password });

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
    }
    // 성공 시 server action에서 redirect("/dashboard") 처리됨
  });
};
```

**렌더링 구조:**
```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  {/* 에러 박스 */}

  <Input
    id="password"
    label="새 비밀번호"
    type={showPassword ? "text" : "password"}
    required
    autoComplete="new-password"
    hint="6자 이상 입력하세요."
    className="pr-10"
    rightElement={<비밀번호토글버튼 />}
  />

  <Input
    id="passwordConfirm"
    label="새 비밀번호 확인"
    type={showPasswordConfirm ? "text" : "password"}
    required
    autoComplete="new-password"
    className="pr-10"
    rightElement={<비밀번호확인토글버튼 />}
  />

  <Button type="submit" className="w-full" disabled={isPending}>
    {isPending ? "변경 중..." : "비밀번호 변경"}
  </Button>
</form>
```

---

### 5.7 `app/reset-password/page.tsx` (신규)

**역할:** 비밀번호 재설정 페이지 Server Component. 세션 유효성을 확인해 접근을 제어한다.

**세션 검증 로직:**
```typescript
export default async function ResetPasswordPage() {
  const result = await getUserWithRole();

  // 세션 없음 → 만료된 링크 또는 직접 접근
  // "unauthenticated", "error" 모두 세션 없음으로 처리
  if (result.status === "unauthenticated" || result.status === "error") {
    redirect("/forgot-password?error=link_expired");
  }

  // 정상 세션 (ready 또는 empty) → 폼 렌더링
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1>새 비밀번호 설정</h1>
          <p>새로 사용할 비밀번호를 입력해주세요.</p>
        </div>

        <Card>
          <ResetPasswordForm />
        </Card>
      </div>
    </main>
  );
}
```

> **`forgot-password/page.tsx`에서 `error=link_expired` 처리:**
> `/forgot-password?error=link_expired` 접근 시 `searchParams`로 에러 메시지를 읽어 폼 위에 안내 메시지를 표시한다. (별도 props 또는 Form 외부에서 처리)

---

## 6. 전체 데이터 흐름

### 6.1 정상 흐름 (처음부터 끝까지)

```
1. [사용자] /forgot-password → 이메일 입력
2. forgotPasswordAction() →
     headers()로 origin 구성 →
     resetPasswordForEmail(email, "{origin}/auth/callback?next=/reset-password") →
     Supabase → 이메일 발송
3. [Form] emailSent = true → 발송 완료 UI 표시
4. [사용자] 이메일 클릭 →
     Supabase가 "{origin}/auth/callback?code=XXX&next=/reset-password(URL인코딩)" 형태로 redirect
     ※ Supabase는 redirectTo를 code 콜백 URL로 포함시킴
5. [app/auth/callback/route.ts] →
     exchangeCodeForSession(code) → recovery 세션 쿠키 저장 →
     redirect("/reset-password")
6. [사용자] /reset-password →
     page.tsx: getUserWithRole() → status === "ready" (recovery 세션)
     → ResetPasswordForm 렌더링
7. 새 비밀번호 입력 → resetPasswordAction() →
     updateUser({ password }) →
     성공 → redirect("/dashboard")
8. [사용자] /dashboard → 로그인 상태 유지됨
```

### 6.2 만료/무효 링크 접근 흐름

```
[사용자] 만료된 recovery 링크 클릭
    → /auth/callback?code=XXX (만료된 코드)
    → exchangeCodeForSession(code) 실패 (error)
    → redirect("/login?error=error.message")
    → /login 페이지에 에러 표시

[사용자] 직접 /reset-password 접근 (세션 없음)
    → page.tsx: getUserWithRole() → status === "unauthenticated"
    → redirect("/forgot-password?error=link_expired")
    → /forgot-password 페이지에 안내 메시지 표시
```

### 6.3 `app/auth/callback/route.ts`의 현재 에러 처리

현재 콜백 라우트는 에러 발생 시 `/login?error=에러메시지` 로 redirect한다.
이 동작을 그대로 유지한다. 단, `/login` 페이지에서 `error` searchParam을 받아 표시하는 처리는 현재 미구현이므로 이번 범위에 포함하지 않는다. (만료 링크 → `/login`으로 이동하면 로그인 폼이 표시되고, 사용자는 `/forgot-password`로 이동할 수 있음)

---

## 7. UI 레이아웃 계획

### 7.1 비밀번호 찾기 페이지 — 기본 상태

```
┌──────────────────────────────────────────┐
│ GlobalHeader (자동 표시)                  │
├──────────────────────────────────────────┤
│                                          │
│   ┌──────────────────────────────────┐   │
│   │        비밀번호 찾기             │   │
│   │  이메일로 재설정 링크를 보내드립니다. │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  [에러 박스 — 있을 때만]         │   │
│   │                                  │   │
│   │  이메일  [가입하신 이메일 입력]  │   │
│   │                                  │   │
│   │     [ 재설정 링크 발송 버튼 ]    │   │
│   └──────────────────────────────────┘   │
│                                          │
│         ← 로그인으로 돌아가기            │
│                                          │
└──────────────────────────────────────────┘
```

### 7.2 비밀번호 찾기 페이지 — 발송 완료 상태

```
│   ┌──────────────────────────────────┐   │
│   │        ✉ (이메일 아이콘)         │   │
│   │       메일을 발송했습니다         │   │
│   │  이메일이 존재한다면              │   │
│   │  you@example.com으로             │   │
│   │  재설정 링크가 발송됩니다.        │   │
│   │  메일이 오지 않는다면             │   │
│   │  스팸 폴더를 확인해주세요.        │   │
│   │   [ 로그인 페이지로 이동 버튼 ]  │   │
│   └──────────────────────────────────┘   │
```

### 7.3 비밀번호 재설정 페이지

```
┌──────────────────────────────────────────┐
│ GlobalHeader (자동 표시)                  │
├──────────────────────────────────────────┤
│                                          │
│   ┌──────────────────────────────────┐   │
│   │      새 비밀번호 설정            │   │
│   │  새로 사용할 비밀번호를 입력해주세요. │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  [에러 박스 — 있을 때만]         │   │
│   │                                  │   │
│   │  새 비밀번호  [   입력  👁  ]   │   │
│   │  6자 이상 입력하세요.            │   │
│   │                                  │   │
│   │  비밀번호 확인 [   입력  👁  ]  │   │
│   │                                  │   │
│   │      [  비밀번호 변경 버튼  ]    │   │
│   └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

---

## 8. 트레이드오프 및 고려사항

### 8.1 `app/auth/callback/route.ts` 재사용 vs 별도 경로

**선택: 재사용 (수정 없음)**

현재 콜백 라우트는 `next` 파라미터를 지원하므로 `resetPasswordForEmail`의 `redirectTo`에 `?next=/reset-password`를 포함시키면 password reset 흐름을 처리할 수 있다. 별도 경로를 만들면 콜백 로직이 분산되고 유지보수 부담이 증가한다.

### 8.2 `updateUser()`를 서버 액션에서 처리하는 이유

대안은 클라이언트 컴포넌트에서 `createSupabaseBrowserClient()`로 직접 호출하는 방식이다.

| 방식 | 장점 | 단점 |
|------|------|------|
| 서버 액션 (선택) | 기존 프로젝트 패턴 일관성. 민감한 작업이 서버에서 처리됨. | 쿠키 기반 세션에 의존하므로 세션이 전달되지 않으면 실패. |
| 클라이언트 직접 호출 | 브라우저 세션을 직접 사용하므로 세션 전달 문제 없음. | "use client" 컴포넌트에서 supabase 직접 호출 → 기존 패턴과 다름. |

`@supabase/ssr`은 쿠키를 통해 서버/클라이언트 간 세션을 공유하므로, `exchangeCodeForSession()` 이후 서버 액션에서도 recovery 세션에 접근 가능하다. 따라서 서버 액션 방식이 안전하다.

### 8.3 `/reset-password` 직접 접근 예외 처리

세션 없이 `/reset-password`에 직접 접근한 경우:
- `getUserWithRole()` → `"unauthenticated"`
- `/forgot-password?error=link_expired`로 redirect
- `forgot-password/page.tsx`에서 `searchParams.error` 를 읽어 "링크가 만료되었거나 유효하지 않습니다" 안내 메시지 표시

이미 로그인된 사용자가 `/reset-password`에 접근한 경우:
- `getUserWithRole()` → `"ready"`
- 일반 세션도 `updateUser()`를 허용하므로, 폼을 표시한다 (자신의 비밀번호를 변경하는 것이므로 문제없음)

### 8.4 이메일 존재 여부 비노출 정책

`resetPasswordForEmail()`은 Supabase 설계 상 미가입 이메일에도 에러를 반환하지 않는다.
클라이언트에서도 "이메일이 존재하지 않습니다" 메시지를 절대 표시하지 않는다.
성공 메시지: "이메일이 존재한다면 재설정 링크가 발송됩니다."

### 8.5 Supabase 에러 메시지 한국어화 위치

로그인/회원가입 액션과 동일하게 각 액션 파일의 로컬 함수로 처리한다.
- `app/forgot-password/actions.ts` → `translateForgotPasswordError()`
- `app/reset-password/actions.ts` → `translateResetPasswordError()`

### 8.6 GlobalHeader 자동 노출 구조와 충돌

`app/layout.tsx`에서 비로그인 상태(`status !== "ready"`)이면 GlobalHeader가 자동 표시된다.
비밀번호 찾기 페이지 → 비로그인 상태 → GlobalHeader 자동 표시 → 충돌 없음.
비밀번호 재설정 페이지 → recovery 세션 있음 (`status === "ready"`) → Sidebar가 표시될 수 있음.

> **주의:** recovery 세션이 있으면 `app/layout.tsx`에서 `isLoggedIn = true`가 되어 Sidebar가 렌더링된다. 이 상태에서 비밀번호 재설정 폼이 Sidebar와 함께 표시될 수 있다.
>
> 이는 기능상 문제가 없으나 (Sidebar를 보면서 비밀번호 재설정 가능), UX가 다소 어색할 수 있다. **이번 구현에서는 이 동작을 그대로 허용한다.** 별도 layout 처리는 현재 프로젝트 구조를 크게 변경해야 하므로 이번 범위 밖이다.

### 8.7 비밀번호 재설정 성공 후 이동

`updateUser({ password })` 성공 후 세션은 recovery 세션에서 일반 세션으로 업그레이드된다.
사용자는 로그인 상태이므로 `/dashboard`로 redirect한다.
(role이 organizer/manager인 경우에도 `/dashboard`로 보낸다. 이미 세션이 있으므로 dashboard에서 자동으로 `/admin`으로 redirect됨)

> 실제 redirect 최종 경로:
> - player → `/dashboard` (직접)
> - organizer/manager → `/dashboard` → dashboard가 `/admin`으로 redirect

이 흐름은 현재 `dashboard/page.tsx`의 `if (isOperationRole(result.role)) redirect("/admin")` 로직에 의해 자동 처리된다.

### 8.8 Rate Limit 처리

Supabase는 같은 이메일로 짧은 시간 내 여러 번 요청 시 rate limit 에러를 반환한다.
`translateForgotPasswordError()`에서 한국어 메시지로 처리: "잠시 후 다시 시도해주세요."

---

## 9. 구현 단계 (순서)

1. [완료] `lib/api/auth.ts` — `resetPasswordForEmail()`, `updateUserPassword()` 함수 추가
2. [완료] `app/forgot-password/page.tsx` — 기본 페이지 레이아웃 + 만료 링크 에러 표시
3. [완료] `app/forgot-password/Form.tsx` — 이메일 입력 폼 + 발송 완료 UI 분기
4. [완료] `app/forgot-password/actions.ts` — 메일 발송 서버 액션
5. [완료] `app/reset-password/page.tsx` — 세션 검증 + 기본 페이지 레이아웃
6. [완료] `app/reset-password/Form.tsx` — 새 비밀번호 입력 폼 (비밀번호 + 확인 + 토글)
7. [완료] `app/reset-password/actions.ts` — 비밀번호 업데이트 서버 액션

---

## 10. 구현 후 확인 체크리스트

**비밀번호 찾기:**
- [ ] 이메일 입력 후 발송 → 발송 완료 UI 표시 (가입 여부 무관하게 동일 메시지)
- [ ] 빈 이메일 제출 → 에러 메시지 표시, 서버 호출 없음
- [ ] rate limit 에러 → "잠시 후 다시 시도해주세요." 메시지
- [ ] 발송 완료 상태에서 "로그인 페이지로 이동" 버튼 → `/login`
- [ ] 이미 로그인된 상태로 접근 → 적절한 페이지로 redirect

**비밀번호 재설정:**
- [ ] 유효한 recovery 링크 클릭 → `/reset-password` 도달
- [ ] 새 비밀번호 6자 미만 → 클라이언트 에러 메시지, 서버 호출 없음
- [ ] 비밀번호 ≠ 비밀번호 확인 → 클라이언트 에러 메시지
- [ ] 정상 비밀번호 입력 → 변경 완료 → `/dashboard` 이동
- [ ] 만료된 링크로 `/reset-password` 진입 → `/forgot-password?error=link_expired` redirect
- [ ] `/reset-password` 직접 접근 (세션 없음) → `/forgot-password?error=link_expired` redirect
- [ ] 비밀번호 표시/숨기기 토글 (새 비밀번호, 확인 각각)
- [ ] pending 상태 → 버튼 비활성화 + 텍스트 변경
