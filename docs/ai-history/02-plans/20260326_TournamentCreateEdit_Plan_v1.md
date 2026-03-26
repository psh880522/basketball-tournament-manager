# Implementation Plan: 대회 생성 및 수정 페이지 개선

- **날짜**: 2026-03-26
- **기능명**: TournamentCreateEdit
- **참고 리서치**: `docs/ai-history/01-research/20260326_TournamentCreateEdit_Research.md`
- **승인 필요**: 이 문서는 구현 전 검토용이며, 승인 후 구현 시작

---

## 1. 기능 상세 설명

### 1-1. 공통 레이아웃 재구성

두 페이지(생성/수정) 모두 아래 카드 구조로 재편한다.

```
<header>  페이지 제목 + 설명 텍스트 (+ 수정 페이지는 "목록으로" 버튼)
<Card>    포스터 섹션
<Card>    기본정보 섹션 (+ 수정 페이지는 상태 필드 포함)
<Card>    설정 섹션 (최대 팀 수 + 코트 + 디비전)
```

### 1-2. 포스터 이미지 업로드

- Supabase Storage `tournament-posters` 버킷 사용
- 최대 1개, 삭제 가능
- 업로드/삭제는 **Server Action**을 통해 서버에서만 처리
- **생성 페이지**: tournament INSERT 완료(ID 확보) → 이미지 업로드 → `poster_url` UPDATE → 리다이렉트
  - 폼 제출 방식을 JSON fetch → **Server Action + FormData**로 변경
  - 이미지 없이 생성도 정상 동작
- **수정 페이지**: 기존 `DivisionsSection` / `CourtsSection`과 동일한 독립 카드 패턴 (`PosterSection`)
  - "업로드" 버튼 클릭 → 파일 선택 → 즉시 Server Action 호출 → `poster_url` 갱신
  - "삭제" 버튼 → Storage 파일 삭제 + `poster_url` null 처리

### 1-3. 기본정보 필드 추가

| 필드 | UI | 변경 내용 |
|---|---|---|
| 대회명 | text input | 유지 |
| 장소 | text input | 유지 |
| 시작일 / 종료일 | date input (2열 grid) | 유지 |
| **시작 시간** | **time input** (신규) | `schedule_start_at`의 시간 부분만 입력. 서버에서 `start_date + time` 조합으로 ISO datetime 생성 |
| **설명** | **textarea** (신규) | 자유 입력, 최대 2000자, 글자 수 표시 |
| 리그 형식(format) | text input | 유지 (기존 데이터 보존), 기본정보 카드로 이동 |

> **수정 페이지 전용**: 상태 select (draft/open/closed/finished) — 현재 위치(기본정보 카드) 유지

-- TODO: 대회 상태는 수정 페이지에서 수정하면 위험 할 수 있으니 제거하자.

### 1-4. 설정 섹션 재구성

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
| `lib/api/tournaments.ts` | 타입 추가, getTournamentForEdit/updateTournament 보강 |
| `app/admin/tournaments/new/page.tsx` | 카드 3분할 레이아웃으로 재구성 |
| `app/admin/tournaments/new/Form.tsx` | 포스터/설명/시작 시간 추가, Server Action으로 제출 방식 변경 |
| `app/admin/tournaments/[id]/edit/page.tsx` | PosterSection 카드 추가 |
| `app/admin/tournaments/[id]/edit/Form.tsx` | 설명/시작 시간 추가, PosterSection 컴포넌트 추가 |
| `app/admin/tournaments/[id]/edit/actions.ts` | updateTournamentAction 타입 보강, poster 관련 Actions 추가 |

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

-- Storage RLS: organizer만 업로드/삭제
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

**변경 대상:**

#### a) `TournamentEditRow` 타입 보강
```typescript
export type TournamentEditRow = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;   // ← 추가
  poster_url: string | null;    // ← 추가
};
```

#### b) `getTournamentForEdit()` select 컬럼 보강
```typescript
// 변경 전
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at")

// 변경 후
.select("id,name,location,start_date,end_date,status,max_teams,schedule_start_at,description,poster_url")
```

