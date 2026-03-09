# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/edit` 페이지에서 코트(Courts)를 추가/삭제/정렬할 수 있다
- organizer만 관리 가능하다
- 코트는 이후 스케줄/코트배정 단계에서 사용된다
- 코트 테이블이 없다면 Supabase MCP로 생성하고 마이그레이션을 남긴다

---

## 전제
- 대회는 tournamentId로 식별됨
- T-0100(Global Nav), T-0101(group_size UI), T-0095(divisions UI)가 존재하거나 유사 구조가 있음

---

## DB

### 1) courts 테이블이 이미 존재하는 경우
- 컬럼을 확인하고 아래 필수 컬럼이 없으면 추가(MCP):
  - `tournament_id uuid not null references tournaments(id) on delete cascade`
  - `name text not null`
  - `sort_order int not null default 0`
  - `created_at timestamptz not null default now()`

권장 제약:
- unique(tournament_id, name) (선택)

### 2) courts 테이블이 없는 경우 (필수: Supabase MCP로 생성)
create table courts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

index:
- (tournament_id)
- (tournament_id, sort_order)

---

## RLS 정책 (필수)
- courts SELECT:
  - organizer: 허용
  - (선택) public: 대회 일정 공개를 위해 허용 가능하나 이번 티켓에서는 organizer-only로 시작
- courts INSERT/UPDATE/DELETE:
  - organizer만 허용

> 정책은 Supabase MCP로 적용하고 마이그레이션에 포함한다.

---

## Supabase MCP 절차 (필요 시)
- courts 테이블 생성/컬럼 추가
- RLS enable + 정책 생성
- 마이그레이션 저장:
  - `supabase/migrations/0102_courts.sql` (예시)

---

## API

### 1) listCourts(tournamentId)
- 반환: id, name, sort_order
- 정렬: sort_order asc

### 2) createCourt(tournamentId, { name })
- organizer만 가능
- sort_order: max(sort_order)+1
- 반환: `{ ok: true } | { ok: false, error }`

### 3) updateCourt(courtId, { name?, sort_order? })
- organizer만 가능

### 4) deleteCourt(courtId)
- organizer만 가능
- (중요) 이미 match에 court_id로 참조되고 있으면 삭제 불가 권장
  - 만약 match.court_id가 존재한다면:
    - 참조 중이면 실패 + 이유 메시지 반환
  - match.court_id가 아직 없다면:
    - 단순 삭제 허용

---

## UI

### 경로
- `/admin/tournaments/[id]/edit`

### Courts 섹션 추가
Edit 페이지에 “Courts” 섹션을 새로 추가한다.

구성:
1) Courts 목록
   - 코트명
   - sort_order(표시용)
   - 삭제 버튼
2) "+ 코트 추가"
   - name 입력
   - 저장/취소
3) (선택) 정렬 변경
   - MVP에서는 drag/drop 제외
   - “위로/아래로” 버튼 또는 sort_order 직접 입력(간단)

UX 규칙:
- 삭제는 confirm
- 코트 없으면 빈 상태: “등록된 코트가 없습니다”

---

## 에러 처리 규칙(필수)
- 로딩 상태(list)
- 에러 메시지 UI
- 빈 상태 UI
- create/update/delete 실패 반환값 표준화

---

## 권한
- organizer만 접근/수정 가능
- team_manager/player 접근 불가(기존 정책 유지)

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/edit/page.tsx`
- `/app/admin/tournaments/[id]/edit/actions.ts`
- `/app/admin/tournaments/[id]/edit/Form.tsx` (Edit 폼이 분리되어 있다면)
- `/lib/api/courts.ts` (신규)
- `/lib/api/divisions.ts` (Edit 페이지에서 함께 쓰는 경우 변경 없이 호출만)
- (필요 시) `supabase/migrations/0102_courts.sql`

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 코트 배정 로직
- 스케줄 페이지(다음 티켓)
- public에 코트 노출
- drag&drop 정렬

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] Edit 페이지에서 코트 목록이 보인다
- [ ] 코트를 추가할 수 있다
- [ ] 코트를 삭제할 수 있다(필요 시 참조 중이면 삭제 차단)
- [ ] sort_order 기준 정렬이 유지된다
- [ ] organizer만 가능하다
- [ ] DB가 필요하면 MCP로 생성/정책 적용/마이그레이션 저장이 완료된다