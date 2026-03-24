# Research: Bracket Match Generation UI 수정
**날짜**: 2026-03-24  
**기능명**: bracket-match-generation-ui  
**대상 페이지**: `admin/tournaments/[id]/bracket`

---

## 1. 프로젝트 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16.1.6 (App Router) |
| 언어 | TypeScript 5.x |
| UI 스타일링 | Tailwind CSS v4 |
| 백엔드/DB | Supabase (PostgreSQL + RLS) |
| Supabase 클라이언트 | `@supabase/ssr`, `@supabase/supabase-js` |
| 상태관리 | React 19 내장 (`useState`, `useTransition`, `useMemo`) |
| 패키지 매니저 | pnpm |

### App Router 컨벤션
- **Server Component 우선**: 페이지(`page.tsx`)는 기본적으로 서버 컴포넌트
- **`'use client'` 최소화**: 인터랙션이 필요한 Form 컴포넌트에만 적용
- **Server Actions**: `actions.ts` 파일에 `'use server'` 지시어 사용
- **라우팅**: `/admin/tournaments/[id]/bracket` 형태의 동적 세그먼트

---

## 2. 디렉터리 구조 분석

```
app/
  admin/
    tournaments/
      [id]/
        bracket/
          page.tsx          ← Server Component: 인증 확인, 데이터 페칭, BracketConsoleForm 렌더
          actions.ts        ← Server Actions: generateDivisionMatches, createLeagueMatchesAction, createTournamentMatchesAction 등
          Form.tsx          ← Client Component ('use client'): 전체 UI 렌더링
          tournament/       ← (서브 경로, 상세 불명)

lib/
  api/
    bracket.ts             ← 핵심 API: getBracketGenerationSummary, createLeagueMatches, createTournamentMatches
    matches.ts             ← 경기 CRUD: getMatchesByTournament, updateMatchResult, deleteMatchesByDivision 등
    groups.ts              ← deleteGroupsByDivision
    divisions.ts           ← DivisionRow 타입, getDivisionsByTournament, updateDivision 등
    results.ts             ← 결과 페이지 전용 API: listLeagueMatchesForResult, listTournamentMatchesByDivision 등

supabase/
  migrations/              ← DB 스키마 마이그레이션 파일들
```

---

## 3. 현재 Bracket Page 상세 분석

### 3.1 `app/admin/tournaments/[id]/bracket/page.tsx`

**역할**: 서버 컴포넌트. 인증/권한 확인 후 `getBracketGenerationSummary(id)`를 호출하여 대회 요약 정보를 가져와 `BracketConsoleForm`에 전달.

**데이터 흐름**:
1. `getUserWithRole()` → 인증 체크, `organizer` 권한 확인
2. `getBracketGenerationSummary(tournamentId)` → `BracketGenerationSummary` 반환
3. `<BracketConsoleForm tournamentId={id} summary={summary} />` 렌더

### 3.2 `app/admin/tournaments/[id]/bracket/Form.tsx` (Client Component)

**현재 UI 구조** (수정 대상):
```
1. 조/경기 생성 콘솔 헤더 (대회명, 디비전 현황)
2. 리그 경기 생성 섹션
   - 디비전 선택 (드롭다운) ← 이미 존재
   - 그룹 크기 입력 (숫자) ← 이미 존재
   - 리그 경기 생성 버튼 ← 이미 존재
3. 토너먼트 경기 생성 섹션
   - 디비전 선택 (드롭다운) ← 이미 존재
   - 토너먼트 크기 입력 (number input) ← [수정 필요: 드롭다운으로 변경]
   - 토너먼트 경기 생성 버튼 ← 이미 존재
4. 생성 결과 요약 섹션 ← [삭제 대상]
5. 경기 구조 확인 섹션 (read-only 목록)
   - 리그 조별 경기 목록
   - 토너먼트 라운드별 경기 목록
   ← [수정 필요: 편집 가능한 테이블 형태로]
```

**주요 State**:
- `leagueDivisionId`, `groupSize`, `leagueMsg`, `isLeaguePending`
- `tournamentDivisionId`, `tournamentSize`, `tournamentMsg`, `isTournamentPending`

**현재 토너먼트 크기 입력 방식**:  
현재 `<input type="number">` 방식이지만 요구사항은 `2/4/8/16강 선택(드롭다운)`.

