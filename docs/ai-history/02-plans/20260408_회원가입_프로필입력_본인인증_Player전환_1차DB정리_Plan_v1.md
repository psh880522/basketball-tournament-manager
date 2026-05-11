# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 1차 DB 구조 정리 Plan

> 작성일: 2026-04-08  
> 구현 완료: 2026-04-08  
> 범위: DB / RLS / RPC / 타입 / API 레이어 설계  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`

---

## 1. 기능 상세 설명

### 이번 1차 묶음에서 구현할 항목

| # | 항목 | 방향 | 상태 |
|---|------|------|------|
| 1 | `player_profiles` 테이블 신규 생성 | 선수 전용 정보(성별/포지션/신장/경력/지역 등) 분리 | [완료] |
| 2 | `profiles` 테이블 본인인증 확정값 컬럼 추가 | `verified_name`, `verified_phone`, `verified_birth_date` | [완료] |
| 3 | `user_terms_consents` 테이블 신규 생성 | 버전형 약관 동의 이력 관리 | [완료] |
| 4 | `promote_to_player()` RPC 보강 | 프로필 완료 사전 체크 + 확정값 파라미터 추가 | [완료] |
| 5 | TypeScript 타입 신규 정의 | `PlayerProfile`, `TermsConsent`, `IdentityVerifiedFields` | [완료] |
| 6 | API 레이어 신규/수정 | `lib/api/player-profile.ts`, `lib/api/terms.ts`, `lib/api/profiles.ts` 수정 | [완료] |
| 7 | RLS 정책 | 각 신규 테이블 RLS 반영 | [완료] |

### 포함 범위

- DB 스키마 변경 및 마이그레이션 파일 설계
- RLS 정책 설계 (각 테이블별)
- RPC 함수 시그니처 확장
- TypeScript 타입 정의
- API 함수 시그니처 및 핵심 로직 설계

### 제외 범위

- 회원가입/프로필 입력/본인인증 UI 구현 (2차)
- 실제 PASS 등 외부 본인인증 provider 연동 (별도 단계)
- 사이드바/대시보드 노출 정책
- 구현 코드 작성 (이번 단계는 설계까지만)

### 후속 단계 확장 포인트

- **2차**: 회원가입 약관 동의 UI (`signup/Form.tsx` 체크박스 추가)
- **3차**: 프로필 입력 폼 개편 (선수 정보 필드 추가, `phone`/`birth_date` 제거)
- **4차**: 본인인증 단계 UI 개편 + 실제 provider adapter

### 이번 단계 완료 기준

- 모든 마이그레이션 파일 작성 및 Supabase에 적용 완료
- RLS 정책 각 테이블에 적용 완료
- TypeScript 타입 파일 생성 완료
- API 레이어 함수 시그니처 확정 완료
- `promote_to_player()` RPC v2 적용 완료

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 |
|------|------|
| DB / RLS / RPC | Supabase PostgreSQL 기본 기능으로 충분 |
| TypeScript 타입 | 기존 `ApiResult<T>`, `ActionResult` 재사용 |
| 약관 버전 관리 | DB 테이블 설계로 해결 (별도 CMS 불필요) |
| 마이그레이션 | `supabase/migrations/*.sql` 기존 방식 유지 |

---

## 3. 변경 파일 목록

### 신규 파일

- `supabase/migrations/0221_player_profiles.sql` [완료]
- `supabase/migrations/0222_player_profiles_rls.sql` [완료]
- `supabase/migrations/0223_user_terms_consents.sql` [완료]
- `supabase/migrations/0224_user_terms_consents_rls.sql` [완료]
- `supabase/migrations/0225_profiles_verified_identity.sql` [완료]
- `supabase/migrations/0226_promote_to_player_rpc_v2.sql` [완료]
- `lib/types/player.ts` [완료]
- `lib/types/terms.ts` [완료]
- `lib/api/player-profile.ts` [완료]
- `lib/api/terms.ts` [완료]

### 수정 파일

- `lib/api/profiles.ts` — `ProfileUpdateInput`에서 `phone`/`birth_date` 제거, `verified_*` 필드 반영 [완료]
- `lib/types/api.ts` — 변경 없음 (유지)
- `app/(app)/onboarding/profile/actions.ts` — `phone` 검증 제거 [완료]
- `app/(app)/onboarding/profile/Form.tsx` — `phone`/`birth_date` UI 및 상태 제거 [완료]

---

## 4. 파일별 구현 구조

---

### 4-1. `0221_player_profiles.sql`

**역할**: 선수 전용 프로필 정보를 저장하는 별도 테이블 생성  
**왜 필요한지**: `profiles` 테이블에 선수 전용 컬럼을 계속 추가하면 `organizer`/`manager`/`user` role 행에도 null 컬럼이 쌓임. 선수 정보는 player role 전환 이후에만 의미 있으므로 분리.

**핵심 구조**:

```sql
CREATE TABLE public.player_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender       text,              -- '남성' | '여성' | NULL
  position     text,              -- '포인트가드' | '슈팅가드' | ... | NULL
  sub_position text,              -- 서브 포지션 (선택)
  height_cm    smallint,          -- 신장 (cm, 선택)
  weight_kg    smallint,          -- 체중 (kg, 선택)
  career_level text,              -- '입문' | '아마추어' | '세미프로' | NULL
  region       text,              -- 활동 지역 (선택)
  jersey_number smallint,         -- 등번호 (선택)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

**설계 결정**:
- `gender`, `position`, `career_level`은 ENUM 대신 `text`로 시작 (ENUM 변경 비용 회피)
- 필드 대부분 NULL 허용 (player 전환 직후에는 미입력 가능)
- `profiles.id` 와 1:1 (동일 PK)

---

### 4-2. `0222_player_profiles_rls.sql`

**역할**: `player_profiles` 테이블 RLS 정책  
**핵심 구조**:

```sql
-- SELECT: 본인 또는 organizer
CREATE POLICY "player_profiles_select_own_or_organizer"
  ON public.player_profiles FOR SELECT
  USING (id = auth.uid() OR public.is_organizer());

-- INSERT: 본인만 (player 전환 시 행 생성)
CREATE POLICY "player_profiles_insert_own"
  ON public.player_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- UPDATE: 본인만
CREATE POLICY "player_profiles_update_own"
  ON public.player_profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- DELETE: 금지 (cascade는 auth.users 삭제 시에만)
```

---

### 4-3. `0223_user_terms_consents.sql`

**역할**: 약관 동의 이력 테이블 생성 (버전형)  
**왜 필요한지**: 법적 요건(서비스 이용약관, 개인정보처리방침)과 마케팅 동의는 동의 시점/버전을 이력으로 보관해야 함. 단순 boolean 컬럼은 재동의 처리 불가.

**핵심 구조**:

```sql
CREATE TABLE public.user_terms_consents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_type   text NOT NULL,    -- 'service' | 'privacy' | 'marketing'
  terms_version text NOT NULL,   -- 예: '2026-01', '1.0'
  agreed       boolean NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now()
);

-- 복합 인덱스: 특정 사용자의 최신 동의 상태 조회
CREATE INDEX idx_user_terms_consents_user_type
  ON public.user_terms_consents (user_id, terms_type, consented_at DESC);
```

**설계 결정**:
- 동의 취소도 `agreed = false` 행 INSERT로 기록 (UPDATE 금지, 이력 보존)
- `terms_type` = `'service'` | `'privacy'` | `'marketing'` (ENUM 아닌 text로 확장성 유지)
- 최신 동의 상태 = 해당 타입의 가장 최근 행 `agreed` 값

---

### 4-4. `0224_user_terms_consents_rls.sql`

**역할**: `user_terms_consents` 테이블 RLS 정책  
**핵심 구조**:

```sql
-- SELECT: 본인만
CREATE POLICY "user_terms_consents_select_own"
  ON public.user_terms_consents FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: 본인만 (동의/철회 모두 INSERT)
CREATE POLICY "user_terms_consents_insert_own"
  ON public.user_terms_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE/DELETE: 금지 (이력 보존)
```

---

### 4-5. `0225_profiles_verified_identity.sql`

**역할**: `profiles` 테이블에 본인인증 확정값 컬럼 추가  
**왜 필요한지**: 현재 `phone`, `birth_date`는 프로필 입력 단계에서 수집되는 구조(잘못된 흐름). 실명/생년월일/휴대폰은 본인인증 단계의 확정값이며, 기존 컬럼과 명확히 구분 필요.

**핵심 구조**:

```sql
ALTER TABLE public.profiles
  ADD COLUMN verified_name       text    DEFAULT NULL, -- 실명 (본인인증 확정)
  ADD COLUMN verified_phone      text    DEFAULT NULL, -- 휴대폰 (본인인증 확정)
  ADD COLUMN verified_birth_date date    DEFAULT NULL; -- 생년월일 (본인인증 확정)

-- 기존 phone, birth_date 컬럼 처리
-- → phone: 기존 '연락처' 의미로 유지 가능하나 프로필 입력 단계 폼에서는 제거
-- → birth_date: 동일 (향후 deprecated 처리)
-- 이번 마이그레이션에서 DROP은 하지 않음 (프론트엔드 영향 범위 별도 검토)
COMMENT ON COLUMN public.profiles.phone IS 'DEPRECATED: 본인인증 확정값은 verified_phone 사용';
COMMENT ON COLUMN public.profiles.birth_date IS 'DEPRECATED: 본인인증 확정값은 verified_birth_date 사용';
```

**설계 결정**:
- 기존 `phone`, `birth_date` 즉시 DROP 금지 → 기존 코드 영향 최소화, deprecated 주석으로 표시
- `verified_*` 컬럼은 RPC를 통해서만 기록, API 레이어에서 직접 UPDATE 금지
- `identity_verified_at` 타임스탬프는 기존 컬럼 그대로 유지

---

### 4-6. `0226_promote_to_player_rpc_v2.sql`

**역할**: `promote_to_player()` RPC에 프로필 완료 체크 + 확정값 저장 파라미터 추가  
**왜 필요한지**: 현재 RPC는 `player_profiles` 행 생성 없음, 프로필 완료 검증 없음, `verified_*` 저장 없음.

**핵심 구조**:

```sql
CREATE OR REPLACE FUNCTION public.promote_to_player(
  p_provider          text    DEFAULT 'mock',
  p_provider_tx_id    text    DEFAULT NULL,
  p_raw_response      jsonb   DEFAULT NULL,
  -- 본인인증 확정값 (신규 파라미터)
  p_verified_name     text    DEFAULT NULL,
  p_verified_phone    text    DEFAULT NULL,
  p_verified_birth_date date  DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Unauthenticated'; END IF;

  -- 멱등 처리
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'player') THEN
    RETURN;
  END IF;

  -- user role 검증
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND role = 'user') THEN
    RAISE EXCEPTION 'Only user role can be promoted to player';
  END IF;

  -- [신규] display_name 필수 체크 (프로필 완료 사전 검증)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_user_id AND display_name IS NOT NULL AND display_name <> ''
  ) THEN
    RAISE EXCEPTION 'Profile not completed: display_name required';
  END IF;

  -- 인증 이력 저장 (기존 유지)
  INSERT INTO identity_verifications (user_id, provider, provider_tx_id, raw_response)
  VALUES (v_user_id, p_provider, p_provider_tx_id, p_raw_response);

  -- profiles 업데이트: role 승격 + verified_* 저장 (신규)
  UPDATE profiles
  SET role                  = 'player',
      identity_verified_at  = now(),
      verified_name         = p_verified_name,
      verified_phone        = p_verified_phone,
      verified_birth_date   = p_verified_birth_date
  WHERE id = v_user_id;

  -- [신규] player_profiles 행 생성 (미리 생성해두고 UI에서 채움)
  INSERT INTO player_profiles (id) VALUES (v_user_id)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
```

---

### 4-7. `lib/types/player.ts` (신규)

**역할**: 선수 프로필 관련 TypeScript 타입 정의  
**핵심 구조**:

```typescript
export type Position =
  | '포인트가드' | '슈팅가드' | '스몰포워드' | '파워포워드' | '센터';

export type CareerLevel = '입문' | '아마추어' | '세미프로' | '기타';

export type Gender = '남성' | '여성';

export type PlayerProfile = {
  id: string;
  gender: Gender | null;
  position: Position | null;
  sub_position: Position | null;
  height_cm: number | null;
  weight_kg: number | null;
  career_level: CareerLevel | null;
  region: string | null;
  jersey_number: number | null;
  created_at: string;
  updated_at: string;
};

export type PlayerProfileUpdateInput = {
  gender?: Gender;
  position?: Position;
  sub_position?: Position;
  height_cm?: number;
  weight_kg?: number;
  career_level?: CareerLevel;
  region?: string;
  jersey_number?: number;
};
```

---

### 4-8. `lib/types/terms.ts` (신규)

**역할**: 약관 동의 관련 TypeScript 타입 정의  
**핵심 구조**:

```typescript
export type TermsType = 'service' | 'privacy' | 'marketing';

export type UserTermsConsent = {
  id: string;
  user_id: string;
  terms_type: TermsType;
  terms_version: string;
  agreed: boolean;
  consented_at: string;
};

/** 최신 동의 상태 요약 (UI에서 사용) */
export type TermsConsentStatus = {
  service: boolean;   // 서비스 이용약관 동의 여부
  privacy: boolean;   // 개인정보처리방침 동의 여부
  marketing: boolean; // 마케팅 동의 여부
};

