# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 3차 선수등록 프로필 입력 개편 Plan v2

> 작성일: 2026-04-08  
> v1 대비 변경: 필수/선택 항목 재분류, bio(자기소개) 신규, 선수 등록 동의 3개 추가, 프로필 완료 기준 재정의  
> 전제: 1차 묶음(DB/RLS/RPC/타입/API) 완료, 2차 묶음(회원가입 약관 동의) 완료  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`  
> 참고: `docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_1차DB정리_Plan_v1.md`

---

## v1 → v2 변경 요약

| 항목 | v1 | v2 |
|------|----|----|
| 필수 항목 | display_name | gender, position, height_cm, career_level, region |
| 선택 항목 | 나머지 전부 | display_name, sub_position, weight_kg, jersey_number, bio |
| 자기소개(bio) | 없음 | player_profiles에 신규 추가 |
| 프로필 사진 | 없음 | **이번 범위 제외** (Storage 연동 별도 단계) |
| 선수 등록 동의 | 없음 | 3개 동의 폼에 추가 (필수) |
| 프로필 완료 기준 | display_name 입력 | 5개 필수 항목 모두 입력 |
| DB 마이그레이션 | 없음 | 2개 신규 (bio 컬럼, RPC v3) |
| TermsType | service/privacy/marketing | + player_registration/tournament_notification/basic_info_usage |

---

## 1. 기능 상세 설명

### 구현 항목

| # | 항목 | 방향 | 상태 |
|---|------|------|------|
| 1 | DB: `player_profiles`에 `bio` 컬럼 추가 | 자기소개 저장 필드 신규 | [완료] |
| 2 | DB: `promote_to_player()` RPC v3 | display_name 필수 체크 제거 → 필수 항목 체크는 액션으로 위임 | [완료] |
| 3 | `lib/types/player.ts` 수정 | PlayerProfile/PlayerProfileUpdateInput에 bio 추가 | [완료] |
| 4 | `lib/types/terms.ts` 수정 | TermsType에 선수 등록 동의 3종 추가 | [완료] |
| 5 | `lib/constants/terms.ts` 수정 | 선수 등록 동의 버전 상수 추가 | [완료] |
| 6 | `lib/api/player-profile.ts` 수정 | `isPlayerRegistrationCompleted()` 함수 추가 | [완료] |
| 7 | `onboarding/profile/Form.tsx` 전면 수정 | 필수/선택 재분류, bio 추가, 동의 체크박스 3개 추가 | [완료] |
| 8 | `onboarding/profile/actions.ts` 수정 | 필수 항목 서버 검증 + 동의 저장 추가 | [완료] |
| 9 | `onboarding/profile/page.tsx` 수정 | 완료 기준 함수 변경 (display_name → isPlayerRegistrationCompleted) | [완료] |

### 포함 범위

- 필수 항목(gender, position, height_cm, career_level, region) 미입력 시 진행 불가
- 표시명(display_name)은 선택으로 전환
- 자기소개(bio) 필드 신규 추가 (선택)
- 선수 등록 동의 3개 (필수 체크박스) — 저장까지 완성
- 저장 완료 후 `/onboarding/identity`로 이동 (기존 흐름 유지)
- `isPlayerRegistrationCompleted()` 신규 정의 — 4차 identity 가드에서도 사용

### 제외 범위

- 프로필 사진 — Supabase Storage 연동 필요, 별도 단계로 분리
- 사진/영상 활용 동의 — 대회 참가 신청 단계로 미룸 (**검토 결론**)
- 회원가입 약관 동의 (2차 완료)
- 본인인증 UI / 외부 provider 연동 (4차)
- player role 전환 로직 변경
- 선수 프로필 수정 페이지 확장 (별도 단계)
- 실명 / 생년월일 / 휴대폰번호 수집 (본인인증 단계에서 처리)
- 사이드바 / 대시보드 노출 정책

### 프로필 완료 기준 (v1 → v2 변경)

**기준: 5개 필수 항목(gender, position, height_cm, career_level, region) 모두 입력**

- `isPlayerRegistrationCompleted(playerProfile)` 신규 함수 → `lib/api/player-profile.ts`에 추가
- 기존 `isProfileCompleted(profile)` (display_name 기준)은 유지 — 다른 컨텍스트에서 참조 가능
- `promote_to_player()` RPC의 display_name 필수 체크 → 제거 (RPC v3 마이그레이션)
- 필수 항목 검증은 Server Action에서 수행, RPC는 role 적격성만 체크

### 저장 순서 (form submit 시)

```
1. 클라이언트: 필수 5개 + 동의 3개 검증
2. Server Action: 필수 5개 서버 검증
3. updateMyProfile({ display_name }) — display_name 입력된 경우만
4. upsertMyPlayerProfile({ gender, position, height_cm, career_level, region, ...선택값, bio })
5. recordTermsConsentBatch([player_registration, tournament_notification, basic_info_usage])
6. 전부 성공: revalidatePath + { ok: true }
7. 클라이언트: Toast → 1.5초 후 /onboarding/identity
```

> 3번 display_name은 입력값이 있을 때만 저장 (trim 후 빈 문자열이면 updateMyProfile 스킵)

### 예외 케이스 및 실패 처리

| 케이스 | 처리 |
|--------|------|
| 필수 항목(5개 중 하나) 미입력 | 클라이언트 required + 서버 검증 차단, 항목별 에러 메시지 |
| 필수 동의 미체크 | 클라이언트: 버튼 disabled / 서버: `ok: false` |
| player_profiles upsert 실패 | 에러 반환, 이동 없음, 재시도 가능 |
| 동의 저장 실패 | 에러 반환, 이동 없음 (프로필 저장이 선행됐어도 재시도 허용 — 동의는 INSERT 멱등) |
| 비로그인 접근 | `/login` 리다이렉트 (page.tsx 가드 유지) |
| 이미 선수 등록 완료 상태(재진입) | 기존값 초기값으로 표시, 동의는 재저장 허용 |

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 | 이유 |
|------|------|------|
| 텍스트에어리어(bio) | `<textarea>` 직접 사용 | 자기소개 한 필드용으로 라이브러리 불필요 |
| Select UI | `<select>` + Tailwind 유지 | v1과 동일 |
| 동의 체크박스 | `<input type="checkbox">` + Tailwind | 2차(약관 동의)와 동일 패턴 재사용 |
| 프로필 사진 | 이번 제외 | Storage 연동 시 별도 결정 |

---

## 3. 변경 파일 목록

### 신규 파일 (마이그레이션)

| 파일 | 이유 |
|------|------|
| `supabase/migrations/0228_player_profiles_bio.sql` | player_profiles에 bio(text) 컬럼 추가 |
| `supabase/migrations/0229_promote_to_player_rpc_v3.sql` | display_name 필수 체크 제거 — 필수 검증 책임을 Server Action으로 이동 |

### 수정 파일

| 파일 | 이유 |
|------|------|
| `lib/types/player.ts` | `PlayerProfile.bio`, `PlayerProfileUpdateInput.bio` 필드 추가 |
| `lib/types/terms.ts` | `TermsType`에 `player_registration` / `tournament_notification` / `basic_info_usage` 추가, `TermsConsentStatus`에 3개 필드 추가 |
| `lib/constants/terms.ts` | 선수 등록 동의 3종 버전 상수 추가 |
| `lib/api/player-profile.ts` | `isPlayerRegistrationCompleted()` 추가 |
| `app/(app)/onboarding/profile/Form.tsx` | 필수/선택 재분류, bio 필드, 동의 체크박스 3개 추가 |
| `app/(app)/onboarding/profile/actions.ts` | 필수 항목 서버 검증 + 동의 저장 추가 |
| `app/(app)/onboarding/profile/page.tsx` | `isPlayerRegistrationCompleted()` 기반 완료 여부 판단 |

### 변경 불필요 (유지)

| 파일 | 이유 |
|------|------|
| `lib/api/terms.ts` | `recordTermsConsentBatch()` 그대로 재사용 |
| `lib/api/profiles.ts` | `isProfileCompleted()`, `updateMyProfile()` 변경 없음 |
| `lib/api/player-profile.ts` | 기존 `upsertMyPlayerProfile()`, `getMyPlayerProfile()` 유지 |
| `src/lib/auth/roles.ts` / `guards.ts` | 변경 없음 |

---

## 4. 파일별 구현 구조

### 4.1 `supabase/migrations/0228_player_profiles_bio.sql`

**역할**: player_profiles에 자기소개 컬럼 추가  
**핵심 구조**:

```sql
ALTER TABLE public.player_profiles
  ADD COLUMN bio text DEFAULT NULL;

