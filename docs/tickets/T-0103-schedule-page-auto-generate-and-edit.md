# Active Vertical Slice Ticket

⚠️ 이 파일에는 반드시 **하나의 티켓만** 존재해야 한다.
⚠️ 실행 후에는 다른 티켓으로 교체한다.
⚠️ 티켓 본문은 원본(T-xxxx 파일)과 동일해야 한다.

---

# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/schedule` 페이지를 추가한다
- organizer가 다음을 할 수 있다:
  1) 대회 시작 시간(start_at)과 경기 간격(interval)을 입력
  2) “스케줄 자동 생성” 버튼 클릭
     - division별로 경기 정렬 후 블록 배치
     - 코트는 sort_order 기준 라운드로빈 배정
     - 각 match에 scheduled_at(또는 scheduled_time) + court_id 저장
  3) 자동 생성 후에는 “시간/코트(슬롯)”은 고정으로 두고,
     경기(매치)를 드래그&드롭으로 슬롯 순서만 변경한다
  4) 변경 사항은 “한 번에 저장(Bulk Save)” 한다

---

## 전제
- T-0102 완료:
  - courts 테이블/관리 UI 존재
- divisions 존재(T-0094) 및 applications에 division_id 존재
- matches 테이블에 `tournament_id`가 있고, match들이 생성되어 있음(조/경기 생성 후)
- match에 `scheduled_time`(또는 `scheduled_at`) 컬럼이 존재한다고 가정
  - 없다면: 이 티켓에서 Supabase MCP로 컬럼 추가(필요 시) + 마이그레이션 저장
- match에 `court_id` 컬럼이 필요
  - 없다면: 이 티켓에서 Supabase MCP로 추가 + FK(courts.id) + 마이그레이션 저장

---

## DB (필요 시: Supabase MCP)

### 1) matches에 court_id 추가 (없으면)
- `court_id uuid null references courts(id) on delete set null`

### 2) matches에 scheduled_time(또는 scheduled_at) 확인
- 없다면 `scheduled_at timestamptz null` 추가

### 3) RLS
- organizer가 matches의 scheduled_at/court_id 업데이트 가능해야 함
- public/team은 읽기 정책은 기존 유지(이번 티켓 범위 밖이면 변경하지 않음)

MCP 절차:
- 컬럼/제약 추가
- RLS 정책 보강(필요 시)
- 마이그레이션 저장:
  - `supabase/migrations/0103_match_schedule_fields.sql` (예시)

---

## 스케줄 자동 생성 로직(고정)

### 입력
- tournamentId
- start_at (timestamptz)
- interval_minutes (int, >= 1)

### 사용 데이터
- divisions: sort_order asc
- courts: sort_order asc
- matches: tournament_id 기준, division별 분류 가능해야 함
  - match에 division_id가 없다면:
    - (현 상태에 맞춰) match가 group/division과 연결되는 경로를 사용(예: groups/divisions join)
    - 최소 구현: “match를 division별로 분류할 수 있는 방법”을 서버에서 확보

### 정렬 규칙
- division 블록 순서: divisions.sort_order asc
- division 내부 match 정렬:
  1) group_id(또는 round) asc (가능하면)
  2) created_at asc

### 배치 규칙 (블록 배치 + 코트 병렬)
- 한 타임슬롯에 코트 수 만큼 병렬 배치
- division마다 슬롯을 0부터 채움
- assigned_time = start_at + floor(slot_index / courts.length) * interval_minutes
- assigned_court = courts[slot_index % courts.length]

update match:
- court_id = assigned_court.id
- scheduled_at = assigned_time

### 덮어쓰기 정책
- “스케줄 자동 생성”은:
  - 해당 tournament matches의 scheduled_at/court_id를 덮어쓴다
  - 실행 전 confirm: “기존 스케줄을 덮어씁니다”

---

## 편집 모델(변경: 시간 고정 + DnD로 경기만 이동)

### 핵심 원칙
- 자동 생성 이후 "슬롯(= scheduled_at + court_id 조합)"은 고정
- 운영자는 "어떤 match가 어떤 슬롯에 들어갈지"만 재배치한다
- 결과적으로 저장 시에는 match들의 scheduled_at/court_id가 서로 교환/재할당된다

### 슬롯 정의
- 슬롯은 현재(또는 자동 생성으로 만들어진) matches의
  `(scheduled_at, court_id)` 조합을 기준으로 정렬한 리스트로 본다
- 정렬 기준:
  1) scheduled_at asc
  2) court.sort_order asc

> 이 방식은 별도 DB 컬럼(order_index) 없이도
> “고정된 시간표” 위에서 match만 바꿔 끼우는 편집을 구현 가능하다.

---

## API / Server Action

