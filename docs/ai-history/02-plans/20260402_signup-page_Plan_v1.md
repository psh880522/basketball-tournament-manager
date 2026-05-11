# 회원가입 페이지 구현 계획

**작성일:** 2026-04-02
**버전:** v1
**참조 리서치:** `docs/ai-history/01-research/20260402_auth-pages_Research.md`
**브랜치:** develop
**상태:** 검토 대기 (미승인)

---

## 1. 구현 개요

### 1.1 목표

현재 `app/signup/` 에 존재하는 MVP 수준(inline style, 디자인 없음, 비밀번호 확인 없음)의 회원가입 페이지를 아래 원칙에 따라 전면 재구현한다.

- 이메일/비밀번호 기반 회원가입
- 신규 가입 사용자 기본 역할 `player` (DB 트리거 자동 처리)
- 추가 프로필 입력 없는 최소 가입 구조
- 기존 로그인 페이지와 UI 일관성 유지

### 1.2 구현 범위

| 기능 | 현황 | 계획 |
|------|------|------|
| 이메일 입력 | 있음 (스타일 없음) | 재구현 |
| 비밀번호 입력 | 있음 (스타일 없음) | 재구현 |
| 비밀번호 확인 입력 | **없음** | 신규 추가 |
| 비밀번호 표시/숨기기 | **없음** | 신규 추가 |
| 클라이언트 유효성 검증 | **없음** | 신규 추가 |
| 서버 액션 에러 한국어화 | **없음** | 신규 추가 |
| 이메일 인증 필요 여부 분기 | **없음** | 신규 추가 |
| 가입 완료 후 이동 처리 | 있음 (클라이언트 router.push) | 서버 액션 redirect로 변경 |
| 로그인 페이지 링크 | 있음 | 스타일 개선 |
| 이미 로그인된 사용자 처리 | **없음** | 신규 추가 |

### 1.3 역할(Role) 생성 구조

회원가입 페이지에서 역할을 직접 설정하지 않는다.
`supabase.auth.signUp()` 호출 시 Supabase의 DB 트리거(`handle_new_user`)가 자동으로 `profiles` 테이블에 `role = 'player'` 행을 삽입한다.

```
supabase.auth.signUp() 호출
    → auth.users에 INSERT
    → 트리거 on_auth_user_created 발동
    → public.profiles에 { id, role: 'player' } INSERT
```

---

## 2. 추가 설치 라이브러리 검토

**결론: 추가 설치 없음.**

| 고려 대상 | 판단 | 근거 |
|-----------|------|------|
| `react-hook-form` | 불필요 | 필드가 3개(email, password, passwordConfirm). 프로젝트 전체 패턴이 `useState` + `useTransition`이며, 이 패턴으로 비밀번호 확인 포함 3개 필드 관리가 충분히 가능하다. 도입 시 로그인 페이지와 패턴이 달라진다. |
| `zod` / `yup` | 불필요 | 클라이언트 유효성은 `비밀번호 === 비밀번호 확인` 비교 + HTML `required` 속성으로 처리한다. 서버 액션에서 추가 검증이 필요하면 수동 조건문으로 처리한다. |
| 기타 UI 라이브러리 | 불필요 | 로그인 페이지 구현 시 만든 `Input.tsx`, `Button.tsx`, `Card.tsx`로 충분하다. |

---

## 3. 파일 목록

### 3.1 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `lib/api/auth.ts` | `signUpWithPassword()` 반환 타입 변경 — 이메일 인증 필요 여부(`requiresEmailConfirmation`) 플래그 추가 |
| `app/signup/page.tsx` | 이미 로그인된 사용자 redirect + centered card 레이아웃으로 재구현 |
| `app/signup/Form.tsx` | 비밀번호 확인 필드, 토글, 유효성 검증, 이메일 인증 분기 UI로 재구현 |
| `app/signup/actions.ts` | 한국어 에러 매핑, 이메일 인증 여부 분기, 서버 액션 redirect 처리로 개선 |

### 3.2 재사용 파일 (수정 없음)

