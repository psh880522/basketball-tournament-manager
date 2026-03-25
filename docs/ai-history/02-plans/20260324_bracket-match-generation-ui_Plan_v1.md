# 구현 계획: Bracket 경기 생성 UI 수정
**날짜**: 2026-03-24  
**기능명**: bracket-match-generation-ui  
**버전**: v1  
**상태**: 검토 대기 중

---

## 0. 요약

`admin/tournaments/[id]/bracket` 페이지의 경기 생성 UI와 백엔드 로직을 수정한다.  
핵심은 4가지다:

| # | 요구사항 | 난이도 |
|---|---------|--------|
| 1 | 리그 경기 생성 섹션 UI 유지 | 낮음 (이미 구현됨) |
| 2 | 토너먼트 경기 생성 — round 컬럼 삭제 + group 기반 전환 | **매우 높음** |
| 3 | 생성 결과 요약 섹션 삭제 | 낮음 |
| 4 | 경기 구조 확인 → 편집 가능 테이블 + seed 컬럼 추가 | 중간 |

> **주의**: 요구사항 2의 `round` 컬럼 삭제는 시스템 전반에 파급 영향을 준다. `lib/api/results.ts`의 `saveTournamentResult` 함수(결과 페이지 토너먼트 결과 저장 + 다음 라운드 팀 자동 배치)와 `lib/api/schedule-slots.ts`의 슬롯 생성 로직이 완전히 재작성되어야 한다.

---

## 1. 추가 설치 라이브러리

**없음.** 기존 스택(Next.js + Supabase + TypeScript + Tailwind CSS)으로 구현 가능하다.

---

## 2. 핵심 설계 결정

### 2-A. `round` 컬럼 삭제 후 토너먼트 라운드 표현 방식

**현재 방식**:
```
matches.group_id = null        → 토너먼트 경기
matches.round = 'semifinal'   → 라운드 식별
```

**변경 방식**:
```
groups.type = 'tournament'        → 토너먼트 라운드용 그룹
groups.name = 'semifinal'         → 라운드 식별자 (기존 round 값과 동일한 값 사용)
groups.order = 1..N               → 라운드 순서 (round_of_16=1, quarterfinal=2, ...)
matches.group_id = <group.id>     → 모든 경기가 group_id를 가짐
```

**선택 이유**:  
`groups` 테이블에 `type` 컬럼을 추가하여 리그(league) / 토너먼트(tournament) 그룹을 명확히 구분한다. 이렇게 하면 기존 `group_id IS NOT NULL` = 리그 경기 가정을 가진 여러 함수의 조건식을 `groups.type = 'league'`로 교체할 수 있어 의미가 명확해진다.

### 2-B. `seed` 컬럼 설계

토너먼트 경기 각 자리의 시드(순위) 번호를 저장한다.

```sql
matches.seed_a INTEGER   -- A팀 자리의 시드 번호 (예: 1위)
matches.seed_b INTEGER   -- B팀 자리의 시드 번호 (예: 4위)
```

### 2-C. 토너먼트 경기 생성 정책 변경

- **기존**: 리그가 없으면 팀 자동 배정, 리그가 있으면 미배정
- **변경**: 항상 미배정(`team_a_id = null`, `team_b_id = null`)으로 생성
- **이유**: 요구사항 명시 "경기 생성은 경기 미배정 상태로 생성"

### 2-D. 2강 추가

현재 허용값 `[4, 8, 16]`에 `2` 추가. 2강 구조:
```
groups: [{name: 'final', type: 'tournament', order: 1}, {name: 'third_place', type: 'tournament', order: 2}]
matches: final 1경기 + third_place 1경기
```

// TODO: 2강 추가는 제외 하자.

---

## 3. 변경 파일 전체 목록

### 신규 생성 파일

| 파일 경로 | 용도 |
|-----------|------|
| `supabase/migrations/0118_bracket_refactor.sql` | round 컬럼 삭제, seed 컬럼 추가, groups.type 추가 |

### 수정 파일

