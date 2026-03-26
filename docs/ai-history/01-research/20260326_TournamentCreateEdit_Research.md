# Research Report: 대회 생성 및 수정 페이지 개선

- **날짜**: 2026-03-26
- **기능명**: TournamentCreateEdit
- **요구사항 요약**: `admin/tournaments/new` (대회 생성) 및 `admin/tournaments/[id]/edit` (대회 수정) 페이지에 포스터 이미지 업로드, 설명 필드, 시작 시간 필드를 추가하고, 기존 UI를 카드 기반 레이아웃(포스터/기본정보/설정)으로 재구성

---

## 1. 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | Next.js 16.1.6 (App Router) |
| 언어 | TypeScript 5 |
| UI 스타일링 | Tailwind CSS v4 (`@import "tailwindcss"`) |
| 폰트 | Space Grotesk (Google Fonts, `next/font/google`) |
| 백엔드/DB | Supabase (PostgreSQL + RLS + SSR client) |
| 인증 | Supabase Auth + `@supabase/ssr` 0.8.0 |
| 상태관리 | React 19 내장 (`useState`, `useTransition`, `useMemo`, `useEffect`) |
| DnD | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (스케줄 관련 기능에서 사용) |
| 파일업로드 라이브러리 | **없음** — 현재 프로젝트에 미구현 상태 |
| 패키지 매니저 | pnpm (pnpm-workspace.yaml 존재) |

---

## 2. 프로젝트 폴더 구조 핵심 요약

