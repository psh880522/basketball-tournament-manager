# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 2차 회원가입 약관 동의 Plan

> 작성일: 2026-04-08  
> 범위: 회원가입 단계 약관 동의 UI / 검증 / 저장 연결  
> 전제: 1차 묶음(DB/RLS/RPC/타입/API 레이어) 완료 상태  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`  
> 참고: `docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_1차DB정리_Plan_v1.md`

---

## 1. 기능 상세 설명

### 구현 항목

| # | 항목 | 방향 |
|---|------|------|
| 1 | `signup/Form.tsx` 약관 동의 UI 추가 | 필수 2개 + 선택 1개 체크박스 |
| 2 | `signup/actions.ts` 검증 + 저장 | 필수 미동의 시 거부, 가입 완료 후 동의 기록 |
| 3 | 약관 버전 상수 정의 | `lib/constants/terms.ts` 신규 |

### 포함 범위

- 회원가입 폼에 약관 동의 체크박스 3개 추가 (서비스 이용약관, 개인정보처리방침, 마케팅 동의)
- "전체 동의" 토글 UI
- 필수 약관 미동의 시 클라이언트 + 서버 양쪽 차단
- 회원가입 성공 후 `recordTermsConsentBatch()` 호출로 동의 기록 저장
- 이메일 인증 필요 시 처리 분기 (기존 로직 유지 + 동의 저장 타이밍 정리)
- 약관 버전 상수 관리 (`CURRENT_TERMS_VERSION`)

### 제외 범위

- 약관 상세 문구 (법무 확정 전)
- 약관 상세 페이지 UI (`/terms/service`, `/terms/privacy` 등)
- 프로필 입력 폼 개편 (3차)
- 본인인증 UI / 외부 provider 연동 (4차)
- player role 전환 로직 변경
- 마이페이지 내 동의 설정 관리 화면

### 회원가입 완료 후 흐름

```
이메일 인증 불필요 환경 (개발):
  가입 성공 → 동의 기록 저장 → redirect("/")

이메일 인증 필요 환경 (프로덕션):
  가입 성공 → 동의 기록 저장 → emailConfirmSent 상태 표시
  (이후 이메일 인증 완료 → /auth/callback → redirect("/"))
