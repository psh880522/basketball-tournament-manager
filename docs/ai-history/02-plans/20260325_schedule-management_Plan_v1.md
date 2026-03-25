# 20260325 Schedule Management — 구현 계획 v1

## 0) 구현 범위 요약
리서치 문서(`20260325_schedule-management_Research.md`)를 기반으로 아래 5개 요구사항 구현을 위한 파일별 상세 플랜 정리.

1. UI/UX 및 버튼 기능 변경
2. 스케줄 리스트 구조 통합 (단일 테이블)
3. 스케줄 자동 생성 로직 (소요시간 기반)
4. 개별 스케줄(행 단위) 편집 (DnD + 즉시 저장)
5. 정렬 및 데이터 정합성 체크

---

## 1) 추가 설치 라이브러리

### @dnd-kit/core + @dnd-kit/sortable
- 이유: 현재 native DnD는 슬롯 간 swap 방식. 요구사항은 전체 행 순서 재배치(sortable list) 방식이므로 UX 차이가 큼. @dnd-kit은 TypeScript 지원, 접근성, 터치 지원이 있는 표준 React DnD 라이브러리.
- 설치 명령: `pnpm add @dnd-kit/core @dnd-kit/sortable`
- 도입 범위: `ScheduleSlotsBoard.tsx` 내에서만 사용.

---

## 2) DB 마이그레이션 (신규 파일)

### 파일 1: `supabase/migrations/0118_schedule_slots_duration.sql`
`schedule_slots` 테이블에 소요시간 컬럼 추가.
```sql
-- 각 슬롯의 소요시간(분) 저장
-- generateScheduleSlots 시 기본값으로 matchDurationMinutes 또는 breakDurationMinutes가 저장됨
-- 이후 사용자가 행 단위로 수정 가능
ALTER TABLE public.schedule_slots
  ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
```

### 파일 2: `supabase/migrations/0119_tournaments_schedule_defaults.sql`
`tournaments` 테이블에 스케줄 기본값 컬럼 추가.
- 현재 대회 설정에는 start_date(date 타입)만 있음. 시간까지 포함하는 timestamp 필드와 휴식시간 기본값 필드를 추가.
```sql
-- 대회 스케줄 기본 시작시간 (datetime)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS schedule_start_at TIMESTAMPTZ NULL;

-- 경기 간 기본 휴식시간 (분 단위)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS break_duration_minutes INT NULL DEFAULT 0;
```

-- TODO: 대회 설정에 휴식시간은 넣지 않아도 됨. break 타입 스케줄의 소요시간을 휴식시간으로 간주.

---

## 3) 변경 및 추가 파일 목록

### 신규 파일
| 파일 경로 | 역할 |
|---|---|
| `supabase/migrations/0118_schedule_slots_duration.sql` | schedule_slots.duration_minutes 컬럼 추가 |
| `supabase/migrations/0119_tournaments_schedule_defaults.sql` | tournaments.schedule_start_at, break_duration_minutes 추가 |

