# 20260325 Schedule Management — 구현 계획 v2

> **v1 → v2 변경 요약**
> 1. `tournaments.break_duration_minutes` 컬럼 제거 → break 슬롯의 `duration_minutes`가 휴식시간 역할
> 2. 슬롯 반환 구조: `court → flat` → `court → divisions → flat` 으로 변경
> 3. `ScheduleGenerateActions`에 시작시간 표시, 빈슬롯 추가(break only), break 슬롯 삭제 기능 추가
> 4. division 생성 시 `sort_order` 자동증가 기본 적용 명기

---

## 0) 구현 범위 요약
리서치 문서(`20260325_schedule-management_Research.md`)를 기반으로 아래 5개 요구사항 구현을 위한 파일별 상세 플랜 정리.

1. UI/UX 및 버튼 기능 변경
2. 스케줄 리스트 구조 통합 (단일 테이블, 코트별 → 디비전별 → 슬롯 계층)
3. 스케줄 자동 생성 로직 (소요시간 기반)
4. 개별 스케줄(행 단위) 편집 (DnD + 즉시 저장 + break 슬롯 삭제)
5. 정렬 및 데이터 정합성 체크

---

## 1) 추가 설치 라이브러리

### @dnd-kit/core + @dnd-kit/sortable
- 이유: 현재 native DnD는 슬롯 간 swap 방식. 요구사항은 전체 행 순서 재배치(sortable list) 방식이므로 UX 차이가 큼. @dnd-kit은 TypeScript 지원, 접근성, 터치 지원이 있는 표준 React DnD 라이브러리.
- 설치 명령: `pnpm add @dnd-kit/core @dnd-kit/sortable`
- 도입 범위: `ScheduleSlotsFlatBoard.tsx` 내에서만 사용.

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

### 파일 2: `supabase/migrations/0119_tournaments_schedule_start.sql`
`tournaments` 테이블에 스케줄 시작시간 컬럼 추가.
> **v2 변경**: `break_duration_minutes`는 tournaments 테이블에 저장하지 않음.
> break 타입 슬롯 각각의 `duration_minutes`가 휴식시간 역할을 함.
> 자동 생성 시 사용하는 breakDurationMinutes는 UI-only 입력값 (DB 비저장).

```sql
-- 대회 스케줄 기본 시작시간 (datetime)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS schedule_start_at TIMESTAMPTZ NULL;
```

---

## 3) 변경 및 추가 파일 목록

### 신규 파일
| 파일 경로 | 역할 |
|---|---|
| `supabase/migrations/0118_schedule_slots_duration.sql` | schedule_slots.duration_minutes 컬럼 추가 |
| `supabase/migrations/0119_tournaments_schedule_start.sql` | tournaments.schedule_start_at 컬럼 추가 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleSlotsFlatBoard.tsx` | 신규 단일 테이블 스케줄 보드 (court → division → slot) |

### 수정 파일
| 파일 경로 | 변경 내용 요약 |
|---|---|
| `lib/api/schedule-slots.ts` | 타입 확장 (court → division → flat 구조), 신규 API 함수 추가 |
| `lib/api/tournaments.ts` | TournamentEditRow에 schedule_start_at만 추가 |
| `app/admin/tournaments/[id]/schedule/actions.ts` | 신규 액션 추가 (슬롯 추가·삭제·타입변경·소요시간변경·재정렬) |
| `app/admin/tournaments/[id]/schedule/page.tsx` | tournament 데이터 로드, court→division flat 데이터 로드, 새 Board 컴포넌트 사용 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleGenerateActions.tsx` | 재생성 버튼 제거, 시작시간 표시, 빈슬롯 추가 UI 추가 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleSyncActions.tsx` | 검증 제거, 버튼명 변경 |
| `app/admin/tournaments/[id]/edit/Form.tsx` | schedule_start_at 입력 필드만 추가 (break_duration_minutes 제외) |
| `app/admin/tournaments/[id]/edit/actions.ts` | updateTournamentAction에 schedule_start_at만 추가 |
| `lib/api/divisions.ts` (또는 관련 파일) | division 생성 시 sort_order 자동증가 기본값 적용 |

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
  // 추가 (break_duration_minutes 제외)
  schedule_start_at: string | null;
};
```

