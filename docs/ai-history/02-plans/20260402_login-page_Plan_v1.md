# 로그인 페이지 구현 계획

**작성일:** 2026-04-02
**버전:** v1
**참조 리서치:** `docs/ai-history/01-research/20260402_auth-pages_Research.md`
**브랜치:** develop
**상태:** 검토 대기 (미승인)

---

## 1. 구현 개요

### 1.1 목표

현재 `app/login/` 에 존재하는 MVP 수준(inline style, 디자인 없음)의 로그인 페이지를 프로젝트의 기존 UI 패턴과 인증 구조에 맞게 전면 재구현한다.

### 1.2 구현 범위

| 기능 | 현황 | 계획 |
|------|------|------|
| 이메일 입력 | 있음 (스타일 없음) | 재구현 |
| 비밀번호 입력 | 있음 (스타일 없음) | 재구현 |
| 로그인 요청 처리 | 있음 (server action) | 에러 메시지 한국어화 추가 |
| 에러 메시지 표시 | 있음 (inline crimson) | Tailwind 기반 UI로 교체 |
| pending/loading 상태 | 있음 | 버튼 텍스트/비활성화 유지 |
| 회원가입 링크 | 있음 | 스타일 개선 |
| 비밀번호 찾기 링크 | **없음** | 신규 추가 |
| role 기반 redirect | 있음 (server action) | 그대로 유지 |

---

## 2. 추가 설치 라이브러리 검토

**결론: 추가 설치 없음.**

이유:

| 고려 대상 | 판단 | 근거 |
|-----------|------|------|
| `react-hook-form` | 불필요 | 프로젝트 전체에서 `useState` + `useTransition` 패턴 사용. 로그인 폼은 필드가 2개(email, password)뿐이어서 상태 관리 복잡도가 낮다. 도입 시 기존 폼들과 패턴이 달라져 일관성이 깨진다. |
| `zod` / `yup` | 불필요 | 서버 액션에서 trim + 빈 값 체크만으로도 충분하다. 클라이언트 유효성은 HTML `required`, `type="email"` 속성으로 브라우저가 처리한다. 도입 시 기존 서버 액션 패턴과 달라진다. |
| 기타 UI 라이브러리 | 불필요 | Tailwind CSS v4 + 기존 `Button`, `Card`, `FieldHint` 컴포넌트로 충분히 구현 가능하다. |

---

## 3. 파일 목록

### 3.1 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/login/page.tsx` | 페이지 레이아웃 전면 재구현 (centered card 구조) |
| `app/login/Form.tsx` | 폼 UI 전면 재구현 (Input, Button, ErrorMessage 사용) |
| `app/login/actions.ts` | Supabase 에러 메시지 한국어 매핑 추가 |

### 3.2 신규 파일

| 파일 | 역할 | 이유 |
|------|------|------|
| `components/ui/Input.tsx` | 스타일된 `<input>` 래퍼 컴포넌트 | 현재 프로젝트에 스타일된 input이 없다. 회원가입/비밀번호 찾기/재설정에서도 동일하게 재사용할 수 있도록 공통 컴포넌트로 추출한다. |

> **`ErrorMessage.tsx` 별도 분리 여부:** 에러 메시지 표시는 `<p>` 한 줄이고, 색상 클래스만 다르다. 별도 컴포넌트로 추출하면 과도한 추상화가 될 수 있어, 이번 구현에서는 Form 내 인라인으로 처리한다. 여러 폼을 구현하다가 반복이 명확해지면 그때 추출한다.
>
> **`PasswordInput.tsx` 별도 분리 여부:** 비밀번호 표시/숨기기 토글은 `Input.tsx`에 `type` prop을 그대로 전달하는 방식으로 처리하거나, Form 내부에서 `useState`로 토글 상태를 관리한다. 이번 구현에서는 Form 내에서 처리하고 별도 컴포넌트로 분리하지 않는다. (이후 회원가입/재설정 구현 시 반복이 확인되면 추출)

---

## 4. 파일별 역할 및 핵심 코드 구조

### 4.1 `components/ui/Input.tsx` (신규)