| 파일 | 재사용 방식 |
|------|-------------|
| `components/ui/Input.tsx` | 이메일/비밀번호/비밀번호 확인 입력 필드 |
| `components/ui/Button.tsx` | 제출 버튼 (`variant="primary"`, `w-full`) |
| `components/ui/Card.tsx` | 폼 카드 래퍼 |
| `components/ui/FieldHint.tsx` | 비밀번호 조건 힌트 텍스트 |
| `lib/types/api.ts` | `ActionResult` 타입 참조 |

### 3.3 신규 파일 없음

로그인 페이지 구현에서 `Input.tsx`를 이미 만들었고, 나머지 UI 컴포넌트도 기존에 존재한다.
`PasswordInput.tsx` 별도 추출은 이번 구현 후 반복이 확인되면 그때 진행한다.

---

## 4. 파일별 역할 및 핵심 코드 구조

### 4.1 `lib/api/auth.ts` (수정)

**역할:** Supabase Auth 호출 래퍼. 회원가입 시 이메일 인증 필요 여부를 호출부에 전달해야 한다.

**수정이 필요한 이유:**
현재 `signUpWithPassword()`는 `{ error }` 만 반환한다. 그러나 Supabase의 `signUp()` 응답은 이메일 인증이 설정된 경우 `session = null`을 반환한다. 이 정보를 호출부(서버 액션)에 전달하지 않으면, 세션이 없는 상태에서 잘못된 리다이렉트가 발생한다.

**현재 코드:**
```typescript
export async function signUpWithPassword(email, password): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error ? error.message : null };
}
```

**변경 후 구조 (핵심 로직):**
```typescript
type SignUpResult = {
  error: string | null;
  requiresEmailConfirmation: boolean;
};

export async function signUpWithPassword(email, password): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message, requiresEmailConfirmation: false };
  }

  // session이 null이면 이메일 인증 필요
  // session이 있으면 인증 불필요 (개발 환경 등)
  return {
    error: null,
    requiresEmailConfirmation: !data.session,
  };
}
```

**이 변경이 기존 코드에 미치는 영향:**
- `app/signup/actions.ts`에서 반환 타입을 맞춰 사용하도록 수정 필요
- `lib/api/auth.ts`의 다른 함수(`signInWithPassword`, `getCurrentUserRole`)는 영향 없음

---

### 4.2 `app/signup/page.tsx` (수정)

**역할:** 회원가입 페이지 Server Component. 이미 로그인된 사용자를 리다이렉트하고, 비로그인 사용자에게 회원가입 UI를 렌더링한다.

**수정이 필요한 이유:** 현재 레이아웃이 없고, 이미 로그인된 사용자에 대한 처리가 없다.

**구조 (핵심 로직):**
```tsx
export default async function SignupPage() {
  // 이미 로그인된 경우 리다이렉트
  const result = await getUserWithRole();
  if (result.status === "ready") {
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  return (
    // GlobalHeader는 app/layout.tsx에서 자동으로 표시됨 (비로그인 상태)
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">

        {/* 헤더 */}
        <div className="space-y-1 text-center">
          <h1>회원가입</h1>
          <p>이메일과 비밀번호로 계정을 만드세요.</p>
        </div>

        {/* 폼 카드 */}
        <Card>
          <SignupForm />
        </Card>

        {/* 로그인 링크 */}
        <p>
          이미 계정이 있으신가요?{" "}
          <Link href="/login">로그인</Link>
        </p>

      </div>
    </main>
  );
}
```

---

### 4.3 `app/signup/Form.tsx` (수정)

**역할:** 회원가입 폼 Client Component. 이메일, 비밀번호, 비밀번호 확인 입력과 유효성 검증을 담당한다.

**수정이 필요한 이유:**
- 비밀번호 확인 필드가 없다.
- 비밀번호 일치 여부 검증이 없다.
- 에러 UI가 inline style이다.
- 가입 성공 후 이메일 인증 필요 여부에 따른 UI 분기가 없다.

**상태 관리:**
```typescript
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [passwordConfirm, setPasswordConfirm] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
const [message, setMessage] = useState<Message | null>(null);
const [emailConfirmSent, setEmailConfirmSent] = useState(false); // 이메일 인증 필요 상태
const [isPending, startTransition] = useTransition();
```