| 파일 경로 | 변경 규모 | 이유 |
|-----------|-----------|------|
| `lib/api/bracket.ts` | **대형** | createTournamentMatches 재작성, getBracketGenerationSummary 수정 |
| `lib/api/matches.ts` | **중형** | MatchRow 타입 수정, round 참조 쿼리 제거 |
| `lib/api/results.ts` | **대형** | TournamentMatchRow 수정, listTournamentMatchesByDivision/saveTournamentResult/getTournamentBracketProgress 재작성 |
| `lib/api/schedule-slots.ts` | **대형** | round 기반 정렬/슬롯생성 로직 → group.order 기반으로 재작성 |
| `lib/formatters/matchLabel.ts` | **소형** | round 파라미터 제거, group.name 파라미터로 대체 |
| `app/admin/tournaments/[id]/bracket/Form.tsx` | **대형** | UI 전면 개편 |
| `app/admin/tournaments/[id]/bracket/actions.ts` | **중형** | updateMatchSeedAction 추가 |
| `app/admin/tournaments/[id]/bracket/page.tsx` | **소형** | 추가 데이터 페칭 (경기 목록) |
| `app/admin/tournaments/[id]/result/components/ResultForm.tsx` | **중형** | round → group.name 표시로 수정 |

---

## 4. 단계별 구현 계획

### Step 1: DB 마이그레이션 (파일: `supabase/migrations/0118_bracket_refactor.sql`)

```sql
-- 1) groups 테이블에 type 컬럼 추가
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'league';

ALTER TABLE public.groups
  ADD CONSTRAINT groups_type_check
  CHECK (type IN ('league', 'tournament'));

-- 기존 데이터 처리: 기존 groups는 모두 league 타입 (DEFAULT로 이미 처리됨)

-- 2) matches 테이블에 seed 컬럼 추가
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS seed_a INTEGER,
  ADD COLUMN IF NOT EXISTS seed_b INTEGER;

-- 3) round 컬럼 관련 제약 제거
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_round_check;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_round_group_check;

-- 4) round 컬럼 삭제
-- ⚠️ 주의: 운영 데이터가 있는 경우 먼저 데이터 이전 후 삭제 필요
-- 현재 개발 단계이므로 직접 삭제 진행
ALTER TABLE public.matches
  DROP COLUMN IF EXISTS round;

-- 5) matches UPDATE RLS: seed 업데이트 허용 (organizer)
-- 기존 UPDATE 정책이 있으면 유지, 없으면 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matches' AND policyname = 'matches_update_organizer'
  ) THEN
    CREATE POLICY "matches_update_organizer"
      ON public.matches
      FOR UPDATE
      USING (public.is_organizer())
      WITH CHECK (public.is_organizer());
  END IF;
END $$;
```

---

### Step 2: `lib/api/bracket.ts` 수정 — createTournamentMatches 재작성

**핵심 변경**: round 대신 group을 생성하고 group_id로 경기를 연결.