export type TermsConsentInput = {
  terms_type: TermsType;
  terms_version: string;
  agreed: boolean;
};
```

---

### 4-9. `lib/api/player-profile.ts` (신규)

**역할**: `player_profiles` 테이블 CRUD API  
**왜 필요한지**: 선수 프로필 조회/수정은 `profiles.ts`와 구분된 별도 레이어 필요  
**핵심 구조**:

```typescript
// 내 선수 프로필 조회
export async function getMyPlayerProfile(): Promise<ApiResult<PlayerProfile | null>>
  // SELECT FROM player_profiles WHERE id = auth.uid()

// 내 선수 프로필 수정
export async function updateMyPlayerProfile(
  input: PlayerProfileUpdateInput
): Promise<ActionResult>
  // UPDATE player_profiles SET {허용 필드만} WHERE id = auth.uid()
  // updated_at = now() 포함

// 특정 사용자 선수 프로필 조회 (organizer용)
export async function getPlayerProfileById(
  userId: string
): Promise<ApiResult<PlayerProfile | null>>
```

---

### 4-10. `lib/api/terms.ts` (신규)

**역할**: 약관 동의 저장/조회 API  
**핵심 구조**:

```typescript
// 현재 사용자의 최신 약관 동의 상태 조회
export async function getMyTermsConsentStatus(): Promise<ApiResult<TermsConsentStatus>>
  // SELECT terms_type, agreed FROM user_terms_consents WHERE user_id = auth.uid()
  // DISTINCT ON (terms_type) ORDER BY terms_type, consented_at DESC

