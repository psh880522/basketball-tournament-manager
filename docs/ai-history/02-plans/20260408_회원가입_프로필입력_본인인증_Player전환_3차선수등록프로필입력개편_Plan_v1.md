# 회원가입/프로필입력/본인인증 → Player 전환 흐름 — 3차 선수등록 프로필 입력 개편 Plan

> 작성일: 2026-04-08  
> 범위: 온보딩 프로필 입력 화면 항목 개편 + 선수 정보 저장 연결  
> 전제: 1차 묶음(DB/RLS/RPC/타입/API) 완료, 2차 묶음(회원가입 약관 동의) 완료  
> 참고: `docs/ai-history/01-research/20260408_회원가입_프로필_본인인증_Research.md`  
> 참고: `docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_1차DB정리_Plan_v1.md`

---

## 1. 기능 상세 설명

### 구현 항목

| # | 항목 | 방향 | 상태 |
|---|------|------|------|
| 1 | `onboarding/profile/Form.tsx` 선수 정보 필드 추가 | display_name + 선수 정보(성별/포지션/경력 등) 입력 | [완료] |
| 2 | `onboarding/profile/actions.ts` 저장 분기 확장 | profiles + player_profiles 두 테이블에 각각 저장 | [완료] |
| 3 | `lib/api/player-profile.ts` upsert 함수 추가 | 온보딩 시 행 없는 상태에서도 저장 가능하도록 | [완료] |
| 4 | `onboarding/profile/page.tsx` 초기값 확장 | player_profiles 초기값도 함께 로드 | [완료] |

### 포함 범위

- 온보딩 프로필 입력 폼에 선수 정보 필드 추가 (gender, position, sub_position, height_cm, weight_kg, career_level, region, jersey_number)
- 저장 시 `profiles`(display_name)와 `player_profiles`(선수 정보)를 각각 저장
- 저장 완료 후 `/onboarding/identity`로 이동 (기존 흐름 유지)
- 페이지 진입 시 기존 입력값(profiles + player_profiles) 초기값으로 표시

//TODO: 처음 내가 요구했던 요구사항에서 누락된 내용이 있어 아래내용 참고해서 확인해봐
  - 프로필 입력(선수등록) 단계
    - 본인인증 전 선수 프로필 정보 입력
    - 필수 정보:
      - 성별
      - 주 포지션
      - 신장
      - 경력 수준
      - 활동 지역
    - 선택 정보:
      - 표시명(닉네임)
      - 프로필 사진
      - 자기소개
      - 서브 포지션
      - 체중
      - 등번호
    - 필수 동의:
      - 선수 등록 정보 입력 및 활용 동의
      - 대회 운영 관련 안내 수신 동의
      - 대회 참가를 위한 기본 정보 활용 동의
    - 검토 항목:
      - 사진/영상 활용 동의를 이 단계에서 받을지, 대회 참가 신청 단계로 미룰지

### 제외 범위

- 회원가입 약관 동의 (2차 완료)
- 본인인증 UI / 외부 provider 연동 (4차)
- player role 전환 로직 변경
- 선수 프로필 수정 페이지 확장 (별도 단계)
- 실명 / 생년월일 / 휴대폰번호 수집 (본인인증 단계에서 처리)
- 사이드바 / 대시보드 노출 정책

### 프로필 완료 기준

**기준: `display_name`이 입력된 경우 완료**

- `isProfileCompleted()` 로직 변경 없음 (1차에서 이미 display_name 기준으로 확정됨)
- `promote_to_player()` RPC v2도 display_name 체크만 하므로 일관성 유지
- 선수 정보(position, career_level 등)는 이 단계에서 미입력해도 진행 가능 (선택 항목)

### 저장 후 다음 단계 이동

```
form submit
  → profiles.display_name 저장 (updateMyProfile)
  → player_profiles 선수 정보 upsert (upsertMyPlayerProfile)
  → 둘 다 성공: Toast("저장되었습니다.") → 1.5초 후 /onboarding/identity
  → 어느 하나 실패: 에러 표시, 이동 없음
```

