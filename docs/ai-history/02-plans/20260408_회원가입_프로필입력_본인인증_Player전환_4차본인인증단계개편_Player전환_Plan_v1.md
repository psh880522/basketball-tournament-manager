# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 4차 본인인증 단계 개편 및 Player 전환 Plan

> 작성일: 2026-04-08  
> 범위: 본인인증 화면 정비 + 확정값 저장 + user → player 승격 흐름 완성  
> 전제: 1차(DB/RLS/RPC/타입/API), 2차(약관 동의), 3차(프로필 입력 개편) 완료 상태  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`  
> 참고: `docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_3차선수등록프로필입력개편_Plan_v2.md`

---

## 1. 기능 상세 설명

### 구현 항목

| # | 항목 | 방향 | 상태 |
|---|------|------|------|
| 1 | `onboarding/identity/page.tsx` 프로필 완료 가드 추가 | 진입 전 `isProfileCompleted()` 체크 → 미완료 시 `/onboarding/profile` 리다이렉트 | [완료] |
| 2 | `onboarding/identity/actions.ts` 확정값 파라미터 전달 | RPC v2 시그니처에 맞춰 `p_verified_*` 파라미터 전달 구조로 교체 | [완료] |
| 3 | `onboarding/identity/IdentityForm.tsx` mock 흐름 정비 | 실명/생년월일/휴대폰번호 입력 필드 추가 (mock 환경에서는 자유 입력, 실제 provider 연동 전 임시) | [완료] |
| 4 | 실제 provider 연동 준비 구조 | adapter 인터페이스 확장 — 확정값 반환 필드 추가 | [완료] |

### 포함 범위

- `onboarding/identity/page.tsx`에 프로필 완료 가드 추가
- `IdentityForm.tsx`에 실명/생년월일/휴대폰번호 입력 필드 추가 (mock용 직접 입력 방식)
- `actions.ts`에서 `promote_to_player()` RPC v2 시그니처로 확정값 파라미터 전달
- `IdentityVerificationAdapter` 인터페이스에 확정값 반환 필드 추가
- mock adapter가 확정값 형태로 반환하도록 수정
- 이미 player인 경우, 프로필 미완료인 경우 예외 처리

### 제외 범위

- 실제 PASS 등 외부 본인인증 provider 구현 (provider 확정/계약 이후 별도 단계)
- 약관 동의 구현 (2차 완료)
- 선수등록 폼 개편 (3차 완료)
- player 이후 프로필 수정 페이지
- 관리자 수동 role 변경 확장

### 본인인증 성공 후 처리 흐름

```
[page.tsx]
  isProfileCompleted() 체크 → 미완료 시 /onboarding/profile 리다이렉트

[IdentityForm.tsx] (mock 환경)
  실명/생년월일/휴대폰 직접 입력 → "본인인증 시작" 버튼 클릭

[actions.ts: verifyIdentityAndPromote(input)]
  1. adapter.verify(token) → { ok, provider, txId, rawResponse, verifiedFields }
  2. supabase.rpc("promote_to_player", {
       p_provider, p_provider_tx_id, p_raw_response,
       p_verified_name, p_verified_phone, p_verified_birth_date
     })
  3. 성공 → { ok: true }

[IdentityForm.tsx]
  성공 → Toast("본인인증 완료. 선수로 등록되었습니다.")
       → router.refresh() (세션 role 갱신)
       → 1.5초 후 router.push("/dashboard")