// 약관 동의 기록 저장 (단건)
export async function recordTermsConsent(
  input: TermsConsentInput
): Promise<ActionResult>
  // INSERT INTO user_terms_consents (user_id, terms_type, terms_version, agreed)

// 복수 동의 일괄 저장 (가입 시)
export async function recordTermsConsentBatch(
  inputs: TermsConsentInput[]
): Promise<ActionResult>
  // 트랜잭션은 Supabase 미지원 → 순차 INSERT (실패 시 부분 저장 가능성 → 각 타입 독립)
```

---

### 4-11. `lib/api/profiles.ts` (수정)

**역할**: `ProfileUpdateInput`에서 `phone`/`birth_date` 제거, `verified_*` 타입 반영  
**변경 내용**:

```typescript
// 기존 ProfileUpdateInput
export type ProfileUpdateInput = {
  display_name?: string;
  // phone, birth_date 제거 (본인인증 확정값으로 이동)
};

// Profile 타입에 verified_* 필드 추가
export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  phone: string | null;           // DEPRECATED: verified_phone 사용
  birth_date: string | null;      // DEPRECATED: verified_birth_date 사용
  identity_verified_at: string | null;
  verified_name: string | null;
  verified_phone: string | null;
  verified_birth_date: string | null;
  created_at: string;
};