#### c) `TournamentUpdatePayload` 타입 보강 (파일 내 private 타입)
```typescript
type TournamentUpdatePayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;   // ← 추가
  poster_url?: string | null;   // ← 추가 (optional, poster는 별도 처리)
};
```

#### d) `updateTournament()` 함수: 새 필드 반영
```typescript
// 기존 payload 구성에 description 추가 (poster_url은 별도 함수로 분리)
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

대회 생성 흐름을 Server Action으로 통합한다.  
FormData로 파일과 텍스트 필드를 함께 수신한다.

```typescript
"use server";

import { redirect } from "next/navigation";
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
  if (userResult.status === "unauthenticated") return { ok: false, error: "로그인이 필요합니다." };
  if (userResult.role !== "organizer" || !userResult.user) return { ok: false, error: "권한이 없습니다." };

  // 2. 필드 추출
  const name       = (formData.get("name") as string)?.trim();
  const location   = (formData.get("location") as string)?.trim() || null;
  const start_date = formData.get("start_date") as string;
  const end_date   = formData.get("end_date") as string;
  const timeValue  = formData.get("start_time") as string; // "HH:mm"
  const description = (formData.get("description") as string)?.trim() || null;
  const format     = (formData.get("format") as string)?.trim() || null;
  const max_teams_raw = formData.get("max_teams") as string;
  const posterFile = formData.get("poster") as File | null;
  // divisions/courts는 JSON string으로 직렬화해서 전달
  const divisionsRaw = formData.get("divisions") as string;
  const courtsRaw    = formData.get("courts") as string;

  // 3. 유효성 검사
  if (!name)        return { ok: false, error: "대회명은 필수입니다." };
  if (!start_date)  return { ok: false, error: "시작일은 필수입니다." };
  if (!end_date)    return { ok: false, error: "종료일은 필수입니다." };

  // 4. schedule_start_at 계산: start_date + timeValue
  let schedule_start_at: string | null = null;
  if (timeValue) {
    const combined = new Date(`${start_date}T${timeValue}:00`);
    if (!isNaN(combined.getTime())) {
      schedule_start_at = combined.toISOString();
    }
  }

  // 5. max_teams 파싱
  const max_teams = max_teams_raw ? Number(max_teams_raw) : null;
  if (max_teams !== null && (!Number.isInteger(max_teams) || max_teams < 2)) {
    return { ok: false, error: "최대 팀 수는 2 이상의 정수여야 합니다." };
  }

  // 6. divisions/courts 파싱
  const divisions = divisionsRaw ? JSON.parse(divisionsRaw) : [];
  const courts    = courtsRaw    ? JSON.parse(courtsRaw)    : [];

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

  // 10. 포스터 업로드 (선택)
  if (posterFile && posterFile.size > 0) {
    const ext = posterFile.name.split(".").pop() ?? "jpg";
    const path = `${tournamentId}/poster.${ext}`;
    const arrayBuffer = await posterFile.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("tournament-posters")
      .upload(path, buffer, {
        contentType: posterFile.type,
        upsert: true,
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("tournament-posters")
        .getPublicUrl(path);

      await supabase
        .from("tournaments")
        .update({ poster_url: urlData.publicUrl })
        .eq("id", tournamentId);
    }
    // 업로드 실패해도 대회 생성은 성공으로 처리
  }

  return { ok: true, id: tournamentId };
}
```

---

### 4-4. `app/admin/tournaments/new/page.tsx` (수정)

단일 Card → 3개 Card 섹션 분리.  
`<NewTournamentForm />`에 props는 없음 (기존 유지).

```tsx
// 레이아웃 구조 (Server Component)
return (
  <main className="min-h-screen bg-gray-50 px-4 py-8">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">대회 생성</h1>
        <p className="text-sm text-gray-600">
          대회 기본 정보와 설정을 입력하세요.
        </p>
      </header>

      {/* 3개 Card를 하나의 <form>으로 감싸는 구조는
          Client Form이 담당 — page는 레이아웃만 제공 */}
      <NewTournamentForm />
    </div>
  </main>
);
```

> `<NewTournamentForm />`이 내부적으로 3개의 Card를 렌더링하며  
> 제출 버튼은 마지막 섹션(설정 카드) 하단에 위치

---

### 4-5. `app/admin/tournaments/new/Form.tsx` (수정)

#### a) 상태 추가
```typescript
// 기존 FormState에 추가
type FormState = {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  format: string;
  max_teams: string;
  start_time: string;      // ← 추가 "HH:mm"
  description: string;     // ← 추가
};