```

### 예외 케이스 및 실패 처리

| 케이스 | 처리 |
|--------|------|
| 프로필 미완료(display_name 없음)로 identity 접근 | page.tsx에서 `/onboarding/profile` 리다이렉트 |
| 이미 player인 상태로 접근 | 기존 로직 유지 — `/dashboard` 리다이렉트 |
| mock adapter 성공 + RPC 실패 | `{ ok: false, error: "승격 처리 중 오류가 발생했습니다." }` + 실제 에러 서버 로그 |
| 실명/생년월일/휴대폰 미입력 (mock 환경) | 클라이언트 required 처리. 서버에서는 null로 허용 (mock에서는 확정값 미필수) |
| 중복 인증 시도 (이미 player) | RPC 멱등 처리 — 오류 없이 반환, 클라이언트는 성공으로 처리 후 대시보드 이동 |
| provider 오류 (production) | `{ ok: false, error: "본인인증에 실패했습니다. 다시 시도해주세요." }` |

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 | 이유 |
|------|------|------|
| 날짜 입력 | `<input type="date">` | mock 환경 전용 임시 UI. react-day-picker는 과도함 |
| 전화번호 포맷 | 없음 | mock 환경에서는 자유 입력, 실제 provider 연동 시 재설계 |
| 폼 상태 관리 | `useState` 유지 | 기존 패턴 그대로 |
| Provider adapter | 기존 인터페이스 확장 | 신규 라이브러리 불필요, 타입 필드만 추가 |

---

## 3. 변경 파일 목록

### 수정 파일

| 파일 | 이유 |
|------|------|
| `app/(app)/onboarding/identity/page.tsx` | 프로필 완료 가드 추가 (`isProfileCompleted()` 체크) |
| `app/(app)/onboarding/identity/IdentityForm.tsx` | 실명/생년월일/휴대폰 입력 필드 추가, input → actions 전달 구조 변경 |
| `app/(app)/onboarding/identity/actions.ts` | 확정값 파라미터 수신 + RPC v2 시그니처로 전달, 에러 로깅 추가 |
| `src/lib/identity/adapter.ts` | `IdentityVerificationResult`에 `verifiedFields` 반환 필드 추가, mock adapter 수정 |

### 신규 파일

**없음** — DB/타입/API 레이어는 1차에서 완성됨. 별도 마이그레이션 불필요.

---

## 4. 파일별 구현 구조

### 4.1 `src/lib/identity/adapter.ts` — 인터페이스 확장

**역할**: 본인인증 provider 추상화 + mock 구현  
**왜 필요한지**: 현재 `IdentityVerificationResult`에 확정값(실명/생년월일/전화번호) 반환 필드가 없음. RPC v2 파라미터로 전달하려면 adapter 결과에 포함돼야 함  
**핵심 구조**:

```typescript
// 확정값 필드 추가
export type IdentityVerificationResult =
  | {
      ok: true;
      provider: string;
      txId: string;
      rawResponse: unknown;
      verifiedName: string | null;       // 실명 확정값
      verifiedPhone: string | null;      // 휴대폰 확정값
      verifiedBirthDate: string | null;  // 생년월일 확정값 (YYYY-MM-DD)
    }
  | { ok: false; error: string };

// mock adapter: verifiedFields를 입력값에서 그대로 반환
export const mockAdapter: IdentityVerificationAdapter = {
  async verify(_token, fields?) {
    return {
      ok: true,
      provider: "mock",
      txId: `mock-${Date.now()}`,
      rawResponse: null,
      verifiedName: fields?.name ?? null,
      verifiedPhone: fields?.phone ?? null,
      verifiedBirthDate: fields?.birthDate ?? null,
    };
  },
};
```

> mock adapter의 `verify()` 시그니처에 선택적 `fields` 파라미터 추가.  
> 인터페이스(`IdentityVerificationAdapter`)의 `verify()` 시그니처도 동일하게 변경.

---

### 4.2 `app/(app)/onboarding/identity/actions.ts` — 확정값 전달 구조로 교체

**역할**: 본인인증 adapter 호출 + RPC v2로 승격  
**왜 필요한지**: 현재 RPC 호출 시 `p_verified_*` 파라미터가 전달되지 않음. 또한 에러를 `"승격 처리 중 오류가 발생했습니다."`로만 반환해 디버깅 불가  
**핵심 구조**:

```typescript
// 입력 타입 추가
type VerifyInput = {
  name: string;
  phone: string;
  birthDate: string;  // YYYY-MM-DD
};

async function verifyIdentityAndPromote(input: VerifyInput): Promise<ActionResult>
  1. getUserWithRole() → 미인증이면 에러
  2. adapter.verify("", { name, phone, birthDate }) → verifiedFields 포함한 결과
  3. supabase.rpc("promote_to_player", {
       p_provider: result.provider,
       p_provider_tx_id: result.txId,
       p_raw_response: result.rawResponse,
       p_verified_name: result.verifiedName,
       p_verified_phone: result.verifiedPhone,
       p_verified_birth_date: result.verifiedBirthDate,
     })
  4. RPC 오류 시: console.error(error.message) + { ok: false, error: "승격 처리 중 오류가 발생했습니다." }
  5. 성공: { ok: true }
```

> `getUserWithRole()` 가드 추가 (현재 없음).  
> adapter 분기(`requireIdentityVerification` 플래그)는 그대로 유지.  
> production 분기는 현재 `{ ok: false, error: "provider 미연동" }` 유지.

---

### 4.3 `app/(app)/onboarding/identity/IdentityForm.tsx` — 입력 필드 추가

**역할**: 실명/생년월일/휴대폰 입력 + 본인인증 요청  
**왜 필요한지**: 현재 버튼 하나만 있고 확정값 입력 수단이 없음. mock 환경에서 확정값을 직접 입력해 저장 흐름을 검증할 수 있어야 함  
**핵심 구조**:

```typescript
// 상태
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [birthDate, setBirthDate] = useState("");

// handleVerify
  → 클라이언트 검증: name.trim() 필수
  → verifyIdentityAndPromote({ name, phone, birthDate })
  → 성공: Toast → router.refresh() → 1.5초 후 /dashboard
  → 실패: setErrorMessage(result.error)

// UI 구조
<form>
  <Input label="실명" value={name} required />
  <Input label="휴대폰번호" value={phone} placeholder="01012345678" />
  <Input label="생년월일" type="date" value={birthDate} />
  <Button "본인인증 시작" />
  <button "취소하고 나중에 하기" />