// isProfileCompleted() 기준 변경
// 기존: display_name + phone
// 변경: display_name만 필수 (phone은 본인인증 단계로 이동)
export function isProfileCompleted(profile: Profile | null): boolean {
  return !!profile?.display_name?.trim();
}

// updateMyProfile() 허용 필드 축소
// display_name만 허용 (phone, birth_date UPDATE 제거)
```

---

## 5. 고려 사항 / 트레이드오프

### 5-1. `profiles` 유지 vs `player_profiles` 분리

**결론: 분리 채택**

| 관점 | profiles 통합 | player_profiles 분리 |
|------|--------------|---------------------|
| 단순성 | 테이블 1개로 관리 | 조인 필요 |
| 역할 명확성 | 비-선수 role에 null 컬럼 누적 | 선수 전용 데이터 명확히 구분 |
| 확장성 | 컬럼 증가 시 `profiles` 비대화 | 독립적 스키마 확장 가능 |
| 향후 팀 로스터 | player_id 참조 시 `profiles` 직접 | `player_profiles.id` 참조 일관성 |

→ 이미 `identity_verifications`도 별도 테이블 분리 패턴이 있으므로 분리 채택.

---

### 5-2. 기존 `phone`/`birth_date` 재사용 vs `verified_*` 분리

**결론: `verified_*` 신규 컬럼 추가 (기존 컬럼 즉시 DROP 금지)**

- 기존 `phone`/`birth_date`: 현재 API, 타입, `isProfileCompleted()` 등에서 참조 중 → 즉시 DROP 시 다수 파일 수정 필요
- `verified_name`, `verified_phone`, `verified_birth_date` 추가로 의미 구분 명확히 함
- 기존 컬럼은 `COMMENT`로 deprecated 표시만 하고, UI 레이어에서 노출 제거

---

### 5-3. 프로필 완료 검증 위치: RPC vs Server Action

**결론: RPC에 최소 검증 포함 + Server Action에서 사전 검증**

| 관점 | RPC 단독 | Server Action 단독 | 혼합 |
|------|---------|-----------------|------|
| 보안 | 데이터 레이어에서 강제 | 우회 가능 (직접 RPC 호출 시) | 양쪽 보호 |
| 관심사 분리 | RPC 복잡도 증가 | 비즈니스 로직 집중 | 중복이지만 안전 |

→ RPC: `display_name` 필수 체크만 (최소한의 데이터 정합성 보호)  
→ Server Action: 전체 프로필 완료 여부 + 에러 메시지 처리

---

### 5-4. RLS와 API 레이어 책임 분리

| 책임 | RLS | API 레이어 |
|------|-----|----------|
| 행(Row) 수준 접근 제어 | ✅ RLS에서 처리 | 불필요 |
| 컬럼(Column) 수준 보호 | ❌ Supabase 미지원 | ✅ API에서 허용 컬럼만 명시 |
| 비즈니스 규칙 검증 | ❌ | ✅ Server Action에서 처리 |
| `verified_*` 컬럼 보호 | ❌ | ✅ `updateMyProfile()`에서 제외 |

→ `verified_*` 컬럼은 `updateMyProfile()` 허용 목록에서 반드시 제외. RPC에서만 기록.

---

### 5-5. 약관: 단순 boolean vs 버전형 이력

**결론: 버전형 이력 채택**

- 단순 boolean (`profiles.terms_agreed = true`): 재동의 불가, 법적 증거력 약함
- 버전형 `user_terms_consents` 테이블: 동의 시점/버전/타입 모두 기록, 마케팅 철회 처리 가능
- 버전 관리 부담이 있지만 법적 요건(개인정보처리방침 변경 고지 의무)을 감안하면 필수

---

## 6. 마이그레이션 적용 순서

```
0221_player_profiles.sql
  ↓