**클라이언트 유효성 검증 흐름:**
```typescript
const handleSubmit = (e) => {
  e.preventDefault();
  setMessage(null);

  // 비밀번호 길이 검증 (최소 6자 — Supabase 기본 요건)
  if (password.length < 6) {
    setMessage({ tone: "error", text: "비밀번호는 6자 이상이어야 합니다." });
    return;
  }

  // 비밀번호 확인 일치 검증
  if (password !== passwordConfirm) {
    setMessage({ tone: "error", text: "비밀번호가 일치하지 않습니다." });
    return;
  }

  startTransition(async () => {
    const result = await signUpWithPassword({ email, password });

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }

    if (result.requiresEmailConfirmation) {
      // 이메일 인증이 필요한 경우: 인증 안내 화면으로 전환
      setEmailConfirmSent(true);
      return;
    }

    // 이메일 인증 불필요 (세션 즉시 생성): server action에서 redirect 처리됨
  });
};
```

**이메일 인증 안내 UI 분기:**
```tsx
// emailConfirmSent가 true이면 폼 대신 안내 메시지 표시
if (emailConfirmSent) {
  return (
    <div className="space-y-4 text-center">
      <div>이메일 아이콘 또는 체크 아이콘</div>
      <h2>이메일을 확인해주세요</h2>
      <p>{email} 로 인증 링크를 발송했습니다. 링크를 클릭하면 로그인됩니다.</p>
      <Link href="/login">로그인 페이지로 이동</Link>
    </div>
  );
}
```

**렌더링 구조 (폼):**
```tsx
return (
  <form onSubmit={handleSubmit} className="space-y-4">

    {/* 에러 메시지 박스 */}
    {message?.tone === "error" && (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm text-red-700">{message.text}</p>
      </div>
    )}

    {/* 이메일 */}
    <Input
      id="email"
      label="이메일"
      type="email"
      required
      autoComplete="email"
      disabled={isPending}
      value={email}
      onChange={e => setEmail(e.target.value)}
    />

    {/* 비밀번호 (표시/숨기기 토글 포함) */}
    <div className="relative">
      <Input
        id="password"
        label="비밀번호"
        type={showPassword ? "text" : "password"}
        required
        autoComplete="new-password"
        disabled={isPending}
        hint="6자 이상 입력하세요."
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="pr-10"
      />
      <토글버튼 tabIndex={-1} />
    </div>

    {/* 비밀번호 확인 (표시/숨기기 토글 포함) */}
    <div className="relative">
      <Input
        id="passwordConfirm"
        label="비밀번호 확인"
        type={showPasswordConfirm ? "text" : "password"}
        required
        autoComplete="new-password"
        disabled={isPending}
        value={passwordConfirm}
        onChange={e => setPasswordConfirm(e.target.value)}
        className="pr-10"
      />
      <토글버튼 tabIndex={-1} />
    </div>

    {/* 제출 버튼 */}
    <Button type="submit" className="w-full" disabled={isPending}>
      {isPending ? "가입 중..." : "회원가입"}
    </Button>

  </form>
);
```

---

### 4.4 `app/signup/actions.ts` (수정)

**역할:** 회원가입 서버 액션. 입력 검증, Supabase 호출, 이메일 인증 여부에 따른 분기를 담당한다.

**수정이 필요한 이유:**
- 현재 에러 메시지가 영어(Supabase 원문)이다.
- `requiresEmailConfirmation` 처리가 없다.
- 이메일 인증 불필요 시 서버 액션에서 `redirect("/dashboard")`를 하지 않는다.
- 성공 후 클라이언트 `router.push()` 방식은 세션 생성 타이밍과 맞지 않을 수 있다.

**변경 후 ActionResult 타입:**
```typescript
type SignUpActionResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };
```

> **`ok: true`일 때 두 가지 경우:**
> 1. `requiresEmailConfirmation: true` → 클라이언트가 이메일 인증 안내 UI를 표시
> 2. `requiresEmailConfirmation: false` → 서버 액션 내에서 `redirect("/dashboard")` 호출 (이 경우 클라이언트에서는 이 값을 받기 전에 이동함)

