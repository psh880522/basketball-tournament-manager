# Vertical Slice Ticket

## 목표
- `/tournament/[id]/apply`에서 참가 신청 시
  1) 팀 선택
  2) division 선택
  후 신청할 수 있다
- 신청 데이터는 `tournament_team_applications`에 저장되며 `division_id`가 포함된다
- team manager만 신청 가능하다
- 신청 후 상태(pending/approved/rejected)와 신청한 팀/division을 확인할 수 있다

---

## 전제(DB)
- T-0094 완료:
  - divisions 테이블
  - tournament_team_applications.division_id (not null)
- T-0091(Apply 팀 선택) 구현이 되어 있다면 그 흐름을 확장한다

---

## DB
- 변경 없음

---

## API

### 1) listTournamentDivisions(tournamentId)
- divisions where tournament_id = tournamentId
- 정렬: sort_order asc
- 반환: id, name, sort_order

### 2) applyToTournament({ tournamentId, teamId, divisionId })
- server action에서 처리
- 검증(필수):
  - 현재 유저가 teamId의 manager인지 확인
  - tournament.status == open 인지 확인(가능하면)
  - divisionId가 tournamentId에 속하는지 확인 (필수)
  - 중복 신청 방지(unique(tournament_id, team_id))
- 처리:
  - tournament_team_applications INSERT:
    - tournament_id
    - team_id
    - division_id
    - applied_by = auth.uid()
    - status='pending'
- 반환:
  - 성공: `{ ok: true }`
  - 실패: `{ ok: false, error }`

### 3) getMyApplicationStatus(tournamentId)
- 기존 구현이 있다면 확장:
  - teamName + status + divisionName 포함해서 반환
- 반환 예:
  - null 또는
  - { teamId, teamName, divisionId, divisionName, status }

---

## UI

### 경로
- `/tournament/[id]/apply`

### 상태 분기(필수)
1) 로그인 안됨
- `/login`으로 유도 또는 redirect

2) manager 팀 없음
- 안내 + CTA: `/dashboard`로 이동

3) divisions 없음
- 안내: “이 대회는 아직 참가 구분(division)이 설정되지 않았습니다. 운영자에게 문의하세요.”
- 신청 UI 비활성

4) 신청 기록 없음
- Step UI(간단):
  - Step 1: 팀 선택 (내 manager 팀만)
  - Step 2: division 선택 (해당 tournament divisions)
  - Step 3: “참가 신청” 버튼
- 버튼은 team/division 둘 다 선택해야 활성화

5) 신청 기록 있음
- 신청한 팀/division 표시
- 상태 배지(pending/approved/rejected)
- (선택) 팀 보기 → `/teams/[teamId]`

---

## 에러 처리 규칙(필수)
- 로딩 상태:
  - manager 팀 목록 로딩
  - divisions 로딩
  - 신청 제출 중
- 에러 메시지 UI:
  - division 검증 실패(다른 대회 division 선택)
  - 중복 신청
  - 권한 없음(manager 아님)
  - 대회 status=open 아님
- 빈 상태:
  - manager 팀 없음
  - divisions 없음

---

## 권한
- team manager만 신청 가능
- player는 신청 불가

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
- `/lib/api/divisions.ts` (listTournamentDivisions 추가/확장)
- `/lib/api/applications.ts` (applyToTournament/getMyApplicationStatus 확장)
- `/lib/api/teams.ts` (listMyManagedTeams 재사용)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 신청 취소/변경
- 팀 다중 division 신청(정책: 한 팀당 한 대회 1개 신청)
- 선수 수/자격 검증(예: 3명 이상)
- 승인 화면 수정(다음 티켓)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] apply 화면에서 팀 선택 + division 선택 후 신청할 수 있다
- [ ] 신청 레코드에 division_id가 저장된다
- [ ] divisions 없으면 신청 불가 안내가 나온다
- [ ] 신청 후 팀/division/상태가 화면에 표시된다
- [ ] 로딩/에러/빈 상태 UI가 있다