### 수정 파일
| 파일 경로 | 변경 내용 요약 |
|---|---|
| `lib/api/schedule-slots.ts` | 타입 확장, 신규 API 함수 추가 |
| `lib/api/tournaments.ts` | TournamentEditRow 타입, getTournamentForEdit, updateTournament 업데이트 |
| `app/admin/tournaments/[id]/schedule/actions.ts` | 신규 액션 추가 |
| `app/admin/tournaments/[id]/schedule/page.tsx` | tournament 데이터 로드, props 전달 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleGenerateActions.tsx` | 재생성 버튼 제거, 입력란 제거, tournament props 수신 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleSyncActions.tsx` | 검증 제거, 버튼명 변경 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx` | 전면 재설계: 단일 테이블, DnD, 행 편집 |
| `app/admin/tournaments/[id]/edit/Form.tsx` | schedule_start_at, break_duration_minutes 입력 필드 추가 |
| `app/admin/tournaments/[id]/edit/actions.ts` | updateTournamentAction 파라미터 확장 |

---

## 4) 파일별 구현 상세

---

### 4-A. `lib/api/tournaments.ts`

#### 변경 포인트 1: `TournamentEditRow` 타입 확장
```ts
export type TournamentEditRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  max_teams: number | null;
  // 추가
  schedule_start_at: string | null;
  break_duration_minutes: number | null;
};
```

#### 변경 포인트 2: `getTournamentForEdit` 쿼리 확장
```ts
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at,break_duration_minutes")
```

#### 변경 포인트 3: `TournamentUpdatePayload` 타입 확장
```ts
type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  // 추가
  schedule_start_at: string | null;
  break_duration_minutes: number | null;
};
```

#### 변경 포인트 4: `updateTournament` 업데이트 payload에 신규 필드 포함
```ts
.update({
  name: payload.name.trim(),
  // ...기존 필드...
  schedule_start_at: payload.schedule_start_at ?? null,
  break_duration_minutes: payload.break_duration_minutes ?? null,
})
```

---

### 4-B. `lib/api/schedule-slots.ts`

#### 변경 포인트 1: `ScheduleSlot` 타입 확장
```ts
export type ScheduleSlot = {
  // ... 기존 필드 ...
  duration_minutes: number | null;  // 추가
};
```

#### 변경 포인트 2: `getScheduleSlots` 쿼리에 `duration_minutes` 포함
```ts
.select("id,slot_type,stage_type,start_at,end_at,duration_minutes,court_id,...")
```
slot 객체 매핑 시:
```ts
const slot: ScheduleSlot = {
  // ...기존...
  duration_minutes: (row.duration_minutes as number | null) ?? null,
};
```

#### 변경 포인트 3: `generateScheduleSlots` 에서 duration_minutes 저장
슬롯 생성 시 아래 값을 함께 저장:
```ts
slotsToInsert.push({
  // ...기존 필드...
  duration_minutes: slot.slot_type === "break" ? breakDurationMinutes : matchDurationMinutes,
});
```

#### 신규 함수 1: `updateSlotDuration`
소요시간 변경 + 해당 코트의 모든 슬롯 시간 재계산.
```ts
export async function updateSlotDuration(input: {
  tournamentId: string;
  slotId: string;
  durationMinutes: number;
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) slotId의 court_id를 조회
  // 3) schedule_slots.duration_minutes 업데이트
  // 4) recalculateCourtSlotTimes(tournamentId, courtId) 호출
}
```

#### 신규 함수 2: `updateSlotType`
슬롯 타입(stage_type + slot_type 조합) 변경.
- 요구사항의 "Group/Tournament/Break" 선택 → stage_type과 slot_type 조합으로 매핑:
  - Group(예선): slot_type='match', stage_type='group'
  - Tournament(본선): slot_type='match', stage_type='tournament'
  - Break(휴식): slot_type='break', stage_type 유지 또는 null
```ts
export async function updateSlotType(input: {
  tournamentId: string;
  slotId: string;
  type: "group" | "tournament" | "break";
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) slot이 해당 tournament인지 검증
  // 3) type 매핑 → {slot_type, stage_type} 계산
  // 4) schedule_slots 업데이트
  // 주의: match 슬롯을 break로 변경 시 match_id는 null 처리 필요
}
```

#### 신규 함수 3: `recalculateCourtSlotTimes`
특정 코트의 모든 슬롯 시간을 sort_order 기준으로 재계산.
```ts
export async function recalculateCourtSlotTimes(input: {
  tournamentId: string;
  courtId: string | null;
  scheduleStartAt: string;  // tournament.schedule_start_at
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) 해당 court_id의 schedule_slots를 sort_order 오름차순으로 조회
  // 3) cursor = new Date(scheduleStartAt)
  // 4) 각 슬롯에 대해:
  //    start_at = cursor
  //    end_at = cursor + (duration_minutes ?? 0) * 60 * 1000
  //    cursor = end_at
  // 5) batch update (순차)
}
```

#### 신규 함수 4: `reorderCourtSlots`
단일 테이블 기준의 코트 내 전체 슬롯 순서 재정렬.
- 기존 `reorderGroupSlots`/`reorderTournamentSlots`는 group_key/stage_type 단위였으나, 새 단일 테이블은 court 단위.
```ts
export async function reorderCourtSlots(input: {
  tournamentId: string;
  courtId: string | null;
  orderedSlotIds: string[];
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) 해당 court의 slotId 목록 조회 후 orderedSlotIds 검증
  // 3) updateSlotSortOrders(orderedSlotIds) 호출
}
```

#### 변경 포인트 4: `getScheduleSlots` 반환 구조 단순화
현재 `ScheduleSlotCourtGroup`은 내부적으로 divisions → groups + tournament_slots로 중첩. 새 단일 테이블에서는 court별 flat 슬롯 배열이 필요.

--TODO: court별 > divisions별 >flat 슬롯

신규 반환 타입 추가:
```ts
// 단일 테이블용 코트 그룹
export type ScheduleSlotFlatCourtGroup = {
  court: { id: string; name: string } | null;
  slots: ScheduleSlot[];  // sort_order 오름차순
};
```

신규 함수 `getScheduleSlotsFlatByCourt`:
```ts
export async function getScheduleSlotsFlatByCourt(
  tournamentId: string
): Promise<ApiResult<ScheduleSlotFlatCourtGroup[]>> {
  // 1) schedule_slots를 court_id, sort_order 순으로 조회
  // 2) courts 정보 함께 조인
  // 3) court별로 그룹화하여 flat slots 배열 반환
}
```
> 기존 `getScheduleSlots`는 유지(non-organizer 읽기 전용 뷰에서 사용 중).

---

### 4-C. `app/admin/tournaments/[id]/schedule/actions.ts`

#### 신규 액션 추가
```ts
// 슬롯 소요시간 변경 + 시간 재계산
export async function updateSlotDurationAction(
  tournamentId: string,
  slotId: string,
  durationMinutes: number
): Promise<ActionResult>

