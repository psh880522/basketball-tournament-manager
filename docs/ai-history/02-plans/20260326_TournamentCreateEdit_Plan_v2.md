# Implementation Plan v2: 대회 생성 및 수정 페이지 개선

- **날짜**: 2026-03-26
- **기능명**: TournamentCreateEdit
- **참고 리서치**: `docs/ai-history/01-research/20260326_TournamentCreateEdit_Research.md`
- **이전 버전**: `docs/ai-history/02-plans/20260326_TournamentCreateEdit_Plan_v1.md`
- **승인 필요**: 이 문서는 구현 전 검토용이며, 승인 후 구현 시작

---

## v1 → v2 변경 요약

| 항목 | v1 | v2 |
|---|---|---|
| 수정 페이지 `상태` 필드 | `TournamentEditForm` Card 내부에 유지 | **제거** — 상태 관리는 기존 `/admin/tournaments/[id]` 페이지에서만 수행 |
| `updateTournamentAction` input | `status` 포함 | **`status` 제거** |
| `updateTournament()` DB 함수 payload | `status` 포함 | **`status` 제거** |

**제거 이유:** 대회 상태(draft → open → closed → finished)는 한 방향으로만 진행되며, 되돌리기가 위험한 경우가 있다. 이미 `/admin/tournaments/[id]/page.tsx`에서 ProgressIndicator, 확인 메시지 등 안전장치와 함께 상태 변경을 처리하고 있으므로, 수정 폼에서 상태를 자유롭게 바꿀 수 있는 select를 제공하는 것은 운영 오류 위험이 있다.

---

## 1. 기능 상세 설명

### 1-1. 공통 레이아웃 재구성

두 페이지(생성/수정) 모두 아래 카드 구조로 재편한다.

```
<header>  페이지 제목 + 설명 텍스트 (+ 수정 페이지는 "목록으로" 버튼)
<Card>    포스터 섹션
<Card>    기본정보 섹션
<Card>    설정 섹션 (최대 팀 수 + 코트 + 디비전)
```

> 수정 페이지의 **상태(status)** 필드는 이 카드 구조에서 완전히 제거한다.  
> 상태 변경은 `/admin/tournaments/[id]` (대회 운영 페이지)에서만 가능하다.

### 1-2. 포스터 이미지 업로드

- Supabase Storage `tournament-posters` 버킷 사용
- 최대 1개, 삭제 가능
- 업로드/삭제는 **Server Action**을 통해 서버에서만 처리
- **생성 페이지**: tournament INSERT 완료(ID 확보) → 이미지 업로드 → `poster_url` UPDATE → 리다이렉트
  - 폼 제출 방식을 JSON fetch → **Server Action + FormData**로 변경
  - 이미지 없이 생성도 정상 동작
- **수정 페이지**: 기존 `DivisionsSection` / `CourtsSection`과 동일한 독립 카드 패턴 (`PosterSection`)
  - 파일 선택 → 프리뷰 → "업로드" 클릭 → Server Action 호출 → `poster_url` 갱신
  - "삭제" 버튼 → Storage 파일 삭제 + `poster_url` null 처리

### 1-3. 기본정보 필드

| 필드 | UI | 비고 |
|---|---|---|
| 대회명 | text input | 필수 |
| 장소 | text input | 선택 |
| 시작일 / 종료일 | date input (2열 grid) | 필수, 하루짜리 대회는 동일하게 입력 |
| **시작 시간** | **time input** (신규) | `schedule_start_at`의 시간 부분만 입력. 서버에서 `start_date + time (KST)` 조합으로 ISO datetime 생성 |
| 리그 형식(format) | text input | 선택, 기존 데이터 보존용 |
| **설명** | **textarea** (신규) | 자유 입력, 최대 2000자, 글자 수 표시 |

> ~~**수정 페이지 전용**: 상태 select~~ ← **v2에서 제거됨**

