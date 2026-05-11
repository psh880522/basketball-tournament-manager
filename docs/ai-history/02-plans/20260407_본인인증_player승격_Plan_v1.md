# 구현 계획: 본인인증 Step 2 + user → player 승격 (v1)

- **작성일**: 2026-04-07
- **전제 조건**:
  - 1차 묶음(권한 코어 + 서버 보안 재정의) 구현 완료
  - 2차 묶음(user/player 화면 분기 + 선수 등록 진입 흐름) 구현 완료
  - `Role = "organizer" | "manager" | "user" | "player"` 확정
  - `requirePlayer()`, `isPlayerRole()`, `isUserRole()` 사용 가능
  - `src/lib/config/env.ts` (`requireIdentityVerification` 플래그) 존재
  - `/onboarding/profile` (Step 1) 완료, 저장 후 `/`로 이동 중
- **기반 리서치**: [20260407_권한모델재정의_Research.md](../01-research/20260407_권한모델재정의_Research.md)

---

## 1. 기능 요약

### 이번 범위에 포함되는 것

- `/onboarding/identity` 페이지 — 본인인증 Step 2 UI
- `identity_verifications` 테이블 신규 생성 (인증 이력 영구 보관)
- `profiles.identity_verified_at` 컬럼 추가 (인증 상태 즉시 조회용)
- `promote_to_player()` SECURITY DEFINER RPC 신규 생성
- 인증 성공 시 이력 저장 + 승격 단일 트랜잭션 처리
- production / non-production 분기 (`requireIdentityVerification` 플래그 실제 활용)
- `/onboarding/profile` Form.tsx — 저장 완료 후 `/` → `/onboarding/identity` redirect 변경
- 인증 실패 / 취소 / 재시도 / 중복 요청 / 이미 `player`인 경우 처리

### 이번 범위에서 제외

- 1차/2차에서 완료된 role/login/signup/RLS/UI 분기 재작업
- admin/users 화면 개선
- `captain/member` 네이밍 정리
- 대규모 UI 리디자인
- Step indicator 컴포넌트 (Step 2 이후 연결 후 확장)

### 완료 후 사용자 이동 방식

- Step 1 저장 완료 → `/onboarding/identity` (Step 2)
- 본인인증 성공 → `promote_to_player()` 실행 → `/dashboard`
- 본인인증 실패 → 동일 페이지 에러 표시, 재시도 가능
- 본인인증 취소 → `/` (랜딩)으로 이동
- 이미 `player`인 사용자가 `/onboarding/identity` 접근 → `/dashboard` redirect

---

## 2. 라이브러리 검토

**추가 라이브러리 불필요.**

- provider 미확정 상태이므로 외부 SDK 도입 시점이 아님
- 인증 API 호출은 서버 액션에서 `fetch`로 충분 (HTTP 기반 provider가 대부분)
- 최소 추상화: `IdentityVerificationAdapter` 인터페이스 타입만 정의하고, 실제 구현은 단일 파일에 격리
- non-production 스킵 로직은 `requireIdentityVerification` 플래그로 충분 — 추가 라이브러리 불필요

---

## 3. 변경 파일 목록

### 수정 파일

- `app/(app)/onboarding/profile/Form.tsx` — 저장 완료 후 redirect 대상 변경 (`/` → `/onboarding/identity`)
- `src/lib/config/env.ts` — 소비처 활용 (파일 자체 변경 없음, 이번 단계에서 첫 실제 사용)

### 신규 파일

- `app/(app)/onboarding/identity/page.tsx` — 본인인증 Step 2 페이지 (서버 컴포넌트 + 가드)
- `app/(app)/onboarding/identity/IdentityForm.tsx` — 본인인증 UI 클라이언트 컴포넌트
- `app/(app)/onboarding/identity/actions.ts` — 본인인증 서버 액션 (분기 + promote 호출)
- `src/lib/identity/adapter.ts` — 본인인증 provider 추상화 인터페이스 + mock 구현
- `supabase/migrations/0219_identity_verifications.sql` — `identity_verifications` 테이블 + `profiles.identity_verified_at` 컬럼
- `supabase/migrations/0220_promote_to_player_rpc.sql` — `promote_to_player()` RPC