### 예외 케이스 및 실패 처리

| 케이스 | 처리 |
|--------|------|
| display_name 미입력 | 클라이언트 + 서버 양쪽에서 차단, 에러 메시지 표시 |
| player_profiles upsert 실패 (profiles는 성공) | 에러 반환, 이동하지 않음 (재시도 가능 상태 유지) |
| 비로그인 접근 | `/login` 리다이렉트 (기존 page.tsx 가드 유지) |
| player role 사용자가 접근 | 특별 처리 없음 (player도 표시명/선수정보 재입력 가능) |
| player_profiles 행이 없는 상태에서 저장 | upsert(INSERT ON CONFLICT DO UPDATE)로 처리 |

---

## 2. 라이브러리 검토

**결론: 추가 라이브러리 불필요**

| 항목 | 판단 | 이유 |
|------|------|------|
| Select UI | 기존 방식으로 충분 | `<select>` + Tailwind 조합. 별도 컴포넌트 라이브러리 불필요 |
| 폼 상태 관리 | `useState` 유지 | 필드 수 증가해도 단순 상태로 관리 가능한 수준 |
| 유효성 검증 | 기존 패턴 유지 | 클라이언트는 required / 서버는 trim 체크 |
| DB upsert | Supabase `.upsert()` 기본 기능 | 추가 라이브러리 불필요 |

---

## 3. 변경 파일 목록

### 수정 파일

| 파일 | 이유 |
|------|------|
| `app/(app)/onboarding/profile/page.tsx` | player_profiles 초기값도 로드해서 Form에 전달해야 함 |
| `app/(app)/onboarding/profile/Form.tsx` | 선수 정보 필드(gender/position 등) 추가, props 타입 확장 |
| `app/(app)/onboarding/profile/actions.ts` | player_profiles 저장 로직 추가 (upsertMyPlayerProfile 호출) |
| `lib/api/player-profile.ts` | `upsertMyPlayerProfile()` 함수 추가 (온보딩용 INSERT ON CONFLICT) |

### 신규 파일

**없음** — 1차 묶음에서 타입/API 레이어 모두 구성됨. DB 마이그레이션도 불필요.

> **DB 마이그레이션 불필요 근거**:  
> `player_profiles` 테이블과 RLS는 이미 생성됨(0221, 0222).  
> RLS INSERT 정책(`id = auth.uid()`)은 role 제약이 없어 `user` role도 자신의 행을 INSERT 가능.  
> `promote_to_player()` RPC의 `ON CONFLICT DO NOTHING`은 기존 행이 있으면 그대로 유지함.

---

## 4. 파일별 구현 구조

### 4.1 `lib/api/player-profile.ts` — upsertMyPlayerProfile 추가

**역할**: 온보딩 단계에서 player_profiles 행이 없는 상태에서도 저장 가능한 upsert 함수  
**왜 필요한지**: 기존 `updateMyPlayerProfile()`은 UPDATE만 하므로 행이 없으면 silent fail 발생. 온보딩 최초 저장 시에는 INSERT가 필요함  
**핵심 구조**:

```
upsertMyPlayerProfile(input: PlayerProfileUpdateInput): Promise<ActionResult>
  1. supabase.auth.getUser() → 미인증이면 에러 반환
  2. ALLOWED_UPDATE_COLUMNS 기준으로 업데이트 객체 구성
  3. supabase
       .from("player_profiles")
       .upsert({ id: user.id, ...updateData, updated_at: now() }, { onConflict: "id" })
  4. 성공: { ok: true }
  5. 실패: { ok: false, error: error.message }
```

> `updateMyPlayerProfile()`은 유지 (선수 프로필 수정 페이지에서 사용).  
> 이 함수는 온보딩 전용이며, 나중에 수정 페이지에서도 재사용 가능하면 대체 가능.

---

### 4.2 `app/(app)/onboarding/profile/actions.ts` — 저장 분기 확장

**역할**: profiles + player_profiles 두 곳에 저장하는 Server Action  
**왜 필요한지**: 현재는 display_name만 저장. 선수 정보도 함께 처리해야 함  
**핵심 구조**:

```typescript
// 새 input 타입 정의 (이 파일 내부)
type OnboardingProfileInput = {
  display_name: string;
} & PlayerProfileUpdateInput;

async function saveOnboardingProfile(input: OnboardingProfileInput): Promise<ActionResult>
  1. getUserWithRole() → 미인증이면 에러
  2. display_name 검증: 빈 문자열이면 에러 반환
  3. updateMyProfile({ display_name }) → 실패 시 에러 반환
  4. upsertMyPlayerProfile(playerFields) → 실패 시 에러 반환
  5. revalidatePath("/onboarding/profile")
  6. return { ok: true }
```

> 두 저장은 순차 실행. profiles 저장 실패 시 player_profiles 저장하지 않음.  
> player_profiles 저장 실패 시에도 에러 반환 (이동 차단, 재시도 가능).

---

### 4.3 `app/(app)/onboarding/profile/page.tsx` — 초기값 확장

**역할**: profiles + player_profiles 초기값을 함께 로드해 Form에 전달  
**왜 필요한지**: 재진입 시 기존 입력값 복원 필요. 현재는 profiles만 로드  
**핵심 구조**:

```typescript
export default async function OnboardingProfilePage()
  1. getUserWithRole() → 인증 가드 (기존 유지)
  2. getMyProfile() → profiles 초기값
  3. getMyPlayerProfile() → player_profiles 초기값 (병렬 가능)
  4. <ProfileForm
       initialProfile={profileResult.data}
       initialPlayerProfile={playerProfileResult.data}
     />
```

> `getMyProfile()`과 `getMyPlayerProfile()`은 `Promise.all`로 병렬 호출  
> 헤더 텍스트: "이름과 연락처를 입력하세요." → "닉네임과 선수 정보를 입력하세요."로 수정

---

### 4.4 `app/(app)/onboarding/profile/Form.tsx` — 선수 정보 필드 추가

**역할**: display_name + 선수 정보(gender, position 등)를 입력받는 온보딩 폼  
**왜 필요한지**: 현재는 display_name만 있음. 선수등록 단계답게 필드를 확장해야 함  
**핵심 구조**:

```typescript
type Props = {
  initialProfile: Profile | null;
  initialPlayerProfile: PlayerProfile | null;
};

// 상태
const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "")
const [gender, setGender] = useState<Gender | "">(initialPlayerProfile?.gender ?? "")
const [position, setPosition] = useState<Position | "">(initialPlayerProfile?.position ?? "")
const [subPosition, setSubPosition] = useState<Position | "">(...)
const [heightCm, setHeightCm] = useState<string>(...)   // string으로 관리, 제출 시 number 변환
const [weightKg, setWeightKg] = useState<string>(...)
const [careerLevel, setCareerLevel] = useState<CareerLevel | "">(...)
const [region, setRegion] = useState<string>(...)
const [jerseyNumber, setJerseyNumber] = useState<string>(...)

// handleSubmit
  → display_name trim 검증
  → saveOnboardingProfile({
      display_name,
      gender: gender || undefined,
      position: position || undefined,
      ...  // 미입력 필드는 undefined (upsert 시 누락)
      height_cm: heightCm ? Number(heightCm) : undefined,
      ...
    })
  → 성공: Toast → 1.5초 후 router.push("/onboarding/identity")
  → 실패: setError(result.error)
```

**필드 분류**:

| 필드 | 타입 | 필수 여부 | UI |
|------|------|-----------|-----|
| display_name | text | 필수 | Input (기존) |
| gender | select | 선택 | `<select>`: 남성, 여성 |
| position | select | 선택 | `<select>`: 포지션 5종 |
| sub_position | select | 선택 | `<select>`: 포지션 5종 |
| career_level | select | 선택 | `<select>`: 입문/아마추어/세미프로/기타 |
| height_cm | number | 선택 | Input type="number" |
| weight_kg | number | 선택 | Input type="number" |
| region | text | 선택 | Input type="text" |
| jersey_number | number | 선택 | Input type="number" |