#### 변경 포인트 2: `getTournamentForEdit` 쿼리 확장
```ts
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at")
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
  // 추가 (break_duration_minutes 제외)
  schedule_start_at: string | null;
};
```

#### 변경 포인트 4: `updateTournament` payload에 schedule_start_at 포함
```ts
.update({
  name: payload.name.trim(),
  // ...기존 필드...
  schedule_start_at: payload.schedule_start_at ?? null,
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

#### 변경 포인트 2: `getScheduleSlots` (기존) 쿼리에 `duration_minutes` 포함
기존 `getScheduleSlots`(중첩 구조)도 duration_minutes를 반환하도록 쿼리 및 매핑 업데이트:
```ts
.select("id,slot_type,stage_type,start_at,end_at,duration_minutes,court_id,...")
// 매핑 시:
duration_minutes: (row.duration_minutes as number | null) ?? null,
```

#### 변경 포인트 3: `generateScheduleSlots`에서 duration_minutes 저장
슬롯 생성 시 matchDurationMinutes 또는 breakDurationMinutes를 각 슬롯에 저장:
```ts
slotsToInsert.push({
  // ...기존 필드...
  duration_minutes: slot.slot_type === "break" ? breakDurationMinutes : matchDurationMinutes,
});
```

#### 신규 타입: `ScheduleSlotFlatDivisionGroup`, `ScheduleSlotFlatCourtGroup`
> **v2 변경**: court별 flat → court → division별 flat 구조로 변경.

```ts
// 디비전 단위 flat 슬롯 그룹
export type ScheduleSlotFlatDivisionGroup = {
  division: { id: string; name: string; sort_order: number } | null;
  slots: ScheduleSlot[];  // sort_order 오름차순
};

// 코트 단위 그룹 (내부에 디비전 그룹 포함)
export type ScheduleSlotFlatCourtGroup = {
  court: { id: string; name: string } | null;
  divisions: ScheduleSlotFlatDivisionGroup[];  // division.sort_order 오름차순
};
```

#### 신규 함수 1: `getScheduleSlotsFlatByCourt`
court → division → flat slots 구조로 반환.
```ts
export async function getScheduleSlotsFlatByCourt(
  tournamentId: string
): Promise<ApiResult<ScheduleSlotFlatCourtGroup[]>> {
  // 1) schedule_slots를 court_id, division_id, sort_order 순으로 조회
  //    → courts, divisions 정보 Supabase join 사용
  // 2) court_id로 1차 그룹화
  // 3) 각 court 그룹 내에서 division_id로 2차 그룹화
  // 4) courts는 display_order 오름차순, divisions는 sort_order 오름차순으로 정렬
  // 5) 반환: ScheduleSlotFlatCourtGroup[]
}
```

#### 신규 함수 2: `addBreakSlot`
코트·디비전 지정 break 슬롯 1개 추가.
```ts
export async function addBreakSlot(input: {
  tournamentId: string;
  courtId: string;
  divisionId: string;
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) 해당 court + division의 기존 슬롯 중 최대 sort_order 조회
  // 3) schedule_slots INSERT:
  //    { tournament_id, court_id, division_id, slot_type: 'break', stage_type: null,
  //      duration_minutes: 0, sort_order: maxSortOrder + 1 }
  // 4) 반환
}
```

#### 신규 함수 3: `deleteBreakSlot`
break 타입 슬롯만 삭제 허용.
```ts
export async function deleteBreakSlot(input: {
  tournamentId: string;
  slotId: string;
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) slotId의 slot_type이 'break'인지 확인 (보안: 비-break 슬롯 삭제 방지)
  // 3) schedule_slots DELETE
}
```

#### 신규 함수 4: `updateSlotDuration`
소요시간 변경 + 해당 코트·디비전의 모든 슬롯 시간 재계산.
```ts
export async function updateSlotDuration(input: {
  tournamentId: string;
  slotId: string;
  durationMinutes: number;
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) slotId의 court_id, division_id 조회
  // 3) schedule_slots.duration_minutes 업데이트
  // 4) recalculateCourtDivisionSlotTimes(tournamentId, courtId, divisionId) 호출
}
```

#### 신규 함수 5: `updateSlotType`
슬롯 타입(stage_type + slot_type 조합) 변경.
- "Group(예선)": slot_type='match', stage_type='group'
- "Tournament(본선)": slot_type='match', stage_type='tournament'
- "Break(휴식)": slot_type='break', stage_type=null
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
  //    주의: match 슬롯 → break 변경 시 match_id를 null로 처리
}
```

