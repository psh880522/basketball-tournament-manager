# Vertical Slice Ticket

## 목표
- organizer가 대회 내 각 부문(division)별로 **조 편성 + 조별 리그 경기**를 자동 생성할 수 있다
- 조당 팀 수를 유동적으로 설정할 수 있다
- 한 대회 내 여러 부문(중등부/고등부/일반부 등)을 독립적으로 운영할 수 있다
- 생성된 각 경기는 **코트(A/B 등) 배정이 가능하도록 구조를 준비**한다
  (배정/수정 UI는 이후 슬라이스에서 진행)

---

## 범위 요약 (중요)
- 이번 슬라이스는 **“조 편성 + 조별 리그 경기 생성”까지만** 포함한다
- **토너먼트(8강 1–8 시드 매칭)는 포함하지 않는다**
  → 순위 확정 후 별도 슬라이스(T-005x)에서 처리

---

## DB (MCP 필수)

### 신규/보강 대상 테이블

#### divisions (신규)
- id uuid PK
- tournament_id uuid (FK → tournaments.id)
- name text (중등부/고등부/일반부 등)
- group_size int not null   ← 조당 팀 수(유동)
- created_at timestamptz

#### groups (신규)
- id uuid PK
- division_id uuid (FK → divisions.id)
- name text (A조, B조…)
- order int
- created_at timestamptz

#### group_teams (신규)
- group_id uuid (FK → groups.id)
- team_id uuid (FK → teams.id)
- unique(group_id, team_id)

#### matches (보강 또는 신규)
- id uuid PK
- tournament_id uuid
- division_id uuid
- group_id uuid nullable   ← 조별 리그 경기
- team_a_id uuid
- team_b_id uuid
- court_id uuid nullable   ← A/B 코트 배정용 (이번 슬라이스에서는 null)
- status text (scheduled)
- created_at timestamptz

#### courts (신규, 최소 구조)
- id uuid PK
- tournament_id uuid
- name text (A코트, B코트)
- created_at timestamptz

> courts는 **배정 수정용 구조만 준비**하고,  
> 이번 슬라이스에서는 직접 배정하지 않는다.

---

### RLS 기본 방향
- organizer:
  - divisions / groups / group_teams / matches INSERT 가능
  - 모든 SELECT 가능
- team_manager:
  - 본인 팀이 속한 group/match SELECT 가능
- public:
  - open/closed 대회에 한해 match read 가능(선택, MVP에서는 막아도 됨)

---

### MCP 절차 (반드시 수행)
1) MCP로 기존 tables 존재 여부 확인
2) 필요한 테이블/컬럼/RLS 설계
3) SQL 생성
4) `supabase/migrations/0040_generate_bracket.sql`에 저장
5) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## 생성 로직 (핵심)

### 입력 조건
- organizer만 실행 가능
- tournament.status = `closed`
- division 단위로 실행
- 대상 팀: `teams.status = 'approved'` + division_id 일치

### 조 편성
1) 승인된 팀 목록 조회
2) `division.group_size` 기준으로 조 개수 계산
3) 팀 목록 셔플
4) 순서대로 조에 배치
   - A조 → B조 → C조 … 순환 배치

### 조별 리그 경기 생성
- 각 조마다 **Round-Robin**
- 예: 4팀이면 6경기
- 생성 결과는 matches 테이블에 저장
- status = `scheduled`

---

## API / Action

### Server Action: `generateGroupStage`
- 입력:
  - tournamentId
  - divisionId
- 처리:
  - role=organizer 확인
  - tournament.status === 'closed' 확인
  - 이미 groups/matches 존재 시 실패(중복 생성 방지)
  - 조 생성 → group_teams 생성 → matches 생성
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지 (예시)
- `/admin/tournaments/[id]/bracket`
- 표시:
  - division 목록
  - division별 “조 + 경기 생성” 버튼
- 상태:
  - 로딩 표시
  - 실패 시 에러 메시지
  - 성공 시 “생성 완료” 표시

---

## 권한
- organizer만 생성 가능
- team_manager / public 생성 불가
- 조회는 이후 슬라이스에서 확장 가능

---

## 수정 허용 범위 (필수)

- `/lib/api/bracket.ts`
- `/app/admin/tournaments/[id]/bracket/actions.ts`
- `/app/admin/tournaments/[id]/bracket/page.tsx`
- `supabase/migrations/0040_generate_bracket.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 토너먼트 시드 생성(1–8, 2–7 등)
- 경기 결과 입력
- 순위 계산
- 코트 배정 수정 UI
- realtime
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 모든 신규/보강 테이블 스키마/RLS를 확인했다
- [ ] division별로 조가 자동 생성된다
- [ ] 팀이 조에 정상 배치된다
- [ ] 조별 리그 경기가 round-robin으로 생성된다
- [ ] 중복 생성이 방지된다
- [ ] organizer만 생성 가능하다
