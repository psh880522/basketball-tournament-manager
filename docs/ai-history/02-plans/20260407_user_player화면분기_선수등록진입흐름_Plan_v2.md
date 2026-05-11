# 구현 계획: user/player 화면 분기 + 선수 등록 진입 흐름 재정의 (v2)

- **작성일**: 2026-04-07
- **v1 대비 변경**: 메모 반영
  - CTA 노출 방식: 사이드바/네비 링크 단독 → **랜딩 상단 카드형 CTA + 사이드바 보조 링크 병행**
  - Toast 컴포넌트 신규 파일 추가
- **기반 리서치**: [20260407_권한모델재정의_Research.md](../01-research/20260407_권한모델재정의_Research.md)
- **전제 조건**: 1차 묶음(권한 코어 + 서버 보안 재정의) 구현 완료 상태
  - `Role = "organizer" | "manager" | "user" | "player"` 확정
  - `isPlayerRole()`, `isUserRole()`, `requirePlayer()` 사용 가능
  - 신규 가입자 = `user`, 선수 등록 완료자 = `player`

---

## v1 대비 주요 변경 사항

### TODO 1: CTA 노출 방식 — 카드형 + 사이드바 병행으로 결정

> v1 메모: "네비게이션/사이드바 노출보다는 랜딩/대시보드 페이지 상단같이 잘 보이는 곳에 카드형식으로 노출하는게 자연스러워 보이는데 CTA/Menu로 노출되는게 더 서비스적으로 효과적일지 고민필요."

**결정**: 카드형 CTA(주요 진입점) + 사이드바 링크(보조 네비) 병행.

근거:
- 사이드바 링크만 있으면: 신규 `user`는 사이드바 메뉴를 능동적으로 탐색하지 않음. 선수 등록 인지율 낮음.
- 랜딩 상단 카드가 주요 노출 지점: 로그인 직후 `user`는 랜딩으로 이동 → 카드가 즉시 눈에 띔.
- 사이드바는 이미 등록을 원하는 사용자가 언제든 접근할 수 있는 보조 수단으로 유지.
- `/dashboard`에서 `user` redirect는 `"/"` 유지 — 랜딩에 카드가 있으므로 자연스럽게 연결됨.

변경 범위:
- `app/(public)/page.tsx` — 히어로 섹션 아래에 `user` 전용 "선수 등록 안내 카드" 섹션 추가 (기존 버튼과 별개)
- `components/layout/Sidebar.tsx` — 보조 링크 유지 (v1과 동일)

### TODO 2: Toast 컴포넌트 — 신규 구현

> v1 메모: "toast 컴포넌트 없으면 구현"

현재 `components/ui/` 에 Toast 없음. 신규 추가.

- 용도: `/onboarding/profile` 저장 완료 후 "기본 정보가 저장되었습니다." 안내
- 기존 UI 컴포넌트 패턴(Button, Card 등) 그대로 따름
- 신규 파일: `components/ui/Toast.tsx`

---

## 1. 기능 요약

### 이번 범위에 포함되는 것

- `app/(public)/page.tsx` — 비로그인 / `user` / `player` 상태별 CTA 분기 + `user` 전용 선수 등록 안내 카드 섹션
- `components/nav/GlobalHeader.tsx` — role 기반 네비 링크 분기
- `components/layout/Sidebar.tsx` — `user` 전용 메뉴 추가 (보조 링크)
- `app/(app)/layout.tsx` — 변경 없음
- `app/(app)/dashboard/page.tsx` — `user` 접근 시 `/` redirect
- `app/(app)/team/page.tsx` — `user` 접근 시 `/onboarding/profile` redirect
- `app/(app)/tournament/[id]/apply/page.tsx` — `user` 접근 시 `/onboarding/profile` redirect
- `app/(app)/onboarding/profile/page.tsx` — 선수 등록 Step 1 로 문구/역할 재정의
- `app/(app)/onboarding/profile/Form.tsx` — 저장 후 Toast 안내 + redirect 변경
- `components/ui/Toast.tsx` — Toast 컴포넌트 신규 구현