```
basketball-tournament-manager/
├── app/
│   ├── layout.tsx                          ← RootLayout, GlobalHeader 포함
│   ├── globals.css                         ← @import "tailwindcss" + CSS 변수
│   ├── admin/
│   │   ├── page.tsx                        ← Admin 대시보드 (대회 목록 + 생성 버튼)
│   │   ├── TournamentList.tsx              ← Client 대회 목록 (상태변경/삭제/복구)
│   │   ├── actions.ts                      ← updateTournamentStatus, changeTournamentStatusAction, softDeleteTournamentAction 등
│   │   └── tournaments/
│   │       ├── Form.tsx                    ← TournamentsForm (레거시 상태변경 폼, 목록 형태)
│   │       ├── page.tsx                    ← (레거시) organizer 대회 목록 페이지
│   │       ├── new/
│   │       │   ├── page.tsx               ← 대회 생성 Server Page (권한체크 + 레이아웃)
│   │       │   └── Form.tsx               ← NewTournamentForm Client Component
│   │       └── [id]/
│   │           ├── page.tsx               ← 대회 상세/운영 페이지 (상태변경, ProgressIndicator 등)
│   │           ├── ProgressIndicator.tsx
│   │           ├── StepDescriptions.ts
│   │           ├── actions.ts             ← finishTournamentAction 등
│   │           ├── edit/
│   │           │   ├── page.tsx           ← 대회 수정 Server Page
│   │           │   ├── Form.tsx           ← TournamentEditForm + DivisionsSection + CourtsSection
│   │           │   └── actions.ts         ← updateTournamentAction, Division/Court CRUD Actions
│   │           ├── courts/
│   │           ├── bracket/
│   │           ├── matches/
│   │           ├── schedule/
│   │           ├── standings/
│   │           ├── results/
│   │           ├── result/
│   │           ├── teams/
│   │           └── applications/
│   ├── api/
│   │   └── admin/
│   │       └── tournaments/
│   │           └── route.ts              ← POST /api/admin/tournaments (대회 생성 API)
│   ├── dashboard/
│   ├── login/
│   ├── signup/
│   └── team/
├── components/
│   ├── ui/
│   │   ├── Card.tsx                      ← variant: default|highlight|muted
│   │   ├── Button.tsx                    ← variant: primary|secondary|ghost
│   │   ├── FieldHint.tsx                 ← text-xs text-gray-500 힌트
│   │   └── Badge.tsx
│   └── nav/
│       ├── GlobalHeader.tsx
│       └── NavMenu.tsx
├── lib/
│   ├── api/
│   │   ├── tournaments.ts                ← DB 조회/수정 함수 + 타입 정의
│   │   ├── divisions.ts                  ← Division CRUD + 타입
│   │   ├── courts.ts                     ← Court CRUD + 타입
│   │   ├── applications.ts
│   │   ├── bracket.ts / bracketPreview.ts
│   │   ├── groups.ts / matches.ts / results.ts
│   │   ├── standings.ts / schedule.ts / scheduleSlots.ts
│   │   ├── tournamentGuards.ts / tournamentProgress.ts
│   │   └── players.ts / teams.ts / auth.ts
│   ├── constants/
│   │   └── tournament.ts                 ← TOURNAMENT_SIZE_OPTIONS, TOURNAMENT_SIZE_LABELS
│   └── formatters/
│       ├── matchLabel.ts
│       ├── tournamentMatchOrder.ts
│       └── tournamentRoundMeta.ts
├── src/
│   ├── features/_shared/                 ← 현재 비어 있음
│   └── lib/
│       ├── auth/roles.ts                 ← getUserWithRole() — 인증/권한 체크
│       ├── supabase/
│       │   ├── server.ts                 ← createSupabaseServerClient() (cache 래핑)
│       │   └── client.ts
│       └── validation/
├── supabase/
│   ├── seed.sql
│   └── migrations/                       ← 0002 ~ 0202 순차 마이그레이션
├── docs/
│   ├── rules/
│   │   ├── agent_rules.md
│   │   ├── code_style.md
│   │   ├── rls_rules.md
│   │   └── change_scope_rules.md
│   └── tickets/
│       ├── _active.md
│       └── T-0001 ~ T-0082 ...
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. DB 스키마 현황

### 3-1. `tournaments` 테이블 (migration 0010 ~ 0202 누적)

```sql
CREATE TABLE public.tournaments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  location          text,
  start_date        date        NOT NULL,
  end_date          date        NOT NULL,
  format            text,                          -- 리그 형식 (선택)
  max_teams         integer,                       -- NULL = 무제한
  status            text        NOT NULL DEFAULT 'draft',
  -- CHECK: 'draft' | 'open' | 'closed' | 'finished' (migration 0077에서 finished 추가)
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,                   -- soft delete
  schedule_start_at timestamptz                    -- migration 0202에서 추가, 스케줄 기준 시작 시각
);
```

**현재 RLS 정책:**
- `tournaments_select_public`: `status IN ('open', 'closed', 'finished')` — 비로그인 포함 공개
- `tournaments_select_organizer_all`: organizer는 draft 포함 전체 조회 (migration 0085)

**요구사항 대비 누락 컬럼:**
| 컬럼 | 타입 | 용도 |
|---|---|---|
| `description` | `text` | 설명/공지/규칙 자유 입력 |
| `poster_url` | `text` | 이미지 업로드 후 Storage URL 저장 |

### 3-2. `divisions` 테이블 (migration 0094, 0110)

```sql
CREATE TABLE divisions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id    uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name             text NOT NULL,
  group_size       integer,       -- 그룹(예선) 당 팀 수, 기본값 4
  tournament_size  integer,       -- 토너먼트 규모: 4 | 8 | 16 (NULL=토너먼트 미사용)
  sort_order       integer NOT NULL DEFAULT 0,
  standings_dirty  boolean NOT NULL DEFAULT false
  -- include_tournament_slots boolean: migration 0200에서 제거됨
);

INDEXES:
  idx_divisions_tournament_id ON divisions(tournament_id)
  idx_divisions_tournament_sort ON divisions(tournament_id, sort_order)
```

### 3-3. `courts` 테이블 (migration 0041)

```sql
CREATE TABLE public.courts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name           text NOT NULL,
  display_order  integer,
  UNIQUE (tournament_id, name)     -- 같은 대회 내 코트 이름 중복 불가
);
```

---

## 4. 타입 정의 현황

### 4-1. `lib/api/tournaments.ts`

```typescript
export type TournamentStatus = "draft" | "open" | "closed" | "finished";

// Admin 목록용 (간략)
export type TournamentAdminRow = {
  id: string;
  name: string;
  status: TournamentStatus;
};