// 포스터 전용 상태
const [posterFile, setPosterFile] = useState<File | null>(null);
const [posterPreview, setPosterPreview] = useState<string | null>(null);
```

#### b) 제출 방식 변경: fetch JSON → Server Action
```typescript
import { createTournamentAction } from "./actions";

const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // ...유효성 검사...

  startTransition(async () => {
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

    {/* ─── 포스터 카드 ─── */}
    <Card>
      <h2 className="text-base font-semibold mb-4">포스터</h2>
      {/* 이미지 프리뷰 영역 (없으면 회색 placeholder) */}
      {posterPreview
        ? <img src={posterPreview} alt="포스터 미리보기" className="..." />
        : <div className="... 회색 placeholder">이미지 없음</div>
      }
      {/* 파일 선택 버튼 */}
      <input type="file" accept="image/*" hidden ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setPosterFile(file);
          setPosterPreview(file ? URL.createObjectURL(file) : null);
        }}
      />
      <Button type="button" variant="secondary"
        onClick={() => fileInputRef.current?.click()}>
        이미지 선택
      </Button>
      {posterFile && (
        <Button type="button" variant="ghost"
          onClick={() => { setPosterFile(null); setPosterPreview(null); }}>
          삭제
        </Button>
      )}
      <FieldHint>대회 포스터 또는 관련 이미지를 업로드하세요. (선택)</FieldHint>
    </Card>

    {/* ─── 기본정보 카드 ─── */}
    <Card>
      <h2 className="text-base font-semibold mb-4">기본 정보</h2>
      {/* 대회명 */}
      {/* 장소 */}
      {/* 시작일 / 종료일 (2열 grid) */}
      {/* 시작 시간 (time input) */}
      {/* 리그 형식 (format) */}
      {/* 설명 (textarea, maxLength=2000, 글자 수 표시) */}
    </Card>

    {/* ─── 설정 카드 ─── */}
    <Card>
      <h2 className="text-base font-semibold mb-4">설정</h2>
      {/* 최대 팀 수 */}
      {/* 코트 설정 섹션 (border-t) */}
      {/* 디비전 설정 섹션 (border-t) */}

      {/* 메시지 */}
      {/* 제출 / 취소 버튼 → 설정 카드 하단 */}
    </Card>

  </form>
);
```

#### d) 포스터 파일 입력 ref
```typescript
const fileInputRef = useRef<HTMLInputElement>(null);
```

---

### 4-6. `app/admin/tournaments/[id]/edit/page.tsx` (수정)

`PosterSection` 컴포넌트를 import하여 카드 추가.

```tsx
import TournamentEditForm, {
  DivisionsSection,
  CourtsSection,
  PosterSection,    // ← 추가
} from "./Form";