---

## 4. 파일별 구현 개요

---

### `supabase/migrations/0219_identity_verifications.sql`

**역할**: 인증 이력 테이블 신규 생성 + `profiles` 인증 상태 컬럼 추가  
**추가 이유**: 본인인증 이력을 영구 보관하고, `profiles`에서 인증 상태를 즉시 조회 가능하게 해야 함

**핵심 구조**:

```sql
-- 1) identity_verifications 테이블
CREATE TABLE public.identity_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  provider    text NOT NULL DEFAULT 'mock',  -- 'mock' | 'pass' | 'inicis' 등
  provider_tx_id text,                       -- provider에서 발급한 트랜잭션 ID
  raw_response jsonb                         -- provider 원본 응답 (감사 목적)
);

-- 2) RLS
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- 본인만 자신의 이력 조회 가능
CREATE POLICY "identity_verifications_select_own"
  ON public.identity_verifications FOR SELECT
  USING (user_id = auth.uid());

-- INSERT는 SECURITY DEFINER RPC를 통해서만 처리 (직접 INSERT 차단)

-- 3) profiles.identity_verified_at 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz DEFAULT NULL;
```

**설계 근거**:
- `identity_verifications` 별도 테이블: 재인증, provider 교체, 감사 이력 보관 필요
- `profiles.identity_verified_at`: 빠른 인증 상태 조회용 denormalization — RLS 함수에서 JOIN 없이 체크 가능
- `raw_response jsonb`: provider 교체 시 원본 데이터 소실 방지

---

### `supabase/migrations/0220_promote_to_player_rpc.sql`

**역할**: `promote_to_player()` SECURITY DEFINER RPC — 인증 이력 저장 + role 승격을 단일 트랜잭션으로 처리  
**추가 이유**: 승격 로직을 클라이언트에서 분리하고, DB 레벨에서 정합성 보장

**핵심 구조**:

```sql
CREATE OR REPLACE FUNCTION public.promote_to_player(
  p_provider      text DEFAULT 'mock',
  p_provider_tx_id text DEFAULT NULL,
  p_raw_response  jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- 1) 미인증 + user 상태 검증
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- 이미 player면 멱등 처리 (오류 없이 종료)
  IF EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'player'
  ) THEN
    RETURN;
  END IF;

  -- user 상태가 아니면 거부 (organizer, manager 등)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Only user role can be promoted to player';
  END IF;

  -- 2) 인증 이력 저장
  INSERT INTO identity_verifications (user_id, provider, provider_tx_id, raw_response)
  VALUES (v_user_id, p_provider, p_provider_tx_id, p_raw_response);

  -- 3) profiles 업데이트 (role 승격 + 인증 타임스탬프)
  UPDATE profiles
  SET role = 'player',
      identity_verified_at = now()
  WHERE id = v_user_id;
END;
$$;
```

**설계 근거**:
- SECURITY DEFINER: `identity_verifications`에 직접 INSERT 정책을 두지 않고 RPC를 통해서만 저장 → DB 보안 경계 명확
- 단일 함수 내 트랜잭션: 이력 저장 실패 시 role 승격도 롤백
- 멱등성: 이미 `player`이면 오류 없이 RETURN (중복 호출 안전)
- `auth.uid()` 기반: 함수 인자에 `user_id`를 받지 않아 다른 사용자 승격 불가

---

### `src/lib/identity/adapter.ts` ← 신규

**역할**: 본인인증 provider 추상화 인터페이스 + non-production mock 구현  
**추가 이유**: provider 미확정 상태에서 서버 액션과 provider 연동 코드 분리. 추후 provider 교체 시 이 파일만 수정.

**핵심 구조**:

```typescript
// 인증 결과 타입
export type IdentityVerificationResult =
  | { ok: true; provider: string; txId: string; rawResponse: unknown }
  | { ok: false; error: string };

// 추상화 인터페이스 (provider별 구현 교체용)
export interface IdentityVerificationAdapter {
  verify(token: string): Promise<IdentityVerificationResult>;
}

// Mock 구현 (non-production 전용)
export const mockAdapter: IdentityVerificationAdapter = {
  async verify(_token: string) {
    // 실제 API 호출 없이 항상 성공 반환
    return {
      ok: true,
      provider: "mock",
      txId: `mock-${Date.now()}`,
      rawResponse: null,
    };
  },
};

// 실제 provider 구현 자리 (production용, 미정)
// export const passAdapter: IdentityVerificationAdapter = { ... };
```

**추상화 경계 원칙**:
- `adapter.verify(token)` 호출부만 서버 액션에 존재
- adapter 내부 로직(API endpoint, 서명 검증, 응답 파싱)은 이 파일에 완전 격리
- provider 교체 = 이 파일에서 adapter export 교체만으로 완료

---

### `app/(app)/onboarding/identity/actions.ts` ← 신규

**역할**: 본인인증 서버 액션 — provider 검증 + promote 호출  
**추가 이유**: 승격 흐름의 유일한 서버 진입점. `requireIdentityVerification` 플래그를 여기서 소비.

**핵심 구조**:

```typescript
"use server";

import { requireIdentityVerification } from "@/src/lib/config/env";
import { mockAdapter } from "@/src/lib/identity/adapter";
import { createClient } from "@/src/lib/supabase/server";

export async function verifyIdentityAndPromote(
  token: string  // provider로부터 받은 인증 토큰/코드
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  let txId: string;
  let rawResponse: unknown;
  let provider: string;

  if (!requireIdentityVerification) {
    // non-production: mock adapter 사용, 실제 API 호출 스킵
    const result = await mockAdapter.verify(token);
    if (!result.ok) return { ok: false, error: result.error };
    txId = result.txId;
    rawResponse = result.rawResponse;
    provider = result.provider;
  } else {
    // production: 실제 provider adapter 사용 (adapter 교체 지점)
    // const result = await realAdapter.verify(token);
    // if (!result.ok) return { ok: false, error: result.error };
    // txId = result.txId; ...
    return { ok: false, error: "본인인증 provider가 아직 연동되지 않았습니다." };
  }

  // promote_to_player() RPC 호출 (이력 저장 + role 승격 단일 트랜잭션)
  const { error } = await supabase.rpc("promote_to_player", {
    p_provider: provider,
    p_provider_tx_id: txId,
    p_raw_response: rawResponse,
  });

  if (error) return { ok: false, error: "승격 처리 중 오류가 발생했습니다." };
  return { ok: true };
}
```

**분기 위치 근거**:
- `requireIdentityVerification` 플래그 소비는 서버 액션 내부에서만 — 클라이언트에 환경 정보 노출 없음
- production 케이스는 adapter 교체 한 줄로 전환 가능하도록 구조화

---

### `app/(app)/onboarding/identity/page.tsx` ← 신규

**역할**: 본인인증 Step 2 페이지 — 가드 + IdentityForm 렌더링  
**추가 이유**: 선수 등록 흐름의 Step 2 진입점. player 가드 + user 전용 접근 제어.

**핵심 구조**:

```typescript
// 서버 컴포넌트
import { getUserWithRole } from "@/src/lib/auth/guards";
import { isPlayerRole, isUserRole } from "@/src/lib/auth/roles";
import { redirect } from "next/navigation";

export default async function IdentityPage() {
  const result = await getUserWithRole();

  // 미인증 → 로그인
  if (result.status === "unauthenticated") redirect("/login");
  // 에러/빈 프로필 → 로그인
  if (result.status === "error" || result.status === "empty") redirect("/login");

  // 이미 player → 대시보드 (중복 접근 차단)
  if (isPlayerRole(result.role)) redirect("/dashboard");

  // user가 아닌 경우 (organizer, manager) → 홈
  if (!isUserRole(result.role)) redirect("/");

  return (
    <div className="...">
      <h1>선수 등록 — 본인인증</h1>
      <p className="text-sm text-slate-500">
        본인인증을 완료하면 선수로 등록됩니다.
      </p>
      <p className="text-xs text-slate-400">2단계 / 2단계</p>
      <IdentityForm />
    </div>
  );
}
```