### 1-4. 설정 섹션

| 항목 | 생성 | 수정 |
|---|---|---|
| 최대 팀 수 | 유지 | 유지 |
| 코트 설정 | 추가/삭제 | 추가/수정/삭제 (기존 동일) |
| 디비전 설정 | 추가/삭제 | 추가/수정/삭제 (기존 동일) |

> 수정 페이지는 기존 `DivisionsSection` / `CourtsSection` 컴포넌트 재사용

---

## 2. 추가 설치 라이브러리

**없음.**

`agent_rules.md`의 "새 라이브러리 금지" 규칙을 준수한다.
이미지 업로드는 기존 `@supabase/supabase-js`의 Storage API를 그대로 사용한다.
파일 프리뷰는 브라우저 내장 `URL.createObjectURL()` 을 사용한다.

---

## 3. 변경 파일 목록

### 신규 생성

| 파일 | 구분 |
|---|---|
| `supabase/migrations/0203_tournament_poster_description.sql` | DB Migration |
| `app/admin/tournaments/new/actions.ts` | Server Action (신규) |

### 수정

| 파일 | 변경 범위 |
|---|---|
| `lib/api/tournaments.ts` | 타입 추가, getTournamentForEdit/updateTournament 보강, status 제거 |
| `app/admin/tournaments/new/page.tsx` | 카드 3분할 레이아웃으로 재구성 |
| `app/admin/tournaments/new/Form.tsx` | 포스터/설명/시작 시간 추가, Server Action으로 제출 방식 변경 |
| `app/admin/tournaments/[id]/edit/page.tsx` | PosterSection 카드 추가 |
| `app/admin/tournaments/[id]/edit/Form.tsx` | 설명/시작 시간 추가, status 필드 제거, PosterSection 컴포넌트 추가 |
| `app/admin/tournaments/[id]/edit/actions.ts` | updateTournamentAction에서 status 제거, poster Actions 추가 |

---

## 4. 파일별 구현 상세

---

### 4-1. `supabase/migrations/0203_tournament_poster_description.sql` (신규)

```sql
-- tournaments 테이블에 설명/포스터 컬럼 추가
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS poster_url  text;

-- Storage 버킷 생성 (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tournament-posters', 'tournament-posters', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: organizer만 업로드/수정/삭제
CREATE POLICY "poster_upload_organizer"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'tournament-posters'
    AND public.is_organizer()
  );

CREATE POLICY "poster_update_organizer"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'tournament-posters'
    AND public.is_organizer()
  );

CREATE POLICY "poster_delete_organizer"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'tournament-posters'
    AND public.is_organizer()
  );

-- 공개 읽기는 bucket public=true로 처리됨 (별도 SELECT 정책 불필요)
```

---

### 4-2. `lib/api/tournaments.ts` (수정)

#### a) `TournamentEditRow` 타입 보강
```typescript
export type TournamentEditRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;       // 읽기용 (표시 목적), 수정 폼에서 변경 불가
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;    // ← 추가
  poster_url: string | null;     // ← 추가
};
```

> `status`는 타입에 유지한다. 수정 페이지 헤더에서 현재 상태를 **읽기 전용**으로 표시하는 데 사용할 수 있으므로 타입 자체는 제거하지 않는다. 단, Form에서 수정 불가하도록 input을 렌더링하지 않는다.

#### b) `getTournamentForEdit()` select 컬럼 보강
```typescript
// 변경 전
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at")

// 변경 후
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at,description,poster_url")
```

#### c) `TournamentUpdatePayload` 타입 수정 (파일 내 private 타입)
```typescript
// v2 변경: status 제거
type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  // status: TournamentStatus;   ← 제거 (운영 페이지에서만 변경)
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;   // ← 추가
};
```

#### d) `updateTournament()` 함수 수정
- `status` 필드를 payload에서 제거
- `description`, `schedule_start_at` 추가

