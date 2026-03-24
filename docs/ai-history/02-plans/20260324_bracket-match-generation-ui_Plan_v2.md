# 구현 계획: Bracket 경기 생성 UI 수정
**날짜**: 2026-03-24  
**기능명**: bracket-match-generation-ui  
**버전**: v2  
**상태**: 검토 대기 중  
**변경 이력**: v1 → v2 — 2강(tournamentSize=2) 지원 제외

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

### 2-D. 지원 토너먼트 크기

**지원 크기**: `4 | 8 | 16` (2강은 지원하지 않음)

각 크기별 라운드 구조:

| 크기 | 초기 라운드 | 전체 그룹(라운드) 구성 |
|------|------------|----------------------|
| 4강  | semifinal  | semifinal(2경기) + final(1경기) + third_place(1경기) |
| 8강  | quarterfinal | quarterfinal(4경기) + semifinal(2경기) + final(1경기) + third_place(1경기) |
| 16강 | round_of_16 | round_of_16(8경기) + quarterfinal(4경기) + semifinal(2경기) + final(1경기) + third_place(1경기) |

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
| `lib/api/matches.ts` | **중형** | MatchRow 타입 수정, round 참조 쿼리 제거, updateMatchSeeds 함수 추가 |
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
  tournamentSize: number; // 4 | 8 | 16
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // 1. 권한 확인
  // 2. tournamentSize 검증: [4, 8, 16]만 허용
  // 3. 이미 토너먼트 그룹(type='tournament') 존재 여부 확인 → 이미 있으면 에러
  // 4. 라운드 구조 결정
  // 5. groups 테이블에 type='tournament'로 각 라운드 그룹 생성
  // 6. 각 라운드별 경기 생성 (모두 team_a_id=null, team_b_id=null, status='scheduled')
  // 7. 생성 완료 반환

  // ── 라운드 구조 정의 (4/8/16강만 지원) ──
  const roundStructure: { name: string; matchCount: number }[] = (() => {
    if (tournamentSize === 4) return [
      { name: 'semifinal',   matchCount: 2 },
      { name: 'final',       matchCount: 1 },
      { name: 'third_place', matchCount: 1 },
    ];
    if (tournamentSize === 8) return [
      { name: 'quarterfinal', matchCount: 4 },
      { name: 'semifinal',    matchCount: 2 },
      { name: 'final',        matchCount: 1 },
      { name: 'third_place',  matchCount: 1 },
    ];
    // 16강
    return [
      { name: 'round_of_16', matchCount: 8 },
      { name: 'quarterfinal', matchCount: 4 },
      { name: 'semifinal',    matchCount: 2 },
      { name: 'final',        matchCount: 1 },
      { name: 'third_place',  matchCount: 1 },
    ];
  })();

  // ── 그룹 생성 ──
  const groupDefs = roundStructure.map((r) => ({
    name: r.name,
    type: 'tournament' as const,
    order: TOURNAMENT_ROUND_ORDER[r.name] ?? 99,
  }));
  const groupsResult = await createGroups(divisionId, groupDefs); // type 파라미터 추가 필요
  // ...

  // ── 경기 생성 (모두 미배정 상태) ──
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
- `getTournamentMatchesByRound`: 함수 목적이 소멸 → 삭제 또는 groupId 기반으로 교체
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
// 변경 후: groups.type = 'tournament' 조인 필터로 조회
async function listTournamentMatchesByDivision(divisionId: string) {
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
// 변경 전: round 값을 key로 nextRoundMap으로 다음 라운드 조회
// 변경 후: 현재 경기의 group.name 기반으로 다음 라운드 그룹을 직접 이름으로 조회

const NEXT_ROUND_NAME: Record<string, string | null> = {
  round_of_16: 'quarterfinal',
  quarterfinal: 'semifinal',
  semifinal: 'final',
  final: null,
  third_place: null,
};

async function saveTournamentResult({ matchId, scoreA, scoreB }) {
  // 1. 경기 조회 (group_id, group.name, group.order, group.type 포함)
  const match = await getMatch(matchId, 'id,division_id,group_id,team_a_id,team_b_id,group:groups!inner(id,name,order,type)');

  // 2. 토너먼트 경기 확인 (group.type === 'tournament')
  if (match.group?.type !== 'tournament') return error('토너먼트 경기가 아닙니다.');

  // 3. 결과 저장 (score_a, score_b, status='completed', winner_team_id)
  await updateMatch(matchId, { ... });

  const currentGroupName = match.group.name;

  // 4. 결승/3위전은 다음 라운드 없음 → 종료
  if (currentGroupName === 'final' || currentGroupName === 'third_place') {
    return { ok: true, message: currentGroupName === 'final' ? '우승 확정' : '저장 완료' };
  }

  // 5. 다음 라운드 그룹 이름 결정
  const nextGroupName = NEXT_ROUND_NAME[currentGroupName] ?? null;
  if (!nextGroupName) return { ok: true, message: '저장 완료' };

  // 6. 같은 division의 토너먼트 그룹 중 name=nextGroupName인 그룹 조회
  const nextGroup = await getGroupByDivisionAndName(match.division_id, nextGroupName, 'tournament');

  // 7. 4강(semifinal)이면 패자 → third_place도 처리
  if (currentGroupName === 'semifinal') {
    const thirdPlaceGroup = await getGroupByDivisionAndName(match.division_id, 'third_place', 'tournament');
    // 승자 → final 그룹의 적절한 슬롯
    await assignTeamToGroup(match, winnerTeamId, nextGroup);
    // 패자 → third_place 그룹의 적절한 슬롯
    await assignTeamToGroup(match, loserTeamId, thirdPlaceGroup);
  } else {
    // 현재 경기 인덱스(index / 2)로 다음 슬롯 계산
    await assignTeamToGroup(match, winnerTeamId, nextGroup);
  }
}
```

**getTournamentBracketProgress 재작성**:
```typescript
// round 기반 Map → group.order 기반 Map으로 변경
async function getTournamentBracketProgress(divisionId: string) {
  const matches = await listTournamentMatchesByDivision(divisionId); // groups 조인 포함

  // group.name으로 그룹화, group.order 순으로 정렬
  const groupMap = new Map<string, { group: GroupInfo; matches: TournamentMatchRow[] }>();
  matches.forEach(match => {
    const key = match.group?.name ?? '';
    if (!groupMap.has(key)) groupMap.set(key, { group: match.group!, matches: [] });
    groupMap.get(key)!.matches.push(match);
  });

  // order 순으로 정렬하여 progressRounds 구성
  // round 관련 로직은 group.name/group.order로 대체
  // roundLabelMap은 동일하게 group.name을 key로 사용 (값이 같으므로 재사용 가능)
}
```

---

### Step 5: `lib/api/schedule-slots.ts` 수정

**영향받는 부분**:
1. `ScheduleSlotMatch.round` 필드 제거 → `groupName`, `groupOrder` 로 대체
2. `getScheduleSlots` 쿼리에서 `round` select 제거
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
  groupName: string | null;   // 추가 (기존 round 역할)
  groupOrder: number | null;  // 추가 (정렬용)
  // ...
};

// 정렬 로직 변경
.sort((a, b) => {
  // 변경 전: roundIndex.get(a.round)
  // 변경 후: a.groupOrder ?? 999
  const orderA = a.groupOrder ?? 999;
  const orderB = b.groupOrder ?? 999;
  if (orderA !== orderB) return orderA - orderB;
  // ... 나머지 기준
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
  groupName?: string | null;  // round → groupName으로 이름 변경 (값은 동일, 'semifinal' 등)
  // ...
};

// formatTournamentMatchLabel 내부: round 참조 → groupName 참조로 교체
// formatRoundLabel: 파라미터명 변경 (ROUND_LABELS 맵의 key는 그대로 유지)
```

---

### Step 7: Bracket Page 데이터 페칭 추가 (`page.tsx`)

```typescript
// 현재: getBracketGenerationSummary만 호출
// 변경: summary 안에 경기 데이터가 포함되어 있으므로 별도 호출 불필요
// → getBracketGenerationSummary가 BracketMatchSummary에 seedA/seedB를 포함하도록 수정하면 충분

// BracketConsoleForm props: 기존 summary만으로 유지 가능
// (seed 저장 후 revalidatePath로 페이지 전체 재검증)
<BracketConsoleForm
  tournamentId={id}
  summary={summary}
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
   - 토너먼트 크기: <input type="number"> → <select> (4강/8강/16강)
   - 토너먼트 경기 생성 버튼: 유지

4. 생성 결과 요약 섹션 → 삭제

5. 경기 구조 확인 섹션 → 편집 가능 테이블로 교체
   - 리그 경기: 조별 경기 테이블 (read-only)
   - 토너먼트 경기: 라운드별 경기 테이블 (seed 입력/저장 가능)
```

**토너먼트 크기 드롭다운 (4/8/16강)**:
```tsx
<select
  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
  value={tournamentSize}
  onChange={(e) => setTournamentSize(e.target.value)}
>
  <option value="">선택</option>
  <option value="4">4강</option>
  <option value="8">8강</option>
  <option value="16">16강</option>
</select>
```

**State 추가**:
```typescript
// seed 편집용
const [seedValues, setSeedValues] = useState<Record<string, { seedA: string; seedB: string }>>({});
const [savingSeedId, setSavingSeedId] = useState<string | null>(null);
const [seedRowMessages, setSeedRowMessages] = useState<Record<string, Message>>({});
const [isSeedPending, startSeedTransition] = useTransition();
```

**초기 seed 값 로드** (기존 저장된 seed 표시):
```typescript
// summary.divisions[].tournamentRounds[].matches[].seedA/seedB 를 초기값으로 세팅
useEffect(() => {
  const initial: Record<string, { seedA: string; seedB: string }> = {};
  summary.divisions.forEach(div => {
    div.tournamentRounds.forEach(round => {
      round.matches.forEach(match => {
        initial[match.id] = {
          seedA: match.seedA !== null ? String(match.seedA) : '',
          seedB: match.seedB !== null ? String(match.seedB) : '',
        };
      });
    });
  });
  setSeedValues(initial);
}, [summary]);
```

**토너먼트 경기 테이블 UI** (result 페이지 테이블 패턴 참고):
```tsx
<section className="space-y-3">
  <h2 className="text-xl font-semibold">경기 구조 확인</h2>
  {divisions.map(division => (
    <Card key={division.id} className="space-y-3">
      <h3 className="text-lg font-semibold">{division.name}</h3>

      {/* 리그(조별) 경기 테이블 */}
      {division.groups.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">조별 경기</p>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-3 py-2">조</th>
                  <th className="px-3 py-2">경기</th>
                  <th className="px-3 py-2 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {division.groups.flatMap(group =>
                  group.matches.map(match => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500">{group.name}</td>
                      <td className="px-3 py-2 font-medium">
                        {match.teamAName} vs {match.teamBName}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={statusClass(match.isAssigned ? 'assigned' : 'unassigned')}>
                          {match.isAssigned ? '배정' : '미배정'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 토너먼트 경기 테이블 (seed 편집 가능) */}
      {division.tournamentRounds.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">토너먼트 경기</p>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-20" />
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-8" />
                <col className="w-auto" />
                <col className="w-16" />
                <col className="w-20" />
                <col className="w-20" />
              </colgroup>
              <thead className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-3 py-2">라운드</th>
                  <th className="px-3 py-2 text-center">시드A</th>
                  <th className="px-3 py-2">팀A</th>
                  <th className="px-3 py-2 text-center">VS</th>
                  <th className="px-3 py-2">팀B</th>
                  <th className="px-3 py-2 text-center">시드B</th>
                  <th className="px-3 py-2 text-center">상태</th>
                  <th className="px-3 py-2 text-center">저장</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {division.tournamentRounds.flatMap(round =>
                  round.matches.map(match => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                        {roundLabelMap[round.roundName] ?? round.roundName}
                      </td>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                          value={seedValues[match.id]?.seedA ?? ''}
                          onChange={(e) => setSeedValues(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], seedA: e.target.value },
                          }))}
                          placeholder="-"
                        />
                      </td>
                      <td className="px-3 py-2">{match.teamAName}</td>
                      <td className="px-1 py-2 text-gray-400 text-center">VS</td>
                      <td className="px-3 py-2">{match.teamBName}</td>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          className="w-14 border rounded px-1.5 py-1 text-center text-sm"
                          value={seedValues[match.id]?.seedB ?? ''}
                          onChange={(e) => setSeedValues(prev => ({
                            ...prev,
                            [match.id]: { ...prev[match.id], seedB: e.target.value },
                          }))}
                          placeholder="-"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded ${
                          match.isAssigned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {match.isAssigned ? '배정' : '미배정'}
                        </span>
                        {seedRowMessages[match.id] && (
                          <div className={`mt-0.5 text-xs ${
                            seedRowMessages[match.id]?.tone === 'error' ? 'text-red-500' : 'text-green-600'
                          }`}>
                            {seedRowMessages[match.id]?.text}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          onClick={() => handleSaveSeed(match.id)}
                          disabled={isSeedPending || savingSeedId === match.id}
                        >
                          {savingSeedId === match.id ? '저장 중...' : '저장'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  ))}
</section>
```

**handleSaveSeed 로직**:
```typescript
const handleSaveSeed = (matchId: string) => {
  const vals = seedValues[matchId] ?? { seedA: '', seedB: '' };
  const seedA = vals.seedA === '' ? null : Number(vals.seedA);
  const seedB = vals.seedB === '' ? null : Number(vals.seedB);

  setSavingSeedId(matchId);
  startSeedTransition(async () => {
    const result = await updateMatchSeedAction({ tournamentId, matchId, seedA, seedB });
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
  tournamentId: string;   // revalidatePath에 필요
  matchId: string;
  seedA: number | null;
  seedB: number | null;
}): Promise<ActionResult> {
  const auth = await getUserWithRole();
  if (auth.status !== 'ready' || auth.role !== 'organizer') {
    return { ok: false, error: '권한이 없습니다.' };
  }

  const { tournamentId, matchId, seedA, seedB } = input;
  if (!matchId) return { ok: false, error: '경기 ID가 없습니다.' };

  // seed 값 유효성: null 또는 1 이상의 정수
  if (seedA !== null && (!Number.isInteger(seedA) || seedA < 1)) {
    return { ok: false, error: '시드A는 1 이상의 정수여야 합니다.' };
  }
  if (seedB !== null && (!Number.isInteger(seedB) || seedB < 1)) {
    return { ok: false, error: '시드B는 1 이상의 정수여야 합니다.' };
  }

  const result = await updateMatchSeeds(matchId, seedA, seedB); // lib/api/matches.ts
  if (result.error) return { ok: false, error: result.error };

  revalidatePath(`/admin/tournaments/${tournamentId}/bracket`);
  return { ok: true };
}
```

---

### Step 10: `app/admin/tournaments/[id]/result/components/ResultForm.tsx` 수정

`round` 참조 부분을 `group.name` 참조로 교체:
- `roundLabelMap[match.round]` → `roundLabelMap[match.group?.name ?? '']`
- `match.round` 기반 정렬/구분 → `match.group?.order`, `match.group?.name` 기반으로
- `getTournamentBracketProgress` 타입 변경에 따른 props 타입 조정

---

## 5. 구현 순서 (의존성 고려)

```
1. DB 마이그레이션 (Step 1)
   ↓
2. lib/api/matches.ts — 타입 및 쿼리 수정, updateMatchSeeds 추가 (Step 3)
   ↓
3. lib/api/bracket.ts — createTournamentMatches, getBracketGenerationSummary 재작성 (Step 2)
   ↓
4. lib/api/results.ts — TournamentMatchRow, listTournament..., saveTournamentResult, getTournamentBracketProgress 재작성 (Step 4)
   ↓
5. lib/api/schedule-slots.ts — round 참조 제거, group.order 기반 정렬 전환 (Step 5)
   ↓
6. lib/formatters/matchLabel.ts — 파라미터명 변경 (Step 6)
   ↓
7. app/admin/.../bracket/actions.ts — updateMatchSeedAction 추가 (Step 9)
   ↓
8. app/admin/.../bracket/page.tsx — 필요시 데이터 페칭 조정 (Step 7)
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

`seedTournamentMatchSlotsFromBracket` 함수(스케줄 슬롯 자동 생성 기능)가 `round` 기반으로 경기를 정렬하고 있다. 변경 후에는 `groups.order`를 기준으로 정렬해야 하며, 이 정렬 로직이 잘못되면 스케줄 페이지의 슬롯 순서가 망가질 수 있다. **schedule 페이지까지 통합 테스트 필요.**

### 6-C. `third_place`와 `final`의 그룹 이름 기반 조회

`saveTournamentResult`에서 `semifinal` 경기 완료 시 승자는 `final`, 패자는 `third_place` 그룹으로 각각 배치해야 한다. `group.order`만으로는 두 그룹을 구분할 수 없으므로 **이름 기반(`name === 'final'`, `name === 'third_place'`)으로 직접 조회**하는 방식이 더 안전하다. `NEXT_ROUND_NAME` 맵을 사용하여 `semifinal`의 next를 `final`로, 패자 전용 경로를 `third_place`로 명시한다.

### 6-D. 기존 데이터 이전 문제

현재 DB에 `round` 컬럼을 가진 토너먼트 경기가 존재한다면, 마이그레이션 전에 해당 데이터를 group 기반으로 변환하는 데이터 이전 스크립트가 필요하다. **개발 단계라면 DB를 초기화하거나 리시드하는 방식으로 처리 가능하다.** 운영 데이터가 있다면 추가 데이터 이전 SQL이 필요하다.

### 6-E. Supabase PostgREST 조인 필터 지원 여부

변경 후 리그/토너먼트 경기 모두 `group_id`를 가지므로 `group_id IS NOT NULL` 조건만으로는 구분할 수 없다. `groups.type` 컬럼으로 구분하려면 PostgREST의 조인 필터(`.eq('group.type', 'tournament')`)가 필요하다. 지원하지 않을 경우 **`matches` 테이블에 `stage_type TEXT` 컬럼(`'league'` | `'tournament'`)을 직접 추가**하는 대안으로 전환해야 한다. 구현 전 Supabase 버전 확인 필요.

### 6-F. `lib/api/bracket.ts::createGroups` 함수 시그니처 변경

현재 `createGroups`는 `{ name, order }` 배열을 받는다. `type` 필드를 추가하려면 파라미터 타입을 `{ name, order, type?: string }` 형태로 확장해야 한다. 이 함수는 bracket.ts 내부에서만 사용되므로 하위 호환성 이슈는 없다.

---

## 7. 검증 체크리스트 (구현 완료 후)

- [ ] 리그 경기 생성 → 조별 경기 테이블에 표시됨
- [ ] 토너먼트 경기 생성 → 라운드별 경기 테이블에 표시됨 (모두 TBD/미배정 상태)
- [ ] 토너먼트 크기 드롭다운: 4강/8강/16강 선택 가능 (2강 없음)
- [ ] 생성 결과 요약 섹션 없음
- [ ] 토너먼트 경기 테이블에서 시드(seed) 입력 및 저장 가능
- [ ] 저장된 seed 값이 페이지 재접속 시에도 표시됨
- [ ] result 페이지에서 토너먼트 결과 저장 정상 동작 (다음 라운드 팀 자동 배치)
- [ ] result 페이지 라운드 레이블 정상 표시
- [ ] schedule 페이지 슬롯 생성 정상 동작 (토너먼트 경기 순서 유지)
- [ ] RLS 오류 없음 (seed 업데이트, group INSERT/DELETE)