**서버 액션 흐름 (핵심 로직):**
```typescript
"use server";

export async function signUpWithPassword(input): Promise<SignUpActionResult> {
  // 1. 빈 값 검증
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "이메일과 비밀번호를 입력하세요." };
  }

  // 2. 최소 비밀번호 길이 (서버에서도 재검증)
  if (input.password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }

  // 3. Supabase 회원가입 호출
  const result = await signUp(input.email.trim(), input.password);

  if (result.error) {
    return { ok: false, error: translateSignUpError(result.error) };
  }

  // 4. 이메일 인증 필요 여부에 따른 분기
  if (result.requiresEmailConfirmation) {
    // 세션 없음 → 클라이언트에 안내 요청
    return { ok: true, requiresEmailConfirmation: true };
  }

  // 5. 세션 즉시 생성 → redirect
  redirect("/dashboard");
  return { ok: true, requiresEmailConfirmation: false };
}
```

**에러 한국어 매핑 함수:**
```typescript
function translateSignUpError(message: string): string {
  const map: Record<string, string> = {
    "User already registered": "이미 가입된 이메일입니다.",
    "Password should be at least 6 characters": "비밀번호는 6자 이상이어야 합니다.",
    "Unable to validate email address: invalid format": "올바른 이메일 형식을 입력하세요.",
    "Email rate limit exceeded": "잠시 후 다시 시도해주세요.",
    "Signup requires a valid password": "비밀번호를 입력하세요.",
  };
  return map[message] ?? "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
}
```

---

## 5. 전체 데이터 흐름

### 5.1 이메일 인증 필요 시 흐름

```
[브라우저] form submit
    ↓ 클라이언트 유효성 검증
      - 비밀번호 길이 < 6 → 에러 메시지 표시, 서버 호출 없음
      - 비밀번호 ≠ 비밀번호 확인 → 에러 메시지 표시, 서버 호출 없음
    ↓ startTransition → signUpWithPassword({ email, password })
    ↓
[Server Action: app/signup/actions.ts]
    → 서버 측 검증 (빈 값, 비밀번호 길이)
    → lib/api/auth.ts > signUpWithPassword(email, password)
        ↓
        [Supabase Auth] supabase.auth.signUp()
        → auth.users INSERT
        → 트리거 발동 → profiles INSERT (role: 'player')
        → 이메일 인증 메일 발송
        → 반환: { data: { user, session: null }, error: null }
        ↓
    → requiresEmailConfirmation = true
    → return { ok: true, requiresEmailConfirmation: true }
    ↓
[Client] result.requiresEmailConfirmation === true
    → setEmailConfirmSent(true)
    → 이메일 인증 안내 UI 렌더링
```

### 5.2 이메일 인증 불필요 시 흐름 (개발 환경 등)

```
[브라우저] form submit
    ↓ 클라이언트 유효성 검증 통과
    ↓ startTransition → signUpWithPassword({ email, password })
    ↓
[Server Action]
    → Supabase signUp() → session 즉시 생성
    → requiresEmailConfirmation = false
    → redirect("/dashboard")
    ↓
[브라우저] /dashboard로 이동
    → getUserWithRole() 호출
    → status === "ready", role === "player"
    → 대시보드 렌더링
```

### 5.3 실패 흐름

```
[브라우저] form submit
    ↓
[Server Action]
    → "User already registered" 에러 발생
    → translateSignUpError() → "이미 가입된 이메일입니다."
    → return { ok: false, error: "이미 가입된 이메일입니다." }
    ↓
[Client] result.ok === false
    → setMessage({ tone: "error", text: result.error })
    → 에러 박스 렌더링
    → 입력 필드 값 유지 (초기화 없음)
```

---

## 6. UI 레이아웃 계획

### 6.1 기본 상태 (폼)

