# 구현 계획 - 토너먼트 슬롯 포함 제거 (v2)

## 0. 메모 반영 요약 [완료]

- 메모: “시드 확정 플래그가 꼭 필요한가? `standings_dirty`만으로 불가능한지 고려”
- 결론: **별도 확정 플래그 없이 진행 가능**하다고 판단한다.
  - 이유: 기존 흐름에서 시딩 허용 조건은 “순위가 최신 상태(standings_dirty = false)이고, 확정 버튼을 눌렀는지”였다.
  - 별도 플래그를 제거하면 “순위가 최신 상태이고, 유효한 standings가 존재하면 시딩 가능”으로 단순화된다.
  - UI의 “확정됨” 상태는 **파생 상태(standings_dirty = false && standings 존재)** 로 표시할 수 있다.

따라서 v2 계획은 **새 컬럼을 추가하지 않고, `include_tournament_slots`를 제거**하는 방향으로 정리한다.

## 1. 구현해야 할 기능 상세 설명 [완료]

목표는 “토너먼트 슬롯 포함” 체크 기능을 완전히 제거하는 것이다. 현재 `include_tournament_slots`는 다음 두 의미를 동시에 갖고 있다.

1) 디비전 설정에서 “토너먼트 슬롯 자동 생성” 플래그
2) 리그 순위 확정 여부(시딩 가능 여부) 플래그

요구사항은 1)을 제거하는 것이며, 이를 위해 **`include_tournament_slots` 자체를 삭제**한다. 2)는 별도 컬럼 없이 **`standings_dirty` 및 standings 데이터 존재 여부로 파생 처리**한다.

- 확정 상태(파생): `standings_dirty === false` && `standings`가 존재
- 시딩 허용 조건: 위 파생 상태가 true
- “확정” 버튼: 유지하되, 동작은 standings 계산/검증 후 메시지 표시 (DB 플래그 저장 없음)

## 2. 추가 설치가 필요한 라이브러리 [완료]

추가 설치 필요 없음.

- 기존: Next.js, Supabase, Tailwind, TypeScript
- 신규 라이브러리 요구 없음

## 3. 변경될 파일 경로 및 추가될 파일 목록 [완료]

### 3.1 변경될 파일 [완료]
- [app/admin/tournaments/[id]/edit/Form.tsx](app/admin/tournaments/[id]/edit/Form.tsx)
  - 디비전 생성/수정 UI에서 “토너먼트 슬롯 포함” 체크박스 제거
  - 리스트 표시에서 “토너먼트 슬롯 포함/미포함” 표시 제거

- [app/admin/tournaments/[id]/edit/actions.ts](app/admin/tournaments/[id]/edit/actions.ts)
  - create/update Division 액션에서 `include_tournament_slots` 전달 제거

- [lib/api/divisions.ts](lib/api/divisions.ts)
  - `DivisionRow` 타입에서 `include_tournament_slots` 제거
  - create/update에서 해당 필드 처리 제거
  - select 컬럼에서 해당 필드 제거

- [app/admin/tournaments/[id]/result/page.tsx](app/admin/tournaments/[id]/result/page.tsx)
  - `isConfirmed` 전달값을 파생 로직으로 변경

- [lib/api/results.ts](lib/api/results.ts)
  - `confirmLeagueStandings`에서 `include_tournament_slots` 업데이트 제거
  - `seedTournamentTeamsFromConfirmedStandings`에서 확정 여부 체크를 파생 조건으로 변경

- [app/admin/tournaments/[id]/result/actions.ts](app/admin/tournaments/[id]/result/actions.ts)
  - confirm/seed 로직은 유지하되 내부 검증 기준 변경 반영

- [app/api/admin/tournaments/route.ts](app/api/admin/tournaments/route.ts)
  - 디비전 생성 시 include_tournament_slots 기본값 전달 제거

- [supabase/migrations](supabase/migrations)
  - `include_tournament_slots` 컬럼 제거 마이그레이션 추가

### 3.2 추가될 파일 [완료]
- 새 마이그레이션 파일
  - 예: `supabase/migrations/0200_remove_include_tournament_slots.sql`

## 4. 각 파일별 구현 스니펫 (Pseudocode) [완료]