### 이번 범위에서 제외

- 외부 본인인증 UI 및 API 연동 (VS-R8, VS-R9)
- `promote_to_player()` RPC 구현 (VS-R5)
- `/onboarding/identity` 페이지 신규 생성 (본인인증 Step 2)
- `captain` / `member` 네이밍 정리 (VS-R13, VS-R14)
- admin/users 운영 화면 개선
- `/profile` 내 프로필 페이지 신규 구현
- 1차 묶음에서 완료된 auth/role/RLS 변경

### 후속 단계에서 확장될 내용

- `/onboarding/identity` — 본인인증 Step 2 (VS-R8, VS-R9)
- Step indicator 컴포넌트 — 1/2 단계 시각적 진행 표시
- `promote_to_player()` RPC + 본인인증 콜백 (VS-R5)
- `requireIdentityVerification` 플래그 실제 활용 (`src/lib/config/env.ts`)

### 완료 후 사용자 이동/후속 처리 방식

- `user` 가입/로그인 후 → `/` (랜딩 — 선수 등록 안내 카드 노출)
- `user`가 `/dashboard` 접근 → `/` redirect (카드로 자연 유도)
- `user`가 `/team`, `/tournament/[id]/apply` 접근 → `/onboarding/profile` redirect
- `user`가 사이드바 "선수 등록하기" 클릭 → `/onboarding/profile`
- `/onboarding/profile` 저장 완료 → Toast 안내 + `/` 이동
- `player` 로그인 후 → `/dashboard` (1차 완료)

---

## 2. 라이브러리 검토

**추가 라이브러리 불필요.**

- Toast: 자체 구현 (`components/ui/Toast.tsx`) — 기존 UI 컴포넌트 스타일 통일. Radix/shadcn 등 외부 라이브러리 도입은 과도.
- 나머지: 기존 `getUserWithRole()`, `isPlayerRole()`, `isUserRole()` 조합으로 충분.

---

## 3. 변경 파일 목록

### 수정 파일

- `app/(public)/page.tsx`
- `components/nav/GlobalHeader.tsx`
- `components/layout/Sidebar.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/team/page.tsx`
- `app/(app)/tournament/[id]/apply/page.tsx`
- `app/(app)/onboarding/profile/page.tsx`
- `app/(app)/onboarding/profile/Form.tsx`

### 신규 파일

- `components/ui/Toast.tsx`

> **app/(app)/layout.tsx**: 변경 없음. 현재 role을 Sidebar에 전달하고 있어 Sidebar 내부 분기만으로 충분.  
> **온보딩 스텝 분리**: 이번 단계에서는 단일 페이지(`/onboarding/profile`) 유지. 후속 Step 2는 `/onboarding/identity` 별도 페이지로 확장.

---

## 4. 파일별 구현 개요

---

### `components/ui/Toast.tsx` ← 신규

**역할**: 화면 하단/상단에 일시적으로 표시되는 알림 UI  
**추가 이유**: `/onboarding/profile` 저장 완료 후 안내 문구 표시 필요. 기존 UI에 Toast 없음.

**핵심 구조**:

```typescript
"use client";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
};

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  // useEffect로 3초 후 자동 onClose 호출
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    // 화면 하단 고정, type별 색상 (success: emerald, error: red, info: slate)
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 ...">
      {message}
    </div>
  );
}
```

- 3초 자동 닫힘 + `onClose` 콜백
- `type` 별 색상 구분 (success/error/info)
- 기존 Button, Card 스타일 변수 참고하여 통일

---

### `app/(public)/page.tsx`

**역할**: 공개 랜딩 — 대회 목록 조회 + 상태별 CTA  
**수정 이유**: `user` / `player` role 분기 없음. `user`에게 선수 등록 안내 카드(주요 CTA)와 버튼(보조) 모두 제공.

