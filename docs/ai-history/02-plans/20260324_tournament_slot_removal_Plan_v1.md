# 구현 계획 - 토너먼트 슬롯 포함 제거

## 1. 구현해야 할 기능 상세 설명

목표는 “토너먼트 슬롯 포함” 체크 기능을 완전히 제거하는 것이다. 현재 `include_tournament_slots`는 두 가지 의미로 쓰이고 있다.

1) 디비전 설정에서 “토너먼트 슬롯 자동 생성” 플래그
2) 리그 순위 확정 여부(시딩 가능 여부) 플래그

이번 작업은 “체크해서 슬롯 생성” 동작을 제거하는 것이므로, 다음 중 하나의 방향을 선택해야 한다.

- 방향 A: `include_tournament_slots` 자체를 제거하고, 순위 확정 여부는 별도 컬럼(예: `standings_confirmed`)로 분리한다.
- 방향 B: `include_tournament_slots`는 유지하되 UI/액션에서만 제거하고, 순위 확정 플래그로만 사용하도록 이름과 의미를 정리한다.

요구사항 문맥상 “체크해서 저장하면 슬롯을 만드는 기능을 제거”가 핵심이므로, 추천은 **방향 A (플래그 분리)** 이다. 이렇게 하면 “슬롯 포함 체크” 자체를 삭제하고, 순위 확정 흐름을 별도 필드로 명확하게 분리할 수 있다.

이 계획서는 방향 A를 기준으로 작성한다.

//TODO: 시드 확정 플래그가 꼭 필요한가? standing_durty플래그 만으로는 불가능 한지 고려 해보자

## 2. 추가 설치가 필요한 라이브러리

추가 설치 필요 없음.

- 기존: Next.js, Supabase, Tailwind, TypeScript
- 신규 라이브러리 요구 없음

## 3. 변경될 파일 경로 및 추가될 파일 목록

### 3.1 변경될 파일
- [app/admin/tournaments/[id]/edit/Form.tsx](app/admin/tournaments/[id]/edit/Form.tsx)
  - 디비전 생성/수정 UI에서 “토너먼트 슬롯 포함” 체크박스 제거
  - 리스트 표시에서 “토너먼트 슬롯 포함/미포함” 표시 제거

- [app/admin/tournaments/[id]/edit/actions.ts](app/admin/tournaments/[id]/edit/actions.ts)
  - create/update Division 액션에서 `include_tournament_slots` 전달 제거

- [lib/api/divisions.ts](lib/api/divisions.ts)
  - `DivisionRow` 타입에서 `include_tournament_slots` 제거
  - create/update에서 해당 필드 처리 제거

- [app/admin/tournaments/[id]/result/page.tsx](app/admin/tournaments/[id]/result/page.tsx)
  - `isConfirmed` 값 전달 로직을 새 필드(예: `standings_confirmed`)로 변경

- [lib/api/results.ts](lib/api/results.ts)
  - `confirmLeagueStandings`에서 `include_tournament_slots` 업데이트 제거
  - `seedTournamentTeamsFromConfirmedStandings`에서 확정 여부 확인을 새 필드로 전환

- [app/admin/tournaments/[id]/result/actions.ts](app/admin/tournaments/[id]/result/actions.ts)
  - confirm/seed 관련 변경으로 인한 타입 및 메시지 조정(필요 시)

- [supabase/migrations](supabase/migrations)
  - `include_tournament_slots` 제거 마이그레이션 추가
  - `standings_confirmed` 컬럼 추가 마이그레이션 추가

### 3.2 추가될 파일
- 새 마이그레이션 파일
  - 예: `supabase/migrations/0200_division_standings_confirmed.sql`

## 4. 각 파일별 구현 스니펫 (Pseudocode)

### 4.1 [supabase/migrations/0200_division_standings_confirmed.sql](supabase/migrations/0200_division_standings_confirmed.sql)

```sql
-- 1) 확정 상태 컬럼 추가
ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS standings_confirmed boolean NOT NULL DEFAULT false;

-- 2) 기존 include_tournament_slots 컬럼 제거 (선택적으로 먼저 데이터 마이그레이션)
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
  // include_tournament_slots 제거
  standings_confirmed: boolean; // 새 컬럼
  sort_order: number;
  standings_dirty: boolean;
};

// select 컬럼에서 include_tournament_slots 제거, standings_confirmed 추가
.select("id,tournament_id,name,group_size,tournament_size,standings_confirmed,sort_order,standings_dirty")

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
// const [includeTournamentSlots, setIncludeTournamentSlots] = useState(false) 제거
// checkbox UI 제거
// createDivisionAction 호출 시 includeTournamentSlots 전달 제거
// onCreated payload에서 include_tournament_slots 제거

// DivisionItem
// includeTournamentSlots state 제거
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
  standings_confirmed: boolean; // include_tournament_slots 대체
};

// getDivisionForSeeding select 수정
.select("id,tournament_id,standings_dirty,tournament_size,standings_confirmed")

// confirmLeagueStandings
// include_tournament_slots 업데이트 제거
// standings_confirmed = true 업데이트

// seedTournamentTeamsFromConfirmedStandings
// if (!standings_confirmed) return { ok: false, error: "리그 순위가 확정되지 않았습니다." };
```

### 4.6 [app/admin/tournaments/[id]/result/page.tsx](app/admin/tournaments/[id]/result/page.tsx)

```tsx
<ResultForm
  ...
  isConfirmed={selectedDivision.standings_confirmed}
/>
```

### 4.7 [app/admin/tournaments/[id]/result/actions.ts](app/admin/tournaments/[id]/result/actions.ts)

```ts
// confirmLeagueStandingsAction / seedTournamentTeamsAction 로직은 유지
// 내부 confirm 함수가 standings_confirmed를 쓰도록 변경
```

## 5. 트레이드오프 및 고려 사항

- 데이터 마이그레이션: 기존 `include_tournament_slots = true` 값이 실제 확정 상태라면, 삭제 전에 `standings_confirmed`로 매핑하는 데이터 이행이 필요하다.
- 호환성: API 및 UI에서 타입이 바뀌므로, `DivisionRow`를 사용하는 다른 컴포넌트가 영향을 받을 수 있다.
- 운영 위험: 확정 플래그 전환 중 오류가 나면 시딩이 차단될 수 있다.
- 명확성: 새로운 컬럼 추가는 스키마가 늘어나지만, 의미가 명확해져 유지보수성이 좋아진다.

## 6. 검증 시나리오 (계획 단계)

- 디비전 생성/수정 화면에서 “토너먼트 슬롯 포함” 항목이 사라졌는지 확인
- 리그 결과 페이지에서 순위 확정 버튼 동작 확인
- 순위 확정 후 토너먼트 팀 배치가 가능해지는지 확인
- 순위 확정 전에는 배치가 차단되는지 확인

---

승인해주면 위 계획에 따라 구현을 진행한다.
