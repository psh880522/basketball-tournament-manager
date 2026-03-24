# Plan: 토너먼트 경기 순서 및 스케줄 배치 정비

Date: 2026-03-24

## 1. 구현해야 할 기능 상세 설명
### 1) 토너먼트 경기 순서의 일관된 정렬 기준 도입
- 목표: 16/8/4강 모두에서 경기 순서를 시드 기준으로 고정하여 표시/배치/자동 진출이 일치하도록 한다.
- 현재 문제: created_at 기반 정렬로 인해 라벨/배치/자동진출의 기준이 어긋남.
- 변경 방향:
  - 초기 라운드(첫 토너먼트 라운드)는 `seed_a`, `seed_b`를 우선 정렬 기준으로 사용.
  - 이후 라운드는 “이전 라운드 매치 인덱스 기준” 또는 “다음 라운드 슬롯 index 기준”으로 정렬.
  - 정렬 키는 공통 유틸로 노출하여 UI/결과/스케줄이 동일한 기준을 사용.

### 2) 스케줄 생성에서 토너먼트 경기 순서를 시드 기준으로 반영
- 목표: 코트 배치가 display_order 순서를 따르되, 토너먼트 경기의 “순서”는 시드 기준으로 고정.
- 변경 방향:
  - schedule-slots 생성 로직에서 토너먼트 경기 정렬 시 created_at 대신 “시드 기반 정렬 키”를 사용.
  - 코트 배치는 기존 round-robin을 유지하되, 정렬된 리스트 순서대로 배치.

### 3) 결과 입력 후 다음 라운드 배치 기준 정비
- 목표: 경기 순서대로 다음 라운드 슬롯에 승자가 들어가도록 보장.
- 변경 방향:
  - saveTournamentResult에서 currentIndex 계산을 created_at 대신 “라운드 내 정렬 키” 기반으로 계산.
  - 라운드 내 정렬 기준을 UI와 동일하게 맞춰 index 계산.

### 4) 라벨링/표시 정렬 기준 통일
- 목표: 경기 목록, 스케줄 보드, 결과 입력 화면에서 동일한 라운드/경기 순서가 적용.
- 변경 방향:
  - buildTournamentRoundMetaByRound에 전달하는 정렬 함수에서 seed 기반 정렬을 사용.
  - 필요 시 seed_a/seed_b 정보를 목록 조회에 포함.

## 2. 추가 설치가 필요한 라이브러리
- 없음.
  - 기존 Next.js + Supabase + TS 범위 내에서 구현 가능.

## 3. 변경될 파일 및 추가될 파일
### 변경 예정
- lib/api/schedule-slots.ts
- lib/api/results.ts
- lib/api/matches.ts
- app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx
- app/admin/tournaments/[id]/matches/page.tsx
- app/admin/tournaments/[id]/result/components/ResultForm.tsx
- lib/formatters/tournamentRoundMeta.ts (또는 신규 유틸로 분리)
- lib/formatters/matchLabel.ts (필요 시 정렬 키용 helper 추가)

### 추가 예정
- lib/formatters/tournamentMatchOrder.ts (신규, 공통 정렬 키 유틸)

## 4. 파일별 구현 스니펫 (Pseudocode)
### A) lib/formatters/tournamentMatchOrder.ts (신규)
```ts
// 입력: 라운드명, seed_a/b, created_at, group.order 등
// 출력: 정렬에 사용하는 key
export function buildTournamentMatchSortKey(input) {
  if (input.isInitialRound) {
    // seed 기준 정렬 우선
    // seed_a asc, seed_b desc (또는 seed_b asc)
    return [0, seed_a ?? 999, seed_b ?? 999, created_at];
  }

  // 이후 라운드: roundIndex 기반 정렬
  // roundIndex는 이전 라운드 매치 인덱스 또는 slot 기준으로 계산
  return [1, roundIndex ?? 999, created_at];
}

export function sortTournamentMatches(a, b) {
  const keyA = buildTournamentMatchSortKey(a);
  const keyB = buildTournamentMatchSortKey(b);
  return compareTuple(keyA, keyB);
}
```

### B) lib/api/matches.ts
```ts
// listTournamentMatches, listMatchesForResultEntry 등에서
// seed_a/seed_b를 select에 포함
select("..., seed_a, seed_b, ...")
```

### C) lib/api/schedule-slots.ts (generateScheduleSlots)
```ts
// tournamentMatches 정렬 변경
const tournamentMatches = matches
  .filter(type === "tournament")
  .sort((a, b) => sortTournamentMatches(a, b));
```

### D) lib/api/results.ts (saveTournamentResult)
```ts
// currentIndex 계산 시 created_at 정렬 대신
// sortTournamentMatches 기준으로 정렬한 후 index 계산
const currentMatches = fetchCurrentRoundMatches();
const ordered = currentMatches.sort(sortTournamentMatches);
const currentIndex = ordered.findIndex(m => m.id === matchId);

// nextRound slot 결정 로직은 동일
```

### E) app/admin/tournaments/[id]/schedule/components/ScheduleSlotsBoard.tsx
```tsx
// buildTournamentRoundMetaByRound 호출 시
// 기존 sortSlots 대신 sortTournamentMatches 적용
const metaById = buildTournamentRoundMetaByRound(roundBucket, {
  getId: (slot) => slot.id,
  sort: (a, b) => sortTournamentMatches(a.match, b.match),
});
```

### F) app/admin/tournaments/[id]/matches/page.tsx
```tsx
// roundMap 생성 후 meta 계산 시
// sortTournamentMatches 적용
const metaById = buildTournamentRoundMetaByRound(roundMap, {
  getId: (match) => match.id,
  sort: sortTournamentMatches,
});
```

### G) app/admin/tournaments/[id]/result/components/ResultForm.tsx
```tsx
// tournamentMetaByMatchId 계산 시
// sortTournamentMatches 적용
const metaById = buildTournamentRoundMetaByRound(roundMap, {
  getId: (match) => match.id,
  sort: sortTournamentMatches,
});
```

## 5. 트레이드 오프 및 고려 사항
- seed_a/seed_b 입력이 없는 경우 초기 라운드 정렬이 불안정할 수 있음.
  - 대안: seed 값이 없으면 created_at fallback 유지.
- 라운드 내 순서를 seed로 결정하면 기존 데이터의 created_at 기반 순서와 달라질 수 있음.
  - UI 라벨 및 자동 진출 결과가 기존과 다르게 보일 수 있음.
- 정렬 기준을 공통 유틸로 통합하면 일관성은 좋아지지만
  - 모든 호출부에서 필요한 데이터(seed_a/seed_b, roundIndex)가 필요함.
- schedule.ts(legacy)와 schedule-slots.ts가 이중으로 존재하므로,
  - 실제 운영 플로우에서 사용하는 경로에만 변경 적용 여부 확인 필요.

## 6. 계획 요약
- 공통 정렬 유틸을 추가하여 토너먼트 경기 순서를 시드 기반으로 통일.
- 스케줄 생성, 결과 자동 진출, 라벨링 계산 모두 동일한 정렬 기준 사용.
- seed_a/seed_b 조회 보강 및 UI 메타 계산 정렬 함수 교체.

---

승인 후 구현을 시작하겠습니다.