**역할:** 프로젝트 전역에서 재사용 가능한 스타일된 input 컴포넌트. 현재 native `<input>`에 inline style을 쓰는 패턴을 대체한다.

**인터페이스:**
```typescript
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;       // label 텍스트 (있으면 label 태그 함께 렌더링)
  hint?: string;        // FieldHint로 렌더링할 보조 텍스트
  error?: string;       // 에러 메시지 (있으면 빨간 테두리 + 에러 텍스트)
  id: string;           // label-input 연결을 위해 required
};
```

**구조:**
```tsx
export default function Input({ label, hint, error, id, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className={[
          "기본 스타일 (border, rounded, px, py, text-sm, focus ring amber-400 계열)",
          error ? "border-red-400 bg-red-50" : "border-slate-200",
          className,
        ].filter(Boolean).join(" ")}
        {...props}
      />
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

**디자인 원칙:**
- 기본 테두리: `border border-slate-200`
- focus ring: `focus:outline-none focus:ring-2 focus:ring-amber-400` (Button 컴포넌트와 동일한 amber-400 계열)
- 에러 상태: `border-red-400 bg-red-50`
- 비활성: `disabled:opacity-50 disabled:cursor-not-allowed`
- 전체 너비: `w-full`

---

### 4.2 `app/login/page.tsx` (수정)

**역할:** 로그인 페이지의 Server Component. 이미 로그인된 사용자를 리다이렉트하고, 비로그인 사용자에게 로그인 UI를 렌더링한다.

**구조:**
```tsx
// Server Component (기본값)
export default async function LoginPage() {
  // 이미 로그인된 경우 리다이렉트
  const result = await getUserWithRole();
  if (result.status === "ready") {
    redirect(isOperationRole(result.role) ? "/admin" : "/dashboard");
  }

  return (
    // GlobalHeader는 app/layout.tsx에서 자동으로 표시됨
    // 이 페이지는 남은 영역을 채우는 레이아웃만 담당
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50 px-4 py-12">
      {/* 3.5rem = GlobalHeader 높이 h-14 */}
      <div className="w-full max-w-sm space-y-6">

        {/* 헤더 영역 */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
          <p className="text-sm text-slate-500">이메일과 비밀번호로 로그인하세요.</p>
        </div>

        {/* 폼 카드 */}
        <Card>
          <LoginForm />
        </Card>

        {/* 하단 링크 */}
        <p className="text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-amber-600 hover:text-amber-500">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
```

**이미 로그인된 사용자 처리 이유:**
- 현재 구현에는 이 로직이 없어서, 로그인된 상태로 `/login`을 방문하면 로그인 폼이 그대로 보인다.
- UX 개선: 이미 인증된 사용자는 바로 적절한 페이지로 보낸다.

---

### 4.3 `app/login/Form.tsx` (수정)

**역할:** 로그인 폼의 Client Component. 이메일/비밀번호 입력, 제출, 에러 표시, pending 상태를 관리한다.

**상태 관리:**
```typescript
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);  // 비밀번호 표시 토글
const [message, setMessage] = useState<Message | null>(null);
const [isPending, startTransition] = useTransition();
```

**제출 흐름:**
```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setMessage(null);  // 이전 에러 초기화

  startTransition(async () => {
    const result = await signInWithPassword({ email, password });

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    // 성공 시 server action 내부에서 redirect() 처리됨
    // result.ok === true가 반환되는 경우는 없음 (redirect이 먼저 실행)
  });
};
```

**렌더링 구조:**
```tsx
return (
  <form onSubmit={handleSubmit} className="space-y-4">

    {/* 에러 메시지 (폼 상단, 필드 에러와 구분) */}
    {message?.tone === "error" && (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
        <p className="text-sm text-red-700">{message.text}</p>
      </div>
    )}

    {/* 이메일 */}
    <Input
      id="email"
      label="이메일"
      type="email"
      value={email}
      onChange={e => setEmail(e.target.value)}
      placeholder="you@example.com"
      required
      autoComplete="email"
      disabled={isPending}
    />

    {/* 비밀번호 */}
    <div className="space-y-1">
      <div className="relative">
        <Input
          id="password"
          label="비밀번호"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          required
          autoComplete="current-password"
          disabled={isPending}
        />
        {/* 표시/숨기기 토글 버튼 */}
        <button
          type="button"
          onClick={() => setShowPassword(prev => !prev)}
          className="절대 위치로 input 우측에 배치, text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {/* 비밀번호 찾기 링크 (비밀번호 필드 하단 우측 정렬) */}
      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-slate-500 hover:text-amber-600">
          비밀번호를 잊으셨나요?
        </Link>
      </div>
    </div>

    {/* 제출 버튼 */}
    <Button type="submit" className="w-full" disabled={isPending}>
      {isPending ? "로그인 중..." : "로그인"}
    </Button>

  </form>
);
```

**비밀번호 표시 토글 처리:**
- `showPassword` state로 `type="password"` ↔ `type="text"` 전환
- 토글 버튼은 `tabIndex={-1}`로 설정해 탭 키 포커스에서 제외 (UX 일반 관행)
- 아이콘은 SVG 인라인으로 처리 (외부 아이콘 라이브러리 추가 없음)

---

### 4.4 `app/login/actions.ts` (수정)

**역할:** 로그인 서버 액션. 현재 로직은 충분하나, Supabase 에러 메시지를 한국어로 변환하는 매핑을 추가한다.

**현재 구조 (유지):**
```typescript
"use server";

export async function signInWithPassword(input: SignInInput): Promise<ActionResult> {
  // 1. 빈 값 검증
  if (!input.email.trim() || !input.password.trim()) {
    return { ok: false, error: "이메일과 비밀번호를 입력하세요." };
  }

  // 2. Supabase 로그인 호출
  const result = await signIn(input.email.trim(), input.password);

  if (result.error) {
    // 3. [수정] Supabase 영어 에러 → 한국어 매핑
    return { ok: false, error: translateAuthError(result.error) };
  }

  // 4. 역할 조회 후 리다이렉트
  const roleResult = await getCurrentUserRole();
  if (roleResult.error) {
    return { ok: false, error: "사용자 정보를 불러오지 못했습니다." };
  }

  const nextPath = isOperationRole(roleResult.role) ? "/admin" : "/dashboard";
  redirect(nextPath);
  return { ok: true };  // 실제로는 도달하지 않음 (redirect가 먼저 실행)
}
```

**추가할 에러 한국어 매핑 함수:**
```typescript
// 이 파일 또는 lib/api/auth.ts에 위치
function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "Email not confirmed": "이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.",
    "Too many requests": "잠시 후 다시 시도해주세요.",
    "User not found": "이메일 또는 비밀번호가 올바르지 않습니다.",
    // 필요에 따라 추가
  };
  return map[message] ?? "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
}
```

> **매핑 함수 위치 결정:** `app/login/actions.ts` 내부에 로컬 함수로 정의한다. 현재 회원가입/비밀번호 찾기 등 다른 액션에서도 유사한 에러가 발생할 것이나, 각 액션마다 에러 맥락이 다르므로 공통 유틸로 추출하지 않는다. 중복이 명확해지면 그때 `lib/utils/auth-errors.ts` 등으로 추출한다.

---

## 5. 전체 데이터 흐름

### 5.1 로그인 성공 흐름

```
[브라우저] form submit
    ↓ useTransition