**핵심 구조**:

```typescript
const isLoggedIn = userResult.status === "ready";
const role = userResult.role;

// 히어로 섹션 버튼 분기 (보조)
비로그인 → "대회 참여하기" → /login
isUserRole(role) → "선수 등록하기" → /onboarding/profile
isPlayerRole(role) → "대시보드 가기" → /dashboard
isOperationRole(role) → "관리자 페이지" → /admin
```

**`user` 전용 선수 등록 안내 카드 섹션 (신규 — 히어로 섹션 바로 아래)**:

```typescript
// isUserRole(role)인 경우만 렌더링
{isUserRole(role) && (
  <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3">
    <h2 className="font-semibold">선수로 참가하려면 등록이 필요합니다</h2>
    <p className="text-sm text-gray-600">
      이름, 연락처 등 기본 정보를 입력하고 본인인증을 완료하면
      대회에 참가 신청할 수 있습니다.
    </p>
    <Link href="/onboarding/profile">
      <Button>지금 선수 등록하기</Button>
    </Link>
  </section>
)}
```

**대회 카드 내 "참가 신청" 버튼 분기**:

```typescript
비로그인 → href="/login"
isUserRole(role) → href="/onboarding/profile" + 버튼 텍스트 "선수 등록 후 신청"
isPlayerRole(role) → href="/tournament/[id]/apply"
```

---

### `components/nav/GlobalHeader.tsx`

**역할**: 공개 페이지(`app/(public)/`) 상단 네비게이션  
**수정 이유**: 현재 `isLoggedIn`이면 무조건 "대시보드" 링크 추가. `user`에게는 부적절.

**핵심 구조**:

```typescript
// 변경
if (isUserRole(role)) items.push({ label: "선수 등록하기", href: "/onboarding/profile" });
else if (isPlayerRole(role)) items.push({ label: "대시보드", href: "/dashboard" });
else if (isOperationRole(role)) items.push({ label: "관리", href: "/admin" });
// 비로그인: 추가 없음
```

> 공개 페이지에서만 렌더링. 앱 페이지(`app/(app)/`)는 Sidebar가 담당.

---

### `components/layout/Sidebar.tsx`

**역할**: 앱 내 사이드바 — role 기반 메뉴 (보조 네비게이션)  
**수정 이유**: 현재 `user` case 없음. 사이드바는 주요 CTA가 아닌 **보조 진입 경로**로 `user` 메뉴 추가.

**핵심 구조** (`buildMenuItems` 변경):

```typescript
// user (신규 추가)
if (role === "user") {
  return [
    { label: "대회 보기", href: "/tournaments", icon: <IconList /> },
    { label: "선수 등록하기", href: "/onboarding/profile", icon: <IconUsers /> },
  ];
}

// player (변경 없음)
if (role === "player") {
  return [
    { label: "대시보드", href: "/dashboard", icon: <IconDashboard /> },
    { label: "대회 보기", href: "/tournaments", icon: <IconList /> },
    { label: "내 팀", href: "/team", icon: <IconTeam /> },
  ];
}

// operation role (변경 없음)
```

---

### `app/(app)/layout.tsx`

**변경 없음.**

현재 코드가 이미 `role`을 Sidebar에 전달 → Sidebar 내 `buildMenuItems(role)` 에서 `user` case 처리. 레이아웃 파일 수정 불필요.

---

### `app/(app)/dashboard/page.tsx`

**역할**: 선수 대시보드  
**수정 이유**: `user` 접근 시 의미 있는 콘텐츠 없음. redirect로 랜딩의 카드 CTA로 자연 연결.

**핵심 구조**:

```typescript
// operation role redirect 아래 추가
if (isUserRole(result.role)) {
  redirect("/");
  // 랜딩의 선수 등록 안내 카드로 자연스럽게 유도됨
}
// 이후 기존 player 로직 유지
```

