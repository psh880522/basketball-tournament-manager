# Vertical Slice Ticket

## 목표
- `/tournament/[id]/apply`에서 “팀 생성”이 아니라 **내 팀을 선택해서 참가 신청**할 수 있다
- 신청 생성은 `tournament_team_applications`에 기록된다
- team manager만 신청할 수 있다 (team_members.role_in_team='manager')
- 신청 후 상태(pending/approved/rejected)를 화면에서 확인할 수 있다

---

## 전제(DB)
- T-0088 완료:
  - `team_members`
  - `tournament_team_applications`
- T-0089 완료:
  - `/dashboard`에서 내 팀 생성/조회 가능
- T-0090 완료:
  - 팀 상세/선수 관리 가능 (선수 필수 여부는 이번 티켓에서 강제하지 않음)

---

## DB
- 추가 DB 변경 없음

---

## RLS/권한 정책 확인
- applications INSERT:
  - team manager만 가능
- applications SELECT:
  - organizer: 전체
  - 해당 팀 멤버: 자기 팀 신청 조회 가능

> 만약 현재 정책이 부족하면 T-0088 정책을 minimal diff로 보강한다(이번 티켓에서 DB 변경은 원칙적으로 하지 않음).

---

## API

### 1) `listMyManagedTeams()`
- 현재 유저가 manager인 팀만 조회
  - join team_members where user_id=auth.uid() and role_in_team='manager'
- 반환: team_id, team_name

### 2) `getMyApplicationStatus(tournamentId)`
- 현재 유저가 소속된 팀(또는 manager 팀) 중
  해당 tournament에 신청한 application 조회
- 반환:
  - 없으면 null
  - 있으면 { applicationId, teamId, teamName, status }

> 단순화를 위해 “manager인 팀” 기준으로만 조회해도 됨.

### 3) `applyToTournament({ tournamentId, teamId })`
- server action에서 처리
- 검증:
  - 현재 유저가 해당 teamId의 manager인지 확인
  - tournament.status가 open인지 확인(가능하면)
  - 중복 신청(unique(tournament_id, team_id)) 에러 처리
- 처리:
  - tournament_team_applications INSERT
    - tournament_id
    - team_id
    - applied_by = auth.uid()
    - status='pending'
- 반환:
  - 성공: `{ ok: true }`
  - 실패: `{ ok: false, error }`

---

## UI

### 경로
- `/tournament/[id]/apply`

### 상태 분기(필수)
1) 로그인 안됨
- `/login`으로 유도(또는 redirect)

2) manager 팀이 없음
- 안내: “참가 신청하려면 먼저 팀을 만들어야 합니다.”
- CTA: `/dashboard`로 이동

3) 신청 기록 없음
- “팀 선택” 드롭다운(or 라디오 리스트)
- 선택한 팀으로 “참가 신청” 버튼
- 로딩/에러/성공 UI

4) 신청 기록 있음
- status 표시:
  - pending: 승인 대기 중
  - approved: 참가 확정
  - rejected: 참가 거절됨
- 신청 팀명 표시
- (선택) “내 팀 보기” → `/teams/[teamId]`

> 재신청/취소는 이번 티켓 제외

---

## 에러 처리 규칙(필수)
- 로딩 상태:
  - 팀 목록 로딩
  - 신청 제출 중
- 에러 메시지 UI:
  - 중복 신청
  - 권한 없음(manager 아님)
  - 대회가 open이 아님
- 빈 데이터 상태:
  - manager 팀 없음

---

## 권한
- team manager만 apply 가능
- organizer는 apply할 필요 없음(일반적으로)
- player는 apply 불가 (대시보드에서 team manager가 진행)

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/tournament/[id]/apply/page.tsx`
- `/app/tournament/[id]/apply/actions.ts`
- `/app/tournament/[id]/apply/Form.tsx`
- `/lib/api/teams.ts` (listMyManagedTeams helper)
- `/lib/api/applications.ts` (신규: applications 조회/생성 helper)
- (필요 시) `/lib/api/tournaments.ts` (status=open 확인용)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 팀 생성(대시보드에서 수행)
- 선수 필수 검증(“선수 3명 이상” 같은 룰)
- 신청 취소/변경
- 여러 팀을 한 대회에 중복 신청(정책 고정: unique)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/tournament/[id]/apply`에서 내 팀을 선택해 신청할 수 있다
- [ ] team manager가 아니면 신청할 수 없다(UX + 서버)
- [ ] 신청이 `tournament_team_applications`에 생성된다
- [ ] 신청 후 상태(pending/approved/rejected)가 표시된다
- [ ] manager 팀이 없으면 `/dashboard`로 유도한다
- [ ] 로딩/에러/빈 상태 UI가 있다