#### 신규 함수 6: `recalculateCourtDivisionSlotTimes`
특정 코트·디비전 내 모든 슬롯 시간을 sort_order 기준으로 재계산.
> **v2 변경**: court + division 단위로 재계산 (division별로 독립적인 시간 흐름 상정).
```ts
export async function recalculateCourtDivisionSlotTimes(input: {
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  scheduleStartAt: string;  // tournament.schedule_start_at
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) 해당 court_id + division_id의 슬롯을 sort_order 오름차순으로 조회
  // 3) cursor = new Date(scheduleStartAt)
  // 4) 각 슬롯에 대해:
  //    start_at = cursor
  //    end_at = cursor + (duration_minutes ?? 0) * 60 * 1000
  //    cursor = end_at
  // 5) batch update (upsert)
}
```

#### 신규 함수 7: `reorderCourtDivisionSlots`
코트·디비전 내 슬롯 순서 재정렬.
```ts
export async function reorderCourtDivisionSlots(input: {
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  orderedSlotIds: string[];
}): Promise<ActionResult> {
  // 1) organizer 체크
  // 2) 해당 court + division의 slotId 목록 조회 후 orderedSlotIds 검증
  // 3) updateSlotSortOrders(orderedSlotIds) 호출 (기존 유틸 재사용)
}
```

> **기존 함수 유지**: `getScheduleSlots`는 non-organizer 읽기 전용 뷰에서 사용 중이므로 제거하지 않음.

---

### 4-C. `app/admin/tournaments/[id]/schedule/actions.ts`

#### 신규 액션 추가
```ts
"use server";

// break 슬롯 추가
export async function addBreakSlotAction(
  tournamentId: string,
  courtId: string,
  divisionId: string
): Promise<ActionResult>

// break 슬롯 삭제 (break 타입만 허용)
export async function deleteBreakSlotAction(
  tournamentId: string,
  slotId: string
): Promise<ActionResult>

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

// 코트·디비전 내 슬롯 순서 재정렬
export async function reorderCourtDivisionSlotsAction(
  tournamentId: string,
  courtId: string | null,
  divisionId: string | null,
  orderedSlotIds: string[]
): Promise<ActionResult>
```

---

### 4-D. `app/admin/tournaments/[id]/schedule/page.tsx`

#### 변경 포인트
- `getTournamentForEdit(id)` 호출 추가 (tournament의 schedule_start_at 로드).
- `getScheduleSlotsFlatByCourt(id)` 호출 추가 (court → division flat 구조 로드).
- `ScheduleGenerateActions`에 `scheduleStartAt` props 전달.
- 기존 `ScheduleSlotsBoard` → 신규 `ScheduleSlotsFlatBoard`로 교체.

```ts
// page.tsx 내부 (organizer 분기 안)
const [courtsResult, slotsFlatResult, tournamentResult] = await Promise.all([
  getCourtsByTournament(id),
  getScheduleSlotsFlatByCourt(id),       // court → division → flat slots
  getTournamentForEdit(id),
]);
const divisionsResult = await getDivisionsByTournament(id); // 빈슬롯 추가용 division 목록

// ScheduleGenerateActions에 전달
<ScheduleGenerateActions
  tournamentId={id}
  scheduleStartAt={tournamentResult.data?.schedule_start_at ?? null}
  courts={courtsResult.data ?? []}
  divisions={divisionsResult.data ?? []}
/>

// 단일 테이블 보드 사용
<ScheduleSlotsFlatBoard
  groups={slotsFlatResult.data ?? []}
  courts={courtsResult.data ?? []}
  tournamentId={id}
  scheduleStartAt={tournamentResult.data?.schedule_start_at ?? null}
  isEditable
/>
```

---