> `/dashboard` → `"/"` redirect를 선택하는 이유: 대시보드는 팀/참가 현황이 핵심 — `user`에게 표시할 데이터가 없음. redirect 후 랜딩의 "선수 등록 안내 카드"가 명확하게 다음 행동을 안내함.

---

### `app/(app)/team/page.tsx`

**역할**: 내 팀 페이지  
**수정 이유**: `user` role 가드 없음. 직접 URL 접근 시 빈 화면 노출.

**핵심 구조**:

```typescript
if (result.status === "unauthenticated") redirect("/login");
// ...error/empty 처리...

// role 가드 (신규)
if (isUserRole(result.role)) {
  redirect("/onboarding/profile");
}
```

> 팀 페이지 차단 → 선수 등록 Step 1로 직접 연결. 랜딩보다 구체적인 행동 유도.

---

### `app/(app)/tournament/[id]/apply/page.tsx`

**역할**: 대회 참가 신청 페이지  
**수정 이유**: `user` 접근 시 폼이 노출되지만 제출 시 RLS/가드에서 차단됨 — 진입 시점 차단으로 UX 혼란 방지.

**핵심 구조**:

```typescript
if (userResult.status === "unauthenticated") redirect("/login");
// ...error/empty 처리...

// role 가드 (신규, 대회 조회 이전 배치)
if (isUserRole(userResult.role)) {
  redirect("/onboarding/profile");
}
// 이후 대회 조회 + 폼 렌더링
```

---

### `app/(app)/onboarding/profile/page.tsx`

**역할**: 선수 등록 Step 1 — 기본 정보 입력  
**수정 이유**: 현재 "프로필 입력" 문구로 선수 등록 흐름임이 불명확. Step 1으로 명확히 재정의.

**핵심 구조** (변경 부분):

```typescript
// player 접근 허용 유지 (프로필 수정 용도 — 옵션 A)
// 인증 가드 유지 (변경 없음)

// 헤더 문구 변경
<h1>선수 등록 — 기본 정보 입력</h1>
<p className="text-sm text-slate-500">
  이름과 연락처를 입력하세요.
  입력 완료 후 본인인증을 거쳐 선수로 등록됩니다.
</p>

// Step 표시 (인라인, 별도 컴포넌트 불필요)
<p className="text-xs text-slate-400">1단계 / 2단계 — 본인인증은 추후 지원 예정</p>
```

---

### `app/(app)/onboarding/profile/Form.tsx`

**역할**: 선수 등록 Step 1 폼  
**수정 이유**: 저장 완료 후 `/dashboard` redirect → `user`는 대시보드 차단 대상. Toast 안내 후 `/`로 이동.

**핵심 변경**:

```typescript
// 상태 추가
const [toastMessage, setToastMessage] = useState<string | null>(null);

// 저장 완료 후
if (result.ok) {
  setToastMessage("기본 정보가 저장되었습니다. 본인인증 완료 후 선수로 등록됩니다.");
  // 1.5초 후 이동 (Toast가 잠깐 보이도록)
  setTimeout(() => router.push("/"), 1500);
}

// 렌더링
{toastMessage && (
  <Toast
    message={toastMessage}
    type="success"
    onClose={() => setToastMessage(null)}
  />
)}
```

**Toast 안내 문구**:
```
기본 정보가 저장되었습니다.
본인인증 완료 후 선수로 등록됩니다.
```

---

## 5. 구현 시 고려사항

### CTA 노출 방식: 카드형 + 사이드바 병행

- **주요 CTA**: 랜딩 상단 "선수 등록 안내 카드" — `user` 로그인 후 랜딩 이동 시 즉시 노출. 클릭 없이도 인지 가능.
- **보조 CTA**: Sidebar "선수 등록하기" 링크 — 앱 페이지 탐색 중 언제든 클릭 가능.
- **GlobalHeader**: 공개 페이지 탐색 중 "선수 등록하기" 링크로 보완.
- 세 지점을 함께 두어 `user`가 어떤 경로에서도 선수 등록 진입 가능.

