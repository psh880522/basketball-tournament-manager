# Vertical Slice Ticket

## 목표
- team_manager가 팀을 생성하고 대회 참가 신청을 완료할 수 있다
- 팀 상태는 기본적으로 `pending`이다
- 한 사용자는 동일 대회에 하나의 팀만 신청할 수 있다

---

## DB (MCP 필수)

- 대상: `teams` 테이블
- 변경/추가 내용:
  - `teams` 테이블이 없으면 생성
  - 대회 참가 상태 관리용 컬럼 포함

### teams 스키마(의도)
- id uuid PK
- tournament_id uuid (FK → tournaments.id)
- team_name text
- captain_user_id uuid (FK → auth.users.id)
- contact text
- status text (`pending | approved | rejected`)
- created_at timestamptz

### 제약
- `(tournament_id, captain_user_id)` unique
- status CHECK 제약

### RLS
- team_manager:
  - 본인이 captain인 팀 insert 가능
  - 본인이 captain인 팀 select 가능
- organizer:
  - 모든 팀 select 가능
- update/delete는 이번 슬라이스에서 금지

### MCP 절차(반드시 수행)
1) MCP로 teams 테이블/제약/RLS 존재 여부 확인
2) 필요한 SQL 생성
3) `supabase/migrations/0020_team_apply.sql`에 저장
4) 적용 후 MCP로 결과 재확인

---

## API
- Server Action: `applyTeamToTournament`
  - 입력:
    - tournamentId
    - teamName
    - contact
  - 처리:
    - role=team_manager 확인
    - 중복 신청 여부 확인
    - teams insert(status=pending)
  - 출력:
    - `{ ok: true }`
    - `{ ok: false, error }`

---

## UI
- `/tournament/[id]/apply`
  - 팀 생성 + 참가 신청 폼
  - 입력:
    - 팀 이름
    - 연락처
  - 제출 시 로딩 표시
  - 성공 시 완료 메시지 표시
  - 실패 시 에러 메시지 표시

---

## 권한
- team_manager만 접근 가능
- organizer/player/spectator 접근 불가
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/teams.ts`
- `/app/tournament/[id]/apply/actions.ts`
- `/app/tournament/[id]/apply/Form.tsx`
- `/app/tournament/[id]/apply/page.tsx`
- `supabase/migrations/0020_team_apply.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 팀 승인/거절
- 선수 등록
- 결제
- realtime
- 대회 상태 변경

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 teams 테이블/제약/RLS를 확인했다
- [ ] 필요한 경우 마이그레이션이 생성/적용되었다
- [ ] team_manager만 신청 페이지 접근 가능하다
- [ ] 팀 생성 시 status가 `pending`으로 저장된다
- [ ] 동일 대회에 중복 신청이 불가능하다
- [ ] 성공/실패/로딩 상태가 UI에 표시된다
