# Vertical Slice Ticket

## 목표
- team_manager가 `/team/players`에서 본인 팀 선수 정보를 CRUD 할 수 있다
- 선수는 특정 팀(teams.id)에 소속된다
- 로딩/에러/빈 상태 UI를 제공한다

---

## DB (MCP 필수)

### 대상
- `players` 테이블 (신규 생성 가능성 높음)
- `teams` 테이블 (players.team_id FK / 권한 판단)

### players 스키마(의도)
- id uuid PK
- team_id uuid (FK → teams.id, on delete cascade)
- name text not null
- number int null
- position text null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### 제약(권장)
- 한 팀 내 등번호 중복 방지: unique(team_id, number) (number가 null일 때는 허용되는지 확인 필요)
- name 길이/빈값 방지(앱 레벨에서 최소 검증)

### RLS
- team_manager:
  - 본인이 captain인 팀(team_id가 본인 팀)에 한해 players select/insert/update/delete 가능
- organizer:
  - 이번 슬라이스에서는 필수 아님(추가하지 않아도 됨)
- 비로그인 접근 불가

### MCP 절차(반드시 수행)
1) MCP로 players/teams 스키마 및 RLS 상태 확인
2) 필요한 SQL 생성(테이블/FK/제약/RLS 정책/updated_at 트리거)
3) `supabase/migrations/0030_player_crud.sql`에 저장
4) 마이그레이션 적용 후 MCP로 결과 재확인

### 주의
- 개발용 프로젝트에만 MCP 연결
- 기본 read_only=true
- write가 필요한 경우에만 최소 범위로 해제
- MCP 확인 없이 스키마를 가정해서 작성하지 말 것

---

## API

### Server Actions
- `createPlayer`
  - 입력: name, number?, position?
  - 처리: 내 팀 id 조회 → players insert
  - 출력: `{ ok: true }` / `{ ok: false, error }`

- `updatePlayer`
  - 입력: playerId, name, number?, position?
  - 처리: 내 팀 소속인지 확인(또는 RLS로 차단) → update
  - 출력: `{ ok: true }` / `{ ok: false, error }`

- `deletePlayer`
  - 입력: playerId
  - 처리: 내 팀 소속인지 확인(또는 RLS로 차단) → delete
  - 출력: `{ ok: true }` / `{ ok: false, error }`

---

## UI

### `/team/players`
- 접근:
  - 로그인 필수
  - role: team_manager만 허용 (organizer는 선택)
- 구성:
  - 상단: 내 팀 정보(팀명, 상태) 요약(가능하면)
  - 선수 목록 테이블/리스트
  - "선수 추가" 폼(Form.tsx)
  - 각 선수 row에 "수정" / "삭제" 버튼
- 상태 UI:
  - 로딩: 리스트 로딩 표시
  - 빈 상태: "등록된 선수가 없습니다"
  - 에러: 에러 메시지 표시
  - 액션 로딩: 저장/삭제 중 버튼 disable + 진행 표시

---

## 권한
- team_manager만 CRUD 가능
- 본인 captain 팀의 선수만 CRUD 가능
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/players.ts`
- `/lib/api/teams.ts` (필요 시 최소 보강)
- `/app/team/players/actions.ts`
- `/app/team/players/Form.tsx`
- `/app/team/players/page.tsx`
- `supabase/migrations/0030_player_crud.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 선수 포지션/번호 고급 검증
- 선수 일괄 업로드(엑셀)
- 선수 공개 페이지
- 경기 기록/순위/대진표
- realtime
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 players/teams 스키마·제약·RLS 상태를 확인했다
- [ ] 필요한 경우 마이그레이션이 생성/적용되었다
- [ ] team_manager만 `/team/players` 접근 가능하다
- [ ] 선수 목록이 표시되고 빈 상태 UI가 동작한다
- [ ] 선수 추가/수정/삭제가 정상 동작한다
- [ ] 각 액션에 로딩/에러 UI가 포함된다