COMMENT ON COLUMN public.player_profiles.bio IS '자기소개 (선택)';
```

---

### 4.2 `supabase/migrations/0229_promote_to_player_rpc_v3.sql`

**역할**: display_name 필수 체크 제거  
**왜 필요한지**: display_name이 선택 항목으로 바뀌었으므로 RPC의 display_name 체크가 불필요한 차단 요인이 됨. 필수 항목 검증은 Server Action에서 담당  
**핵심 구조**:

```sql
-- v2에서 display_name 체크 블록만 제거한 버전
-- 나머지 로직(인증 확인, 멱등 처리, user 체크, 인증이력 저장, role 승격, player_profiles 생성) 유지
DROP FUNCTION IF EXISTS public.promote_to_player(text, text, jsonb, text, text, date);
CREATE OR REPLACE FUNCTION public.promote_to_player(...) ...
```

> `CREATE OR REPLACE`가 시그니처 불일치 시 함수를 추가하는 문제(0227에서 경험)를 막기 위해  
> 명시적 `DROP ... IF EXISTS` 후 `CREATE OR REPLACE` 패턴 적용

---

### 4.3 `lib/types/player.ts` — bio 필드 추가

**핵심 구조**:

```typescript
export type PlayerProfile = {
  // 기존 필드 유지 ...
  bio: string | null;  // 신규
};

