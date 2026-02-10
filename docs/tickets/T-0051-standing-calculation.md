# Vertical Slice Ticket

## 목표
- 조별 리그(Group) 단위로 팀 순위를 자동 계산한다
- 순위 결정 기준을 아래 우선순위로 적용한다:
  1) 승수 → 2) 승자승 → 3) 다득점 → 4) 저실점
- organizer가 관리 화면에서 “순위 계산”을 실행하고 결과를 확인할 수 있다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **조별 리그 standings 계산 + 저장 + 관리자 조회**까지만 포함한다
- 토너먼트 생성(시드/8강 매칭)은 포함하지 않는다
- 실시간 반영, 자동 재계산(경기 입력 시 자동)은 포함하지 않는다
  - 재계산은 버튼(수동 실행)으로만 수행한다

---

## DB (MCP 필수)

### 대상 테이블
- `matches` (읽기)
- `standings` (신규 또는 보강)

### standings 스키마(의도)
- id uuid PK
- tournament_id uuid
- division_id uuid
- group_id uuid
- team_id uuid
- wins int not null default 0
- losses int not null default 0
- points_for int not null default 0
- points_against int not null default 0
- points_diff int not null default 0
- rank int not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### 제약
- unique(group_id, team_id)
- rank는 1..N 범위
- 값들은 0 이상

### RLS
- organizer:
  - standings INSERT/UPDATE/SELECT 가능
- team_manager:
  - 본인 팀이 속한 group standings SELECT 가능(선택)
- public:
  - 이번 슬라이스에서는 접근 불가(선택)

---

### MCP 절차 (반드시 수행)
1) MCP로 standings 테이블 존재 여부/스키마/RLS 확인
2) 필요한 SQL 생성(테이블/제약/RLS/updated_at 트리거 등)
3) `supabase/migrations/0051_standing_calculation.sql`에 저장
4) 마이그레이션 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## 계산 규칙(정확히)

### 대상 경기
- `matches.group_id is not null` (조별 리그 경기)
- `matches.status = 'completed'` 인 경기만 반영
- 팀은 `group_teams`에 속한 팀을 기준으로 계산(권장)

### 1) 기본 집계
각 팀별로:
- wins: 승리 경기 수
- losses: 패배 경기 수
- points_for: 득점 합계
- points_against: 실점 합계
- points_diff = points_for - points_against

### 2) 정렬(순위 산정)
정렬 키(우선순위):
1. wins DESC
2. head-to-head(승자승) DESC
3. points_for DESC
4. points_against ASC

#### 승자승(Head-to-Head) 정의
- 동률 그룹(같은 wins)을 대상으로,
  - 동률 팀들끼리의 맞대결 결과에서 **승수**가 높은 팀을 우선한다.
- 3팀 이상 동률이면:
  - 동률 팀들끼리만 추출한 “미니 리그”에서 승수로 비교한다.
- 승자승으로도 완전히 갈리지 않으면 다음 기준(다득점/저실점)으로 진행한다.

※ MVP에서는 “동률 그룹 내 미니리그 승수”까지만 구현하고,
  추가 복잡 규칙(예: 동률 그룹 내 득실차 등)은 이번 슬라이스 제외.

---

## API / Action

### Server Action: `recalculateGroupStandings`
- 입력:
  - tournamentId
  - divisionId
  - groupId
- 처리:
  - role=organizer 확인
  - 해당 group의 팀 목록 조회(group_teams)
  - 해당 group의 completed matches 조회
  - standings 계산
  - standings upsert(기존 있으면 update, 없으면 insert)
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/standings`

### 구성
- division 선택(또는 목록)
- group 선택(또는 목록)
- “순위 계산” 버튼(수동)
- 결과 테이블 표시:
  - rank, team_name, wins, losses, points_for, points_against, points_diff

### 상태 UI
- 로딩 상태 표시
- 실패 시 에러 메시지 표시
- 빈 상태:
  - completed match가 없으면 “완료된 경기가 없습니다”
  - group/team이 없으면 “조/팀 데이터가 없습니다”

---

## 권한
- organizer만 계산 실행 가능
- 조회는 organizer만 우선 지원(팀대표/관람자 공개는 후속)

---

## 수정 허용 범위 (필수)

- `/lib/api/standings.ts`
- `/lib/api/matches.ts` (조회 헬퍼만 사용)
- `/lib/api/teams.ts` (팀명 조회 필요 시)
- `/app/admin/tournaments/[id]/standings/actions.ts`
- `/app/admin/tournaments/[id]/standings/page.tsx`
- `supabase/migrations/0051_standing_calculation.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 자동 재계산(경기 입력 시 트리거)
- 실시간 반영
- 토너먼트 생성
- 관람자 공개 페이지
- 고급 동률 해소 규칙 확장(동률 그룹 내 득실차 등)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 standings 테이블/제약/RLS를 확인했다
- [ ] organizer만 순위 계산 페이지 접근 가능하다
- [ ] completed matches 기반으로 wins/losses/득실이 정확히 계산된다
- [ ] 동률 시 승자승 → 다득점 → 저실점 순으로 순위가 결정된다
- [ ] 결과가 standings에 저장(upsert)된다
- [ ] 로딩/에러/빈 상태 UI가 표시된다