```typescript
// 토너먼트 라운드 순서 정의 (group.order 기준)
const TOURNAMENT_ROUND_ORDER: Record<string, number> = {
  round_of_16: 1,
  quarterfinal: 2,
  semifinal: 3,
  final: 4,
  third_place: 5,
};

export async function createTournamentMatches(input: {
  tournamentId: string;
  divisionId: string;
  tournamentSize: number; // 2 | 4 | 8 | 16
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // 1. 권한 확인
  // 2. tournamentSize 검증: [2, 4, 8, 16]
  // 3. 이미 토너먼트 그룹(type='tournament') 존재 여부 확인 → 이미 있으면 에러
  // 4. 라운드 그룹 목록 생성
  //    - 2강: [final, third_place]
  //    - 4강: [semifinal, final, third_place]
  //    - 8강: [quarterfinal, semifinal, final, third_place]
  //    - 16강: [round_of_16, quarterfinal, semifinal, final, third_place]
  // 5. groups 테이블에 type='tournament'로 각 라운드 그룹 생성
  // 6. 각 라운드별 경기 생성 (모두 team_a_id=null, team_b_id=null, status='scheduled')
  //    - initial round: tournamentSize/2 경기
  //    - 이후 라운드: 1/2씩 줄어듦 (semifinal=2, final=1, third_place=1)
  // 7. 생성 완료 반환

  // ── 라운드 구조 정의 ──
  const roundStructure: { name: string; matchCount: number }[] = (() => {
    const half = tournamentSize / 2;
    if (tournamentSize === 2) return [
      { name: 'final', matchCount: 1 },
      { name: 'third_place', matchCount: 1 },
    ];
    if (tournamentSize === 4) return [
      { name: 'semifinal', matchCount: 2 },
      { name: 'final', matchCount: 1 },
      { name: 'third_place', matchCount: 1 },
    ];
    if (tournamentSize === 8) return [
      { name: 'quarterfinal', matchCount: 4 },
      { name: 'semifinal', matchCount: 2 },
      { name: 'final', matchCount: 1 },
      { name: 'third_place', matchCount: 1 },
    ];
    // 16강
    return [
      { name: 'round_of_16', matchCount: 8 },
      { name: 'quarterfinal', matchCount: 4 },
      { name: 'semifinal', matchCount: 2 },
      { name: 'final', matchCount: 1 },
      { name: 'third_place', matchCount: 1 },
    ];
  })();

  // ── 그룹 생성 ──
  const groupDefs = roundStructure.map((r, idx) => ({
    name: r.name,
    type: 'tournament',
    order: TOURNAMENT_ROUND_ORDER[r.name] ?? (idx + 1),
  }));
  const groupsResult = await createGroups(divisionId, groupDefs); // type 파라미터 추가 필요
  // ...

  // ── 경기 생성 ──
  const matchEntries = [];
  for (const { group, matchCount } of zip(groups, roundStructure)) {
    for (let i = 0; i < matchCount; i++) {
      matchEntries.push({
        tournament_id: tournamentId,
        division_id: divisionId,
        group_id: group.id,
        team_a_id: null,
        team_b_id: null,
        status: 'scheduled',
        court_id: null,
      });
    }
  }
  return createMatches(matchEntries);
}
```

**BracketGenerationSummary 타입 수정**:
```typescript
// 변경 전
export type BracketTournamentRoundSummary = {
  round: string;  // matches.round 값
  matches: BracketMatchSummary[];
};

// 변경 후
export type BracketTournamentRoundSummary = {
  groupId: string;
  roundName: string;     // groups.name (e.g. 'semifinal')
  roundOrder: number;    // groups.order
  matches: BracketMatchSummary[];
};

// BracketMatchSummary에 seed 추가
export type BracketMatchSummary = {
  id: string;
  teamAName: string;
  teamBName: string;
  isAssigned: boolean;
  seedA: number | null;  // 추가
  seedB: number | null;  // 추가
};
```

**getBracketGenerationSummary 수정**:  
- `matches` 조회 시 `groups(id,name,order,type)` 조인
- `round` 분기 로직 → `groups.type === 'tournament'` 분기로 변경

---

### Step 3: `lib/api/matches.ts` 수정

**MatchRow 타입 수정**:
```typescript
export type MatchRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  group_id: string | null;
  // round: string | null;  ← 삭제
  seed_a: number | null;  // 추가
  seed_b: number | null;  // 추가
  team_a_id: string;
  team_b_id: string;
  court_id: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  // 조인 필드들...
  groups: { id: string; name: string; order: number; type: string } | null;  // type 추가
};
```

**수정할 쿼리들**:
- `getMatchesByTournament`: select 문에서 `round` 제거, `seed_a,seed_b` 추가
- `getMatchById`: `round` 제거, `seed_a,seed_b` 추가
- `getTournamentMatchesByDivision`: 조건 `.is("group_id", null)` → groups.type 기반으로 변경
- `getTournamentMatchesByRound`: 함수 시그니처 변경 또는 삭제 (round 대신 groupId 사용)
- `listMatchesForResultEntry`: `round` select 제거
- `listTournamentMatches`: `round` select/정렬 수정

**seed 업데이트 함수 추가**:
```typescript
export async function updateMatchSeeds(
  matchId: string,
  seedA: number | null,
  seedB: number | null
): Promise<ApiResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('matches')
    .update({ seed_a: seedA, seed_b: seedB })
    .eq('id', matchId)
    .select('id')
    .single();
  return { data, error: error ? error.message : null };
}
```

---

### Step 4: `lib/api/results.ts` 수정 (가장 복잡한 부분)