// Admin 목록용 (상세, 날짜/삭제 포함)
export type AdminTournamentListRow = {
  id: string;
  name: string;
  status: TournamentStatus;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  deleted_at: string | null;
};

// 수정 페이지용 — DB에서 조회해 Form에 주입
export type TournamentEditRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  // ⚠️ 누락: description, poster_url
};

// 공개 목록용
export type PublicTournamentRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
};

// updateTournament에 전달하는 payload
type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  // ⚠️ 누락: description, poster_url
};
```

### 4-2. `lib/api/divisions.ts`

```typescript
export type DivisionRow = {
  id: string;
  tournament_id: string;
  name: string;
  group_size: number | null;
  tournament_size: number | null;
  sort_order: number;
  standings_dirty: boolean;
};
```

### 4-3. `lib/api/courts.ts`

```typescript
export type Court = {
  id: string;
  tournament_id: string;
  name: string;
  display_order: number | null;
};
```

### 4-4. `lib/constants/tournament.ts`

```typescript
export const TOURNAMENT_SIZE_OPTIONS = [4, 8, 16] as const;

export const TOURNAMENT_SIZE_LABELS: Record<
  (typeof TOURNAMENT_SIZE_OPTIONS)[number],
  string
> = {
  4: "4강",
  8: "8강",
  16: "16강",
};
```

---

## 5. 대회 생성 페이지 상세 분석 (`/admin/tournaments/new`)

### 5-1. `app/admin/tournaments/new/page.tsx` (Server Component)

**역할:** 권한 체크 + 레이아웃 렌더링

```typescript
export default async function NewTournamentPage() {
  const userResult = await getUserWithRole();
  if (userResult.status === "unauthenticated") redirect("/login");
  if (userResult.role !== "organizer") redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">대회 생성</h1>
          <p className="text-sm text-gray-600">대회 기본 정보를 입력하세요.</p>
        </header>
        <Card>
          <NewTournamentForm />
        </Card>
      </div>
    </main>
  );
}
```

**현재 구조 문제:**
- `<Card>` 하나 안에 모든 필드가 나열됨 (포스터/기본정보/설정 구분 없음)

### 5-2. `app/admin/tournaments/new/Form.tsx` (Client Component)

**현재 FormState:**
```typescript
type FormState = {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  format: string;    // 리그 형식 — 요구사항에 명시 없음
  max_teams: string;
};
```

**현재 로컬 상태:**
```typescript
const [form, setForm] = useState<FormState>(initialState);
const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
const [courts, setCourts] = useState<CourtDraft[]>([]);
const [message, setMessage] = useState<Message | null>(null);
const [isPending, startTransition] = useTransition();
```

**DivisionDraft 타입:**
```typescript
type DivisionDraft = {
  id: string;          // crypto.randomUUID() 로 생성
  name: string;
  groupSize: number;
  tournamentSize: string;  // 선택(string), 제출 시 Number()로 변환
};
```

**CourtDraft 타입:**
```typescript
type CourtDraft = {
  id: string;
  name: string;
};
```

**제출 방식:**
```typescript
// fetch 기반 (Server Action 아님)
const response = await fetch("/api/admin/tournaments", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name, location, start_date, end_date, format, max_teams,
    divisions: divisionsPayload,
    courts: courtsPayload,
  }),
});
// 성공 → router.push("/admin/tournaments") → router.refresh()
```

**현재 렌더링 구조 (단일 `<form>`):**
1. 대회명 input
2. 장소 input
3. 시작일 / 종료일 (grid 2열)
4. 리그 형식 input (`format` 필드)
5. 최대 팀 수 input
6. 디비전 설정 섹션 (border-t 구분선)
7. 코트 설정 섹션 (border-t 구분선)
8. 메시지 / 제출 버튼

**누락 필드:**
- 포스터 이미지 업로드
- 시작 시간 (`schedule_start_at` 미노출)
- 설명 (`description` DB 컬럼 없음)

### 5-3. `app/api/admin/tournaments/route.ts` (API Route Handler)

**수신 payload:**
```typescript
type CreateTournamentPayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  format: string | null;
  max_teams: number | null;
  divisions?: {
    name: string;
    group_size?: number;       // 기본값 4
    tournament_size?: number | null;
  }[];
  courts?: {
    name: string;
  }[];
};
```

**처리 흐름:**
1. 권한 체크: `getUserWithRole()` → organizer만 허용
2. payload 검증 (name, start_date, end_date 필수)
3. divisions 개별 검증 (name, group_size >= 2, tournament_size 형식)
4. courts 개별 검증 (name 필수)
5. supabase에서 tournament INSERT → `{ id }` 반환
6. divisions INSERT (tournament_id + sort_order 자동 할당)
7. courts INSERT

**누락:**
- `description`, `poster_url`, `schedule_start_at` 파라미터 미지원

---

## 6. 대회 수정 페이지 상세 분석 (`/admin/tournaments/[id]/edit`)

### 6-1. `app/admin/tournaments/[id]/edit/page.tsx` (Server Component)

**데이터 로드:**
```typescript
const { data, error } = await getTournamentForEdit(id);
const { data: divisions } = await getDivisionsByTournament(id);
const { data: courts } = await getCourtsByTournament(id);
```

**렌더링 구조 (현재):**
```
<header> 제목 + 목록으로 버튼
<TournamentEditForm tournament={data} />         ← Card 포함 (기본정보 + 상태)
<DivisionsSection tournamentId={id} ... />       ← 별도 Card
<CourtsSection tournamentId={id} ... />          ← 별도 Card
```

**개선 필요:**
- 포스터(Card) 섹션 추가 필요
- 기본정보 Card에 설명, 시작 시간 추가 필요

### 6-2. `app/admin/tournaments/[id]/edit/Form.tsx` (Client Component)

**TournamentEditForm 현재 상태:**
```typescript
const [name, setName] = useState(tournament.name ?? "");
const [location, setLocation] = useState(tournament.location ?? "");
const [startDate, setStartDate] = useState(tournament.start_date ?? "");
const [endDate, setEndDate] = useState(tournament.end_date ?? "");
const [maxTeams, setMaxTeams] = useState(...);
const [status, setStatus] = useState<TournamentStatus>(tournament.status);
const [scheduleStartAt, setScheduleStartAt] = useState(
  tournament.schedule_start_at
    ? new Date(tournament.schedule_start_at).toISOString().slice(0, 16)
    : ""
);
// ⚠️ 누락: description, poster_url
```

**현재 rendereding 필드:**
1. 대회명 (required)
2. 장소
3. 시작일 / 종료일 (grid 2열)
4. 상태 select (finished 시 disabled)
5. 최대 팀 수
6. 대회 시작 시간 (`datetime-local` 타입)
7. 에러/성공 메시지
8. 저장 / 취소 버튼

**시작 시간 현황:**
- `input type="datetime-local"` — 날짜+시간 통합 입력
- 요구사항: "시간만 입력받고 시작일에서 계산" → `input type="time"` 분리 필요

**DivisionsSection:**
- `Card` 내부에 독립 상태 관리
- `AddDivisionForm` (인라인 폼, `showAdd` 토글)
- `DivisionItem` (기존 항목: 수정/삭제 inline edit)
- Server Action 기반: `createDivisionAction`, `updateDivisionAction`, `deleteDivisionAction`
- 낙관적 업데이트: `onCreated`, `onUpdated`, `onDeleted` 콜백으로 로컬 상태 즉시 반영

**CourtsSection:**
- DivisionsSection과 동일한 패턴
- Server Action: `createCourtAction`, `updateCourtAction`, `deleteCourtAction`

### 6-3. `app/admin/tournaments/[id]/edit/actions.ts` (Server Actions)

```typescript
// 기본 정보 수정
export async function updateTournamentAction(input: {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
}): Promise<ActionResult>

