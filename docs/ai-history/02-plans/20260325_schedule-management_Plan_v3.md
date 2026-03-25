# 20260325 Schedule Management — 구현 계획 v3

> **v2 → v3 변경 요약**
> 1. 카드 계층 구조: `CourtDivisionSection` 단일 카드 → `CourtCard(외부) > DivisionSection(내부)` 2단계 계층으로 재구성
> 2. 시간 재계산 범위: `(courtId, divisionId)` 단위 독립 계산 → `courtId` 단위 전체 연속 재계산
> 3. "구분" 칼럼 추가 + 기존 라벨링 모듈 (`formatLeagueMatchLabel` 등) 사용
> 4. 유형 칼럼 읽기전용으로 변경 (`<select>` 제거)

---

## 0) 변경 범위 요약

v2 구현 완료 상태를 기반으로 아래 4가지 수정을 적용한다. DB 마이그레이션, 서버 컴포넌트, page.tsx 등은 변경 없음.

| # | 변경 내용 | 관련 파일 |
|---|---|---|
| 1 | 카드 계층 구조 재구성 | `ScheduleSlotsFlatBoard.tsx` |
| 2 | 코트 단위 시간 재계산 | `lib/api/schedule-slots.ts`, `schedule/actions.ts` |
| 3 | "구분" 칼럼 추가 + 경기 라벨 포맷터 적용 | `ScheduleSlotsFlatBoard.tsx` |
| 4 | 유형 칼럼 읽기전용 | `ScheduleSlotsFlatBoard.tsx` |

---

## 1) 변경 파일 목록

### 수정 파일
| 파일 경로 | 변경 내용 요약 |
|---|---|
| `lib/api/schedule-slots.ts` | `recalculateCourtSlotTimes` 추가, `updateSlotDuration` / `updateSlotCourt` / `reorderCourtDivisionSlots` 수정 |
| `app/admin/tournaments/[id]/schedule/actions.ts` | `recalculateCourtSlotsAction` 추가 |
| `app/admin/tournaments/[id]/schedule/components/ScheduleSlotsFlatBoard.tsx` | 카드 계층 재구성, 구분 칼럼 추가, 라벨링 포맷터 적용, 유형 칼럼 읽기전용 |

### 변경 없는 파일
| 파일 경로 | 이유 |
|---|---|
| `supabase/migrations/*` | DB 스키마 변경 없음 |
| `lib/api/tournaments.ts` | `schedule_start_at` 이미 존재 |
| `lib/api/schedule-slots.ts` (기존 함수들) | `recalculateCourtDivisionSlotTimes`는 삭제하지 않음 — 다른 경로에서 직접 사용될 수 있음 |
| `app/admin/tournaments/[id]/schedule/page.tsx` | 변경 없음 |
| `app/admin/tournaments/[id]/edit/*` | 변경 없음 |
| `ScheduleGenerateActions.tsx` | 변경 없음 |
| `ScheduleSyncActions.tsx` | 변경 없음 |
| `ScheduleSlotsBoard.tsx` | 변경 없음 (non-organizer 뷰 유지) |

---

## 2) 파일별 구현 상세 [완료]

---

### 2-A. `lib/api/schedule-slots.ts` [완료]

#### 변경 1: `recalculateCourtSlotTimes` 신규 추가

기존 `recalculateCourtDivisionSlotTimes`는 `(courtId, divisionId)` 단위로 독립 계산 — 각 그룹이 `schedule_start_at`을 기준점으로 개별 시작한다. v3에서는 동일 코트 내 모든 디비전 슬롯을 하나의 연속된 시퀀스로 계산한다.

**함수 시그니처**:
```typescript
export async function recalculateCourtSlotTimes(input: {
  tournamentId: string;
  courtId: string | null;
}): Promise<ActionResult>
```

**로직**:
1. `tournaments.schedule_start_at` 조회 → 없으면 에러 반환
2. 해당 코트의 슬롯을 "division.sort_order ASC NULLS LAST, schedule_slots.sort_order ASC" 순으로 조회
3. cursor = `new Date(schedule_start_at)`으로 초기화
4. 각 슬롯에 대해:
   - `startAt = cursor`
   - `endAt = cursor + duration_minutes * 60 * 1000`
   - DB 업데이트 (`start_at`, `end_at`)
   - `cursor = endAt`