export type PlayerProfileUpdateInput = {
  // 기존 필드 유지 ...
  bio?: string;  // 신규
};
```

---

### 4.4 `lib/types/terms.ts` — TermsType 확장

**핵심 구조**:

```typescript
export type TermsType =
  | "service"
  | "privacy"
  | "marketing"
  | "player_registration"       // 선수 등록 정보 입력 및 활용 동의 (신규)
  | "tournament_notification"   // 대회 운영 관련 안내 수신 동의 (신규)
  | "basic_info_usage";         // 대회 참가를 위한 기본 정보 활용 동의 (신규)

export type TermsConsentStatus = {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
  player_registration: boolean;      // 신규
  tournament_notification: boolean;  // 신규
  basic_info_usage: boolean;         // 신규
};
```

---

### 4.5 `lib/constants/terms.ts` — 선수 등록 동의 버전 추가

**핵심 구조**:

```typescript
export const TERMS_VERSIONS = {
  service:                 '2026-04',
  privacy:                 '2026-04',
  marketing:               '2026-04',
  player_registration:     '2026-04',      // 신규
  tournament_notification: '2026-04',      // 신규
  basic_info_usage:        '2026-04',      // 신규
} as const satisfies Record<TermsType, string>;
```

---

### 4.6 `lib/api/player-profile.ts` — isPlayerRegistrationCompleted 추가

**역할**: 선수 등록 완료 여부 판단 — 5개 필수 항목 모두 입력 여부  
**왜 필요한지**: 프로필 완료 기준이 display_name → 5개 필수 항목으로 바뀜. identity 페이지 진입 가드(4차)와 page.tsx에서 사용  
**핵심 구조**:

```typescript
export function isPlayerRegistrationCompleted(
  playerProfile: PlayerProfile | null
): boolean {
  if (!playerProfile) return false;
  return (
    !!playerProfile.gender &&
    !!playerProfile.position &&
    playerProfile.height_cm != null &&
    !!playerProfile.career_level &&
    !!playerProfile.region?.trim()
  );
}
```

---

### 4.7 `app/(app)/onboarding/profile/actions.ts` — 검증 + 동의 저장 추가

**역할**: 필수 항목 검증 + profiles + player_profiles + 동의 3종 순차 저장  
**핵심 구조**:

```typescript
type OnboardingProfileInput = {
  display_name?: string;   // 선택으로 변경
  player_registration_consent: boolean;
  tournament_notification_consent: boolean;
  basic_info_usage_consent: boolean;
} & PlayerProfileUpdateInput;