### 4.1 [supabase/migrations/0200_remove_include_tournament_slots.sql](supabase/migrations/0200_remove_include_tournament_slots.sql)

```sql
ALTER TABLE divisions
  DROP COLUMN IF EXISTS include_tournament_slots;
```

### 4.2 [lib/api/divisions.ts](lib/api/divisions.ts)

```ts
export type DivisionRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number | null;
  tournament_size: number | null;
  sort_order: number;
  standings_dirty: boolean;
};

// select 컬럼에서 include_tournament_slots 제거
.select("id,tournament_id,name,group_size,tournament_size,sort_order,standings_dirty")

// createDivision / updateDivision에서 include_tournament_slots 처리 제거
```

### 4.3 [app/admin/tournaments/[id]/edit/actions.ts](app/admin/tournaments/[id]/edit/actions.ts)

```ts
// createDivisionAction / updateDivisionAction
// includeTournamentSlots 파라미터 제거
// createDivision / updateDivisionConfig 호출 시 해당 필드 전달 제거
```

### 4.4 [app/admin/tournaments/[id]/edit/Form.tsx](app/admin/tournaments/[id]/edit/Form.tsx)

```tsx
// AddDivisionForm
// includeTournamentSlots 상태 제거
// checkbox UI 제거
// createDivisionAction 호출 시 includeTournamentSlots 전달 제거
// onCreated payload에서 include_tournament_slots 제거

// DivisionItem
// includeTournamentSlots 상태 제거
// checkbox UI 제거
// updateDivisionAction 호출 시 includeTournamentSlots 전달 제거
// 리스트 표시에서 "토너먼트 슬롯: 포함/미포함" 제거
```

### 4.5 [lib/api/results.ts](lib/api/results.ts)

```ts
type DivisionSeedingRow = {
  id: string;
  tournament_id: string;
  standings_dirty: boolean;
  tournament_size: number | null;
};

// getDivisionForSeeding select 수정
.select("id,tournament_id,standings_dirty,tournament_size")

// confirmLeagueStandings
// DB 업데이트 제거 (standings_dirty와 standings 존재 확인만 수행)

// seedTournamentTeamsFromConfirmedStandings
// if (standings_dirty) return { ok: false, error: "순위 재계산이 필요합니다." };
// standings가 존재하는지 확인 후 시딩 수행
```

### 4.6 [app/admin/tournaments/[id]/result/page.tsx](app/admin/tournaments/[id]/result/page.tsx)

```tsx
const isConfirmed = !selectedDivision.standings_dirty && (standingsResult.data?.length ?? 0) > 0;

<ResultForm
  ...
  isConfirmed={isConfirmed}
/>
```

### 4.7 [app/admin/tournaments/[id]/result/actions.ts](app/admin/tournaments/[id]/result/actions.ts)

```ts
// confirmLeagueStandingsAction / seedTournamentTeamsAction 로직은 유지
// 내부 confirm 및 seed 함수가 파생 조건을 사용하도록 변경
```

## 5. 트레이드오프 및 고려 사항 [완료]

- 확정 상태의 **영속성 부재**: DB에 확정 여부를 저장하지 않기 때문에, “확정”은 항상 파생 상태로 계산된다.
- UX 차이: 확정 버튼을 눌러도 DB에 기록이 남지 않으므로 “확정 기록”이 필요하다면 별도 컬럼이 필요하다.
- 단순성: 컬럼을 추가하지 않아 스키마가 단순해지고 마이그레이션 리스크가 줄어든다.
- 시딩 조건 완화: 사용자가 명시적으로 확정 버튼을 누르지 않아도, standings가 최신이면 시딩 가능해진다.

## 6. 검증 시나리오 (계획 단계) [완료]

- 디비전 생성/수정 화면에서 “토너먼트 슬롯 포함” 항목이 사라졌는지 확인
- 리그 결과 페이지에서 순위 확정 버튼이 정상 동작(standings_dirty 검사)하는지 확인
- standings가 최신이고 데이터가 있으면 토너먼트 팀 배치가 가능한지 확인
- standings_dirty = true 인 경우에는 배치가 차단되는지 확인

---

구현 완료. 필요 시 검증 시나리오를 수행한다.