**Supabase 쿼리 전략**:

Division join이 필요하므로 두 단계로 나누어 처리한다.

```typescript
// Step 1: 해당 코트에 등장하는 division_id 목록 + sort_order 조회
const { data: divRows } = await supabase
  .from("schedule_slots")
  .select("division_id")
  .eq("tournament_id", tournamentId)
  .eq("court_id", courtId ?? "")  // null 처리는 별도 분기
  .not("division_id", "is", null);
// + null division도 포함

// Step 2: divisions 테이블에서 sort_order 조회 → 정렬
const divisionIds = [...new Set(divRows?.map(r => r.division_id))];

const { data: divisions } = await supabase
  .from("divisions")
  .select("id, sort_order")
  .in("id", divisionIds)
  .order("sort_order", { ascending: true });

// null division은 마지막으로 처리 (NULLS LAST 동작)
const orderedDivisionIds: (string | null)[] = [
  ...(divisions?.map(d => d.id) ?? []),
];
if (divRows?.some(r => r.division_id === null)) {
  orderedDivisionIds.push(null);
}

// Step 3: division 순서대로 슬롯을 가져와 cursor 연속 진행
let cursor = new Date(tournament.schedule_start_at);

for (const divisionId of orderedDivisionIds) {
  let slotsQuery = supabase
    .from("schedule_slots")
    .select("id, duration_minutes")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: true });

  slotsQuery = courtId
    ? slotsQuery.eq("court_id", courtId)
    : slotsQuery.is("court_id", null);

  slotsQuery = divisionId
    ? slotsQuery.eq("division_id", divisionId)
    : slotsQuery.is("division_id", null);

  const { data: slots } = await slotsQuery;

  for (const slot of slots ?? []) {
    const durationMs = ((slot.duration_minutes as number | null) ?? 0) * 60 * 1000;
    const startAt = new Date(cursor);
    const endAt = new Date(startAt.getTime() + durationMs);

    await supabase
      .from("schedule_slots")
      .update({ start_at: startAt.toISOString(), end_at: endAt.toISOString() })
      .eq("id", slot.id);

    cursor = endAt;
  }
}
```

> **참고**: `schedule_slots.court_id`가 null인 경우(코트 미배정) `courtId = null`로 처리. 이 경우 division별 독립 계산이지만, 코트 단위 재계산 특성상 null 코트 슬롯 전체를 연속 계산한다.

---

#### 변경 2: `updateSlotDuration` 수정

기존에 `recalculateCourtDivisionSlotTimes`를 호출하는 부분을 `recalculateCourtSlotTimes`로 교체.

```typescript
// Before (v2): 마지막 return 부분
return recalculateCourtDivisionSlotTimes({
  tournamentId,
  courtId: (slot.court_id as string | null) ?? null,
  divisionId: (slot.division_id as string | null) ?? null,
});

// After (v3):
return recalculateCourtSlotTimes({
  tournamentId,
  courtId: (slot.court_id as string | null) ?? null,
});
```

---

#### 변경 3: `updateSlotCourt` 수정

코트 이동 시 새 코트의 해당 디비전 마지막 위치에 배치하고, 이전/새 코트 모두 재계산한다.

**기존 (v2)**:
- `court_id`만 변경
- `sort_order` 미변경
- 재계산 없음

**변경 (v3)**:

```typescript
export async function updateSlotCourt(input: {
  tournamentId: string;
  slotId: string;
  courtId: string | null;
}): Promise<ActionResult> {
  // ... (기존 인증, 유효성 검증 유지) ...

  // 현재 slot 정보 조회 (이전 court_id 포함)
  const { data: slot } = await supabase
    .from("schedule_slots")
    .select("id, tournament_id, court_id, division_id")
    .eq("id", slotId)
    .maybeSingle();

  const prevCourtId = (slot.court_id as string | null) ?? null;
  const divisionId = (slot.division_id as string | null) ?? null;

  // 새 코트의 같은 division 내 최대 sort_order 조회
  let maxOrderQuery = supabase
    .from("schedule_slots")
    .select("sort_order")
    .eq("tournament_id", tournamentId)
    .order("sort_order", { ascending: false })
    .limit(1);

  maxOrderQuery = courtId
    ? maxOrderQuery.eq("court_id", courtId)
    : maxOrderQuery.is("court_id", null);
  maxOrderQuery = divisionId
    ? maxOrderQuery.eq("division_id", divisionId)
    : maxOrderQuery.is("division_id", null);

  const { data: maxRows } = await maxOrderQuery;
  const newSortOrder = ((maxRows?.[0]?.sort_order as number | null) ?? -1) + 1;

  // court_id + sort_order 업데이트
  const { error: updateErr } = await supabase
    .from("schedule_slots")
    .update({ court_id: courtId, sort_order: newSortOrder })
    .eq("id", slotId)
    .eq("tournament_id", tournamentId);

  if (updateErr) return { ok: false, error: updateErr.message };

  // 이전 코트 & 새 코트 시간 재계산
  if (prevCourtId !== courtId) {
    const prevResult = await recalculateCourtSlotTimes({ tournamentId, courtId: prevCourtId });
    if (!prevResult.ok) return prevResult;
  }

  return recalculateCourtSlotTimes({ tournamentId, courtId });
}
```

---

#### 변경 4: `reorderCourtDivisionSlots` 수정

기존: `updateSlotSortOrders` 호출 후 종료
변경: `updateSlotSortOrders` 후 `recalculateCourtSlotTimes` 추가 호출

```typescript
export async function reorderCourtDivisionSlots(input: {
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  orderedSlotIds: string[];
}): Promise<ActionResult> {
  // ... (기존 인증, 유효성 검증 유지) ...

  const reorderResult = await updateSlotSortOrders(orderedSlotIds);
  if (!reorderResult.ok) return reorderResult;

  // 추가: 코트 전체 시간 재계산
  return recalculateCourtSlotTimes({
    tournamentId,
    courtId,
  });
}
```

---

### 2-B. `app/admin/tournaments/[id]/schedule/actions.ts` [완료]

#### 변경 1: import 추가

```typescript
import {
  // ... 기존 imports ...
  recalculateCourtSlotTimes,  // 추가
} from "@/lib/api/schedule-slots";
```

#### 변경 2: `recalculateCourtSlotsAction` 신규 추가 (수동 트리거용)

UI에서 "시간 재계산" 버튼 등으로 직접 호출할 수 있도록 action 추출.