**TournamentMatchRow 타입 수정**:
```typescript
export type TournamentMatchRow = {
  id: string;
  division_id: string;
  group_id: string | null;     // 추가
  // round: string | null;     ← 삭제
  group: { id: string; name: string; order: number } | null;  // 추가 (조인)
  status: string;
  score_a: number | null;
  score_b: number | null;
  // ... 기타 필드
};
```

**listTournamentMatchesByDivision 수정**:
```typescript
// 변경 전: .is("group_id", null) 조건
// 변경 후: groups.type = 'tournament' 조건으로 조회
async function listTournamentMatchesByDivision(divisionId: string) {
  // groups!inner(id,name,order,type) 조인 + type='tournament' 필터
  const { data, error } = await supabase
    .from('matches')
    .select('...id,...,group:groups!matches_group_id_fkey!inner(id,name,order,type)')
    .eq('division_id', divisionId)
    .eq('group.type', 'tournament')
    .order('group.order', { ascending: true })
    .order('created_at', { ascending: true });
}
```

**saveTournamentResult 재작성** (핵심 변경):
```typescript
// 변경 전: round 값을 key로 nextRoundMap 으로 다음 라운드 조회
// 변경 후: 현재 경기의 group.order + 1에 해당하는 그룹의 경기에 배치

async function saveTournamentResult({ matchId, scoreA, scoreB }) {
  // 1. 경기 조회 (group_id, group.order, group.name 포함)
  const match = await getMatch(matchId, 'id,division_id,group_id,team_a_id,team_b_id,group:groups!inner(id,name,order,type)');

  // 2. 토너먼트 경기 확인 (group.type === 'tournament')
  if (match.group?.type !== 'tournament') return error('토너먼트 경기가 아닙니다.');
  
  // 3. 결과 저장
  await updateMatch(matchId, { score_a, score_b, status: 'completed', winner_team_id });

  // 4. 다음 라운드 그룹 조회 (order + 1, 단 third_place는 special 처리)
  const currentGroupName = match.group.name;
  const currentGroupOrder = match.group.order;
  
  // 결승/3위전은 다음 라운드 없음
  if (currentGroupName === 'final' || currentGroupName === 'third_place') {
    return { ok: true, message: currentGroupName === 'final' ? '우승 확정' : '저장 완료' };
  }

  // 다음 그룹 조회 (같은 division의 tournament 타입 그룹 중 order = currentOrder + 1)
  // 단, third_place와 final은 순서가 겹칠 수 있으므로 name으로도 필터
  const nextGroup = await getNextGroup(match.division_id, currentGroupOrder + 1, 'tournament');
  
  // 4강이면 3위전도 처리
  if (currentGroupName === 'semifinal' ) {
    // 승자 → final, 패자 → third_place
    await assignToNextRound(match, winnerTeamId, nextGroup.finalGroup);
    await assignToNextRound(match, loserTeamId, nextGroup.thirdPlaceGroup);
  } else {
    // 현재 경기 순서 기반 다음 슬롯 계산 (index / 2)
    await assignToNextRound(match, winnerTeamId, nextGroup);
  }
}
```

**getTournamentBracketProgress 재작성**:
```typescript
// round 기반 Map → group.order 기반 Map으로 변경
// 정렬: group.order 순서로 라운드 순서 결정
async function getTournamentBracketProgress(divisionId: string) {
  const matches = await listTournamentMatchesByDivision(divisionId); // groups 조인 포함
  
  // group.order 순서로 라운드 그룹화
  const groupMap = new Map<string, { group, matches[] }>();
  matches.forEach(match => {
    const key = match.group.name;
    if (!groupMap.has(key)) groupMap.set(key, { group: match.group, matches: [] });
    groupMap.get(key).matches.push(match);
  });
  
  // order 순으로 정렬하여 progressRounds 구성
  // 나머지 로직은 동일하되 round 대신 group.name, group.order 사용
}
```

---

### Step 5: `lib/api/schedule-slots.ts` 수정

**영향받는 부분**:
1. `ScheduleSlotMatch.round` 필드 제거 → `groupName`, `groupOrder` 로 대체
2. `getScheduleSlots` 쿼리에서 `round` 제거
3. `seedTournamentMatchSlotsFromBracket` 내 정렬 로직:
   - `roundIndex.get(match.round)` → `match.group?.order` 기반으로 변경