**상태 분기 요약**:

| 접근 상태 | 처리 |
|-----------|------|
| 비로그인 | `/login` redirect |
| `player` (이미 승격) | `/dashboard` redirect |
| `organizer`, `manager` | `/` redirect |
| `user` (정상) | IdentityForm 렌더링 |

---

### `app/(app)/onboarding/identity/IdentityForm.tsx` ← 신규

**역할**: 본인인증 UI 클라이언트 컴포넌트 — 인증 요청/결과 처리  
**추가 이유**: 인증 버튼 클릭 → 서버 액션 호출 → 성공/실패 분기 처리

**핵심 구조**:

```typescript
"use client";

// 상태: idle | pending | success | error | cancelled
const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
const [errorMessage, setErrorMessage] = useState<string | null>(null);

async function handleVerify() {
  setStatus("pending");

  // non-production: 빈 토큰으로 mock 호출
  // production: provider SDK에서 받은 실제 token 사용
  const token = ""; // provider 연동 전 placeholder

  const result = await verifyIdentityAndPromote(token);

  if (!result.ok) {
    setStatus("error");
    setErrorMessage(result.error ?? "본인인증에 실패했습니다.");
    return;
  }

  setStatus("success");
  // role이 player로 바뀌었으므로 세션 갱신 후 대시보드 이동
  router.refresh();
  router.push("/dashboard");
}

// 취소 처리
function handleCancel() {
  router.push("/");
}
```

**상태별 UI**:

| 상태 | UI |
|------|----|
| `idle` | "본인인증 시작" 버튼 + "취소" 링크 |
| `pending` | 버튼 비활성화, 로딩 스피너 |
| `success` | "인증 완료" 표시, 자동 redirect |
| `error` | 에러 메시지 + "다시 시도" 버튼 활성화 |

---

### `app/(app)/onboarding/profile/Form.tsx`

**역할**: Step 1 저장 완료 후 Step 2 연결  
**수정 이유**: 현재 저장 완료 후 `/`(랜딩)으로 이동 — Step 2가 생긴 시점에 `/onboarding/identity`로 변경 필요

**핵심 변경**:

```typescript
// 변경 전
setToastMessage("기본 정보가 저장되었습니다. 본인인증 완료 후 선수로 등록됩니다.");
setTimeout(() => router.push("/"), 1500);

// 변경 후
setToastMessage("기본 정보가 저장되었습니다. 본인인증 단계로 이동합니다.");
setTimeout(() => router.push("/onboarding/identity"), 1500);
```

**변경 범위**: 이 한 줄만 수정. Toast 문구도 함께 조정.

---

## 5. 구현 시 고려사항

### 인증 이력을 별도 테이블로 둘지 여부

**별도 테이블(`identity_verifications`) 필수.**

- `profiles`에 raw 응답을 직접 저장하면 테이블 비대화 + provider 교체 시 스키마 변경 필요
- 이력 보관: 재인증, 위조 조사, 감사 시 원본 응답 필요
- `profiles.identity_verified_at` 은 "인증됨?" 빠른 조회용 denormalization 컬럼으로 유지 — 두 테이블 역할이 다름

### 승격 로직을 서버/RPC에 모아야 하는 이유

- 클라이언트에서 직접 `UPDATE profiles SET role = 'player'` 호출을 허용하면 본인인증 우회 가능
- `identity_verifications` INSERT + `profiles` role/timestamp UPDATE가 트랜잭션으로 묶여야 정합성 보장
- SECURITY DEFINER RPC를 통해서만 승격 가능 → RLS에서 `identity_verifications` 직접 INSERT 차단

### production / non-production 분기 위치