// 슬롯 타입 변경
export async function updateSlotTypeAction(
  tournamentId: string,
  slotId: string,
  type: "group" | "tournament" | "break"
): Promise<ActionResult>

// 코트 내 슬롯 순서 재정렬 + 시간 재계산
export async function reorderCourtSlotsAction(
  tournamentId: string,
  courtId: string | null,
  orderedSlotIds: string[]
): Promise<ActionResult>

// 코트 슬롯 시간 재계산
export async function recalculateCourtSlotTimesAction(
  tournamentId: string,
  courtId: string | null
): Promise<ActionResult>
```

---

### 4-D. `app/admin/tournaments/[id]/schedule/page.tsx`

#### 변경 포인트
- `getTournamentForEdit(id)` 호출 추가 (tournament의 schedule_start_at, break_duration_minutes 로드).
- `ScheduleGenerateActions`에 `scheduleStartAt`, `breakDurationMinutes` props 전달.
- `ScheduleSlotsBoard` 교체 → 새로 만들 단일 테이블 컴포넌트 `ScheduleSlotsFlatBoard` 사용.

```ts
// page.tsx 내부 (organizer 분기 안)
const [courtsResult, slotsFlatResult, tournamentResult] = await Promise.all([
  getCourtsByTournament(id),
  getScheduleSlotsFlatByCourt(id),
  getTournamentForEdit(id),
]);

// ScheduleGenerateActions에 전달
<ScheduleGenerateActions
  tournamentId={id}
  scheduleStartAt={tournamentResult.data?.schedule_start_at ?? null}
  breakDurationMinutes={tournamentResult.data?.break_duration_minutes ?? 0}
/>

// 단일 테이블 보드 사용
<ScheduleSlotsFlatBoard
  groups={slotsFlatResult.data}
  courts={courtsResult.data ?? []}
  tournamentId={id}
  scheduleStartAt={tournamentResult.data?.schedule_start_at ?? null}
  isEditable
/>
```

---

### 4-E. `app/admin/tournaments/[id]/schedule/components/ScheduleGenerateActions.tsx`

#### 제거 항목
- `handleRegenerate` 함수 전체 제거
- "스케줄 재생성" `<Button>` 제거
- `startTime` state + datetime-local input 제거
- `breakMinutes` state + 휴식 시간 input 제거

#### 추가 항목
- props로 `scheduleStartAt: string | null`와 `breakDurationMinutes: number` 수신.

#### 변경 후 컴포넌트 구조 (Pseudocode)
```tsx
type Props = {
  tournamentId: string;
  scheduleStartAt: string | null;  // tournament에서 가져옴
  breakDurationMinutes: number;    // tournament에서 가져옴
};