```

> **타이밍 결정**: 동의 기록은 `supabase.auth.signUp()` 성공 직후, redirect 전에 저장.  
> 이메일 인증 대기 상태일 때도 저장하는 이유: 가입 의사(동의)가 확인된 시점이므로 즉시 기록.

### 예외 케이스 및 실패 처리

| 케이스 | 처리 |
|--------|------|
| 필수 약관 미체크 상태로 폼 제출 | 클라이언트: 버튼 disabled 또는 에러 메시지 / 서버: `ok: false` 반환 |
| 회원가입은 성공했으나 동의 기록 저장 실패 | 가입은 유지 (롤백 불가). 에러 로그만 기록, UX 오류 표시 없음 (비핵심 오류) |
| 이미 가입된 이메일 | 기존 에러 매핑 유지 ("이미 가입된 이메일입니다.") |
| 기존 사용자(동의 이력 없음)의 재로그인 | 이번 단계 처리 없음 (추후 재동의 유도 화면에서 처리) |

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 |
|------|------|
| 체크박스 UI | HTML native checkbox + Tailwind CSS — 기존 패턴으로 충분 |
| 상태 관리 | `useState` — 체크박스 3개이므로 외부 상태 라이브러리 불필요 |
| 약관 동의 저장 | `lib/api/terms.ts` 기존 구현 그대로 사용 |
| 폼 검증 | 클라이언트 직접 조건 체크 — 기존 email/password 검증 패턴 동일 |
| 약관 버전 관리 | 상수 파일 신규 생성 — 외부 CMS 불필요 |

---

## 3. 변경 파일 목록

### 신규 파일

| 파일 | 이유 |
|------|------|
| `lib/constants/terms.ts` | 약관 버전 상수를 한 곳에서 관리. 버전 변경 시 이 파일만 수정. |

### 수정 파일

| 파일 | 이유 |
|------|------|
| `app/(auth)/signup/Form.tsx` | 약관 동의 체크박스 UI 추가, 전체 동의 토글, 필수 미동의 시 제출 차단 |
| `app/(auth)/signup/actions.ts` | 약관 동의 입력값 수신, 서버 사이드 필수 검증, 가입 후 동의 기록 저장 |

### 변경 없는 파일 (유지)

- `lib/api/terms.ts` — `recordTermsConsentBatch()` 그대로 사용
- `lib/types/terms.ts` — `TermsConsentInput`, `TermsType` 그대로 사용
- `lib/api/auth.ts` — `signUpWithPassword()` 그대로 사용
- `src/lib/auth/roles.ts`, `src/lib/supabase/server.ts` — 변경 없음
- `components/ui/*` — 기존 컴포넌트 재사용

---

## 4. 파일별 구현 구조

---

### 4-1. `lib/constants/terms.ts` (신규)

**역할**: 약관 버전 상수 정의 — 서버 액션과 폼 양쪽에서 동일 버전 참조  
**왜 필요한지**: 버전을 분산 하드코딩하면 버전 변경 시 여러 파일 수정 필요. 단일 진실 공급원(SSOT).

**핵심 구조**:

```typescript
// 현재 약관 버전 (버전 변경 시 이 파일만 수정)
export const TERMS_VERSIONS = {
  service:   '2026-04',
  privacy:   '2026-04',
  marketing: '2026-04',
} as const satisfies Record<string, string>;
```

**사용처**:
- `signup/actions.ts` — 저장 시 `terms_version` 값으로 사용
- `signup/Form.tsx` — 약관 링크 텍스트의 날짜 표시 등에 참조 가능

---

### 4-2. `app/(auth)/signup/Form.tsx` (수정)

**역할**: 회원가입 폼에 약관 동의 체크박스 영역 추가  
**왜 필요한지**: 현재 폼에는 약관 동의 UI가 없음. 필수/선택 동의를 수집해 Server Action에 전달해야 함.

**추가 상태**:

```typescript
const [agreeService, setAgreeService] = useState(false);   // 필수
const [agreePrivacy, setAgreePrivacy]  = useState(false);   // 필수
const [agreeMarketing, setAgreeMarketing] = useState(false); // 선택
```

**전체 동의 토글 로직**:

```
agreeAll = agreeService && agreePrivacy && agreeMarketing
전체 동의 클릭 → 셋 모두 !agreeAll 로 설정
```

**제출 차단 조건 (클라이언트)**:

```
if (!agreeService || !agreePrivacy) → "필수 약관에 동의해주세요." 에러 메시지
```

**서버 액션 호출 변경**:

```typescript
// 기존
await signUpWithPassword({ email, password })

// 변경
await signUpWithPassword({ email, password, agreeService, agreePrivacy, agreeMarketing })
```

**UI 구조 스케치**:

```
[전체 동의] 체크박스
────────────────
[✓] (필수) 서비스 이용약관 동의  [전문 보기 링크]
[✓] (필수) 개인정보처리방침 동의  [전문 보기 링크]
[□] (선택) 마케팅 정보 수신 동의  [전문 보기 링크]
```

> **기존 emailConfirmSent 화면, 에러 표시, isPending 처리 패턴 그대로 유지**

---

### 4-3. `app/(auth)/signup/actions.ts` (수정)

**역할**: 약관 동의 입력값 수신 → 서버 사이드 필수 검증 → 가입 후 동의 기록 저장

**타입 변경**:

```typescript
// 기존
type SignUpInput = { email: string; password: string; }

// 변경
type SignUpInput = {
  email: string;
  password: string;
  agreeService: boolean;   // 필수
  agreePrivacy: boolean;   // 필수
  agreeMarketing: boolean; // 선택
}
```

**서버 사이드 검증 추가** (기존 검증 블록 하단에 추가):

```typescript
if (!input.agreeService || !input.agreePrivacy) {
  return { ok: false, error: "필수 약관에 동의해주세요." };
}
```

**가입 성공 후 동의 기록 저장** (pseudocode):

```typescript
const result = await signUp(email, password);
if (result.error) return { ok: false, error: translateSignUpError(result.error) };

// 동의 기록 저장 (가입 성공 직후)
const consentInputs: TermsConsentInput[] = [
  { terms_type: 'service',   terms_version: TERMS_VERSIONS.service,   agreed: true },
  { terms_type: 'privacy',   terms_version: TERMS_VERSIONS.privacy,   agreed: true },
  { terms_type: 'marketing', terms_version: TERMS_VERSIONS.marketing, agreed: input.agreeMarketing },
];
await recordTermsConsentBatch(consentInputs);
// 저장 실패해도 가입 흐름은 계속 진행 (에러 무시)

if (result.requiresEmailConfirmation) {
  return { ok: true, requiresEmailConfirmation: true };
}

redirect("/");
```

> **동의 저장 실패 처리**: 가입 성공 후 동의 저장은 비핵심 경로이므로, 저장 실패 시 UX 오류 표시 없이 진행. 추후 재동의 유도 화면으로 보완 가능.

> **`recordTermsConsentBatch()`는 내부적으로 `supabase.auth.getUser()`를 호출하는데, 이메일 인증 미완료 상태일 때 세션이 있는지 확인 필요** → 리서치에서 `supabase.auth.signUp()` 성공 시 세션이 바로 생성되므로 이메일 인증 대기 상태에서도 저장 가능.

---

## 5. 고려 사항 / 트레이드오프

### 5-1. 약관 체크 검증: 클라이언트 단독 vs 서버 이중 검증

**결론: 양쪽 모두 검증**

| 관점 | 클라이언트 단독 | 서버 이중 검증 |
|------|--------------|--------------|
| UX | 빠른 피드백 | — |
| 보안 | JS 우회 가능 | 서버에서 최종 차단 |
| 일관성 | 클라이언트 버그 시 미검증 통과 | 서버가 보루 역할 |

→ 클라이언트: 버튼 제출 전 조건 체크, 인라인 에러 메시지  
→ 서버: `actions.ts`에서 동일 필수 조건 재검증 후 `ok: false` 반환

---

### 5-2. 회원가입 성공과 동의 저장 묶음 처리

**결론: 순차 처리 (트랜잭션 없음)**

Supabase는 `auth.signUp()`과 일반 테이블 INSERT를 단일 트랜잭션으로 묶을 수 없음.

| 시나리오 | 처리 |
|---------|------|
| 가입 성공 + 동의 저장 성공 | 정상 |
| 가입 성공 + 동의 저장 실패 | 가입은 유지, 동의 이력만 누락. 에러 표시 없이 진행 |
| 가입 실패 | 동의 저장 시도 안 함 |

→ 동의 저장 실패 대응: 추후 로그인 시 동의 이력 없는 사용자 감지 → 재동의 유도 화면으로 보완 (이번 범위 외)

---

### 5-3. 약관 버전 변경 시 확장 가능성

**현재 구조**:
- `lib/constants/terms.ts`의 `TERMS_VERSIONS` 상수만 업데이트
- 기존 이력은 유지, 새 버전으로 신규 행 INSERT
- 최신 동의 상태 조회 시 가장 최근 행 기준 → 버전 변경 전 동의는 자동으로 이전 버전으로 기록됨

**재동의 유도 흐름 (이번 범위 외)**:
- `getMyTermsConsentStatus()` 조회 시 버전 비교 로직 추가 가능
- 이전 버전 동의자에게 새 버전 재동의 요청 화면 연결 가능

---

### 5-4. 필수/선택 동의 UI 공용화 여부

**결론: 이번 단계에서는 공용 컴포넌트 불필요**

- 이번 범위는 회원가입 폼 1곳에만 적용
- 추후 마이페이지 동의 설정 화면 구현 시 공용 컴포넌트 추출 검토 (현재는 premature abstraction)
- `Form.tsx` 내에 인라인 UI로 구현, 추후 `TermsConsentCheckboxGroup` 컴포넌트로 추출 가능 구조 유지

---

### 5-5. 기존 auth 흐름과의 충돌 여부

| 기존 흐름 | 충돌 여부 | 대응 |
|-----------|----------|------|
| `supabase.auth.signUp()` 호출 | 없음 | 기존 `lib/api/auth.ts` 그대로 사용 |
| 이메일 인증 분기 (`requiresEmailConfirmation`) | 없음 | 동의 저장 후 동일 분기 유지 |
| `redirect("/")` 후 `getUserWithRole()` | 없음 | role은 DB trigger로 `user`로 생성됨 |
| 에러 매핑 (`translateSignUpError`) | 없음 | 기존 매핑 유지, 새 에러 추가 없음 |

→ 기존 `signUpWithPassword()` API 시그니처는 `lib/api/auth.ts`에서 변경 없음.  
→ `actions.ts`의 `SignUpInput` 타입만 확장.

---

## 6. 이번 단계 완료 기준

- [완료] `lib/constants/terms.ts` 생성 완료
- [완료] `signup/Form.tsx` 약관 동의 UI (3개 체크박스 + 전체 동의) 추가 완료
- [완료] 필수 약관 미체크 시 클라이언트 제출 차단 동작 확인
- [완료] `signup/actions.ts` 서버 사이드 필수 약관 검증 추가 완료
- [완료] 가입 성공 후 `recordTermsConsentBatch()` 호출 + DB에 3건 이력 저장 확인
- [완료] 기존 이메일 인증 분기, 에러 표시, isPending 패턴 회귀 없음 확인
- [완료] 마케팅 미동의 상태에서도 가입 가능 확인

---

## 7. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_2차회원가입약관동의_Plan_v1.md
```