### 3.3 `app/admin/tournaments/[id]/bracket/actions.ts`

**Server Actions 목록**:
| 함수 | 역할 |
|------|------|
| `previewDivisionAction` | 미리보기 |
| `updateGroupSizeAction` | group_size 저장 |
| `generateDivisionMatches` | 기존 방식 경기 생성 (덮어쓰기 지원) |
| `seedGroupSlotsFromBracketAction` | 리그 슬롯 시딩 |
| `seedTournamentSlotsFromBracketAction` | 토너먼트 슬롯 시딩 |
| `createLeagueMatchesAction` | 리그 경기 생성 → `lib/api/bracket.ts::createLeagueMatches` 호출 |
| `createTournamentMatchesAction` | 토너먼트 경기 생성 → `lib/api/bracket.ts::createTournamentMatches` 호출 |

---

## 4. DB 스키마 상세 분석

### 4.1 `matches` 테이블 (핵심 수정 대상)

**현재 컬럼**:
```sql
CREATE TABLE public.matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL,
  division_id  uuid NOT NULL,
  group_id     uuid,                   -- 리그 경기: NOT NULL, 토너먼트: NULL
  team_a_id    uuid,                   -- nullable (0043 마이그레이션 후)
  team_b_id    uuid,                   -- nullable
  court_id     uuid,
  status       text NOT NULL DEFAULT 'scheduled',
  score_a      int,
  score_b      int,
  winner_team_id uuid,
  round        text,                   -- 토너먼트 라운드: 'round_of_16'|'quarterfinal'|'semifinal'|'final'|'third_place'
  scheduled_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

**현재 `round` 컬럼 제약**:
- `0060` 마이그레이션: `round` 컬럼 추가, check constraint `('quarterfinal','semifinal','final')`
- `0062` 마이그레이션: unique index 제거
- `0063` 마이그레이션: `'third_place'` 허용 추가
- `0064` 마이그레이션: `'round_of_16'` 허용 추가
- **현재 허용값**: `NULL | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final' | 'third_place'`

**로직적 규칙** (`matches_round_group_check` constraint):
- `group_id IS NULL` → `round IS NOT NULL` (토너먼트 경기)
- `group_id IS NOT NULL` → `round IS NULL` (리그 경기)

**요구사항 관련 변경사항**:
1. **`round` 컬럼 삭제** (요구사항 2): 토너먼트 경기에서 라운드를 `group` 테이블로 이전
2. **`seed` 컬럼 추가** (요구사항 4): `matches` 테이블에 seed 정보 추가 (team_a 시드, team_b 시드 각각?)

### 4.2 `groups` 테이블

```sql
CREATE TABLE public.groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  "order"     integer NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**요구사항 관련**: 토너먼트의 라운드를 이 테이블에서 관리. 예: `name = 'semifinal'`, `order = 1` 형태.

### 4.3 `divisions` 테이블

```sql
-- 주요 컬럼
id                     uuid PRIMARY KEY
tournament_id          uuid NOT NULL
name                   text NOT NULL
group_size             integer NOT NULL
tournament_size        int                      -- 0110 마이그레이션 추가
include_tournament_slots boolean DEFAULT false  -- 0110 마이그레이션 추가
sort_order             int DEFAULT 0            -- 0094 마이그레이션 추가
standings_dirty        boolean DEFAULT false    -- 0109 마이그레이션 추가
```

### 4.4 관련 테이블 관계도

```
tournaments
  └── divisions (tournament_id FK)
        └── groups (division_id FK)
              └── group_teams (group_id FK)
              └── matches via group_id (리그 경기)
        └── matches via division_id (토너먼트 경기, group_id=NULL)
```

---

## 5. 핵심 API 함수 분석

### 5.1 `lib/api/bracket.ts`

#### `createLeagueMatches(input)` - 리그 경기 생성
```typescript
// 입력
{ tournamentId: string; divisionId: string; groupSize: number }

// 동작
1. organizer 권한 확인
2. division 유효성 확인
3. 이미 경기 존재 시 에러 (overwrite 없음)
4. 승인 팀 조회 → groupSize로 나눠 그룹 생성
5. group_teams 배정
6. 라운드 로빈 매치 생성 (status='scheduled', court_id=null)
```

#### `createTournamentMatches(input)` - 토너먼트 경기 생성
```typescript
// 입력
{ tournamentId: string; divisionId: string; tournamentSize: number }