export default function ScheduleGenerateActions({ tournamentId, scheduleStartAt, breakDurationMinutes }: Props) {
  const [matchMinutes, setMatchMinutes] = useState("");

  const handleGenerate = () => {
    if (!scheduleStartAt) {
      // 에러: "대회 수정 페이지에서 스케줄 시작 시간을 먼저 설정하세요."
      return;
    }
    // scheduleStartAt, matchMinutes, breakDurationMinutes를 generateScheduleSlotsAction에 전달
  };

  const handleClear = () => {
    // clearGeneratedScheduleSlotsAction 호출 (변경 없음)
  };

  return (
    <Card>
      <h2>스케줄 생성</h2>
      {/* scheduleStartAt이 null이면 경고 표시 */}
      {!scheduleStartAt && <p className="text-sm text-amber-600">대회 수정 페이지에서 스케줄 시작 시간을 설정하세요.</p>}
      <div>
        <label>경기 소요시간 (기본값)</label>
        <input type="number" value={matchMinutes} onChange={...} placeholder="30" />
        <Button onClick={handleGenerate}>자동생성</Button>
        <Button variant="secondary" onClick={handleClear}>초기화</Button>
      </div>
    </Card>
  );
}
```
> 버튼명 변경: "스케줄 생성" → "자동생성" (요구사항의 "자동생성 버튼" 표현 반영)
--TODO: 
--  1. 경기 시작 시간 표시 필요(YYYY년mm월dd일 hh:mm)
--  2. 빈슬롯 추가 기능
--      - 코트, 디비전 선택 생성 클릭시 슬롯 1개 생성(우선 휴식시간 용 경기용 추가는 범위 제외)
--  3. 이론상 모든 슬롯을 추가 삭제 할수 있어야 하지만 경기 배정과 물려있기 때문에 휴식시간 슬롯만 삭제 버튼 노출되게 한다.
---

### 4-F. `app/admin/tournaments/[id]/schedule/components/ScheduleSyncActions.tsx`

#### 제거 항목
- `validation` state 전체 제거
- `handleValidate` 함수 제거
- "검증" `<Button>` 제거
- `handleSave` 내 `validateScheduleBeforeSyncAction` 호출 제거
- validation 결과 표시 블록 제거

#### 변경 항목
- "동기화 저장" → "저장"
- "동기화 초기화" → "초기화"
- `handleSave`는 validateAction 없이 직접 `syncScheduleToMatchesAction` 호출

#### 변경 후 컴포넌트 구조 (Pseudocode)
```tsx
export default function ScheduleSyncActions({ tournamentId }: Props) {
  const handleSave = () => {
    // syncScheduleToMatchesAction(tournamentId) 직접 호출
  };

  const handleClear = () => {
    // clearScheduleSyncAction(tournamentId) 호출 (변경 없음)
  };

  return (
    <Card>
      <h2>스케줄 동기화</h2>
      <div>
        <Button onClick={handleSave}>저장</Button>
        <Button variant="secondary" onClick={handleClear}>초기화</Button>
      </div>
    </Card>
  );
}
```

---

### 4-G. `app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx` → 신규 `ScheduleSlotsFlatBoard.tsx`

핵심 변경. 기존 파일은 유지(non-organizer 뷰 또는 하위 호환)하고, 신규 파일 생성.

#### 신규 파일: `ScheduleSlotsFlatBoard.tsx`

```tsx
"use client";
// @dnd-kit/core, @dnd-kit/sortable 사용

type Props = {
  groups: ScheduleSlotFlatCourtGroup[] | null;
  courts: Court[];
  tournamentId: string;
  scheduleStartAt: string | null;
  isEditable?: boolean;
};