```typescript
export async function recalculateCourtSlotsAction(
  tournamentId: string,
  courtId: string | null
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  const result = await recalculateCourtSlotTimes({ tournamentId, courtId });

  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/schedule`);
  }

  return result;
}
```

> **참고**: `updateSlotDurationAction`, `updateSlotCourtAction`, `reorderCourtDivisionSlotsAction`은 action 레이어 변경 없음. 내부 API 함수(`updateSlotDuration`, `updateSlotCourt`, `reorderCourtDivisionSlots`)가 court-wide 재계산을 포함하도록 변경되므로 action 레이어는 그대로.

---

### 2-C. `app/admin/tournaments/[id]/schedule/components/ScheduleSlotsFlatBoard.tsx` 전면 수정 [완료]

#### 변경 1: import 변경

**추가**:
```typescript
import {
  formatLeagueMatchLabel,
  formatTournamentMatchLabel,
  formatBreakLabel,
  formatTournamentCategoryLabel,
} from "@/lib/formatters/matchLabel";
import {
  buildTournamentRoundMetaByRound,
  type TournamentRoundMeta,
} from "@/lib/formatters/tournamentRoundMeta";
import {
  getInitialRoundFromRoundMap,
  compareTournamentMatchOrder,
} from "@/lib/formatters/tournamentMatchOrder";
```

**제거**:
```typescript
import { updateSlotTypeAction } from "../actions";
// (updateSlotTypeAction은 더 이상 사용하지 않음)
```

---

#### 변경 2: `TournamentSlotMeta` 타입 정의 추가

`ScheduleSlotsBoard.tsx`와 동일한 타입 로컬 정의 (또는 `tournamentRoundMeta.ts`에서 re-export할 경우 import 사용).

```typescript
type TournamentSlotMeta = TournamentRoundMeta;
// TournamentRoundMeta = { roundIndex: number; roundTotal: number; previousRoundTotal: number | null; initialRound: string | null; }
```

---

#### 변경 3: `buildFlatTournamentSlotMeta` 헬퍼 추가

`ScheduleSlotsBoard.tsx`의 `buildTournamentSlotMeta`와 동일한 로직. 입력 타입만 `ScheduleSlotFlatCourtGroup[]`에 맞게 조정.

```typescript
function buildFlatTournamentSlotMeta(
  groups: ScheduleSlotFlatCourtGroup[]
): Map<string, TournamentSlotMeta> {
  const metaBySlotId = new Map<string, TournamentSlotMeta>();
  const divisionRoundBuckets = new Map<string, Map<string, ScheduleSlot[]>>();

  groups.forEach((courtGroup) => {
    courtGroup.divisions.forEach((divGroup) => {
      const divisionId = divGroup.division?.id ?? "__unassigned__";
      const bucket = divisionRoundBuckets.get(divisionId) ?? new Map();

      divGroup.slots.forEach((slot) => {
        // tournament match 슬롯만 포함
        if (slot.stage_type !== "tournament" || slot.slot_type !== "match") return;
        if (!slot.match) return;
        const key = slot.match.groupName ?? "tournament";
        bucket.set(key, [...(bucket.get(key) ?? []), slot]);
      });

      divisionRoundBuckets.set(divisionId, bucket);
    });
  });

  divisionRoundBuckets.forEach((roundBucket) => {
    const initialRound = getInitialRoundFromRoundMap(roundBucket);
    const metaById = buildTournamentRoundMetaByRound(roundBucket, {
      getId: (slot) => slot.id,
      sort: (left, right) =>
        compareTournamentMatchOrder(
          {
            id: left.id,
            groupName: left.match?.groupName ?? null,
            seedA: left.match?.seedA ?? null,
            seedB: left.match?.seedB ?? null,
            createdAt: null,
          },
          {
            id: right.id,
            groupName: right.match?.groupName ?? null,
            seedA: right.match?.seedA ?? null,
            seedB: right.match?.seedB ?? null,
            createdAt: null,
          },
          initialRound
        ),
    });
    metaById.forEach((meta, id) => metaBySlotId.set(id, meta));
  });

  return metaBySlotId;
}
```

---

#### 변경 4: `buildSlotCategory` 헬퍼 추가

`ScheduleSlotsBoard.tsx`에서 동일한 함수를 컴포넌트 파일 내부에 재구현. (현재 ScheduleSlotsBoard는 export 하지 않음)

```typescript
function buildSlotCategory(
  slot: ScheduleSlot,
  roundIndex: number | null,
  roundTotal: number | null
): string {
  if (slot.slot_type !== "match") {
    if (slot.slot_type === "break") return "휴식";
    return "슬롯";
  }
  if (slot.stage_type === "tournament") {
    return formatTournamentCategoryLabel(
      slot.match?.groupName ?? null,
      roundIndex,
      roundTotal
    );
  }
  return slot.group_key ?? "-";
}
```

---

#### 변경 5: `buildMatchLabel` 헬퍼 추가

```typescript
function buildMatchLabel(
  slot: ScheduleSlot,
  meta: TournamentSlotMeta | null
): string {
  if (slot.slot_type !== "match") {
    if (slot.label) return slot.label;
    if (slot.slot_type === "break") return formatBreakLabel();
    return "슬롯";
  }
  if (!slot.match) return "경기 미배정";

  const teamA = slot.match.team_a ?? "TBD";
  const teamB = slot.match.team_b ?? "TBD";

  if (slot.stage_type === "tournament") {
    return formatTournamentMatchLabel({
      groupName: slot.match.groupName,
      teamA,
      teamB,
      seedA: slot.match.seedA ?? null,
      seedB: slot.match.seedB ?? null,
      roundIndex: meta?.roundIndex ?? null,
      roundTotal: meta?.roundTotal ?? null,
      initialRound: meta?.initialRound ?? null,
      previousRoundTotal: meta?.previousRoundTotal ?? null,
    });
  }

  return formatLeagueMatchLabel({
    groupName: slot.group_key,
    teamA,
    teamB,
  });
}
```

---

#### 변경 6: `SortableSlotRow` 수정

**Props 변경** — `meta` 추가:
```typescript
type SortableSlotRowProps = {
  slot: ScheduleSlot;
  courts: Court[];
  tournamentId: string;
  isEditable: boolean;
  meta: TournamentSlotMeta | null; // 추가
};
```

**제거**:
- `handleTypeChange` 함수 전체 삭제
- `updateSlotTypeAction` 더 이상 호출하지 않음

**유형 칼럼 변경** — isEditable 여부와 무관하게 항상 배지(badge)로 표시:
```tsx
{/* 유형 — v3: 읽기전용 */}
<td className="px-2 py-1 w-28">
  <span
    className={`text-xs px-1.5 py-0.5 rounded ${
      slot.slot_type === "break"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700"
    }`}
  >
    {slot.slot_type === "break"
      ? "휴식"
      : slot.stage_type === "tournament"
        ? "토너먼트"
        : "조별"}
  </span>
