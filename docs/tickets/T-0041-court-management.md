# Vertical Slice Ticket

## 목표
- organizer가 대회에서 사용할 코트(A코트, B코트 등)를 관리할 수 있다
- 코트는 대회 단위 리소스로 관리된다
- 이후 슬라이스에서 경기(match)에 코트를 배정/수정할 수 있도록 기반을 마련한다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **코트 CRUD(생성/조회/삭제)** 까지만 포함한다
- 경기(match)와의 실제 연결/배정은 **다음 슬라이스(T-0043)** 에서 진행한다

---

## DB (MCP 필수)

### 대상 테이블
- `courts` (신규 또는 기존 보강)

### courts 스키마(의도)
- id uuid PK
- tournament_id uuid (FK → tournaments.id)
- name text not null (예: A코트, B코트)
- display_order int (선택, 정렬용)
- created_at timestamptz not null default now()

### 제약
- unique(tournament_id, name)
- name 빈값 금지

### RLS
- organizer:
  - INSERT / SELECT / DELETE 가능
- team_manager / public:
  - SELECT 불가 (이번 슬라이스에서는 관리자 전용)

---

### MCP 절차 (반드시 수행)
1) MCP로 courts 테이블/제약/RLS 존재 여부 확인
2) 필요한 SQL 생성
3) `supabase/migrations/0041_court_management.sql`에 저장
4) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## API / Action

### Server Action: `createCourt`
- 입력:
  - tournamentId
  - name
- 처리:
  - role=organizer 확인
  - 동일 tournament 내 name 중복 체크
  - courts insert
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

### Server Action: `deleteCourt`
- 입력:
  - courtId
- 처리:
  - role=organizer 확인
  - courts delete
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/courts`

### 구성
- 코트 목록 표시
  - 코트명
- “코트 추가” 폼
  - 입력: 코트명
- 각 코트 row에 “삭제” 버튼

### 상태 UI
- 로딩 상태 표시
- 에러 메시지 표시
- 빈 상태:
  - “등록된 코트가 없습니다”

---

## 권한
- organizer만 접근/조작 가능
- team_manager / player / spectator 접근 불가
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/courts.ts`
- `/app/admin/tournaments/[id]/courts/actions.ts`
- `/app/admin/tournaments/[id]/courts/Form.tsx`
- `/app/admin/tournaments/[id]/courts/page.tsx`
- `supabase/migrations/0041_court_management.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 경기(match)에 코트 배정
- 경기 시간 스케줄링
- 코트 수정(rename)
- realtime
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 courts 테이블/제약/RLS를 확인했다
- [ ] organizer만 코트 목록 페이지 접근 가능하다
- [ ] 코트 추가가 정상 동작한다
- [ ] 코트 삭제가 정상 동작한다
- [ ] 로딩/에러/빈 상태 UI가 표시된다