### 4-E. `app/admin/tournaments/[id]/schedule/components/ScheduleGenerateActions.tsx`

#### 제거 항목 (v1과 동일)
- `handleRegenerate` 함수 전체 제거
- "스케줄 재생성" `<Button>` 제거
- `startTime` state + datetime-local input 제거 (→ tournament.schedule_start_at으로 대체)

#### v2 추가 사항
1. **시작시간 표시**: 컴포넌트 내 tournament.schedule_start_at을 한국 날짜 포맷으로 표시
2. **빈슬롯 추가 UI**: 코트 + 디비전 선택 → break 슬롯 1개 생성
3. **breakMinutes 입력 유지**: UI-only 입력 (DB 비저장), 자동 생성 시 각 break 슬롯의 duration_minutes 초기값으로 사용
4. **break 슬롯 삭제**: 삭제는 각 슬롯 행에서 노출하므로 이 컴포넌트에서는 불필요

#### props 타입
```tsx
type Props = {
  tournamentId: string;
  scheduleStartAt: string | null;     // tournament.schedule_start_at (schedule 기준)
  courts: Array<{ id: string; name: string }>;      // 빈슬롯 추가 코트 선택용
  divisions: Array<{ id: string; name: string }>;   // 빈슬롯 추가 디비전 선택용
};
```

#### 변경 후 컴포넌트 구조 (Pseudocode)
```tsx
export default function ScheduleGenerateActions({ tournamentId, scheduleStartAt, courts, divisions }: Props) {
  // --- 자동 생성 ---
  const [matchMinutes, setMatchMinutes] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("");  // UI-only, DB 비저장

  const handleGenerate = () => {
    if (!scheduleStartAt) {
      // 에러 표시: "대회 수정 페이지에서 스케줄 시작 시간을 먼저 설정하세요."
      return;
    }
    // generateScheduleSlotsAction(tournamentId, scheduleStartAt, matchMinutes, breakMinutes) 호출
  };

  const handleClear = () => {
    // clearGeneratedScheduleSlotsAction 호출 (변경 없음)
  };

  // --- 빈슬랏 추가 ---
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id ?? "");
  const [selectedDivisionId, setSelectedDivisionId] = useState(divisions[0]?.id ?? "");

  const handleAddBreakSlot = () => {
    // addBreakSlotAction(tournamentId, selectedCourtId, selectedDivisionId) 호출
    // 성공 후 router.refresh()
  };

  return (
    <Card>
      <h2>스케줄 생성</h2>

      {/* 시작 시간 표시 (v2 신규) */}
      <p className="text-sm text-gray-600">
        스케줄 시작:{" "}
        {scheduleStartAt
          ? formatScheduleStartAt(scheduleStartAt)  // "YYYY년 MM월 DD일 HH:mm" 형식
          : <span className="text-amber-600">대회 수정 페이지에서 설정 필요</span>
        }
      </p>

      {/* 자동 생성 섹션 */}
      <div>
        <label>경기 소요시간 (분, 기본값)</label>
        <input type="number" value={matchMinutes} onChange={...} placeholder="30" />
        <label>휴식 시간 (분, 기본값)</label>
        <input type="number" value={breakMinutes} onChange={...} placeholder="10" />
        <Button onClick={handleGenerate} disabled={!scheduleStartAt}>자동생성</Button>
        <Button variant="secondary" onClick={handleClear}>초기화</Button>
      </div>

      {/* 빈슬롯 추가 섹션 (v2 신규) */}
      <div>
        <h3>휴식 슬롯 직접 추가</h3>
        <select value={selectedCourtId} onChange={...}>
          {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedDivisionId} onChange={...}>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Button onClick={handleAddBreakSlot}>슬롯 추가</Button>
      </div>
    </Card>
  );
}
```

> **formatScheduleStartAt 유틸**: `new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })` 형태 포맷 함수 (helpers 파일 또는 컴포넌트 내 inline 정의).

---

### 4-F. `app/admin/tournaments/[id]/schedule/components/ScheduleSyncActions.tsx`

#### 제거 항목 (v1과 동일)
- `validation` state 전체 제거
- `handleValidate` 함수 제거
- "검증" `<Button>` 제거
- `handleSave` 내 `validateScheduleBeforeSyncAction` 호출 제거
- validation 결과 표시 블록 제거