// 렌더링 변경
return (
  <main ...>
    <div className="mx-auto max-w-3xl space-y-6">
      <header> ... </header>

      {/* 포스터 카드 — 신규 */}
      <PosterSection
        tournamentId={id}
        initialPosterUrl={data.poster_url}
      />

      {/* 기본정보 카드 (기존 TournamentEditForm) */}
      <TournamentEditForm tournament={data} />

      {/* 설정 카드들 (기존) */}
      <DivisionsSection tournamentId={id} initialDivisions={divisions ?? []} />
      <CourtsSection tournamentId={id} initialCourts={courts ?? []} />
    </div>
  </main>
);
```

---

### 4-7. `app/admin/tournaments/[id]/edit/Form.tsx` (수정)

#### a) `TournamentEditForm` 내부 상태 추가
```typescript
const [description, setDescription] = useState(tournament.description ?? "");
// schedule_start_at에서 시간 부분만 추출
const [startTime, setStartTime] = useState(() => {
  if (!tournament.schedule_start_at) return "";
  // schedule_start_at은 UTC → KST 변환 없이 time 부분만 표시하는 방식 선택
  return new Date(tournament.schedule_start_at).toISOString().slice(11, 16);
});
```

#### b) `updateTournamentAction` 호출 시 추가 필드 전달
```typescript
updateTournamentAction({
  tournamentId: tournament.id,
  name: name.trim(),
  location: ...,
  start_date: startDate,
  end_date: endDate,
  status,
  max_teams: maxTeamsValue,
  schedule_start_at: startTime
    ? new Date(`${startDate}T${startTime}:00`).toISOString()
    : null,
  description: description.trim() || null,   // ← 추가
}).then(...);
```

#### c) 렌더링에 설명/시작 시간 필드 추가 (기본정보 Card 내부)
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
    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none"
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
type PosterSectionProps = {
  tournamentId: string;
  initialPosterUrl: string | null;
};

export function PosterSection({ tournamentId, initialPosterUrl }: PosterSectionProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPosterUrl);
  const [preview, setPreview] = useState<string | null>(null);  // 선택한 파일의 ObjectURL
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setError(null);
    });
  };

  // 렌더링: 이미지 미리보기 / 업로드 버튼 / 삭제 버튼
}
```

---

### 4-8. `app/admin/tournaments/[id]/edit/actions.ts` (수정)

#### a) `updateTournamentAction` input 타입 보강
```typescript
type UpdateTournamentInput = {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  max_teams: number | null;
  schedule_start_at: string | null;
  description: string | null;   // ← 추가
};
```