async function saveOnboardingProfile(input): Promise<ActionResult>
  1. getUserWithRole() → 미인증 차단
  2. 필수 항목 검증 (서버):
     - gender, position, height_cm, career_level, region 각각 null/빈값 체크
  3. 동의 검증: 3개 모두 true인지 체크
  4. display_name 있으면 updateMyProfile({ display_name }) → 실패 시 에러
  5. upsertMyPlayerProfile(playerFields) → 실패 시 에러
  6. recordTermsConsentBatch([
       { terms_type: 'player_registration', agreed: true, version: TERMS_VERSIONS.player_registration },
       { terms_type: 'tournament_notification', agreed: true, version: TERMS_VERSIONS.tournament_notification },
       { terms_type: 'basic_info_usage', agreed: true, version: TERMS_VERSIONS.basic_info_usage },
     ]) → 실패 시 에러
  7. revalidatePath("/onboarding/profile")
  8. return { ok: true }
```

---

### 4.8 `app/(app)/onboarding/profile/Form.tsx` — 필수/선택 재분류 + 동의 추가

**핵심 구조**:

```typescript
type Props = {
  initialProfile: Profile | null;
  initialPlayerProfile: PlayerProfile | null;
};

// 상태 — 필수 항목
const [gender, setGender] = useState<Gender | "">(...필수...)
const [position, setPosition] = useState<Position | "">(...필수...)
const [heightCm, setHeightCm] = useState<string>(...필수...)
const [careerLevel, setCareerLevel] = useState<CareerLevel | "">(...필수...)
const [region, setRegion] = useState<string>(...필수...)

// 상태 — 선택 항목
const [displayName, setDisplayName] = useState(...)   // 선택으로 전환
const [subPosition, setSubPosition] = useState(...)
const [weightKg, setWeightKg] = useState<string>(...)
const [jerseyNumber, setJerseyNumber] = useState<string>(...)
const [bio, setBio] = useState<string>(...)           // 신규

// 상태 — 동의
const [consentPlayerReg, setConsentPlayerReg] = useState(false)
const [consentTournamentNotif, setConsentTournamentNotif] = useState(false)
const [consentBasicInfo, setConsentBasicInfo] = useState(false)
const allConsentsChecked = consentPlayerReg && consentTournamentNotif && consentBasicInfo

// handleSubmit
  → 필수 5개 클라이언트 검증
  → 동의 3개 미체크 시 에러
  → saveOnboardingProfile({ ... })
  → 성공: Toast → 1.5초 후 /onboarding/identity
```

**필드 분류**:

| 필드 | 타입 | 필수 여부 | v1 대비 |
|------|------|-----------|---------|
| gender | select | **필수** | 선택 → 필수 |
| position | select | **필수** | 선택 → 필수 |
| height_cm | number | **필수** | 선택 → 필수 |
| career_level | select | **필수** | 선택 → 필수 |
| region | text | **필수** | 선택 → 필수 |
| display_name | text | 선택 | **필수 → 선택** |
| sub_position | select | 선택 | 동일 |
| weight_kg | number | 선택 | 동일 |
| jersey_number | number | 선택 | 동일 |
| bio | textarea | 선택 | **신규** |
| player_registration_consent | checkbox | **필수** | **신규** |
| tournament_notification_consent | checkbox | **필수** | **신규** |
| basic_info_usage_consent | checkbox | **필수** | **신규** |

---

### 4.9 `app/(app)/onboarding/profile/page.tsx` — 완료 기준 변경

**핵심 구조**:

```typescript
// 기존 profileResult 외에 playerProfileResult 유지 (병렬 로드)
// (v1에서 이미 병렬 로드 구현됨)