- **유일한 분기 지점**: `app/(app)/onboarding/identity/actions.ts` 서버 액션 내부
- 클라이언트 컴포넌트에는 플래그 노출 없음
- UI는 환경 무관하게 동일 — 비-프로덕션에서도 실제 "본인인증" 버튼이 존재하고 mock으로 처리됨
- `requireIdentityVerification = false`이면: mock adapter → `promote_to_player()` 즉시 호출

### provider 미확정 상태에서의 추상화 경계

```
[IdentityForm] → actions.ts → [adapter.verify(token)] → supabase.rpc("promote_to_player")
                                   ↑ 교체 지점
                              adapter.ts에 격리
```

- `adapter.verify(token)` 계약: `{ ok: true, provider, txId, rawResponse }` | `{ ok: false, error }`
- provider가 확정되면 `adapter.ts`에 실제 구현 추가 + actions.ts에서 adapter 교체 한 줄

### 이미 `player`인 사용자의 Step 2 접근 처리

- `page.tsx` 서버 컴포넌트에서 `isPlayerRole(role)` → `/dashboard` redirect
- `promote_to_player()` RPC 자체도 멱등 처리 (이미 player이면 오류 없이 RETURN) — 이중 보호

### 중복 제출 / 새로고침 / 이탈 시 정합성

| 케이스 | 처리 |
|--------|------|
| 중복 제출 | `pending` 상태일 때 버튼 비활성화 (클라이언트), RPC 멱등 처리 (서버) |
| 성공 후 새로고침 | `page.tsx`에서 `player` 감지 → `/dashboard` redirect |
| 인증 도중 이탈 | RPC 호출 전 이탈이면 DB 변경 없음 — 재진입 시 Step 2 재시도 가능 |
| provider 응답 후 RPC 실패 | 이력 미저장 + role 미변경 (트랜잭션 롤백) → 재시도 가능 |
| Step 1 미완료 상태에서 Step 2 직접 접근 | `page.tsx` 가드: `user`면 통과 — Step 1 완료 여부는 `profiles.display_name` 기준으로 추가 검증 고려 |

**Step 1 완료 여부 검증 (선택적 강화)**:  
`page.tsx`에서 `getMyProfile()`로 `display_name` 존재 여부 확인 후, 미완료면 `/onboarding/profile` redirect 추가 가능. 이번 초기 구현에서는 선택 사항.

### 이후 인증 제공자 교체 시 변경 최소화 방안

- `src/lib/identity/adapter.ts` 내 신규 adapter 클래스 추가
- `actions.ts`에서 `mockAdapter` → 신규 adapter로 교체 (1줄)
- `identity_verifications.provider` 컬럼으로 어떤 provider로 인증됐는지 이력 구분 가능
- DB 스키마 변경 없음 (`raw_response jsonb`가 모든 provider 응답 수용)

---

## 6. 구현 순서 (권장)

1. **[DB]** `0219_identity_verifications.sql` — 테이블 + `profiles.identity_verified_at` 컬럼 **[완료]**
2. **[DB]** `0220_promote_to_player_rpc.sql` — `promote_to_player()` RPC **[완료]**
3. **[TS]** `src/lib/identity/adapter.ts` — 추상화 인터페이스 + mock 구현 **[완료]**
4. **[TS]** `app/(app)/onboarding/identity/actions.ts` — 서버 액션 (분기 + promote 호출) **[완료]**
5. **[TS]** `app/(app)/onboarding/identity/IdentityForm.tsx` — UI 클라이언트 컴포넌트 **[완료]**
6. **[TS]** `app/(app)/onboarding/identity/page.tsx` — 페이지 가드 + 렌더링 **[완료]**
7. **[TS]** `app/(app)/onboarding/profile/Form.tsx` — redirect 대상 변경 (`/` → `/onboarding/identity`) **[완료]**

DB 변경(1-2) 완료 후 TypeScript 변경(3-7) 진행.  
타입 체크: 전체 완료 후 `tsc --noEmit` 통과 확인.

## 구현 완료 (2026-04-07)

- TypeScript 타입 체크 통과 (신규 오류 없음)
- pre-existing 오류: `.next/types/validator.ts` — Next.js 빌드 캐시 stale 이슈, 내 변경과 무관