```
┌──────────────────────────────────────────┐
│ GlobalHeader (app/layout.tsx 자동 표시)    │
├──────────────────────────────────────────┤
│                                          │
│   ┌──────────────────────────────────┐   │
│   │           회원가입               │   │  ← h1
│   │  이메일과 비밀번호로 계정을 만드세요. │   │
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  [에러 박스 — 있을 때만 표시]    │   │
│   │                                  │   │
│   │  이메일         [     입력     ] │   │
│   │                                  │   │
│   │  비밀번호       [   입력  👁  ] │   │
│   │  6자 이상 입력하세요.            │   │  ← FieldHint
│   │                                  │   │
│   │  비밀번호 확인  [   입력  👁  ] │   │
│   │                                  │   │
│   │        [    회원가입 버튼    ]   │   │
│   └──────────────────────────────────┘   │  ← Card
│                                          │
│      이미 계정이 있으신가요? 로그인 →    │
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 이메일 인증 안내 상태

```
│   ┌──────────────────────────────────┐   │
│   │                                  │   │
│   │         ✉ (이메일 아이콘)        │   │
│   │                                  │   │
│   │       이메일을 확인해주세요       │   │
│   │                                  │   │
│   │  you@example.com 으로 인증 링크   │   │
│   │  를 발송했습니다.                 │   │
│   │  링크를 클릭하면 로그인됩니다.   │   │
│   │                                  │   │
│   │        [로그인 페이지로 이동]    │   │  ← Button variant="secondary"
│   │                                  │   │
│   └──────────────────────────────────┘   │
```

### 6.3 디자인 토큰 (로그인 페이지와 동일)

| 요소 | Tailwind 클래스 |
|------|----------------|
| 배경 | `bg-slate-50` |
| 카드 | `Card` 컴포넌트 |
| 제목 | `text-2xl font-bold text-slate-900` |
| 부제목 | `text-sm text-slate-500` |
| 에러 박스 | `bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700` |
| 주요 버튼 | `Button variant="primary" className="w-full"` |
| 보조 버튼 | `Button variant="secondary" className="w-full"` |
| 링크 | `text-amber-600 hover:text-amber-500` |

---

## 7. 트레이드오프 및 고려사항

### 7.1 추가 프로필 입력 없이 최소 가입만 받는 구조

**장점:**
- 가입 장벽이 낮아 이탈률 감소
- `profiles` 테이블 스키마 변경 없이 구현 가능
- 가입 완료 후 흐름이 단순해짐

**단점:**
- 대회 참가 시 팀 이름, 선수 이름 등 추가 정보가 필요함
  - 단, 이 정보는 팀 생성(`/team`) 또는 선수 등록(`/team/players`) 단계에서 별도 수집 가능
- 사용자 이름이 없어 UI에서 이메일 앞부분을 표시해야 함 (현재도 이메일 표시 방식 사용 중)

**결론:** 현재 스키마(`profiles`에 `display_name` 없음) 및 타 페이지 구조(팀/선수 정보는 별도 단계)를 고려하면 최소 가입 구조가 적합하다.

### 7.2 비밀번호 확인 필드 검증 위치

**클라이언트에서만 검증하는 이유:**
- `비밀번호 === 비밀번호 확인` 비교는 순수 UI 편의 기능이다.
- 서버(Supabase)로 전달되는 것은 `password` 하나이며, `passwordConfirm`은 서버에 전달하지 않는다.
- 따라서 서버 액션에서 `passwordConfirm`을 재검증하는 것은 의미가 없다.

**그러나 서버에서도 비밀번호 길이를 재검증하는 이유:**
- Supabase가 반환하는 에러(`Password should be at least 6 characters`)를 클라이언트에서 선제적으로 막을 수 있으나, 서버에서도 명시적으로 체크해 에러를 한국어로 반환한다.
- 클라이언트 검증 우회(직접 API 호출 등)를 방어할 수 있다.

### 7.3 가입 완료 후 서버 액션 `redirect()` vs 클라이언트 `router.push()`

**선택: 이메일 인증 불필요 시 서버 액션 `redirect()`, 인증 필요 시 클라이언트 상태 전환**

현재 `app/signup/actions.ts`가 `ok: true`만 반환하고, `Form.tsx`가 `router.push("/dashboard")`를 호출하는 방식은 두 가지 문제가 있다:

1. 이메일 인증이 필요한 경우 세션이 없는데 `/dashboard`로 이동하면 `/login`으로 즉시 redirect된다.
2. `router.push()` 이후 `router.refresh()`를 추가로 호출해야 쿠키 기반 세션이 Server Component에 반영된다.

서버 액션 `redirect()`를 사용하면 세션이 생성된 직후에만 이동하므로 타이밍 문제가 없다.

### 7.4 이메일 인증 사용 여부에 따른 UX 차이

Supabase 프로젝트 설정의 **"Confirm email"** 옵션에 따라 동작이 달라진다.

| 설정 | `signUp()` 응답 | 처리 |
|------|----------------|------|
| 인증 필요 (on) | `session: null` | 이메일 인증 안내 UI 표시 → `/login` 유도 |
| 인증 불필요 (off) | `session: { ... }` | 서버 액션에서 `redirect("/dashboard")` |

이 분기를 `requiresEmailConfirmation` 플래그로 처리하므로, Supabase 설정이 어느 쪽이어도 정상 동작한다.

### 7.5 Supabase 에러 메시지 한국어화 위치

**선택: `app/signup/actions.ts` 내 로컬 함수 `translateSignUpError()`**

로그인 페이지(`app/login/actions.ts`)에서 `translateAuthError()`를 로컬 함수로 처리한 것과 동일한 원칙을 따른다. 에러 메시지의 맥락이 액션마다 다르므로(로그인 실패 vs 가입 중복 이메일 등) 공통 유틸 추출보다 로컬 관리가 적절하다.

### 7.6 공용 `Input` / `PasswordInput` 컴포넌트 도입 범위

- `components/ui/Input.tsx`는 로그인 페이지 구현 시 이미 생성됨. 회원가입 폼에서 그대로 재사용한다.
- `PasswordInput.tsx` 별도 추출은 이번 범위에서 하지 않는다. 비밀번호 토글 로직이 Form 컴포넌트 내 `useState` 2개로 충분히 관리 가능하고, 4개 auth 페이지 모두 구현 후 반복 패턴이 확인되면 추출한다.

### 7.7 GlobalHeader 자동 노출 구조와 충돌 여부

`app/layout.tsx`에서 `status !== "ready"` (비로그인 상태)이면 GlobalHeader가 자동으로 표시된다. 로그인 페이지와 동일한 구조이며 충돌 없다. 페이지 `<main>`의 최소 높이는 `min-h-[calc(100vh-3.5rem)]`으로 설정한다.

### 7.8 향후 대회 참가용 상세 정보 수집 시점

현재 `profiles` 테이블에는 `display_name`, `phone`, `avatar_url` 등의 컬럼이 없다.
대회 참가에 필요한 정보(팀 이름, 선수 목록 등)는 아래 기존 페이지에서 별도 수집한다:

- `/team` — 팀 생성 (팀 이름)
- `/team/players` — 선수 등록 (이름, 등번호, 포지션)
- `/tournament/[id]/apply` — 대회 신청

따라서 회원가입 단계에서 추가 정보를 수집할 필요가 없다.

---

## 8. 구현 단계 (순서)

1. [완료] `lib/api/auth.ts` — `signUpWithPassword()` 반환 타입 변경 (`requiresEmailConfirmation` 추가)
2. [완료] `app/signup/page.tsx` — 이미 로그인된 사용자 redirect + centered card 레이아웃
3. [완료] `app/signup/Form.tsx` — 비밀번호 확인, 토글, 유효성 검증, 이메일 인증 분기 UI
4. [완료] `app/signup/actions.ts` — 한국어 에러 매핑, 이메일 인증 분기, redirect 처리

---

## 9. 구현 후 확인 체크리스트

- [ ] 이메일/비밀번호/비밀번호 확인 입력 후 가입 → 이메일 인증 안내 UI 또는 `/dashboard` 이동
- [ ] 비밀번호 6자 미만 입력 → 클라이언트에서 에러 메시지, 서버 호출 없음
- [ ] 비밀번호 ≠ 비밀번호 확인 → 클라이언트에서 에러 메시지, 서버 호출 없음
- [ ] 이미 가입된 이메일 입력 → 한국어 에러 메시지 "이미 가입된 이메일입니다."
- [ ] 이메일 인증 필요 시 → 이메일 인증 안내 UI 렌더링 + 로그인 링크 표시
- [ ] 이메일 인증 불필요 시 → 즉시 `/dashboard` 이동
- [ ] 가입 중(pending) → 버튼 비활성화 + 텍스트 변경
- [ ] 이미 로그인된 상태로 `/signup` 접근 → 적절한 페이지로 redirect
- [ ] 로그인 링크 → `/login` 이동
- [ ] 비밀번호 표시/숨기기 토글 동작 (비밀번호, 비밀번호 확인 각각)
- [ ] GlobalHeader 정상 표시
- [ ] `profiles` 테이블에 `role = 'player'`로 행 생성 확인