export default function ScheduleSlotsFlatBoard({ groups, courts, tournamentId, scheduleStartAt, isEditable }: Props) {
  // 코트별로 <FlatScheduleTable>을 렌더링
  return (
    <div>
      {(groups ?? []).map((group) => (
        <Card key={group.court?.id ?? "unassigned"}>
          <h3>{group.court?.name ?? "미지정 코트"}</h3>
          <FlatScheduleTable
            slots={group.slots}
            courtId={group.court?.id ?? null}
            courts={courts}
            tournamentId={tournamentId}
            scheduleStartAt={scheduleStartAt}
            isEditable={isEditable}
          />
        </Card>
      ))}
    </div>
  );
}
```

#### 내부 컴포넌트: `FlatScheduleTable`
- `@dnd-kit/sortable`의 `SortableContext` + `useSortable`로 행 DnD 구현.
- 열 구성:

| 열 | 구현 방식 |
|---|---|
| 핸들 | `<span>⠿</span>` + `useSortable` drag attributes |
| 타입 | `<select>` Group/Tournament/Break, onChange → `updateSlotTypeAction` |
| 시간 | 읽기 전용 `formatTimeRange(start_at, end_at)` |
| 소요시간 | `<input type="number">` onBlur → `updateSlotDurationAction` + revalidate |
| 경기 정보 | 읽기 전용 라벨(기존 formatLeagueMatchLabel/formatTournamentMatchLabel 재사용) |
| 코트 | `<select>` onChange → `updateSlotCourtAction` |

- DnD 완료(onDragEnd):
  ```ts
  // 1. 새 orderedSlotIds 계산
  // 2. reorderCourtSlotsAction(tournamentId, courtId, orderedSlotIds) 호출
  // 3. scheduleStartAt이 있으면 recalculateCourtSlotTimesAction 호출
  // 4. router.refresh()
  ```

- 소요시간 변경(onBlur):
  ```ts
  // 1. updateSlotDurationAction(tournamentId, slotId, durationMinutes) 호출
  //    → 내부에서 recalculateCourtSlotTimes 자동 호출
  // 2. router.refresh()
  ```

---

### 4-H. `app/admin/tournaments/[id]/edit/Form.tsx`

기존 `TournamentEditForm`에 아래 필드 추가.

#### `schedule_start_at` 입력 필드
```tsx
<div className="space-y-1">
  <label className="text-sm font-medium">스케줄 시작 시간</label>
  <input
    type="datetime-local"
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    value={scheduleStartAt}
    onChange={(event) => setScheduleStartAt(event.target.value)}
  />
  <p className="text-xs text-gray-500">스케줄 자동 생성 시 기준 시간으로 사용됩니다.</p>
</div>
```

#### `break_duration_minutes` 입력 필드
```tsx
<div className="space-y-1">
  <label className="text-sm font-medium">기본 휴식시간 (분)</label>
  <input
    type="number"
    min={0}
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    value={breakDurationMinutes}
    onChange={(event) => setBreakDurationMinutes(event.target.value)}
    placeholder="0"
  />