### user와 player를 같은 페이지에서 조건부 렌더링할지, 분리된 흐름으로 가져갈지

**분리된 흐름 유지** (Research 방식 X).

- `/dashboard`를 user/player 공용으로 쓰면 컴포넌트 복잡도 증가 + "팀이 없습니다" 빈 화면 UX 열악.
- `user`는 랜딩의 카드 CTA가 충분한 맥락을 제공 — 대시보드 공유 불필요.

### 공개 랜딩과 app 레이아웃 역할 분리

- `app/(public)/page.tsx`: GlobalHeader + 대회 조회 + CTA 카드. 모든 상태 접근 가능.
- `app/(app)/`: Sidebar 레이아웃. user도 포함 (user 전용 사이드바 메뉴).
- 중복 없음 — GlobalHeader는 공개 페이지 전용, Sidebar는 앱 페이지 전용.

### player 전용 페이지 user 접근 처리

| 페이지 | user 접근 시 | redirect 대상 | 이유 |
|--------|-------------|--------------|------|
| `/dashboard` | redirect | `/` | 카드 CTA로 자연 유도 |
| `/team` | redirect | `/onboarding/profile` | 직접적인 다음 행동 안내 |
| `/tournament/[id]/apply` | redirect | `/onboarding/profile` | 직접적인 다음 행동 안내 |

### `/onboarding/profile` 완료 후 다음 단계 연결

- **이번 단계**: Toast 안내 → 1.5초 후 `/` 이동
- **본인인증 추가 시**: `router.push("/")` → `router.push("/onboarding/identity")` 한 줄 변경으로 Step 2 연결
- 구조 변경 없음

### Toast 컴포넌트 도입 시 고려사항

- 간단한 자체 구현 — 외부 라이브러리 불필요
- 현재 사용처: `/onboarding/profile/Form.tsx` 1곳
- 향후 재사용 가능 (서버 액션 완료 안내 등)
- `components/ui/` 기존 패턴 그대로 따름 (TailwindCSS, 타입 안전)

### 향후 확장 시 안전한 구조인지

- 랜딩 카드: `isUserRole(role)` 조건부 렌더링 → 본인인증 완료 후 자동으로 사라짐 (role이 player로 변경)
- 사이드바: `buildMenuItems(role)` case 추가 패턴 — player → player 메뉴 자연 전환
- Toast: 재사용 가능 컴포넌트 — 이후 다른 완료 안내에 활용 가능

---

## 6. 구현 순서 (권장)

1. **[완료]** `components/ui/Toast.tsx` — Toast 컴포넌트 구현
2. **[완료]** `components/layout/Sidebar.tsx` — user 메뉴 추가
3. **[완료]** `app/(public)/page.tsx` — role 기반 CTA + user 선수 등록 안내 카드
4. **[완료]** `components/nav/GlobalHeader.tsx` — user/player 링크 분기
5. **[완료]** `app/(app)/dashboard/page.tsx` — user redirect 추가
6. **[완료]** `app/(app)/team/page.tsx` — user redirect 추가
7. **[완료]** `app/(app)/tournament/[id]/apply/page.tsx` — user redirect 추가
8. **[완료]** `app/(app)/onboarding/profile/page.tsx` — 문구/역할 재정의
9. **[완료]** `app/(app)/onboarding/profile/Form.tsx` — Toast + redirect 변경

- DB 변경 없음 — 전부 TypeScript/UI 변경
- TypeScript 타입 체크 통과 (신규 오류 없음)
- pre-existing 오류: `.next/types/validator.ts` — Next.js 빌드 캐시 stale 이슈, 내 변경과 무관

## 구현 완료 (2026-04-07)