</form>
```

> mock 환경 안내 문구 추가: "현재 테스트 환경입니다. 실제 본인인증은 추후 지원됩니다."  
> 입력 필드는 기존 `Input` 컴포넌트 재사용.  
> date 타입은 `<Input type="date">`로 처리.

---

### 4.4 `app/(app)/onboarding/identity/page.tsx` — 프로필 완료 가드 추가

**역할**: 본인인증 페이지 진입 전 사전 조건 검증  
**왜 필요한지**: 현재 프로필 미완료 상태(display_name 없음)에서도 identity 진입 가능. RPC v2에서 display_name 체크로 예외가 발생하는 것을 UI 단에서 미리 차단해야 함  
**핵심 구조**:

```typescript
// 기존 role 가드 다음에 추가
const profileResult = await getMyProfile();
if (!isProfileCompleted(profileResult.data)) {
  redirect("/onboarding/profile");
}
```

> `getMyProfile()` + `isProfileCompleted()` 임포트 추가.  
> 기존 `isPlayerRole()` / `isUserRole()` 가드 순서는 변경 없음 (role 체크 먼저, 프로필 체크 나중).

---

## 5. 고려 사항 / 트레이드오프

### 본인인증 확정값 저장 책임: 액션 vs RPC

**결론: RPC에 위임 (현재 구조 유지)**

| 기준 | 액션에서 저장 | RPC에서 저장 (현재) |
|------|--------------|---------------------|
| 트랜잭션 | identity_verifications 저장과 분리됨 | 단일 트랜잭션으로 일관성 보장 |
| 보안 | API 레이어에서 직접 profiles 수정 필요 | SECURITY DEFINER RPC로 제한적 노출 |
| 유지보수 | 저장 로직이 여러 곳에 분산 | 승격 관련 모든 로직이 RPC 한 곳에 집중 |

RPC v2(`0226`)에 이미 확정값 저장이 포함되어 있음. 액션은 파라미터만 전달.

---

### 프로필 완료 검증 위치: 액션 vs RPC

**결론: RPC(이미 구현) + page.tsx(신규 추가) 이중 검증**

- RPC v2는 이미 `display_name IS NOT NULL` 체크 포함 → 최후 방어선
- page.tsx에서 사전 리다이렉트 → UX 개선 (RPC 오류 없이 친절한 안내)
- actions.ts에서 별도 체크는 추가하지 않음 (page 가드와 RPC 사이에서 중복)

---

### mock adapter vs 실제 provider adapter 구조

**결론: fields 파라미터를 선택적으로 추가, 인터페이스 확장 최소화**

```
IdentityVerificationAdapter.verify(token: string, fields?: VerifyFields): Promise<IdentityVerificationResult>
```

- mock: `fields`를 받아서 그대로 `verifiedFields`로 반환
- 실제 provider: `token`(provider 발급 토큰)으로 API 조회 → 확정값 추출 반환. `fields`는 무시
- production 분기는 현재 `{ ok: false, error: "provider 미연동" }` 유지 (계약/운영 심사 이후 교체)

---

### 인증 실패 / 중복 호출 / 이미 player인 경우

| 상황 | 처리 위치 | 방식 |
|------|-----------|------|
| 이미 player로 page 진입 | page.tsx | `/dashboard` 리다이렉트 (기존 유지) |
| 이미 player 상태에서 RPC 호출 | RPC 내부 멱등 처리 | 오류 없이 RETURN → actions.ts는 성공으로 처리 |
| adapter 오류 | actions.ts | `{ ok: false, error }` → IdentityForm 에러 표시 |
| RPC 오류 (DB 레벨) | actions.ts | `console.error` + 사용자 노출 메시지 구분 |

---

### `identity_verifications.raw_response` 저장 범위

**결론: provider 응답 전체를 jsonb로 저장, 필터링 없음**

- mock 환경: `raw_response = null`
- 실제 provider: provider API 응답 전체 저장 (추후 감사/디버깅용)
- 개인정보(실명 등)가 raw_response에 포함될 수 있으나, 이 테이블은 본인(SELECT) 조회만 허용(RLS). organizer도 직접 접근 불가
- 민감 정보 암호화는 실제 provider 연동 시 별도 결정

---

### 완료 후 `/dashboard` 이동과 라우팅 흐름 충돌 여부

**충돌 없음**. 현재 흐름:
```
promote_to_player() 성공
  → role = 'player'
  → router.refresh() (Next.js 세션/서버 컴포넌트 재검증)
  → router.push("/dashboard") 
```

- `router.refresh()` 후 세션에 role이 반영되어 dashboard 진입 가능
- 로그인 후 role 분기(`/dashboard` for player)와 일치
- refresh 없이 push만 하면 server component가 이전 role(user)로 렌더링될 수 있으므로 refresh가 필수

---

## 6. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_4차본인인증단계개편_Player전환_Plan_v1.md
```