4. 토너먼트 경기 필터링: `.filter(m => !m.group_id)` → `.filter(m => m.group?.type === 'tournament')`

```typescript
// 변경 전
export type ScheduleSlotMatch = {
  round: string | null;  // 삭제
  // ...
};

// 변경 후
export type ScheduleSlotMatch = {
  groupName: string | null;   // 추가
  groupOrder: number | null;  // 추가
  // ...
};

// 정렬 로직 변경
.sort((a, b) => {
  // 변경 전: roundIndex.get(a.round) 
  // 변경 후: a.groupOrder ?? 999
  const orderA = a.groupOrder ?? 999;
  const orderB = b.groupOrder ?? 999;
});
```

---

### Step 6: `lib/formatters/matchLabel.ts` 수정

```typescript
// 변경 전
type TournamentLabelInput = {
  round?: string | null;
  // ...
};

// 변경 후
type TournamentLabelInput = {
  groupName?: string | null;  // round → groupName으로 이름 변경
  // ...
};

// formatTournamentMatchLabel 내부: round → groupName 참조
// formatRoundLabel: 파라미터명 변경 (로직은 동일, name 값이 같으므로)
```

---

### Step 7: Bracket Page 데이터 페칭 추가 (`page.tsx`)

```typescript
// 현재: getBracketGenerationSummary만 호출
// 추가: 경기 목록 조회 (getMatchesByTournament 또는 별도 함수)

const [summaryResult, matchesResult] = await Promise.all([
  getBracketGenerationSummary(id),
  getMatchesByTournamentForBracket(id),  // 신규 함수 또는 기존 활용
]);

// BracketConsoleForm에 matches prop 추가로 전달
<BracketConsoleForm
  tournamentId={id}
  summary={summary}
  matches={matches}   // 추가
/>
```

---

### Step 8: `app/admin/tournaments/[id]/bracket/Form.tsx` 전면 개편

**UI 구조 변경**:

```
1. 조/경기 생성 콘솔 헤더 (대회명, 디비전 현황) → 유지

2. 리그 경기 생성 섹션 → 거의 유지
   - 디비전 드롭다운: 유지
   - 그룹 크기 숫자 입력: 유지
   - 리그 경기 생성 버튼: 유지

3. 토너먼트 경기 생성 섹션 → 수정
   - 디비전 드롭다운: 유지
   - 토너먼트 크기: <input type="number"> → <select> (2/4/8/16강)
   - 토너먼트 경기 생성 버튼: 유지

4. 생성 결과 요약 섹션 → 삭제

5. 경기 구조 확인 섹션 → 편집 가능 테이블로 교체
   - 리그 경기: 조별 경기 테이블 (read-only, result 페이지 참고)
   - 토너먼트 경기: 라운드별 경기 테이블 (seed 편집 가능)
```

**State 추가**:
```typescript
// seed 편집용
const [seedValues, setSeedValues] = useState<Record<string, { seedA: string; seedB: string }>>({});
const [savingSeedId, setSavingSeedId] = useState<string | null>(null);
const [seedRowMessages, setSeedRowMessages] = useState<Record<string, Message>>({});
```

**토너먼트 경기 테이블 UI** (result 페이지 테이블 패턴 참고):
```tsx
<table className="w-full table-fixed text-sm">
  <thead>
    <tr>
      <th>라운드</th>
      <th>시드A</th>
      <th>팀A</th>
      <th>VS</th>
      <th>팀B</th>
      <th>시드B</th>
      <th>상태</th>
      <th>저장</th>
    </tr>
  </thead>
  <tbody>
    {tournamentRounds.flatMap(round =>
      round.matches.map(match => (
        <tr key={match.id}>
          <td>{round.roundLabel}</td>
          <td>
            <input type="number" value={seedValues[match.id]?.seedA ?? ''}
              onChange={...} className="w-14 border rounded px-1.5 py-1 text-center text-sm" />
          </td>
          <td>{match.teamAName}</td>
          <td className="text-gray-400 text-center">VS</td>
          <td>{match.teamBName}</td>
          <td>
            <input type="number" value={seedValues[match.id]?.seedB ?? ''}
              onChange={...} className="w-14 border rounded px-1.5 py-1 text-center text-sm" />
          </td>
          <td>
            <span className={statusClass(match.status)}>{statusLabel(match.status)}</span>
            {seedRowMessages[match.id] && <div className="text-xs mt-0.5">...</div>}
          </td>
          <td>
            <button onClick={() => handleSaveSeed(match.id)} disabled={savingSeedId === match.id}>
              {savingSeedId === match.id ? '저장 중...' : '저장'}
            </button>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>
```