0222_player_profiles_rls.sql
  ↓
0223_user_terms_consents.sql
  ↓
0224_user_terms_consents_rls.sql
  ↓
0225_profiles_verified_identity.sql     ← profiles 테이블 컬럼 추가
  ↓
0226_promote_to_player_rpc_v2.sql       ← 0225 이후에야 SET verified_* 가능
```

**주의**: 0226은 0225 의존 관계가 있으므로 반드시 순서 준수.

---

## 7. 예외 케이스 정리

| 케이스 | 처리 방향 |
|--------|----------|
| `promote_to_player()` 호출 시 `display_name` 미입력 | RPC에서 EXCEPTION 발생, Server Action에서 사전 차단 |
| 이미 player role인 경우 재호출 | 멱등 처리 (기존 유지: 조용히 RETURN) |
| `player_profiles` 행이 이미 존재하는 경우 | `ON CONFLICT (id) DO NOTHING` |
| 약관 동의 기록 없는 사용자의 가입 이전 접근 | 2차 UI 단계에서 처리 (1차는 DB만) |
| `verified_*` 컬럼을 직접 UPDATE 시도 | API 레이어에서 허용 컬럼 제외로 차단 |
| `user_terms_consents` 이력이 없는 기존 사용자 | 최신 동의 상태 조회 시 null → 미동의로 처리 |

---

## 8. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_1차DB정리_Plan_v1.md
```