#### 변경 항목
- "동기화 저장" → "저장"
- "동기화 초기화" → "초기화"
- `handleSave`는 `syncScheduleToMatchesAction` 직접 호출

#### 변경 후 컴포넌트 구조 (Pseudocode)
```tsx
export default function ScheduleSyncActions({ tournamentId }: { tournamentId: string }) {
  const handleSave = () => {
    // syncScheduleToMatchesAction(tournamentId) 직접 호출 (검증 없음)
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

### 4-G. 신규 `ScheduleSlotsFlatBoard.tsx`

기존 `ScheduleSlotsBoard.tsx`는 non-organizer 뷰 및 하위 호환을 위해 유지. 신규 파일을 organizer용으로 생성.

#### 컴포넌트 계층 구조
```
ScheduleSlotsFlatBoard (court 목록 렌더링)
  └─ CourtDivisionSection (court + division 단위 카드)
       └─ FlatScheduleTable (실제 행 목록, DnD 포함)
            └─ SortableSlotRow (개별 슬롯 행)
```

#### props 타입
```tsx
type Props = {
  groups: ScheduleSlotFlatCourtGroup[];       // court → division → slots
  courts: Array<{ id: string; name: string }>;
  tournamentId: string;
  scheduleStartAt: string | null;
  isEditable?: boolean;
};
```

#### 최상위: `ScheduleSlotsFlatBoard`
```tsx
export default function ScheduleSlotsFlatBoard({ groups, courts, tournamentId, scheduleStartAt, isEditable }: Props) {
  return (
    <div className="space-y-6">
      {groups.map((courtGroup) => (
        <div key={courtGroup.court?.id ?? "unassigned"}>
          <h3>{courtGroup.court?.name ?? "미지정 코트"}</h3>
          {courtGroup.divisions.map((divGroup) => (
            <CourtDivisionSection
              key={divGroup.division?.id ?? "unassigned"}
              courtId={courtGroup.court?.id ?? null}
              divisionLabel={divGroup.division?.name ?? "미지정 디비전"}
              slots={divGroup.slots}
              courts={courts}
              tournamentId={tournamentId}
              scheduleStartAt={scheduleStartAt}
              isEditable={isEditable}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### 중간: `CourtDivisionSection`
```tsx
function CourtDivisionSection({ courtId, divisionLabel, slots, courts, tournamentId, scheduleStartAt, isEditable }) {
  return (
    <Card>
      <h4>{divisionLabel}</h4>
      <FlatScheduleTable
        slots={slots}
        courtId={courtId}
        divisionId={/* divisionId from slot */}
        courts={courts}
        tournamentId={tournamentId}
        scheduleStartAt={scheduleStartAt}
        isEditable={isEditable}
      />
    </Card>
  );
}
```

#### 핵심: `FlatScheduleTable` (DnD 포함)
- `@dnd-kit/sortable`의 `SortableContext` + `useSortable`로 행 DnD 구현.

**열 구성:**

| 열 | 구현 방식 | isEditable 여부 |
|---|---|---|
| 핸들 | `⠿` 아이콘 + useSortable drag attributes | editable만 표시 |
| 구분(타입) | `<select>` Group/Tournament/Break → onChange: `updateSlotTypeAction` | editable: select, read-only: 텍스트 |
| 시간 | 읽기 전용 `formatTimeRange(start_at, end_at)` | 항상 읽기 전용 |
| 소요시간(분) | `<input type="number">` onBlur → `updateSlotDurationAction` | editable: input, read-only: 텍스트 |
| 경기 정보 | 읽기 전용 라벨 (기존 포맷 함수 재사용) | 항상 읽기 전용 |
| 코트 | `<select>` onChange → `updateSlotCourtAction` | editable만 |
| 삭제 | 버튼 (slot_type === 'break'인 경우만 표시) → `deleteBreakSlotAction` | editable + break 타입만 |

**DnD 완료 핸들러 (onDragEnd):**
```ts
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  // 1. 새 sort 순서 계산 (arrayMove 유틸 사용)
  const newOrderedIds = arrayMove(slotIds, oldIndex, newIndex);
  // 2. optimistic update (UI 즉시 반영)
  setLocalSlots(reorderedSlots);
  // 3. 서버 저장
  await reorderCourtDivisionSlotsAction(tournamentId, courtId, divisionId, newOrderedIds);
  // 4. 시간 재계산
  if (scheduleStartAt) {
    await recalculateCourtDivisionSlotTimesAction(tournamentId, courtId, divisionId);
  }
  // 5. router.refresh()
}
```

**소요시간 변경 핸들러 (onBlur):**
```ts
async function handleDurationBlur(slotId: string, value: string) {
  const durationMinutes = parseInt(value, 10);
  if (isNaN(durationMinutes) || durationMinutes < 0) return;
  // updateSlotDurationAction 내부에서 시간 재계산 자동 호출
  await updateSlotDurationAction(tournamentId, slotId, durationMinutes);
  router.refresh();
}
```

**break 슬롯 삭제 핸들러:**
```ts
async function handleDeleteBreakSlot(slotId: string) {
  await deleteBreakSlotAction(tournamentId, slotId);
  router.refresh();
}
```

---

### 4-H. `app/admin/tournaments/[id]/edit/Form.tsx`

기존 `TournamentEditForm`에 아래 필드만 추가.
> **v2 변경**: `break_duration_minutes` 입력 필드 제거. schedule_start_at만 추가.

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

#### state 추가
```ts
const [scheduleStartAt, setScheduleStartAt] = useState(
  tournament.schedule_start_at
    ? new Date(tournament.schedule_start_at).toISOString().slice(0, 16)  // datetime-local 형식
    : ""
);
```

#### handleSubmit 수정
```ts
updateTournamentAction({
  // 기존 필드...
  schedule_start_at: scheduleStartAt ? new Date(scheduleStartAt).toISOString() : null,
  // break_duration_minutes 제거됨
})
```

---

### 4-I. `app/admin/tournaments/[id]/edit/actions.ts`

`updateTournamentAction` 파라미터 확장 (schedule_start_at만).
```ts
export async function updateTournamentAction(payload: {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  // 추가 (break_duration_minutes 제외)
  schedule_start_at: string | null;
}): Promise<ActionResult>
```

---

### 4-J. 정렬 및 데이터 정합성

#### 코트·디비전 순서 체크 (경고 수준)
`validateScheduleBeforeSync` (또는 별도 `checkScheduleOrder`) 함수:
```ts
// courts.display_order 기준으로 슬롯의 코트 등장 순서 확인
// divisions.sort_order 기준으로 각 코트 내 슬롯의 디비전 등장 순서 확인
// 이상 감지 시 warnings[]에 추가 (에러 아님)
```
> 검증 기능 UI는 제거되었으나, `syncScheduleToMatchesAction` 내부에서 warnings를 포함한 결과를 반환하여 ScheduleSyncActions에서 토스트/인라인 경고 표시 가능.

#### division sort_order 자동증가 (v2 신규)
> **v2 신규**: division 생성 시 sort_order를 자동증가 방식으로 기본 입력.

대상 파일: `lib/api/divisions.ts` (또는 동등한 파일) 내 division 생성 함수 및 관련 Server Action.
```ts
// division 생성 시:
// 1) 해당 tournament의 기존 divisions 중 max(sort_order) 조회
// 2) sort_order = maxSortOrder + 1 (기본값, 사용자가 변경 가능)
const { data: maxRow } = await supabase
  .from("divisions")
  .select("sort_order")
  .eq("tournament_id", tournamentId)
  .order("sort_order", { ascending: false })
  .limit(1)
  .single();

const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;
// INSERT 시 sort_order: nextSortOrder
```
> 이 변경은 스케줄 관리 범위 밖의 division 생성 플로우이지만, 정합성 체크의 전제 조건이므로 함께 구현.

---

## 5) 구현 순서 (의존성 기준)

```
Step 1:  DB 마이그레이션 (0118: duration_minutes, 0119: schedule_start_at) — 기반 스키마 확립
Step 2:  lib/api/tournaments.ts 타입/함수 업데이트 (schedule_start_at만)
Step 3:  lib/api/schedule-slots.ts 타입/함수 업데이트 (duration_minutes, 신규 함수 7개)
Step 4:  schedule/actions.ts 신규 액션 5개 추가
Step 5:  edit/Form.tsx + edit/actions.ts (schedule_start_at 추가, break_duration_minutes 제외)
Step 6:  ScheduleGenerateActions.tsx 수정 (시작시간 표시 + 빈슬롯 추가 UI)
Step 7:  ScheduleSyncActions.tsx 수정 (검증 제거, 버튼명 변경)
Step 8:  ScheduleSlotsFlatBoard.tsx 신규 작성 (court → division → slot 계층, DnD, 행 편집)
Step 9:  page.tsx 수정 (getScheduleSlotsFlatByCourt + getTournamentForEdit 로드, 신규 Board 사용)
Step 10: lib/api/divisions.ts division 생성 시 sort_order 자동증가 적용
Step 11: 정합성 체크 경고 로직 확장
```

---

## 6) 트레이드오프 및 고려사항

### T1. break_duration_minutes 제거 → 슬롯 단위 소요시간으로 통일
- 장점: 데이터 일관성. "대회 기본 휴식시간" vs "개별 슬롯 소요시간" 이중 관리 불필요. break 슬롯마다 다른 소요시간 설정 가능.
- 단점: 자동생성 시 break 소요시간을 별도로 입력해야 함 (UI-only 입력 유지).
- 결정: 슬롯 단위 소요시간(duration_minutes)으로 통일. 자동생성 시 breakMinutes는 ScheduleGenerateActions에서 UI-only 입력.

### T2. court → division → flat 슬롯 계층 구조
- 장점: 디비전별로 슬롯을 독립적으로 관리 가능. 각 디비전의 시간 흐름이 독립적.
- 단점: 코트+디비전 조합이 많을 경우 카드가 많아져 스크롤이 길어질 수 있음.
- 결정: 현재 요구사항(기존 구조가 court → division 기반)에 맞으므로 채택.

### T3. 즉시 저장(Auto-save) vs 일괄 저장
- 선택: 즉시 저장 (저장 버튼 제거 결정 유지).
- onBlur 트리거로 요청 발생 최소화. DnD 완료(onDragEnd) 시 1회 저장.

### T4. DnD 범위 제한
- 현재 플랜: court + division 단위 내 슬롯만 재정렬 가능 (디비전 간 이동 불가).
- 이유: 슬롯의 division_id가 스케줄 정합성에 영향을 주므로, 교차 이동은 타입 변경 기능으로 처리.
- 코트 변경은 기존과 동일하게 select → `updateSlotCourtAction`으로 처리.

### T5. break 슬롯만 삭제 허용
- match 슬롯(group/tournament)은 match 배정과 연결되어 있으므로 삭제 버튼 비노출.
- `deleteBreakSlot` 서버 함수에서도 slot_type='break' 여부를 검증하여 보안 확보.

### T6. 빈슬롯 추가의 초기 duration_minutes
- 빈슬롯 추가 시 duration_minutes=0으로 생성. 사용자가 이후 소요시간 입력.
- 시간 재계산은 소요시간 입력(onBlur) 후 자동으로 수행됨.

### T7. division sort_order 자동증가
- 디비전 생성 플로우는 스케줄 관리 범위 밖이지만, 스케줄 정합성 체크의 전제 조건.
- 현재 sort_order가 수동 입력 방식이라면 누락/중복 리스크 존재 → 자동증가 적용으로 해소.

### T8. 시간 재계산 범위
- duration 변경 또는 순서 변경 시 해당 court + division의 모든 슬롯 start_at/end_at 재계산.
- 코트+디비전 조합당 슬롯 수가 많을 경우 UPDATE 쿼리 다수 발생. 현재 규모에서는 허용 가능.
- 최적화 필요 시 batch upsert 도입.

### T9. getScheduleSlots 구조 이중화
- 기존 `getScheduleSlots`(중첩 구조)과 신규 `getScheduleSlotsFlatByCourt`(court → division → flat 구조) 병존.
- 기존 함수 제거 불가 (non-organizer 뷰 및 다른 참조 코드).
- 유지보수 부담은 있으나 현 단계에서 허용 가능.