### 1) loadScheduleBoard(tournamentId, divisionId?)
- 반환:
  - divisions (id, name)
  - courts (id, name, sort_order)
  - matches (id, divisionId, team labels, scheduled_at, court_id, status)
- 서버에서 slot 정렬에 필요한 court.sort_order 포함

### 2) generateSchedule({ tournamentId, startAt, intervalMinutes })
- organizer 권한 체크
- courts 존재 체크:
  - 없으면 실패: “코트를 먼저 추가하세요”
- matches 존재 체크:
  - 없으면 실패: “먼저 조/경기 생성을 완료하세요”
- 로직대로 scheduled_at/court_id 일괄 업데이트
- 반환:
  - 성공 `{ ok: true }`
  - 실패 `{ ok: false, error }`

### 3) bulkReorderSchedule({ tournamentId, divisionId, orderedMatchIds })
- organizer 권한 체크
- 서버 로직:
  - 해당 division의 "슬롯 리스트"를 생성:
    - 기존 matches에서 (scheduled_at, court_id) 조합을 정렬해 slots[] 생성
  - orderedMatchIds 길이가 division matches 개수와 동일한지 검증
  - i번째 matchId에 slots[i]를 할당하도록 업데이트:
    - match.scheduled_at = slots[i].scheduled_at
    - match.court_id = slots[i].court_id
  - 트랜잭션 성격으로 처리(가능하면)
- 반환:
  - 성공 `{ ok: true }`
  - 실패 `{ ok: false, error }`

> 이 방식은 "시간은 고정"을 보장하면서 DnD로 순서만 바꿀 수 있다.
> (슬롯 자체의 시간/코트는 변하지 않고 match만 재할당)

---

## UI

### 경로
- `/admin/tournaments/[id]/schedule`

### 상단: 자동 생성 폼
- start_at (datetime-local)
- interval_minutes (number)
- 버튼:
  - “스케줄 자동 생성(덮어쓰기)” (confirm 포함)
- 에러/로딩 표시

### 필터/탭
- division 필터(전체/특정 division)
- court 필터(전체/특정 court)

### DnD 보드(수정 쉬운 UI)
- “슬롯 리스트”를 시간 순으로 보여주는 리스트/그리드
- 각 슬롯 카드에는:
  - 시간 (고정, 표시만)
  - 코트명 (전체/특정 court)
  - 매치 카드(드래그 대상)
    - Team A vs Team B
- 드래그&드롭으로 매치 카드의 순서를 바꾸면
  - “변경됨(Dirty)” 상태 표시

### 저장 UX (Bulk Save)
- 상단 또는 하단에 고정 바:
  - “변경사항 저장” 버튼 (Bulk Save)
  - “되돌리기” 버튼(선택: 마지막 로드 상태로 reset)
- 저장 중 로딩/완료/실패 메시지

### 빈 상태/가드
- matches 없음 → “먼저 조/경기 생성을 완료하세요”
- courts 없음 → “코트를 먼저 추가하세요”
- division 선택했는데 해당 division match 없음 → 안내

---

## 에러 처리 규칙(필수)
- 로딩 상태(초기 로드, 생성 중, 저장 중)
- 에러 메시지 UI
- 빈 데이터 상태
- 실패 케이스 반환값 표준화

---

## 권한
- organizer만 접근/수정 가능

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/schedule/page.tsx` (신규)
- `/app/admin/tournaments/[id]/schedule/actions.ts` (신규)
- `/app/admin/tournaments/[id]/schedule/Form.tsx` (신규, DnD Client 포함)
- `/lib/api/schedule.ts` (신규)
- `/lib/api/matches.ts` (스케줄 필드 업데이트 helper 활용 가능)
- `/lib/api/divisions.ts`
- `/lib/api/courts.ts`
- (필요 시) `supabase/migrations/0103_match_schedule_fields.sql`

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 슬롯 시간/코트 자체를 편집하는 기능(이번 티켓에서는 금지)
- 스케줄 확정(잠금) 기능 (다음 티켓)
- 충돌 자동 감지/해결
- 드래그앤드롭 고급 기능(다중 선택 등)
- public 스케줄 공개 UI

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin/tournaments/[id]/schedule` 페이지가 있다
- [ ] start_at + interval 입력 후 스케줄 자동 생성이 된다(division 블록 + 코트 병렬)
- [ ] 자동 생성 후 시간/코트는 고정으로 표시된다
- [ ] 드래그&드롭으로 매치 순서를 바꿀 수 있다
- [ ] “변경사항 저장”을 누르면 한번에 저장된다(orderedMatchIds → slots 재할당)
- [ ] 코트/경기 없으면 적절한 에러/안내가 나온다
- [ ] 로딩/에러/빈 상태 UI가 있다