> select 요소는 별도 UI 컴포넌트 없이 `<select>` + Tailwind 스타일 직접 사용  
> 미선택 상태를 표현하기 위해 빈 문자열 option("선택 안 함")을 첫 번째로 배치

---

## 5. 고려 사항 / 트레이드오프

### 선수 정보를 profiles에 둘지 player_profiles에 둘지

**결론: player_profiles 분리 유지**

| 기준 | profiles | player_profiles |
|------|----------|-----------------|
| 저장 책임 | 계정 기본 정보 (표시명, role, 인증 확정값) | 선수 역할 전용 정보 |
| 1차 설계 | 이미 이 방향으로 확정 | 이미 테이블 생성됨 |
| 조회 패턴 | 항상 필요한 정보 | player 관련 기능에서만 필요 |
| 확장성 | 모든 role에 적용됨 | player role에만 의미 있음 |

profiles에 성별/포지션을 넣으면 organizer, manager에게도 해당 컬럼이 존재하는 구조적 오염이 생김. 1차 묶음의 설계 결정을 그대로 따름.

---

### 프로필 완료 조건을 어디서 판단할지

**결론: `isProfileCompleted()` (lib/api/profiles.ts)에서 판단, 기준은 display_name만**

- `promote_to_player()` RPC v2도 display_name만 체크하므로 일관성 유지
- 선수 정보(position, career_level 등)를 완료 조건에 포함하면 기존 RPC와 불일치 발생
- 선수 정보는 선택 항목으로 취급하고, 언제든 재입력 가능하게 설계

---

### 입력 검증을 클라이언트/서버 어디까지 나눌지

| 검증 | 위치 | 이유 |
|------|------|------|
| display_name 빈 값 | 클라이언트 + 서버 | 필수 항목이므로 이중 검증 |
| number 필드 범위 (신장 100~250 등) | 클라이언트 min/max 속성 | UX 개선, 서버에선 별도 체크 불필요 |
| select 값 유효성 (Position, CareerLevel 등) | 서버에서 타입으로 자동 검증 | TypeScript 타입과 DB ENUM 일치 |
| 미입력 선택 항목 | 클라이언트에서 undefined 처리, 서버는 통과 | 선택 항목은 차단 없음 |

---

### 선택형 항목과 필수 항목 구분

- **필수**: display_name (프로필 완료 기준이자 RPC 진입 조건)
- **선택**: 나머지 전부 (gender, position, sub_position, height_cm, weight_kg, career_level, region, jersey_number)
- 선택 항목 미입력 시 player_profiles upsert에서 해당 필드를 undefined로 넘겨 DB NULL 유지

---

### 현재 온보딩 흐름과 충돌 여부

**충돌 없음**. 현재 흐름:
```
/onboarding/profile → 저장 → /onboarding/identity
```
이 흐름은 그대로 유지. Form 내부 필드 구성만 확장.

`isUserRole()` 체크로 현재 user role만 온보딩 진입 허용하는 구조가 page.tsx에 없음(role 제한 없음). player가 재진입해도 표시명/선수정보 재입력 가능한 상태 — 이번 단계에서 처리 범위 아님.

---

### 이후 본인인증 단계와 연결

- 이 단계 완료 후 → `/onboarding/identity` 이동
- identity 단계에서 `promote_to_player()` 호출 시:
  - RPC v2가 display_name 체크함 → 프로필 저장이 선행되어야 함
  - `player_profiles`에는 이미 선수 정보가 upsert된 상태이므로 RPC의 `ON CONFLICT DO NOTHING`이 기존 데이터 보존
- 연결 방식: 암묵적 의존 (프로필 미완료 시 identity에서 RPC가 예외 발생)
  - 필요 시 identity 페이지 진입 가드에서 `isProfileCompleted()` 체크 추가 가능 (4차 단계에서 결정)

---

## 6. 최종 문서 경로

```
docs/ai-history/02-plans/20260408_회원가입_프로필입력_본인인증_Player전환_3차선수등록프로필입력개편_Plan_v1.md
```