**handleSaveSeed 로직**:
```typescript
const handleSaveSeed = (matchId: string) => {
  const vals = seedValues[matchId] ?? { seedA: '', seedB: '' };
  const seedA = vals.seedA === '' ? null : Number(vals.seedA);
  const seedB = vals.seedB === '' ? null : Number(vals.seedB);

  setSavingSeedId(matchId);
  startSeedTransition(async () => {
    const result = await updateMatchSeedAction({ matchId, seedA, seedB });
    setSavingSeedId(null);
    setSeedRowMessages(prev => ({
      ...prev,
      [matchId]: result.ok
        ? { tone: 'success', text: '저장 완료' }
        : { tone: 'error', text: result.error },
    }));
    if (result.ok) {
      setTimeout(() => setSeedRowMessages(prev => ({ ...prev, [matchId]: null })), 1200);
    }
  });
};
```

---

### Step 9: `app/admin/tournaments/[id]/bracket/actions.ts`에 seed 저장 Action 추가

```typescript
export async function updateMatchSeedAction(input: {
  matchId: string;
  seedA: number | null;
  seedB: number | null;
}): Promise<ActionResult> {
  const auth = await getUserWithRole();
  if (auth.status !== 'ready' || auth.role !== 'organizer') {
    return { ok: false, error: '권한이 없습니다.' };
  }

  const { matchId, seedA, seedB } = input;
  if (!matchId) return { ok: false, error: '경기 ID가 없습니다.' };

  // seed 값 유효성: null 또는 양의 정수
  if (seedA !== null && (!Number.isInteger(seedA) || seedA < 1)) {
    return { ok: false, error: '시드A는 1 이상의 정수여야 합니다.' };
  }
  if (seedB !== null && (!Number.isInteger(seedB) || seedB < 1)) {
    return { ok: false, error: '시드B는 1 이상의 정수여야 합니다.' };
  }

  const result = await updateMatchSeeds(matchId, seedA, seedB); // lib/api/matches.ts
  if (result.error) return { ok: false, error: result.error };

  revalidatePath(`/admin/tournaments/.../bracket`); // tournamentId 필요 → input에 추가
  return { ok: true };
}
```

---

### Step 10: `app/admin/tournaments/[id]/result/components/ResultForm.tsx` 수정

`round` 참조 부분을 `group.name` 참조로 교체:
- `roundLabelMap[match.round]` → `roundLabelMap[match.group?.name ?? '']`
- `match.round` 기반 구분자 → `match.group?.name` 기반으로

---

## 5. 구현 순서 (의존성 고려)

```
1. DB 마이그레이션 (Step 1)
   ↓
2. lib/api/matches.ts — 타입 및 쿼리 수정 (Step 3)
   ↓
3. lib/api/bracket.ts — createTournamentMatches, getBracketGenerationSummary 재작성 (Step 2)
   ↓
4. lib/api/results.ts — TournamentMatchRow, listTournament..., saveTournamentResult, getTournamentBracketProgress 재작성 (Step 4)
   ↓
5. lib/api/schedule-slots.ts — round 참조 제거 (Step 5)
   ↓
6. lib/formatters/matchLabel.ts — 파라미터명 변경 (Step 6)
   ↓
7. app/admin/.../bracket/actions.ts — updateMatchSeedAction 추가 (Step 9)
   ↓
8. app/admin/.../bracket/page.tsx — 데이터 페칭 확장 (Step 7)
   ↓
9. app/admin/.../bracket/Form.tsx — UI 전면 개편 (Step 8)
   ↓
10. app/admin/.../result/components/ResultForm.tsx — round 참조 수정 (Step 10)
```

---

## 6. 트레이드오프 및 고려사항