</td>
```

**"구분" 칼럼 추가** — 유형 칼럼과 시간 칼럼 사이에 삽입:
```tsx
{/* 구분 — v3 신규 */}
<td className="px-2 py-1 w-24 text-xs text-gray-600">
  {buildSlotCategory(slot, meta?.roundIndex ?? null, meta?.roundTotal ?? null)}
</td>
```

**경기 칼럼 변경** — 포맷터 함수 적용:
```tsx
{/* 경기 정보 — v3: 포맷터 적용 */}
<td className="px-2 py-1 text-xs text-gray-700">
  {buildMatchLabel(slot, meta)}
</td>
```

---

#### 변경 7: `FlatScheduleTable` 수정

**Props 변경** — `metaBySlotId` 전달:
```typescript
type FlatScheduleTableProps = {
  slots: ScheduleSlot[];
  courts: Court[];
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>; // 추가
};
```

**헤더 칼럼 추가** — "구분" 칼럼:
```tsx
<tr className="border-b text-xs text-gray-500">
  {isEditable && <th className="px-2 py-1 w-8" />}
  <th className="px-2 py-1">유형</th>
  <th className="px-2 py-1">시간</th>
  <th className="px-2 py-1">소요(분)</th>
  <th className="px-2 py-1">구분</th>   {/* 추가 */}
  <th className="px-2 py-1">경기</th>
  <th className="px-2 py-1">코트</th>
  {isEditable && <th className="px-2 py-1" />}
</tr>
```

**`SortableSlotRow` 렌더링** — `meta` 전달:
```tsx
{slots.map((slot) => (
  <SortableSlotRow
    key={slot.id}
    slot={slot}
    courts={courts}
    tournamentId={tournamentId}
    isEditable={isEditable}
    meta={metaBySlotId.get(slot.id) ?? null}  // 추가
  />
))}
```

---

#### 변경 8: 카드 계층 구조 재구성

**현재 (v2)**:
```
ScheduleSlotsFlatBoard
  └─ CourtDivisionSection (Card: "A코트 · 중등부") × N
       └─ FlatScheduleTable
```

**변경 (v3)**:
```
ScheduleSlotsFlatBoard
  └─ CourtCard (외부 Card: "A코트") × court 수
       ├─ DivisionSection (내부 소제목/카드: "중등부")
       │    └─ FlatScheduleTable
       └─ DivisionSection (내부 소제목/카드: "고등부")
            └─ FlatScheduleTable
```

**`CourtDivisionSection` 삭제**, 대신 `CourtCard` + `DivisionSection` 두 컴포넌트로 분리.

**`DivisionSection` 컴포넌트**:
```typescript
type DivisionSectionProps = {
  divisionName: string | null;
  slots: ScheduleSlot[];
  courts: Court[];
  tournamentId: string;
  courtId: string | null;
  divisionId: string | null;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>;
};