// Division CRUD
export async function createDivisionAction(tournamentId, name, groupSize, tournamentSize)
export async function updateDivisionAction(tournamentId, divisionId, name, groupSize, tournamentSize)
export async function deleteDivisionAction(tournamentId, divisionId)

// Court CRUD
export async function createCourtAction(tournamentId, name)
export async function updateCourtAction(tournamentId, courtId, name, displayOrder?)
export async function deleteCourtAction(tournamentId, courtId)
```

**모두 `revalidatePath(\`/admin/tournaments/${tournamentId}/edit\`)`로 캐시 무효화**

---

## 7. UI 컴포넌트 상세

### `components/ui/Card.tsx`
```typescript
type CardVariant = "default" | "highlight" | "muted";

const variantClasses = {
  default: "border-slate-200 bg-white",
  highlight: "border-amber-200 bg-amber-50",
  muted: "border-slate-200 bg-slate-50",
};

// 공통: "rounded-xl border p-5 shadow-sm"
```

### `components/ui/Button.tsx`
```typescript
type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses = {
  primary:   "bg-amber-400 text-slate-900 hover:bg-amber-300",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost:     "px-3 py-2 text-slate-600 hover:bg-slate-100",
};

// 공통: "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ..."
// focus-visible: ring-2 ring-amber-400
// disabled: opacity-50
```

### `components/ui/FieldHint.tsx`
```typescript
// <p className="text-xs text-gray-500" {...props} />
```

### 글로벌 CSS 변수 (`app/globals.css`)
```css
:root {
  --ui-bg: #f6f7fb;
  --ui-surface: #ffffff;
  --ui-surface-muted: #f1f5f9;
  --ui-border: #e2e8f0;
  --ui-text: #0f172a;
  --ui-muted: #64748b;
  --ui-accent: #f59e0b;       /* amber */
  --ui-accent-strong: #f97316;
  --ui-success: #10b981;
  --ui-warning: #f43f5e;
}
```

---

## 8. 기존 패턴 및 규칙 (docs/rules/ 기반)

### 8-1. 데이터 흐름 패턴
```
Server Page (page.tsx)
  → lib/api/*.ts (Supabase SELECT)
  → props로 Client Form에 주입

Client Form (Form.tsx)
  → 사용자 입력
  → Server Action (actions.ts) 또는 fetch API Route
  → lib/api/*.ts (Supabase INSERT/UPDATE/DELETE)
  → revalidatePath() 또는 router.refresh()
```

### 8-2. 인증 패턴
```typescript
const userResult = await getUserWithRole();
if (userResult.status === "unauthenticated") redirect("/login");
if (userResult.status === "error") { /* 에러 UI */ }
if (userResult.status === "empty") { /* 프로필 없음 UI */ }
if (userResult.role !== "organizer") redirect("/dashboard");
```

### 8-3. `getUserWithRole()` — `src/lib/auth/roles.ts`
```typescript
type UserRoleStatus = "unauthenticated" | "error" | "empty" | "ready";

type UserWithRoleResult = {
  status: UserRoleStatus;
  user: { id: string; email: string | null | undefined } | null;
  role: Role | null;   // "organizer" | "team_manager" | "player" | "spectator"
  error: string | null;
};
```
- Supabase `auth.getUser()` → `profiles` 테이블에서 `role` 조회
- `createSupabaseServerClient()`는 `cache()`로 래핑 → 동일 요청 내 재사용

### 8-4. ActionResult 패턴
```typescript
type ActionResult = { ok: true } | { ok: false; error: string };
```
- 모든 Server Action과 lib/api 함수가 이 패턴 사용

### 8-5. Supabase 접근 원칙
- 서버: `createSupabaseServerClient()` 사용 (쿠키 기반)
- 클라이언트 직접 DB 접근 금지
- SELECT 컬럼 명시 필수 (`"*"` 금지)
- RLS 정책으로 권한 제어

### 8-6. 코드 스타일 규칙 (docs/rules/code_style.md)
- `lib/api/*.ts` — DB 접근 함수
- `app/**/actions.ts` — Server Actions
- `app/**/Form.tsx` — Client Form Component
- import: `@/` alias 우선, 같은 폴더 내에서만 상대 경로
- 함수명: 동사+목적어 (예: `listTeams`, `createTournament`)
- 타입명: 명사+역할 (예: `TournamentEditRow`, `DivisionRow`)

### 8-7. Agent Rules (docs/rules/agent_rules.md)
- Minimal Diff 원칙: 기존 구조/스타일/패턴 유지
- 새 라이브러리/패키지 추가 금지
- DB write는 서버에서만 수행
- Server Component: 조회 전용
- Client Component: 입력/상태/폼 처리만

---

## 9. 요구사항 vs 현황 GAP 분석

### 대회 생성 (`/admin/tournaments/new`)

| 요구사항 항목 | 현황 | GAP 수준 |
|---|---|---|
| 포스터 이미지 업로드 (최대 1개, 삭제) | ❌ 없음 | 🔴 신규 구현 필요 |
| 페이지 제목 + 설명 | ✅ 있음 | — |
| 포스터 카드 섹션 분리 | ❌ 없음 | 🟡 레이아웃 재구성 |
| 기본정보 카드 섹션 분리 | ❌ 없음 (단일 Card) | 🟡 레이아웃 재구성 |
| 설정 카드 섹션 분리 | ❌ 없음 | 🟡 레이아웃 재구성 |
| 대회명 | ✅ 있음 | — |
| 장소 | ✅ 있음 | — |
| 시작일 / 종료일 (동일 입력 가능) | ✅ 있음 (힌트 있음) | — |
| 시작 시간 (시간만 입력) | ❌ 없음 | 🟡 신규 필드 추가 |
| 설명 (자유 입력) | ❌ 없음 | 🟡 DB 컬럼 + UI 추가 |
| 최대 팀 수 (NULL=무제한) | ✅ 있음 | — |
| 코트 추가/삭제 | ✅ 있음 | — |
| 디비전 추가/삭제 | ✅ 있음 | — |

### 대회 수정 (`/admin/tournaments/[id]/edit`)

| 요구사항 항목 | 현황 | GAP 수준 |
|---|---|---|
| 포스터 이미지 업로드 (최대 1개, 삭제) | ❌ 없음 | 🔴 신규 구현 필요 |
| 포스터/기본정보/설정 카드 분리 | △ 부분 분리 (edit+Divisions+Courts) | 🟡 레이아웃 재구성 |
| 대회명 | ✅ 있음 | — |
| 장소 | ✅ 있음 | — |
| 시작일 / 종료일 | ✅ 있음 | — |
| 시작 시간 (시간만 입력) | △ `datetime-local`로 날짜+시간 통합 | 🟡 time 타입으로 분리 |
| 설명 | ❌ 없음 | 🟡 DB 컬럼 + UI 추가 |
| 최대 팀 수 | ✅ 있음 | — |
| 코트 추가/수정/삭제 | ✅ 있음 | — |
| 디비전 추가/수정/삭제 | ✅ 있음 | — |

---

## 10. 구현 시 주요 고려 사항

### 10-1. 이미지 업로드 (포스터)

**현재 상황:**
- Supabase Storage 사용 이력 없음 (bucket 미생성)
- `package.json`에 파일 업로드 관련 라이브러리 없음
- agent_rules.md: 새 라이브러리 추가 금지

**구현 전략 (새 라이브러리 없이):**
```
사용자 파일 선택 → FileReader/URL.createObjectURL로 프리뷰
→ 저장 시 FormData로 Server Action에 파일 전달
→ Server Action: supabase.storage.from('bucket').upload(...)
→ Storage public URL → tournaments.poster_url에 저장
```

**고려 사항:**
- Supabase Storage bucket 생성 필요 (예: `tournament-posters`)
- RLS: organizer만 upload/delete 가능
- 파일 크기 제한 권장 (client-side validation)
- 삭제 시: Storage에서 파일 삭제 + DB null 처리
- 대회 생성 시: 대회 먼저 생성 → ID로 파일명 결정 → Storage upload → poster_url update (2단계)
  - 또는 임시 파일명 사용 후 생성 완료 시 rename
- 수정 시: 기존 파일 있으면 overwrite 또는 삭제 후 재업로드

**주의:** agent_rules.md에 따르면 DB write는 서버에서만. 클라이언트에서 직접 Supabase Storage 업로드 금지 여부 확인 필요 (Storage는 별도 판단 가능)

### 10-2. 시작 시간 필드

**요구사항:** "시간만 입력 받고 시작일에서 계산"

**현재:** `schedule_start_at TIMESTAMPTZ` 컬럼 (수정 페이지에서 `datetime-local`로 노출)

**구현 방안:**
```
UI: <input type="time"> (예: "09:30")
서버: start_date + " " + time → new Date(...).toISOString()
     예: "2026-08-15" + "09:30" → "2026-08-15T00:30:00.000Z" (UTC 변환)
```

**생성 페이지:** `schedule_start_at` 필드 신규 추가 (현재 없음)
**수정 페이지:** `datetime-local` → `time` 분리, 날짜는 `start_date`에서 자동 계산

### 10-3. 설명 필드

**DB 변경:**
```sql
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS description text;
```

**UI:** `<textarea>` 컴포넌트 (글자 수 제한 선택 — 요구사항: "필요하다면")
- 예시: `maxLength={2000}` + 현재 글자 수 표시

**생성:** API route payload에 `description` 추가
**수정:** `updateTournamentAction` + `updateTournament()` 함수에 `description` 추가

### 10-4. `format` 필드 처리

- 현재 생성 폼에 "리그 형식" 필드로 존재
- 요구사항에서 명시적으로 요구하지 않음
- 기존 데이터 유지 차원에서 존재는 유지하되, UI 배치 재검토 필요

---

## 11. 영향 받는 파일 목록

### 신규 생성 (Migration)
| 파일 | 내용 |
|---|---|
| `supabase/migrations/XXXX_tournament_poster_description.sql` | `description text`, `poster_url text` 컬럼 추가 |

### 수정 대상 파일

| 파일 | 변경 내용 |
|---|---|
| `lib/api/tournaments.ts` | `TournamentEditRow`에 `description`, `poster_url` 추가; `getTournamentForEdit()` select 컬럼 보강; `TournamentUpdatePayload` + `updateTournament()` 함수에 description, poster_url 추가 |
| `app/api/admin/tournaments/route.ts` | payload 타입 + supabase INSERT에 `description`, `poster_url`, `schedule_start_at` 추가 |
| `app/admin/tournaments/new/page.tsx` | 단일 Card → 포스터/기본정보/설정 카드 3분할 레이아웃으로 재구성 |
| `app/admin/tournaments/new/Form.tsx` | FormState에 `description`, `scheduleTime` 추가; 포스터 업로드 UI; 설명 textarea; 시작 시간 time input |
| `app/admin/tournaments/[id]/edit/page.tsx` | 포스터 카드 섹션 추가; 레이아웃 조정 |
| `app/admin/tournaments/[id]/edit/Form.tsx` | TournamentEditForm에 `description`, `poster_url` 상태 + UI 추가; `scheduleStartAt`을 `time` 타입으로 변경 |
| `app/admin/tournaments/[id]/edit/actions.ts` | `updateTournamentAction` input 타입에 description, poster_url 추가 |

---

## 12. 참고 — 기존 유사 구현 패턴

### 12-1. Division 낙관적 업데이트 패턴 (`edit/Form.tsx`)
```typescript
// AddDivisionForm에서 onCreated 콜백으로 로컬 상태 즉시 반영
onCreated({
  id: crypto.randomUUID(),   // 임시 ID (revalidate 후 실제 ID로 교체됨)
  tournament_id: tournamentId,
  name: name.trim(),
  ...
});
```

### 12-2. inline 추가 폼 토글 패턴
```typescript
const [showAdd, setShowAdd] = useState(false);
// "추가" 버튼 → setShowAdd(true)
// 완료/취소 → setShowAdd(false)
```

### 12-3. Server Action 에러 전파 패턴
```typescript
const result = await createDivisionAction(...);
if (!result.ok) {
  onError(result.error);
  return;
}
```

### 12-4. 수정/삭제 inline 토글 (`DivisionItem`)
- `isEditing` 상태로 뷰/편집 모드 토글
- 편집 중 취소 시 원본 값으로 복원

---

## 13. 현재 활성 티켓 (`docs/tickets/_active.md`)

현재 활성 티켓은 "토너먼트 미배정 경기 표시 형식 통일" (경기 목록/스케줄/결과 화면 formatter 관련)로, 이번 대회 생성/수정 개선 작업과 **무관**. 새 티켓으로 교체 후 진행 필요.