// 동작
1. organizer 권한 확인
2. tournamentSize 검증: [4, 8, 16]만 허용 (현재 2는 없음)
3. 리그 경기 존재 여부 확인
4. 리그 있음: 팀 미배정 상태로 생성
   리그 없음: 승인 팀 자동 배정
5. round='semifinal'/'quarterfinal'/'round_of_16' + 후속 라운드까지 한번에 생성
   - 4강: initial + final + third_place
   - 8강: initial + 2*semifinal + final + third_place
   - 16강: initial + 4*quarterfinal + 2*semifinal + final + third_place
```

**⚠️ 핵심 문제**: 현재 `createTournamentMatches`는 `group_id=null, round=<라운드명>` 구조로 생성하며, `round` 컬럼에 의존. 요구사항은 이를 group 테이블로 이전하는 것.

#### `getBracketGenerationSummary(tournamentId)` - 요약 데이터 조회
- 대회 이름, 디비전 목록
- 각 디비전의 리그/토너먼트 경기 수, 그룹별 경기 목록, 라운드별 경기 목록
- 현재 `round` 컬럼 기반으로 `tournamentRounds` 구성

**⚠️ 수정 필요**: `round` 삭제 시 요약 데이터 구성 방식도 변경해야 함.

### 5.2 `lib/api/matches.ts`

#### 주요 타입
```typescript
export type MatchRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  group_id: string | null;
  round: string | null;       // ← 삭제 대상
  team_a_id: string;
  team_b_id: string;
  court_id: string | null;
  status: string;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  // 조인 필드들...
};
```

#### `deleteMatchesByDivision(divisionId)` - CASCADE 삭제
- division 기준 모든 경기 삭제 (bracket overwrite 시)

---

## 6. result 페이지 구조 분석 (참고용)

### 6.1 `app/admin/tournaments/[id]/result/page.tsx`
- Server Component
- 디비전, 코트 목록 + 리그/토너먼트 경기 결과 조회
- `ResultForm` (Client Component)에 데이터 전달

### 6.2 `app/admin/tournaments/[id]/result/components/ResultForm.tsx`

**테이블 UI 구조** (요구사항 4의 참고 대상):
```
<table class="w-full table-fixed text-sm">
  <colgroup> ... </colgroup>
  <thead>
    <tr>
      <th>시간</th>
      <th>구분</th>
      <th>경기</th>
      <th colspan=3>스코어</th>
      <th>상태</th>
      <th>저장</th>     ← 행별 개별 저장 버튼
    </tr>
  </thead>
  <tbody>
    <tr> <!-- 각 경기 행 -->
      <td>시간</td>
      <td>그룹명/라운드명</td>
      <td>팀A vs 팀B</td>
      <td><input type="number" /></td>  <!-- 점수A -->
      <td>:</td>
      <td><input type="number" /></td>  <!-- 점수B -->
      <td>상태 배지</td>
      <td><button>저장</button></td>
    </tr>
  </tbody>
