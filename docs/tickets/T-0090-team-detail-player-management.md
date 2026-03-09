# Vertical Slice Ticket

## 목표
- `/teams/[teamId]`에서 팀 상세를 볼 수 있다
- 팀의 선수 목록을 볼 수 있다
- team manager는 이 화면에서 선수 추가/수정/삭제를 할 수 있다
- team member(player)는 조회만 가능하다
- 권한은 글로벌 role이 아니라 `team_members.role_in_team` 기반으로 동작한다

---

## 전제(DB)
- T-0088 완료:
  - teams
  - team_members (role_in_team: manager/player)
- 기존 players 테이블이 team_id 기반으로 존재한다고 가정(T-0030)

---

## DB
- 추가 DB 변경 없음
- (단, 기존 players RLS가 team_manager 글로벌 role 기준이면,
  이번 티켓에서 team_members 기반으로 정책을 보강/수정해야 할 수 있음)

---

## RLS/권한 정책 (필요 시 변경)
- players:
  - SELECT: team member면 허용
    - exists team_members where team_id = players.team_id and user_id = auth.uid()
  - INSERT/UPDATE/DELETE: team manager만 허용
    - exists team_members where team_id = players.team_id and user_id = auth.uid() and role_in_team='manager'

> 정책 변경이 필요하면 Supabase MCP로 수행하고 마이그레이션 파일을 남긴다.
> (파일명 예: `supabase/migrations/0090_players_rls_team_members.sql`)

---

## API

### 1) `getTeam(teamId)`
- 반환: id, name, contact, created_by
- 권한: team member(또는 organizer)만 조회 가능

### 2) `listTeamPlayers(teamId)`
- 반환: player id, name, number, position (및 필요한 필드)
- 권한: team member만 조회 가능

### 3) `createPlayer(teamId, payload)`
### 4) `updatePlayer(playerId, payload)`
### 5) `deletePlayer(playerId)`
- 권한: team manager만 가능

> 기존 `/lib/api/players.ts`가 있다면 재사용하되,
> helper 시그니처를 팀 화면에서 쓰기 좋게 맞춘다.

---

## UI

### 경로
- `/teams/[teamId]`

### 구성(최소)
1) Team Header
   - 팀명
   - 연락처(있으면)
   - 내 역할 배지(manager/player)

2) Players 섹션
   - 선수 목록 테이블/카드
   - 빈 상태: “등록된 선수가 없습니다”

3) Player 관리 UI
- manager일 때만 노출:
  - “+ 선수 추가” 버튼
  - 선수 행마다 “수정”, “삭제” 버튼

- player(조회 전용)일 때:
  - 버튼 숨김 또는 disabled + 안내 텍스트

### 폼
- Client Form으로 구현:
  - `/app/teams/[teamId]/Form.tsx`
- 입력 필드(최소):
  - name (필수)
  - number (선택/또는 필수 정책에 맞춤)
  - position (선택)

---

## 에러 처리 규칙(필수)
- 로딩 상태(팀/선수 로딩, 저장 중)
- 에러 메시지 UI
- 빈 데이터 상태(선수 없음)
- 실패 케이스 반환값 표준화

---

## 권한
- 로그인 필수
- team member만 접근 가능
- team manager만 쓰기 가능(선수 CRUD)
- organizer는 접근 허용 여부 선택:
  - 기본은 제외(팀 운영에 organizer가 굳이 필요 없으면)
  - 필요 시 정책 추가는 별도 티켓

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/teams/[teamId]/page.tsx`
- `/app/teams/[teamId]/actions.ts`
- `/app/teams/[teamId]/Form.tsx`
- `/lib/api/teams.ts`
- `/lib/api/players.ts` (또는 기존 player api 파일)
- (필요 시) `supabase/migrations/0090_players_rls_team_members.sql`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 팀 정보 수정/삭제
- 팀 멤버 초대/역할 변경
- 선수 대량 업로드
- 참가 신청/대회 연결(다음 티켓)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/teams/[teamId]`에서 팀 정보가 표시된다
- [ ] 선수 목록이 표시된다(없으면 빈 상태)
- [ ] team manager는 선수 추가/수정/삭제가 가능하다
- [ ] team member(player)는 조회만 가능하다
- [ ] 권한이 team_members 기반으로 강제된다(RLS/서버 액션)
- [ ] 로딩/에러/빈 상태 UI가 있다