function DivisionSection({
  divisionName,
  slots,
  courts,
  tournamentId,
  courtId,
  divisionId,
  isEditable,
  metaBySlotId,
}: DivisionSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1">
        <span className="text-sm font-medium text-gray-700">
          {divisionName ?? "디비전 미배정"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          {slots.length}개
        </span>
      </div>
      <div className="overflow-x-auto">
        <FlatScheduleTable
          slots={slots}
          courts={courts}
          tournamentId={tournamentId}
          courtId={courtId}
          divisionId={divisionId}
          isEditable={isEditable}
          metaBySlotId={metaBySlotId}
        />
      </div>
    </div>
  );
}
```

**`CourtCard` 컴포넌트**:
```typescript
type CourtCardProps = {
  courtName: string | null;
  courtId: string | null;
  divisions: ScheduleSlotFlatDivisionGroup[];
  courts: Court[];
  tournamentId: string;
  isEditable: boolean;
  metaBySlotId: Map<string, TournamentSlotMeta>;
};

function CourtCard({
  courtName,
  courtId,
  divisions,
  courts,
  tournamentId,
  isEditable,
  metaBySlotId,
}: CourtCardProps) {
  const totalSlots = divisions.reduce((sum, d) => sum + d.slots.length, 0);

  return (
    <Card className="space-y-3">
      {/* 코트 헤더 */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {courtName ?? "코트 미배정"}
        </span>
        <span className="ml-auto text-xs text-gray-400">
          총 {totalSlots}개
        </span>
      </div>
      {/* 디비전별 섹션 */}
      <div className="space-y-4 divide-y divide-gray-100">
        {divisions.map((divGroup) => {
          const divisionId = divGroup.division?.id ?? null;
          const divisionName = divGroup.division?.name ?? null;

          return (
            <DivisionSection
              key={divisionId ?? "none"}
              divisionName={divisionName}
              slots={divGroup.slots}
              courts={courts}
              tournamentId={tournamentId}
              courtId={courtId}
              divisionId={divisionId}
              isEditable={isEditable}
              metaBySlotId={metaBySlotId}
            />
          );
        })}
      </div>
    </Card>
  );
}
```

**`ScheduleSlotsFlatBoard` 루트 컴포넌트 변경**:
```tsx
export default function ScheduleSlotsFlatBoard({
  groups,
  courts,
  tournamentId,
  isEditable = false,
}: Props) {
  if (groups.length === 0) {
    return <p className="text-sm text-gray-500">생성된 스케줄 이 없습니다.</p>;
  }

  // 전체 groups에 대해 tournament meta 한 번만 빌드
  const metaBySlotId = buildFlatTournamentSlotMeta(groups);

  return (
    <div className="space-y-4">
      {groups.map((courtGroup) => {
        const courtId = courtGroup.court?.id ?? null;
        const courtName = courtGroup.court?.name ?? null;

        return (
          <CourtCard
            key={courtId ?? "none"}
            courtName={courtName}
            courtId={courtId}
            divisions={courtGroup.divisions}
            courts={courts}
            tournamentId={tournamentId}
            isEditable={isEditable}
            metaBySlotId={metaBySlotId}
          />
        );
      })}
    </div>
  );
}
```

---

## 3) 구현 순서 [완료]

1. **`lib/api/schedule-slots.ts`** [완료]
   - `recalculateCourtSlotTimes` 함수 추가 (기존 `recalculateCourtDivisionSlotTimes` 아래에 추가)
   - `updateSlotDuration` — 마지막 return을 `recalculateCourtSlotTimes` 호출로 교체
   - `updateSlotCourt` — sort_order 배치 + 양쪽 코트 재계산 로직으로 교체
   - `reorderCourtDivisionSlots` — 마지막에 `recalculateCourtSlotTimes` 호출 추가

2. **`app/admin/tournaments/[id]/schedule/actions.ts`** [완료]
   - `recalculateCourtSlotTimes` import 추가
   - `recalculateCourtSlotsAction` 함수 추가

3. **`ScheduleSlotsFlatBoard.tsx`** [완료]
   - import 수정 (포맷터 추가, `updateSlotTypeAction` 제거)
   - `TournamentSlotMeta` 타입 정의
   - `buildFlatTournamentSlotMeta`, `buildSlotCategory`, `buildMatchLabel` 헬퍼 추가
   - `SortableSlotRow` 수정 (`meta` prop 추가, 유형 칼럼 읽기전용, 구분 칼럼 추가, 경기 라벨 포맷터 적용)
   - `FlatScheduleTable` 수정 (`metaBySlotId` prop 추가, 헤더 구분 칼럼 추가, Row에 meta 전달)
   - `CourtDivisionSection` 삭제 → `DivisionSection` + `CourtCard` 추가
   - `ScheduleSlotsFlatBoard` 루트 컴포넌트 수정 (groups.map → CourtCard)

---

## 4) 주의사항 및 설계 결정

### 4-1. `recalculateCourtDivisionSlotTimes` 유지
기존 함수는 삭제하지 않는다. 비록 `updateSlotDuration`과 `reorderCourtDivisionSlots`에서 더 이상 직접 호출하지 않더라도, `ScheduleSlotsBoard.tsx` 측 로직이나 추후 다른 기능에서 직접 사용할 수 있다.

### 4-2. division 정렬 기준
`recalculateCourtSlotTimes`에서 division을 정렬하는 기준은 `divisions.sort_order` 오름차순. `null` division (디비전 미배정 슬롯)은 마지막으로 처리(NULLS LAST).

### 4-3. `getInitialRoundFromRoundMap`, `compareTournamentMatchOrder` import
두 함수 모두 `lib/formatters/tournamentMatchOrder.ts`에서 이미 export되고 있음이 확인됨. FlatBoard에서 그대로 import하여 사용.

### 4-4. `buildSlotCategory`, `buildMatchLabel` 공유 여부
현재 `ScheduleSlotsBoard.tsx` 내부의 private 함수이므로 FlatBoard에서 직접 import할 수 없다. v3에서는 FlatBoard 파일 내에 동일한 로직을 재구현한다. 추후 공유 모듈 추출을 고려할 수 있으나 현재 범위에서는 불필요하다.

### 4-5. 휴식 슬롯 추가 버튼 위치
현재 `ScheduleGenerateActions.tsx`에서 court+division 단위로 break 슬롯을 추가한다. v3에서 카드 구조가 변경되어도, break 추가는 DivisionSection 레벨에서 자연스럽다. 하지만 `ScheduleGenerateActions.tsx` 변경은 이번 v3 범위에서 제외한다. 기존 위치(별도 UI 영역)를 그대로 유지.

### 4-6. 코트 이동 후 DnD 재정렬과 sort_order 관계
코트 이동 시 슬롯이 새 코트에서 `max sort_order + 1` 위치로 이동한다. 새 코트의 DivisionSection 내에서 DnD로 순서를 조정할 때 `reorderCourtDivisionSlots`를 통해 sort_order가 재배정된다. 이 흐름은 일관성 있게 유지된다.

### 4-7. TypeScript 타입 안정성
`buildFlatTournamentSlotMeta`의 `sort` 함수에서 `compareTournamentMatchOrder`의 첫 번째/두 번째 인자 타입을 맞추기 위해 `{ id, groupName, seedA, seedB, createdAt }` 객체를 직접 생성한다. `ScheduleSlotMatch`의 `seedA`, `seedB`는 `number | null`이므로 그대로 전달 가능.

---

## 5) 검증 기준 [완료 — npx tsc --noEmit 통과 (exit code 0)]

| 항목 | 확인 방법 |
|---|---|
| 카드 계층 표시 | 화면에서 코트 외부 카드 안에 디비전 섹션들이 분리 표시되는지 확인 |
| 구분 칼럼 표시 | 조별 슬롯은 조 이름("A조"), 토너먼트 슬롯은 라운드("8강 1경기"), 휴식슬롯은 "휴식" 표시 확인 |
| 경기 라벨 | 팀명이 있는 경우 "팀A vs 팀B" 형태, 시드 TBD는 "TBD" 표시 확인 |
| 유형 칼럼 | isEditable=true여도 select가 아닌 badge로만 표시되는지 확인 |
| 소요시간 변경 후 시간 | 특정 슬롯의 소요시간을 변경했을 때 같은 코트 내 모든 디비전 슬롯 시간이 연쇄 업데이트되는지 확인 |
| 코트 이동 후 위치 | 슬롯을 다른 코트로 이동했을 때 새 코트의 마지막 순서에 배치되는지 확인 |
| `npx tsc --noEmit` | TypeScript 에러 없음 |