#### b) 신규: `uploadPosterAction`
```typescript
export async function uploadPosterAction(
  tournamentId: string,
  formData: FormData
): Promise<{ ok: true; posterUrl: string } | { ok: false; error: string }> {
  const file = formData.get("poster") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "파일을 선택해 주세요." };

  // 파일 크기 제한 (5MB)
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

  // poster_url에서 경로 추출 후 Storage에서 삭제
  const { data: row } = await supabase
    .from("tournaments")
    .select("poster_url")
    .eq("id", tournamentId)
    .maybeSingle();

  if (row?.poster_url) {
    // URL에서 bucket 이후 path 추출
    const url = new URL(row.poster_url);
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

### 5-1. 포스터 업로드 — 2단계 처리 vs 원자적 처리

**현재 계획 (2단계):**  
- 생성 시: tournament 생성 → ID 확보 → 포스터 업로드 → `poster_url` UPDATE
- 문제: 포스터 업로드 실패 시 tournament는 생성되고 이미지만 없는 상태

**대안:**
- 포스터 업로드를 supabase transaction으로 묶는 방법은 Storage가 SQL transaction에 포함되지 않아 불가
- 실용적으로는 "포스터는 선택사항이므로 이미지 없는 대회 존재는 허용"으로 처리

**결론:** 현재 계획 유지. 포스터 업로드 실패는 무시하고 대회 생성을 성공으로 처리.

### 5-2. `schedule_start_at` 타임존 처리

**현재 계획:**  
`new Date(\`${start_date}T${start_time}:00\`)`는 로컬 타임존 기준으로 파싱됨.  
서버(Node.js)의 타임존이 UTC라면 실제 의도한 KST 시각과 다를 수 있음.

**대안:**
- 클라이언트에서 타임존 오프셋을 함께 전달
- 또는 `start_date + "T" + start_time + ":00+09:00"` 형태로 KST 명시

**결론:** KST 오프셋(`+09:00`)을 하드코딩하여 처리한다. (한국 대상 서비스이므로 허용)  
```typescript
const combined = new Date(`${start_date}T${start_time}:00+09:00`);
schedule_start_at = combined.toISOString();
```

### 5-3. 기존 `schedule_start_at` 데이터 시간 표시

기존에 `datetime-local`로 저장된 `schedule_start_at` 값은 UTC ISO 문자열.  
`time` input 표시 시 UTC → KST 변환이 필요할 수 있음.

**처리 방안:** KST 기준으로 time 추출:
```typescript
const kstDate = new Date(new Date(tournament.schedule_start_at).getTime() + 9 * 60 * 60 * 1000);
const initialTime = kstDate.toISOString().slice(11, 16); // "HH:mm"
```

### 5-4. 포스터 이미지 표시 (next/image vs img)

- `next/image`를 사용하려면 `next.config.ts`의 `images.remotePatterns`에 Supabase Storage 도메인 등록 필요
- 현재 `next.config.ts`는 비어 있음

**결론:** 관리 페이지(admin)이므로 성능 최적화 우선도가 낮음. 일반 `<img>` 태그 사용. 추후 필요 시 `next/image` 전환.

### 5-5. `format` 필드

- 요구사항에서 명시적으로 다루지 않음
- 기존 데이터 보존을 위해 제거하지 않음
- 기본정보 카드에 포함시켜 유지 (현재 레이아웃과 동일)

### 5-6. Storage 버킷 생성 방법

- Migration SQL의 `INSERT INTO storage.buckets`는 Supabase 환경에서 동작 가능
- 단, 로컬 Supabase CLI 환경에서는 `supabase/config.toml`에 버킷 설정이 필요할 수 있음
- 이미 cloud Supabase를 사용 중이라면 SQL migration으로 생성 가능

### 5-7. 파일 크기/타입 제한

- 클라이언트: `accept="image/*"` + `file.size > 5MB` 체크
- 서버(Server Action): `file.size > 5MB` 재검증 (클라이언트 우회 방어)
- Supabase Storage 자체 제한: 기본 50MB (충분)

### 5-8. 수정 페이지 — 설정 카드 헤더 한국어화

현재 `DivisionsSection`의 제목이 "Divisions" (영문)으로 표시됨.
요구사항의 설정 카드 맥락에서 한글화 필요 여부 확인 필요.
→ 이번 작업 범위에 포함하여 "디비전" / "코트" 한글화 처리.

---

## 6. 구현 순서 (권장)

| 순서 | 작업 | 파일 |
|---|---|---|
| 1 | DB Migration 적용 | `supabase/migrations/0203_...sql` |
| 2 | lib/api 타입/함수 보강 | `lib/api/tournaments.ts` |
| 3 | 대회 수정 — actions 보강 | `edit/actions.ts` |
| 4 | 대회 수정 — Form 보강 | `edit/Form.tsx` |
| 5 | 대회 수정 — page 레이아웃 | `edit/page.tsx` |
| 6 | 대회 생성 — actions 신규 생성 | `new/actions.ts` |
| 7 | 대회 생성 — Form 재구성 | `new/Form.tsx` |
| 8 | 대회 생성 — page 레이아웃 | `new/page.tsx` |

---

## 7. 완료 기준 (Definition of Done)

- [ ] 대회 생성 시 포스터 이미지 선택 → 업로드 → DB에 `poster_url` 저장
- [ ] 대회 생성 시 설명 입력 → DB에 `description` 저장
- [ ] 대회 생성 시 시작 시간 입력 → `schedule_start_at`에 `start_date + time` 조합으로 저장
- [ ] 대회 수정 시 포스터 업로드/삭제 → Storage + DB 동기화
- [ ] 대회 수정 시 설명 수정 → DB 반영
- [ ] 대회 수정 시 시작 시간 (`time` input) → `schedule_start_at` 갱신
- [ ] 생성/수정 두 페이지 모두 포스터/기본정보/설정 카드 3분할 레이아웃
- [ ] 포스터 없는 대회 생성 정상 동작
- [ ] 이미지 5MB 초과 시 에러 메시지 표시
- [ ] 기존 divisions/courts CRUD 동작 영향 없음
- [ ] organizer 외 접근 불가