### 6-A. `round` 컬럼 삭제의 파급 범위 (가장 큰 리스크)

`saveTournamentResult` 함수는 결과 페이지에서 토너먼트 경기 결과를 저장하고 **다음 라운드 경기에 승자를 자동 배치**하는 핵심 로직이다. 이 로직 전체가 `round` 컬럼에 의존하고 있어, 변경 시 결과 페이지 동작이 완전히 깨진다. **DB 마이그레이션과 results.ts 수정을 반드시 한 세트로 진행해야 한다.**

### 6-B. `schedule-slots.ts`의 광범위한 round 의존성

`seedTournamentMatchSlotsFromBracket` 함수(스케줄  자동 생성 기능)가 `round` 기반으로 경기를 정렬하고 있다. 변경 후에는 `groups.order`를 기준으로 정렬해야 하며, 이 정렬 로직이 잘못되면 스케줄 페이지의 슬롯 순서가 망가질 수 있다. **schedule 페이지까지 통합 테스트 필요.**

### 6-C. `third_place`와 `final`의 group.order 충돌 가능성

두 라운드 모두 "최종 라운드" 범주에 있지만 order가 다르다 (`final: 4`, `third_place: 5`). `saveTournamentResult`에서 `semifinal` 경기 완료 시 승자는 `final(order=4)`, 패자는 `third_place(order=5)` 그룹으로 각각 배치해야 한다. **이름 기반(`name === 'final'`)으로 직접 조회하는 방식**이 더 안전하다.

### 6-D. 기존 데이터 이전 문제

현재 DB에 `round` 컬럼을 가진 토너먼트 경기가 존재한다면, 마이그레이션 전에 해당 데이터를 group 기반으로 변환하는 데이터 이전 스크립트가 필요하다. **개발 단계라면 DB를 초기화하거나 리시드하는 방식으로 처리 가능하다.** 운영 데이터가 있다면 추가 데이터 이전 SQL이 필요하다.

### 6-E. 토너먼트 경기와 리그 경기의 group 기반 구분

변경 후 두 경기 모두 `group_id`를 가지므로 `group_id IS NOT NULL` 조건만으로는 리그 경기를 구분할 수 없다. `groups.type` 컬럼(`league` | `tournament`)으로 명확히 구분하는 방식을 선택했다. 단, Supabase PostgREST에서 조인된 컬럼으로 필터링하는 방식(`.eq('group.type', 'tournament')`)을 지원하는지 확인이 필요하다. 지원하지 않는 경우 **`matches.stage_type` 컬럼(TEXT, `league` | `tournament`)을 직접 matches 테이블에 추가**하는 대안을 선택해야 한다.

### 6-F. 토너먼트 크기 드롭다운 — 2강 추가

현재 코드에는 2강 지원이 없다. 2강은 `final 1경기 + third_place 1경기`로 구성된다. 이는 단순한 로직이지만 `roundStructure` 정의에 명시적으로 추가해야 한다.

### 6-G. `lib/api/bracket.ts::createGroups` 함수 시그니처 변경

현재 `createGroups`는 `{ name, order }` 배열을 받는다. `type` 필드를 추가하려면 파라미터 타입을 `{ name, order, type? }` 형태로 확장해야 한다. 이 함수는 bracket.ts 내부에서만 사용되므로 하위 호환성 이슈는 없다.

---

## 7. 검증 체크리스트 (구현 완료 후)

- [ ] 리그 경기 생성 → 조별 경기 테이블에 표시됨
- [ ] 토너먼트 경기 생성 → 라운드별 경기 테이블에 표시됨 (모두 TBD 상태)
- [ ] 토너먼트 크기 드롭다운: 2/4/8/16강 선택 가능
- [ ] 생성 결과 요약 섹션 없음
- [ ] 토너먼트 경기 테이블에서 시드(seed) 입력 및 저장 가능
- [ ] result 페이지에서 토너먼트 결과 저장 정상 동작 (다음 라운드 팀 자동 배치)
- [ ] result 페이지 라운드 레이블 정상 표시
- [ ] schedule 페이지 슬롯 생성 정상 동작 (토너먼트 경기 정렬 순서 유지)
- [ ] RLS 오류 없음 (seed 업데이트, group INSERT/DELETE)