// 추가: 이미 등록 완료 상태라면 경고 없이 진입 허용 (재수정 가능)
// page.tsx에서 isPlayerRegistrationCompleted() 호출은 필요 없음
// — identity 진입 가드(4차 plan)에서 이 함수를 사용
// — 이 페이지에서는 role이 player인 경우에도 재진입 허용
```

> page.tsx 자체는 v1 구현 거의 그대로. `isPlayerRegistrationCompleted()`를 직접 사용하지 않음.  
> 4차 `identity/page.tsx`에서 이 함수를 import해 가드로 사용하는 것이 주 목적.

---

## 5. 고려 사항 / 트레이드오프

### 프로필 완료 기준: isProfileCompleted vs isPlayerRegistrationCompleted

| 함수 | 위치 | 판단 기준 | 사용처 |
|------|------|-----------|--------|
| `isProfileCompleted(profile)` | lib/api/profiles.ts | display_name 입력 여부 | 유지 (다른 컨텍스트 참조 가능) |
| `isPlayerRegistrationCompleted(playerProfile)` | lib/api/player-profile.ts | 5개 필수 항목 모두 입력 | identity 진입 가드(4차), 온보딩 완료 판단 |

두 함수를 분리하는 이유: 참조하는 테이블이 다름(`profiles` vs `player_profiles`). 하나로 합치면 항상 두 테이블을 같이 로드해야 하는 의존성 발생.

---

### RPC display_name 체크 제거 여부

**결론: 제거 (RPC v3)**

display_name이 선택 항목으로 바뀌었으므로 RPC가 이를 필수로 체크하면 display_name 없이 5개 필수 항목만 입력한 사용자가 본인인증을 통과하지 못함. 필수 항목 검증은 Server Action에서 책임지고, RPC는 role 적격성(user 여부, 멱등)만 체크하는 역할로 분리.

---

### 선수 등록 동의와 회원가입 약관 동의의 관계

| 항목 | 회원가입(2차) | 선수 등록(3차) |
|------|--------------|---------------|
| service, privacy, marketing | 회원가입 시 1회 | 변경 없음 |
| player_registration, tournament_notification, basic_info_usage | — | 선수 등록 폼 제출 시 저장 |
| 저장 방식 | `recordTermsConsentBatch()` | 동일 함수 재사용 |
| 재동의 | 재가입 시 | 폼 재제출 시 재저장 (이력 누적, 최신이 유효) |

user_terms_consents는 `text` 타입으로 terms_type을 저장하므로, DB 마이그레이션 없이 TermsType 상수만 추가하면 됨.

---

### 프로필 사진 처리 결정

**결론: 이번 범위에서 제외**

Supabase Storage 버킷 생성, 업로드 정책, URL 저장, 이미지 최적화 등 별도 고려사항이 많음. 선수 등록 핵심 흐름 검증 후 별도 단계에서 진행.

---

### 사진/영상 활용 동의 타이밍

**결론: 대회 참가 신청 단계로 미룸**

"선수 등록 단계"는 선수 신원 확인과 기본 프로필 등록이 목적. 사진/영상 활용은 대회 참가 시 구체적 동의를 받는 것이 법적으로도 더 적절(목적 명시 가능).

---

### 입력 검증 레이어 구분

| 검증 항목 | 클라이언트 | 서버(Action) |
|-----------|-----------|-------------|
| 필수 5개 항목 빈값 | required 속성 + trim | 각 항목 명시적 체크 |
| number 범위(신장 100~250cm 등) | input min/max | 불필요 (DB 타입으로 제한) |
| 동의 3개 미체크 | 버튼 disabled | true 여부 체크 |
| bio 최대 길이 | maxLength 속성 | 불필요 (DB text 무제한) |

---

### 4차 계획(identity)과의 연결

4차 `identity/page.tsx` 가드는 현재 `isProfileCompleted()`를 사용할 예정(4차 v1 계획). v2 구현 후에는 **`isPlayerRegistrationCompleted(playerProfile)`로 교체** 필요. 4차 계획 실행 시 반영할 것.

---

## 6. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_3차선수등록프로필입력개편_Plan_v2.md
```
