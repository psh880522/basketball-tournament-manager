# Vertical Slice Ticket

## 목표
- division 기준 “승인된 참가 팀”을 조회하는 단일 helper를 만든다
- 조/경기 생성 등 운영 로직에서 승인 팀 입력을 applications 기반 + division 기준으로 전환한다 (minimal diff)

---

## 전제
- T-0094~T-0097 완료 (divisions + application.division_id + 승인 UI)

---

## API

### 1) listApprovedTeamsByDivision(tournamentId, divisionId)
- source: tournament_team_applications
- filter:
  - tournament_id = tournamentId
  - division_id = divisionId
  - status = 'approved'
- join: teams
- return:
  - teamId, teamName

### 2) listDivisionsForTournament(tournamentId)
- divisions where tournament_id = tournamentId
- order by sort_order asc

---

## 적용 범위(minimal diff)
- 기존 “승인 팀 조회”를 teams.status나 다른 방식으로 하고 있다면
  - 해당 조회 부분만 `listApprovedTeamsByDivision`로 교체
- 조/경기 생성 기능이 division을 아직 받지 않는다면
  - UI/액션 입력으로 divisionId를 받도록 1단계만 확장
  - (즉, division 선택 후 생성 실행)

> 전면 리팩토링 금지. “승인팀 입력”만 바꾼다.

---

## 권한
- organizer만 사용(운영 기능)

---

## 수정 허용 범위 (필수)
- `/lib/api/applications.ts` (approved teams helper 추가)
- `/lib/api/divisions.ts`
- (필요 시) 조/경기 생성 관련 파일 1~2개
  - 단, 승인팀 조회 교체 + divisionId 전달 정도만 허용

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개 제시.

---

## 완료 기준 (Definition of Done)
- [ ] division 기준 승인팀 조회 helper가 있다
- [ ] 조/경기 생성에서 승인팀 조회가 applications 기반으로 동작한다
- [ ] 최소 변경으로 기존 로직이 깨지지 않는다