</table>
```

**주요 패턴**:
- `useTransition()` + `savingMatchId` state로 행별 저장 중 상태 관리
- `rowMessages` state로 행별 성공/에러 메시지 표시
- 저장 후 1.2초 뒤 행 메시지 자동 초기화

---

## 7. 요구사항별 영향 파일 매핑

### 요구사항 1: 리그 경기 생성 섹션 (UI 수정)
| 파일 | 변경 사항 |
|------|-----------|
| `app/admin/tournaments/[id]/bracket/Form.tsx` | UI는 이미 구현됨, 기능적으로 완성된 상태 |
| `lib/api/bracket.ts::createLeagueMatches` | 추가 변경 없음 |

**현재 상태**: 디비전 드롭다운, 그룹 크기 숫자 입력, 버튼 모두 이미 구현되어 있음.  
→ 별도 수정 최소화 가능

### 요구사항 2: 토너먼트 경기 생성 섹션 (주요 변경)
| 파일 | 변경 사항 |
|------|-----------|
| `app/admin/tournaments/[id]/bracket/Form.tsx` | `<input type="number">` → `<select>` (2/4/8/16강 드롭다운) |
| `lib/api/bracket.ts::createTournamentMatches` | `round` 대신 `group_id` 사용하도록 전면 재작성 |
| `supabase/migrations/new` | `matches.round` 컬럼 삭제, `round_group_check` constraint 제거 |
| `lib/api/matches.ts` | `MatchRow` 타입에서 `round` 제거, 관련 조회 쿼리 수정 |
| `lib/api/bracket.ts::getBracketGenerationSummary` | `tournamentRounds` 구성 방식 변경 (round → group) |

**핵심 로직 변경**:
- 현재: `matches.round = 'semifinal'`, `matches.group_id = null`
- 변경 후: `matches.group_id = <group.id>` (그룹 이름: `'semifinal'` 등), `matches.round = null` → 추후 컬럼 삭제

**2강 추가 필요**: 현재 `allowedSizes = [4, 8, 16]`이지만 요구사항에 `2강` 포함.

### 요구사항 3: 생성 결과 요약 섹션 삭제
| 파일 | 변경 사항 |
|------|-----------|
| `app/admin/tournaments/[id]/bracket/Form.tsx` | `<section>` (생성 결과 요약) 블록 삭제 |

### 요구사항 4: 경기 구조 확인 섹션 → 편집 가능 테이블
| 파일 | 변경 사항 |
|------|-----------|
| `app/admin/tournaments/[id]/bracket/Form.tsx` | 현재 read-only 목록 → result 페이지 참고한 편집 가능 테이블 |
| `supabase/migrations/new` | `matches` 테이블에 `seed_a`, `seed_b` 컬럼 추가 (또는 단일 `seed`) |
| `lib/api/bracket.ts` 또는 new API | seed 저장 API 추가 |
| `app/admin/tournaments/[id]/bracket/actions.ts` | seed 저장 Server Action 추가 |

**seed 컬럼 해석**: 토너먼트 경기의 경우 각 자리의 시드 번호 → `seed_a INT`, `seed_b INT` 분리 저장이 가장 명확함.

---

## 8. 현재 `BracketDivisionSummary` 타입 (수정 필요)

```typescript
export type BracketDivisionSummary = {
  id: string;
  name: string;
  group_size: number;
  tournament_size: number | null;
  leagueMatchCount: number;
  tournamentMatchCount: number;
  hasLeagueMatches: boolean;
  hasTournamentMatches: boolean;
  hasUnassignedTournament: boolean;
  readyForSchedule: boolean;
  groups: BracketGroupSummary[];
  tournamentRounds: BracketTournamentRoundSummary[];  // ← round 삭제 시 변경 필요
};