#### e) 신규: `updateTournamentPosterUrl()`
```typescript
export async function updateTournamentPosterUrl(
  tournamentId: string,
  posterUrl: string | null
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ poster_url: posterUrl })
    .eq("id", tournamentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

---

### 4-3. `app/admin/tournaments/new/actions.ts` (신규)

대회 생성 흐름을 Server Action으로 통합한다. FormData로 파일과 텍스트 필드를 함께 수신한다.

```typescript
"use server";

import { getUserWithRole } from "@/src/lib/auth/roles";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createTournamentAction(
  formData: FormData
): Promise<CreateResult> {
  // 1. 권한 체크
  const userResult = await getUserWithRole();
  if (userResult.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (userResult.role !== "organizer" || !userResult.user) {
    return { ok: false, error: "권한이 없습니다." };
  }

  // 2. 필드 추출
  const name        = (formData.get("name") as string)?.trim();
  const location    = (formData.get("location") as string)?.trim() || null;
  const start_date  = formData.get("start_date") as string;
  const end_date    = formData.get("end_date") as string;
  const timeValue   = formData.get("start_time") as string; // "HH:mm"
  const description = (formData.get("description") as string)?.trim() || null;
  const format      = (formData.get("format") as string)?.trim() || null;
  const max_teams_raw = formData.get("max_teams") as string;
  const posterFile  = formData.get("poster") as File | null;
  const divisionsRaw = formData.get("divisions") as string;
  const courtsRaw   = formData.get("courts") as string;

  // 3. 유효성 검사
  if (!name)       return { ok: false, error: "대회명은 필수입니다." };
  if (!start_date) return { ok: false, error: "시작일은 필수입니다." };
  if (!end_date)   return { ok: false, error: "종료일은 필수입니다." };

  // 4. schedule_start_at 계산 (KST 기준)
  let schedule_start_at: string | null = null;
  if (timeValue) {
    const combined = new Date(`${start_date}T${timeValue}:00+09:00`);
    if (!isNaN(combined.getTime())) {
      schedule_start_at = combined.toISOString();
    }
  }

  // 5. max_teams 파싱
  const max_teams = max_teams_raw ? Number(max_teams_raw) : null;
  if (max_teams !== null && (!Number.isInteger(max_teams) || max_teams < 2)) {
    return { ok: false, error: "최대 팀 수는 2 이상의 정수여야 합니다." };
  }

  // 6. divisions/courts JSON 파싱
  const divisions = divisionsRaw ? (JSON.parse(divisionsRaw) as { name: string; group_size: number; tournament_size: number | null }[]) : [];
  const courts    = courtsRaw    ? (JSON.parse(courtsRaw) as { name: string }[]) : [];

  const supabase = await createSupabaseServerClient();

  // 7. tournament INSERT
  const { data: tournament, error: insertError } = await supabase
    .from("tournaments")
    .insert({
      name,
      location,
      start_date,
      end_date,
      format,
      max_teams,
      description,
      schedule_start_at,
      status: "draft",
      created_by: userResult.user.id,
    })
    .select("id")
    .single();

  if (insertError || !tournament) {
    return { ok: false, error: insertError?.message ?? "대회 생성에 실패했습니다." };
  }

  const tournamentId = tournament.id;

  // 8. divisions INSERT
  for (let i = 0; i < divisions.length; i++) {
    const div = divisions[i];
    await supabase.from("divisions").insert({
      tournament_id: tournamentId,
      name: div.name,
      group_size: div.group_size ?? 4,
      tournament_size: div.tournament_size ?? null,
      sort_order: i,
    });
  }

  // 9. courts INSERT
  for (let i = 0; i < courts.length; i++) {
    await supabase.from("courts").insert({
      tournament_id: tournamentId,
      name: courts[i].name,
      display_order: i,
    });
  }

  // 10. 포스터 업로드 (선택, 실패해도 생성 성공 처리)
  if (posterFile && posterFile.size > 0) {
    const ext = posterFile.name.split(".").pop() ?? "jpg";
    const path = `${tournamentId}/poster.${ext}`;
    const buffer = new Uint8Array(await posterFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("tournament-posters")
      .upload(path, buffer, { contentType: posterFile.type, upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("tournament-posters")
        .getPublicUrl(path);

      await supabase
        .from("tournaments")
        .update({ poster_url: urlData.publicUrl })
        .eq("id", tournamentId);
    }
  }

  return { ok: true, id: tournamentId };
}
```

---

### 4-4. `app/admin/tournaments/new/page.tsx` (수정)

`<NewTournamentForm />`이 내부적으로 3개 Card를 렌더링하므로, page는 레이아웃만 담당한다.  
기존 단일 `<Card>` Wrapper를 제거한다.

```tsx
return (
  <main className="min-h-screen bg-gray-50 px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">대회 생성</h1>
        <p className="text-sm text-gray-600">
          대회 기본 정보와 설정을 입력하세요.
        </p>
      </header>
      <NewTournamentForm />   {/* 내부에서 Card x3 렌더링 */}
    </div>
  </main>
);
```

---

### 4-5. `app/admin/tournaments/new/Form.tsx` (수정)

#### a) 상태 추가
```typescript
type FormState = {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  format: string;
  max_teams: string;
  start_time: string;    // ← 추가 "HH:mm"
  description: string;   // ← 추가
};

// 포스터 전용 상태 (FormState 밖)
const [posterFile, setPosterFile] = useState<File | null>(null);
const [posterPreview, setPosterPreview] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### b) 제출 방식 변경: fetch JSON → Server Action
```typescript
import { createTournamentAction } from "./actions";

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setMessage(null);

  // 기존 유효성 검사 동일...

  startTransition(async () => {
    const divisionsPayload = divisions.map((d) => ({
      name: d.name.trim(),
      group_size: d.groupSize,
      tournament_size: d.tournamentSize ? Number(d.tournamentSize) : null,
    }));
    const courtsPayload = courts.map((c) => ({ name: c.name.trim() }));

    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("location", form.location);
    formData.set("start_date", form.start_date);
    formData.set("end_date", form.end_date);
    formData.set("start_time", form.start_time);
    formData.set("description", form.description);
    formData.set("format", form.format);
    formData.set("max_teams", form.max_teams);
    formData.set("divisions", JSON.stringify(divisionsPayload));
    formData.set("courts", JSON.stringify(courtsPayload));
    if (posterFile) formData.set("poster", posterFile);

    const result = await createTournamentAction(formData);
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
      return;
    }
    router.push("/admin");
    router.refresh();
  });
};
```

#### c) 렌더링 구조 (3개 Card)

```tsx
return (
  <form onSubmit={handleSubmit} className="space-y-6">

    {/* ────────── 포스터 카드 ────────── */}
    <Card>
      <h2 className="mb-4 text-base font-semibold">포스터</h2>
      <div className="space-y-3">
        {/* 프리뷰 영역 */}
        {posterPreview ? (
          <img
            src={posterPreview}
            alt="포스터 미리보기"
            className="h-48 w-full rounded-lg object-cover border border-gray-200"
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-400">이미지 없음</p>
          </div>
        )}
        {/* 숨겨진 file input */}
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setPosterFile(file);
            if (posterPreview) URL.revokeObjectURL(posterPreview);
            setPosterPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
        <div className="flex gap-2">
          <Button type="button" variant="secondary"
            onClick={() => fileInputRef.current?.click()}>
            이미지 선택
          </Button>
          {posterFile && (
            <Button type="button" variant="ghost"
              onClick={() => {
                if (posterPreview) URL.revokeObjectURL(posterPreview);
                setPosterFile(null);
                setPosterPreview(null);
              }}>
              선택 취소
            </Button>
          )}
        </div>
        <FieldHint>대회 포스터 또는 관련 이미지 (선택, 최대 5MB)</FieldHint>
      </div>
    </Card>

    {/* ────────── 기본정보 카드 ────────── */}
    <Card>
      <h2 className="mb-4 text-base font-semibold">기본 정보</h2>
      <div className="space-y-4">
        {/* 대회명 */}
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">대회명</label>
          <input id="name" value={form.name} onChange={...} required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="예: 2026 봄 리그" />
        </div>

        {/* 장소 */}
        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">장소</label>
          <input id="location" value={form.location} onChange={...}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="예: 서울 체육관" />
        </div>

        {/* 시작일 / 종료일 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="start_date" className="text-sm font-medium">시작일</label>
            <input id="start_date" type="date" value={form.start_date} onChange={...} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="end_date" className="text-sm font-medium">종료일</label>
            <input id="end_date" type="date" value={form.end_date} onChange={...} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <FieldHint>하루짜리 대회는 시작일과 동일하게 입력하세요.</FieldHint>
          </div>
        </div>

        {/* 시작 시간 */}
        <div className="space-y-1">
          <label htmlFor="start_time" className="text-sm font-medium">시작 시간</label>
          <input id="start_time" type="time" value={form.start_time} onChange={...}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <FieldHint>시작일 기준으로 스케줄 시간이 자동 계산됩니다. (선택)</FieldHint>
        </div>

        {/* 리그 형식 */}
        <div className="space-y-1">
          <label htmlFor="format" className="text-sm font-medium">리그 형식</label>
          <input id="format" value={form.format} onChange={...}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="예: 4강 토너먼트" />
          <FieldHint>선택 입력입니다.</FieldHint>
        </div>

        {/* 설명 */}
        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">설명</label>
          <textarea id="description" value={form.description} onChange={...}
            rows={5} maxLength={2000}
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="공지사항, 규칙 등을 자유롭게 작성하세요." />
          <FieldHint>{form.description.length} / 2000자</FieldHint>
        </div>
      </div>
    </Card>

    {/* ────────── 설정 카드 ────────── */}
    <Card>
      <h2 className="mb-4 text-base font-semibold">설정</h2>
      <div className="space-y-4">
        {/* 최대 팀 수 */}
        <div className="space-y-1">
          <label htmlFor="max_teams" className="text-sm font-medium">최대 팀 수</label>
          <input id="max_teams" type="number" min={2} value={form.max_teams} onChange={...}
            className={`w-full rounded-md border px-3 py-2 text-sm ${isMaxTeamsValid ? "border-gray-300" : "border-rose-400"}`}
            placeholder="예: 16" />
          <FieldHint>비워두면 제한 없이 등록됩니다.</FieldHint>
        </div>

        {/* 디비전 설정 섹션 (border-t) */}
        {/* 기존 코드 동일 */}

        {/* 코트 설정 섹션 (border-t) */}
        {/* 기존 코드 동일 */}

        {/* 메시지 */}
        {message && (
          <p className={message.tone === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
            {message.text}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={isPending || !isMaxTeamsValid}>
            {isPending ? "생성 중..." : "대회 생성"}
          </Button>
          <Button type="button" variant="secondary"
            onClick={() => router.push("/admin")} disabled={isPending}>
            취소
          </Button>
        </div>
      </div>
    </Card>

  </form>
);
```

---

### 4-6. `app/admin/tournaments/[id]/edit/page.tsx` (수정)

`PosterSection`을 import하여 헤더 바로 아래에 포스터 카드를 추가한다.

```tsx
import TournamentEditForm, {
  DivisionsSection,
  CourtsSection,
  PosterSection,    // ← 추가
} from "./Form";

return (
  <main className="min-h-screen bg-gray-50 px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-6">

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">대회 수정</h1>
          <p className="text-sm text-gray-600">대회 정보를 수정하고 저장하세요.</p>
        </div>
        <Link href="/admin">
          <Button variant="secondary">목록으로</Button>
        </Link>
      </header>

      {/* 포스터 카드 — 신규 */}
      <PosterSection
        tournamentId={id}
        initialPosterUrl={data.poster_url}
      />

      {/* 기본정보 카드 (status 제거된 TournamentEditForm) */}
      <TournamentEditForm tournament={data} />

      {/* 설정 카드들 */}
      <DivisionsSection tournamentId={id} initialDivisions={divisions ?? []} />
      <CourtsSection tournamentId={id} initialCourts={courts ?? []} />
    </div>
  </main>
);
```

---

### 4-7. `app/admin/tournaments/[id]/edit/Form.tsx` (수정)

#### a) `TournamentEditForm` — `status` 필드 제거

**제거 대상:**
- `const [status, setStatus] = useState<TournamentStatus>(tournament.status)` 삭제
- `statusLabels`, `isFinished` 관련 로직 삭제
- `<select>` (상태 선택) 렌더링 삭제
- `updateTournamentAction` 호출에서 `status` 파라미터 삭제

**추가 대상:**

```typescript
// description 상태
const [description, setDescription] = useState(tournament.description ?? "");

// startTime: schedule_start_at에서 KST 시간 부분만 추출
const [startTime, setStartTime] = useState(() => {
  if (!tournament.schedule_start_at) return "";
  const kstMs = new Date(tournament.schedule_start_at).getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstMs).toISOString().slice(11, 16); // "HH:mm"
});
```

#### b) `updateTournamentAction` 호출 수정

```typescript
updateTournamentAction({
  tournamentId: tournament.id,
  name: name.trim(),
  location: location.trim() || null,
  start_date: startDate,
  end_date: endDate,
  // status: 제거
  max_teams: maxTeamsValue,
  schedule_start_at: startTime
    ? new Date(`${startDate}T${startTime}:00+09:00`).toISOString()
    : null,
  description: description.trim() || null,  // ← 추가
}).then((result) => { ... });
```

#### c) 기본정보 Card 렌더링에 필드 추가

```tsx
{/* 시작 시간 — datetime-local 대체 */}
<div className="space-y-1">
  <label className="text-sm font-medium">시작 시간</label>
  <input
    type="time"
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
    value={startTime}
    onChange={(e) => setStartTime(e.target.value)}
  />
  <FieldHint>시작일 기준으로 스케줄 시간이 자동 계산됩니다.</FieldHint>
</div>

{/* 설명 */}
<div className="space-y-1">
  <label className="text-sm font-medium">설명</label>
  <textarea
    className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
    rows={5}
    maxLength={2000}
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="공지사항, 규칙 등을 자유롭게 작성하세요."
  />
  <FieldHint>{description.length} / 2000자</FieldHint>
</div>
```

#### d) 신규 `PosterSection` 컴포넌트 (edit/Form.tsx에 추가 export)

```typescript
"use client";

import { useRef, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import { uploadPosterAction, deletePosterAction } from "./actions";

type PosterSectionProps = {
  tournamentId: string;
  initialPosterUrl: string | null;
};

export function PosterSection({ tournamentId, initialPosterUrl }: PosterSectionProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPosterUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displaySrc = preview ?? posterUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("파일 크기는 5MB 이하여야 합니다.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("poster", selectedFile);
      const result = await uploadPosterAction(tournamentId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(result.posterUrl);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setSelectedFile(null);
      setError(null);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePosterAction(tournamentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPosterUrl(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setSelectedFile(null);
      setError(null);
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold">포스터</h2>

      {/* 이미지 프리뷰 */}
      {displaySrc ? (
        <img src={displaySrc} alt="포스터"
          className="h-48 w-full rounded-lg object-cover border border-gray-200" />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">이미지 없음</p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <input type="file" accept="image/*" hidden ref={fileInputRef}
        onChange={handleFileChange} />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}>
          이미지 선택
        </Button>

        {selectedFile && (
          <Button type="button" onClick={handleUpload} disabled={isPending}>
            {isPending ? "업로드 중..." : "업로드"}
          </Button>
        )}

        {posterUrl && !selectedFile && (
          <Button type="button" variant="ghost"
            onClick={handleDelete} disabled={isPending}>
            {isPending ? "삭제 중..." : "이미지 삭제"}
          </Button>
        )}

        {selectedFile && (
          <Button type="button" variant="ghost"
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setPreview(null);
              setSelectedFile(null);
            }}>
            선택 취소
          </Button>
        )}
      </div>

      <FieldHint>대회 포스터 또는 관련 이미지 (선택, 최대 5MB)</FieldHint>
    </Card>
  );
}
```

---

### 4-8. `app/admin/tournaments/[id]/edit/actions.ts` (수정)

#### a) `updateTournamentAction` — `status` 제거, `description` 추가

```typescript
// v2 변경: status 제거, description 추가
type UpdateTournamentInput = {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  // status: TournamentStatus;  ← 제거
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;  // ← 추가
};

export async function updateTournamentAction(
  input: UpdateTournamentInput
): Promise<ActionResult> {
  if (!input.tournamentId) return { ok: false, error: "대회 정보가 없습니다." };

  return updateTournament(input.tournamentId, {
    name: input.name,
    location: input.location,
    start_date: input.start_date,
    end_date: input.end_date,
    // status 제거
    max_teams: input.max_teams,
    schedule_start_at: input.schedule_start_at,
    description: input.description,
  });
}
```

#### b) 신규: `uploadPosterAction`

```typescript
export async function uploadPosterAction(
  tournamentId: string,
  formData: FormData
): Promise<{ ok: true; posterUrl: string } | { ok: false; error: string }> {
  const file = formData.get("poster") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "파일을 선택해 주세요." };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "파일 크기는 5MB 이하여야 합니다." };
  }

  const supabase = await createSupabaseServerClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${tournamentId}/poster.${ext}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("tournament-posters")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("tournament-posters")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("tournaments")
    .update({ poster_url: urlData.publicUrl })
    .eq("id", tournamentId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  return { ok: true, posterUrl: urlData.publicUrl };
}
```

#### c) 신규: `deletePosterAction`

```typescript
export async function deletePosterAction(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("tournaments")
    .select("poster_url")
    .eq("id", tournamentId)
    .maybeSingle();

  if (row?.poster_url) {
    const url = new URL(row.poster_url);
    // Supabase Storage URL 형식: .../storage/v1/object/public/[bucket]/[path]
    const storagePath = url.pathname.split("/tournament-posters/")[1];
    if (storagePath) {
      await supabase.storage.from("tournament-posters").remove([storagePath]);
    }
  }

  const { error } = await supabase
    .from("tournaments")
    .update({ poster_url: null })
    .eq("id", tournamentId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  return { ok: true };
}
```

---

## 5. 트레이드오프 및 고려 사항

### 5-1. 상태(status) 제거 — 기존 코드 영향

`TournamentEditForm`에서 `status` 관련 코드를 제거할 때 주의할 점:
- `isFinished` 변수: `tournament.status === "finished"` 체크 → `TournamentEditForm`에서는 제거
- 단, 수정 페이지(`edit/page.tsx`)에서 완료된 대회임을 사용자에게 알리고 싶다면 헤더 영역에 상태 Badge 표시 권장
  - 예: `data.status === "finished"` 시 헤더에 `<Badge>완료</Badge>` 표시 (읽기 전용)
- 기존 `admin/tournaments/[id]/page.tsx`의 상태 변경 로직은 **건드리지 않음**

### 5-2. 포스터 업로드 — 2단계 처리

- 생성 시: tournament INSERT → ID 확보 → 포스터 업로드 → `poster_url` UPDATE
- 포스터 업로드 실패 시 tournament는 생성되고 이미지만 없는 상태
- **결론:** 포스터는 선택사항이므로 허용. 수정 페이지에서 재업로드 가능

### 5-3. `schedule_start_at` 타임존 처리

- `new Date(\`${start_date}T${start_time}:00+09:00\`)` — KST 오프셋 하드코딩
- 한국 대상 서비스이므로 허용

### 5-4. 기존 `schedule_start_at` 데이터에서 시간 추출

- 저장된 값은 UTC ISO 문자열
- `time` input 표시 시 KST 기준으로 변환:
```typescript
const kstMs = new Date(tournament.schedule_start_at).getTime() + 9 * 60 * 60 * 1000;
const initialTime = new Date(kstMs).toISOString().slice(11, 16); // "HH:mm"
```

### 5-5. 포스터 이미지 표시

- `<img>` 태그 사용 (next/image 설정 변경 없음)
- admin 관리 페이지이므로 성능 최적화 우선도 낮음

### 5-6. `format` 필드

- 요구사항 명시 없음, 기존 데이터 보존을 위해 제거하지 않고 기본정보 카드에 포함

### 5-7. Storage 버킷 생성

- Migration SQL에서 `INSERT INTO storage.buckets` 처리
- Cloud Supabase 사용 중이므로 SQL migration으로 처리 가능

### 5-8. 수정 페이지 DivisionsSection / CourtsSection 헤더 한국어화

- 현재 "Divisions" → "디비전"으로, "Courts" 관련도 한글화
- 이번 작업 범위에 포함

---

## 6. 구현 순서 (권장)

| 순서 | 작업 | 파일 |
|---|---|---|
| 1 | DB Migration 적용 | `supabase/migrations/0203_...sql` |
| 2 | lib/api 타입/함수 보강 (status 제거 포함) | `lib/api/tournaments.ts` |
| 3 | 대회 수정 — actions 보강 (status 제거, poster 추가) | `edit/actions.ts` |
| 4 | 대회 수정 — Form 보강 (status 제거, 설명/시간/PosterSection 추가) | `edit/Form.tsx` |
| 5 | 대회 수정 — page 레이아웃 (PosterSection 카드 추가) | `edit/page.tsx` |
| 6 | 대회 생성 — actions 신규 생성 | `new/actions.ts` |
| 7 | 대회 생성 — Form 재구성 (3카드, Server Action) | `new/Form.tsx` |
| 8 | 대회 생성 — page 레이아웃 (Card wrapper 제거) | `new/page.tsx` |

---

## 7. 완료 기준 (Definition of Done)

- [ ] 대회 생성 시 포스터 이미지 선택 → 업로드 → DB에 `poster_url` 저장
- [ ] 대회 생성 시 설명 입력 → DB에 `description` 저장
- [ ] 대회 생성 시 시작 시간 입력 → `schedule_start_at`에 KST 기준 ISO datetime 저장
- [ ] 대회 수정 시 포스터 업로드/삭제 → Storage + DB 동기화
- [ ] 대회 수정 시 설명 수정 → DB 반영
- [ ] 대회 수정 시 시작 시간 (`time` input) → `schedule_start_at` 갱신
- [ ] 생성/수정 두 페이지 모두 포스터/기본정보/설정 카드 3분할 레이아웃
- [ ] **수정 페이지에서 상태(status) 변경 불가** — select 없음
- [ ] 포스터 없는 대회 생성 정상 동작
- [ ] 이미지 5MB 초과 시 클라이언트/서버 양쪽 에러 메시지 표시
- [ ] 기존 divisions/courts CRUD 동작 영향 없음
- [ ] 기존 `/admin/tournaments/[id]` 상태 변경 기능 영향 없음
- [ ] organizer 외 접근 불가