[Client] signInWithPassword({ email, password })  ← Server Action 호출
    ↓
[Server Action: app/login/actions.ts]
    → 빈 값 검증
    → lib/api/auth.ts > signInWithPassword(email, password)
        ↓
        [Supabase Auth] supabase.auth.signInWithPassword({ email, password })
        → 성공: 쿠키에 세션 저장
        ↓
    → getCurrentUserRole()
        → profiles 테이블에서 role 조회
        ↓
    → isOperationRole(role) ?
        → true  → redirect("/admin")
        → false → redirect("/dashboard")
```

### 5.2 로그인 실패 흐름

```
[브라우저] form submit
    ↓
[Server Action]
    → Supabase 에러 발생 (예: "Invalid login credentials")
    → translateAuthError() → "이메일 또는 비밀번호가 올바르지 않습니다."
    → return { ok: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." }
    ↓
[Client] result.ok === false
    → setMessage({ tone: "error", text: result.error })
    → 에러 박스 렌더링
    → 입력 필드는 그대로 유지 (값 초기화 없음)
```

### 5.3 이미 로그인된 사용자 흐름

```
[브라우저] /login 접속
    ↓
[Server: app/login/page.tsx]
    → getUserWithRole()
    → status === "ready"
    → redirect(isOperationRole ? "/admin" : "/dashboard")
    → 로그인 폼 렌더링 없음
```

---

## 6. UI 레이아웃 계획

### 6.1 전체 페이지 구조

```
┌──────────────────────────────────────────┐
│ GlobalHeader (app/layout.tsx 자동 표시)    │ ← h-14 (3.5rem)
├──────────────────────────────────────────┤
│                                          │
│   ┌──────────────────────────────────┐   │
│   │         🏀 로그인                │   │  ← 타이틀
│   │  이메일과 비밀번호로 로그인하세요. │   │  ← 부제목
│   └──────────────────────────────────┘   │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │  [에러 박스 — 있을 때만 표시]    │   │  ← red-50 배경
│   │                                  │   │
│   │  이메일         [     입력     ] │   │
│   │                                  │   │
│   │  비밀번호       [   입력  👁  ] │   │  ← 토글 버튼
│   │                  비밀번호를 잊으셨나요? → │
│   │                                  │   │
│   │        [    로그인 버튼    ]     │   │  ← amber-400 primary
│   └──────────────────────────────────┘   │  ← Card 컴포넌트
│                                          │
│       계정이 없으신가요? 회원가입 →       │  ← amber-600 링크
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 디자인 토큰 (기존 프로젝트 팔레트 준수)

| 요소 | Tailwind 클래스 |
|------|----------------|
| 배경 | `bg-slate-50` |
| 카드 | `Card` 컴포넌트 (`bg-white border-slate-200 rounded-xl p-5 shadow-sm`) |
| 제목 | `text-2xl font-bold text-slate-900` |
| 부제목 | `text-sm text-slate-500` |
| 에러 박스 | `bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700` |
| Input focus | `focus:ring-2 focus:ring-amber-400` |
| 주요 버튼 | `Button variant="primary"` (amber-400) |
| 링크 | `text-amber-600 hover:text-amber-500` |
| 힌트/보조 텍스트 | `text-slate-500` |

---

## 7. 트레이드오프 및 고려사항

### 7.1 서버 액션 `redirect()` vs 클라이언트 `router.push()`

**현재 login/actions.ts:** 서버 액션 내에서 `redirect()` 호출
**현재 signup/Form.tsx:** 클라이언트에서 `router.push("/dashboard")` 호출

**선택: 서버 액션 `redirect()` 유지**

이유:
- 역할(role) 조회가 서버에서 이루어지므로, 서버 액션에서 바로 redirect하는 것이 클라이언트로 role 정보를 내려보내는 것보다 안전하고 간결하다.
- 클라이언트 `router.push()` 방식은 서버 액션 결과를 받은 후 한 번 더 네트워크 왕복이 필요하다.
- **제약:** 서버 액션의 `redirect()`는 `useTransition` 내부에서 호출 시 클라이언트에서 에러로 잡히지 않고 정상적으로 동작한다. (Next.js의 의도된 동작)

### 7.2 `react-hook-form` / `zod` 미도입 유지

**선택: 미도입 유지**

이유:
- 로그인 폼은 필드 2개(email, password). 폼 라이브러리의 실익이 없다.
- 프로젝트 전체가 `useState` 패턴이므로, 로그인 페이지만 다른 패턴을 쓰면 유지보수 혼란이 생긴다.
- 클라이언트 유효성 검사(비어있음, 이메일 형식)는 HTML 속성(`required`, `type="email"`)으로 처리한다.
- 추가적인 유효성 검사가 필요하다면 서버 액션에서 처리한다.

### 7.3 `Input.tsx` 공통 컴포넌트 도입 범위

**선택: `components/ui/Input.tsx`로 추출**

이유:
- 회원가입, 비밀번호 찾기, 비밀번호 재설정에서도 동일한 스타일의 input이 필요하다.
- 미리 추출하면 4개 페이지에서 일관성을 유지할 수 있다.

**범위 제한:**
- 기존 admin/team 폼들(players, courts 등)은 건드리지 않는다. 이미 native input에 Tailwind 클래스를 직접 쓰고 있으며, 리팩토링 범위가 아니다.
- 이번에 만든 `Input.tsx`는 4개 auth 페이지에서만 사용하고, 기존 폼의 소급 적용은 하지 않는다.

### 7.4 Supabase 에러 메시지 한국어화 처리 위치

**선택: `app/login/actions.ts` 내 로컬 함수**

대안 비교:
- `lib/api/auth.ts`에서 처리: Supabase 래퍼 레이어가 UI 언어에 의존하게 됨. API 레이어는 언어-중립적이어야 한다.
- `lib/utils/auth-errors.ts` 공통 유틸: 현재 시점에서 오버엔지니어링. 에러 메시지가 액션마다 다른 컨텍스트를 가진다.
- `app/login/actions.ts` 로컬: 관심사 분리 적절. 로그인 실패 메시지는 로그인 컨텍스트에 속한다.

**중복 발생 시:** 회원가입/비밀번호 재설정까지 구현 후 중복이 확인되면 그때 추출한다.

### 7.5 GlobalHeader와의 레이아웃 충돌 여부

**결론: 충돌 없음**

`app/layout.tsx`에서:
- `status === "ready"` → Sidebar + main 레이아웃
- 그 외 → GlobalHeader + children

`/login` 페이지는 비로그인 상태(`status !== "ready"`)이므로 GlobalHeader가 자동으로 표시된다.
GlobalHeader 높이는 `h-14` (3.5rem)이므로, 로그인 페이지 `<main>`의 최소 높이를 `min-h-[calc(100vh-3.5rem)]`로 설정해 전체 화면을 채운다.

### 7.6 이미 로그인된 사용자 처리

**선택: page.tsx에서 redirect 처리**

현재 구현 없음 → 로그인된 상태로 `/login`을 방문하면 로그인 폼이 그대로 표시된다.
로그인 페이지 Server Component에서 `getUserWithRole()`로 상태 확인 후 적절한 페이지로 redirect한다.

**성능 주의:** `getUserWithRole()`은 Supabase 세션 조회 + profiles 조회 2번의 DB 호출이 발생한다. 그러나 `createSupabaseServerClient`가 `cache()`로 래핑되어 있어, 같은 요청 내에서 중복 호출이 방지된다.

### 7.7 `autoComplete` 속성

**선택: 추가**
- `email` 필드: `autoComplete="email"`
- `password` 필드: `autoComplete="current-password"`

브라우저 비밀번호 관리자가 올바르게 작동하도록 표준 값을 사용한다.

---

## 8. 구현 단계 (순서)

1. [완료] `components/ui/Input.tsx` 신규 작성
2. [완료] `app/login/page.tsx` 재구현 (이미 로그인된 사용자 redirect 포함)
3. [완료] `app/login/Form.tsx` 재구현 (Input, Button, Card 사용)
4. [완료] `app/login/actions.ts` 한국어 에러 매핑 추가

---

## 9. 구현 후 확인 체크리스트

- [ ] 이메일/비밀번호 입력 후 로그인 → organizer/manager는 `/admin` 이동
- [ ] 이메일/비밀번호 입력 후 로그인 → player는 `/dashboard` 이동
- [ ] 잘못된 자격증명 입력 → 한국어 에러 메시지 표시
- [ ] 빈 필드 제출 → 브라우저 기본 유효성 메시지 또는 액션 에러
- [ ] 로그인 중(pending) → 버튼 비활성화 + 텍스트 변경
- [ ] 이미 로그인된 상태로 `/login` 접근 → 적절한 페이지로 redirect
- [ ] 회원가입 링크 → `/signup` 이동
- [ ] 비밀번호 찾기 링크 → `/forgot-password` 이동 (페이지 미구현이면 404)
- [ ] 비밀번호 표시/숨기기 토글 동작
- [ ] GlobalHeader 정상 표시 (로그인 페이지 특성상 Sidebar 없음)
- [ ] 모바일 화면에서도 카드 레이아웃 정상 표시