export type BracketTournamentRoundSummary = {
  round: string;          // ← 현재 matches.round 기반
  matches: BracketMatchSummary[];
};
```

**변경 후**:
- `tournamentRounds` → groups 테이블 기반으로 재구성
- `BracketMatchSummary`에 `seedA`, `seedB` 추가

---

## 9. 연관 마이그레이션 파일 정리

| 파일 | 내용 |
|------|------|
| `0040_generate_bracket.sql` | divisions, groups, group_teams, courts, matches 최초 생성 |
| `0043_allow_null_match_teams.sql` | team_a_id, team_b_id nullable 처리 |
| `0060_generate_seeded_bracket.sql` | `round` 컬럼 추가, check constraint, unique index |
| `0062_drop_matches_division_round_unique.sql` | unique index 제거 |
| `0063_add_third_place_round.sql` | `third_place` round 허용 |
| `0064_add_round_of_16.sql` | `round_of_16` round 허용 |
| `0094_divisions.sql` | divisions 보강, tournament_team_applications division_id 추가 |
| `0095_bracket_delete_rls.sql` | matches/groups/group_teams DELETE RLS |
| `0109_division_standings_dirty.sql` | standings_dirty 컬럼 추가 |
| `0110_division_operating_config.sql` | tournament_size, include_tournament_slots 추가 |

---

## 10. RLS 정책 현황 (보안 관련)

```sql
-- matches
DELETE: is_organizer() → 허용 (0095)
-- groups
DELETE: is_organizer() → 허용 (0095)
-- group_teams
DELETE: is_organizer() → 허용 (0095)
```

`round` 컬럼 삭제 및 `seed` 컬럼 추가를 위한 새 마이그레이션에서 UPDATE RLS 정책 확인 필요.

---

## 11. 구현 시 주요 고려사항

### 11.1 `round` 컬럼 삭제 시 파급 효과
다음 파일들이 `round`를 사용하므로 모두 수정 필요:
- `lib/api/matches.ts`: `MatchRow` 타입, `getMatchById`, `getMatchesByTournament`, `getTournamentMatchesByDivision`, `getTournamentMatchesByRound`, `getTournamentBracketMatches`, `listMatchesForResultEntry`, `listTournamentMatches`
- `lib/api/bracket.ts`: `createTournamentMatches`, `getBracketGenerationSummary`
- `lib/api/results.ts`: `TournamentMatchRow`, 관련 조회 함수
- `app/admin/tournaments/[id]/result/components/ResultForm.tsx`: `roundLabelMap` 참조
- `lib/formatters/matchLabel.ts`: 라운드 레이블 포매팅 (존재 여부 확인 필요)

### 11.2 토너먼트 경기의 그룹 구조 설계
현재: `matches.round = 'semifinal'`  
변경 후: `groups.name = 'semifinal'` (또는 '4강'), `groups.order = 1`, `matches.group_id = <group.id>`

단, 현재 `group_id IS NOT NULL` = 리그 경기, `group_id IS NULL` = 토너먼트 경기 로직이 무너짐.  
→ **별도 구분 컬럼** 필요 또는 그룹의 타입 필드 추가 (`group.type = 'league' | 'tournament'`)  
→ 또는 논리적으로 `group_id`만으로 구분하되 조회 시 groups 테이블 join으로 타입 판단

### 11.3 `seed` 컬럼 설계
요구사항: "각 행 UI: [seed 입력] A팀 VS [seed 입력] B팀, 저장(버튼)"  
→ `matches.seed_a INTEGER`, `matches.seed_b INTEGER` 추가가 가장 자연스러움

### 11.4 2강 경우
요구사항에 `2/4/8/16강` 포함. 현재 `createTournamentMatches`는 4/8/16만 지원.  
2강 = final 1경기 + third_place 1경기만 생성하면 됨.

### 11.5 경기 미배정 상태
요구사항: "경기 생성은 경기 미배정 상태로 생성"  
→ `team_a_id=null`, `team_b_id=null`로 생성 (이미 `hasLeagueMatches`가 있는 경우의 현재 동작과 동일)  
→ 리그 없어도 무조건 미배정 상태로 생성하도록 변경

---

## 12. 참고: result 페이지 테이블 UI 패턴 (요구사항 4 구현 참고)

```tsx
// 행별 저장 패턴
const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
const [rowMessages, setRowMessages] = useState<Record<string, Message>>({});

const handleSaveMatch = (matchId: string) => {
  setSavingMatchId(matchId);
  startSaving(async () => {
    const result = await saveAction({ matchId, ... });
    // 성공/실패 메시지 설정
    setSavingMatchId(null);
    setTimeout(() => setRowMessages(prev => ({ ...prev, [matchId]: null })), 1200);
  });
};

// 테이블 UI: overflow-x-auto rounded-lg border bg-white
// thead: border-b bg-gray-50 text-left text-xs font-medium text-gray-500
// tbody: divide-y, tr: hover:bg-gray-50
// 저장 버튼: inline-flex px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50
```

---

## 13. 파일 연관도 요약

```
[구현 대상 파일]
app/admin/tournaments/[id]/bracket/
  ├── page.tsx          (최소 변경 - 데이터 페칭 추가 가능)
  ├── Form.tsx          (주요 수정)
  └── actions.ts        (seed 저장 Action 추가)

lib/api/
  ├── bracket.ts        (createTournamentMatches 재작성, getBracketGenerationSummary 수정)
  └── matches.ts        (round 필드 제거, seed 필드 추가)

[DB 마이그레이션 - 새 파일]
supabase/migrations/
  └── XXXX_bracket_match_generation_refactor.sql
      - ALTER TABLE matches DROP COLUMN round (+ 관련 constraint 제거)
      - ALTER TABLE matches ADD COLUMN seed_a INTEGER
      - ALTER TABLE matches ADD COLUMN seed_b INTEGER
      - groups 테이블 type 컬럼 추가 (선택적)

[간접 영향 파일 - round 컬럼 삭제 파급]
lib/api/
  ├── results.ts        (TournamentMatchRow.round 제거, 쿼리 수정)
  └── schedule-slots.ts (round 참조 확인 필요)

app/admin/tournaments/[id]/result/
  └── components/ResultForm.tsx (round 기반 라운드 표시 로직)

lib/formatters/matchLabel.ts   (round 레이블 포맷터)
```