</div>
```

#### state 추가
```ts
const [scheduleStartAt, setScheduleStartAt] = useState(
  tournament.schedule_start_at
    ? new Date(tournament.schedule_start_at).toISOString().slice(0, 16)  // datetime-local 형식
    : ""
);
const [breakDurationMinutes, setBreakDurationMinutes] = useState(
  tournament.break_duration_minutes != null ? String(tournament.break_duration_minutes) : "0"
);
```

#### handleSubmit 수정
```ts
updateTournamentAction({
  // 기존 필드...
  schedule_start_at: scheduleStartAt ? new Date(scheduleStartAt).toISOString() : null,
  break_duration_minutes: Number(breakDurationMinutes) || 0,
})
```

---

### 4-I. `app/admin/tournaments/[id]/edit/actions.ts`

`updateTournamentAction` 파라미터 확장.
```ts
export async function updateTournamentAction(payload: {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  // 추가
  schedule_start_at: string | null;
  break_duration_minutes: number | null;
}): Promise<ActionResult>
```
내부에서 `updateTournament` 라이브러리 함수에 그대로 전달.

---

### 4-J. 정렬 및 정합성 체크 강화

`lib/api/schedule-slots.ts`의 `validateScheduleBeforeSync` 함수에 추가 검사 항목 추가 (또는 별도 함수 `checkScheduleOrder`):

#### 코트 순서 체크
```ts
// courts 테이블의 display_order 기준 정렬 순서와
// 실제 schedule_slots의 코트 배치 순서 비교
// 예: court_id 목록이 display_order 오름차순이 아닌 경우 warnings에 추가
const courtDisplayOrders = await fetchCourtDisplayOrders(tournamentId);
// 첫 번째 슬롯 기준으로 코트 등장 순서를 체크
// → 이상 감지 시 warnings.push("코트 순서가 display_order와 다릅니다.")
```

#### 디비전 순서 체크
```ts
// divisions.sort_order 기준 정렬 순서와
// 각 코트 내 슬롯의 division 등장 순서 비교
// → 이상 감지 시 warnings.push("디비전 순서가 설정과 다릅니다.")
```
> 코트/디비전 순서 체크는 **에러**가 아닌 **경고(warnings)**로 처리 (자유 편집 허용 방침에 따라).

단, 현재 요구사항에서 "검증 기능 제거" 방침이 있으므로 이 체크는 **저장 버튼 클릭 시** ScheduleSyncActions 내에서 별도로 보여주는 방식으로 구성 or 단순히 저장 시 warnings를 표시하는 방식으로 가볍게 추가.

--TODO: divisions 생성시 정렬 값이 자동증가 방식으로 기본 입력

---

## 5) 구현 순서 (의존성 기준)

```
Step 1: DB 마이그레이션 (0118, 0119) — 기반 스키마 확립
Step 2: lib/api/tournaments.ts 타입/함수 업데이트
Step 3: lib/api/schedule-slots.ts 타입/함수 업데이트
Step 4: actions.ts 신규 액션 추가
Step 5: edit/Form.tsx + edit/actions.ts (대회 설정 시작시간/휴식시간 추가)
Step 6: ScheduleGenerateActions.tsx 수정
Step 7: ScheduleSyncActions.tsx 수정
Step 8: ScheduleSlotsFlatBoard.tsx 신규 작성 (핵심, 가장 복잡)
Step 9: page.tsx 수정 (데이터 로드 + 컴포넌트 교체)
Step 10: 정합성 체크 로직 확장
```

---

## 6) 트레이드오프 및 고려사항

### T1. 즉시 저장(Auto-save) vs 일괄 저장
- 선택: 즉시 저장 (TODO 주석으로 저장 버튼 제거 결정됨).
- 장점: UI 단순, 사용자 명시적 저장 불필요.
- 단점: 각 행 변경 시 서버 요청 발생 → 빠른 연속 입력 시 요청 다발. onBlur 이벤트로 trigger하여 최소화 가능.

### T2. 시간 재계산 범위
- DnD 또는 소요시간 변경 시 해당 court의 모든 슬롯 start_at/end_at을 재계산.
- 코트당 슬롯 수가 많을 경우 UPDATE 쿼리 다수 발생. 현재 스케줄 규모에서는 허용 가능.
- 최적화 필요 시 batch update(upsert) 도입.

### T3. getScheduleSlots 구조 이중화
- 기존 `getScheduleSlots`(중첩 구조)과 신규 `getScheduleSlotsFlatByCourt`(flat 구조) 병존.
- 기존 함수는 non-organizer 뷰 및 다른 참조 코드가 있으므로 제거 불가.
- 중복 유지는 유지보수 부담이 있으나 현 단계에서 허용 가능.

### T4. 타입 변경(Group/Tournament/Break)의 의미
- "타입" 변경은 slot_type과 stage_type의 조합으로 표현됨.
- Group → Tournament 변경 시 match_id 보존 가능. Break → Group/Tournament 변경 시 match_id가 null인 상태가 유지됨(빈 경기 슬롯).
- 추후 match 연결 기능이 필요할 수 있음 → 현재 범위 밖.

### T5. 단일 테이블 범위 (코트별 vs 전체)
- 현재 플랜: 코트별 단일 테이블 (코트 그룹화 유지).
- 대안: 코트를 열(column)로 하는 완전한 단일 테이블.
- 결정: 코트별 단일 테이블 추천. 코트가 서로 다른 물리적 장소이므로 구분 유지가 합리적. 실제 현장 운영에서도 코트별로 스케줄을 보는 것이 자연스러움.

### T6. schedule_start_at의 실제 적용
- `recalculateCourtSlotTimes`에서 기준 시작시간으로 사용.
- tournament.schedule_start_at이 null이면 재계산 불가 → UI에서 경고 표시.
- 각 코트가 동일한 schedule_start_at에서 시작되는 현재 구조 유지.

### T7. @dnd-kit 도입 범위
- ScheduleSlotsFlatBoard 내부만 사용.
- 기존 ScheduleSlotsBoard(native DnD)와 공존.

### T8. 정합성 체크 약화
- 검증 기능 제거 방침에 따라 "저장" 시 에러 없이 바로 저장됨.
- 코트/디비전 순서 체크는 비파괴적 warnings만 표시.
- 잘못된 데이터 저장 가능성 존재 → 경기 관리 페이지에서 문제 발생 시 추적 어려움.
- 필요 시 저장 성공 후 경고 메시지 표시 방식으로 보완.
