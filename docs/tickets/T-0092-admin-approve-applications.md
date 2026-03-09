# Vertical Slice Ticket

## 목표
- 운영자가 특정 대회의 참가 신청 목록을 보고 승인/거절할 수 있다
- 승인/거절의 기준 데이터는 `tournament_team_applications`이다
- 승인된 팀 목록은 이후 운영(조/경기 생성, 대진표 생성, 순위 계산)의 입력으로 사용된다
- 기존 teams 기반 승인 로직이 있다면 **applications 기준으로 전환**한다 (점진 전환, 최소 변경)

---

## 전제(DB)
- T-0088 완료:
  - tournament_team_applications (status: pending/approved/rejected)
  - team_members / teams
- T-0091 완료:
  - apply가 applications INSERT로 생성됨

---

## DB
- 추가 DB 변경 없음

---

## 권한/RLS
- applications UPDATE(승인/거절)는 organizer만 가능해야 한다
- applications SELECT:
  - organizer: 전체 조회 가능

---

## API

### 1) `listTournamentApplications(tournamentId)`
- 반환 필드(최소):
  - applicationId
  - teamId
  - teamName
  - status
  - applied_by (선택)
  - created_at
- 정렬:
  - pending 먼저, 그 다음 approved/rejected
  - pending 내 created_at asc

### 2) `setApplicationStatus(applicationId, status)`
- status: approved | rejected
- organizer 권한 체크
- 업데이트:
  - tournament_team_applications.status = status
- 반환:
  - 성공: `{ ok: true }`
  - 실패: `{ ok: false, error }`

### 3) `listApprovedTeamsForTournament(tournamentId)` (downstream용 helper)
- applications where tournament_id=tournamentId and status='approved'
- join teams
- 반환:
  - teamId, teamName

> 이후 T-0040/T-005x/T-006x 로직이 “승인 팀 목록”을 필요로 한다면,
> 해당 로직이 teams.status를 보고 있었다면 이 helper로 대체한다.

---

## UI

### 경로 (기존 Admin Approve UI에 맞춤)
- 기존에 `/admin/tournaments/[id]/teams` 또는 유사 경로가 있다면 재사용
- 없으면:
  - `/admin/tournaments/[id]/applications`

### 화면 구성
- 상단: 대회명 + 상태
- 탭/필터(선택):
  - Pending / Approved / Rejected
  - (없어도 됨, 섹션으로 나눠도 됨)
- 리스트 아이템:
  - 팀명
  - 신청일
  - 현재 상태 배지
  - 액션 버튼:
    - 승인(approved)
    - 거절(rejected)

### UX 규칙
- 승인/거절 버튼 클릭 시:
  - 로딩 상태 표시
  - 성공 시 즉시 상태 업데이트
  - 실패 시 에러 메시지 표시
- pending 아이템에만 승인/거절 버튼 노출 (추천)
  - approved/rejected는 “변경”을 막거나(안전)
  - 또는 변경 허용(운영 유연성) 중 택1

> 이번 티켓에서는 운영 유연성을 위해 “변경 허용”도 가능하지만,
> 최소 구현은 pending만 처리.

---

## Downstream 정합(중요)
다음 기능들이 “승인 팀 목록”을 참조하는 방식이 teams.status였다면,
applications 기반으로 전환해야 한다:

- 조/경기 생성(T-0040)
- 순위/결과 집계(T-005x)
- 대진표 생성/진행(T-006x)

이번 티켓에서 해야 할 최소 범위:
- “승인 팀 목록을 가져오는 단일 helper”를 만들고
- 기존 로직이 teams.status 의존이면 그 조회 부분만 교체 (minimal diff)

> 전면 리팩토링 금지. “승인 팀 조회”만 applications로 바꾼다.

---

## 에러 처리 규칙(필수)
- 로딩 상태(리스트 로딩, 승인/거절 처리 중)
- 에러 메시지 UI
- 빈 데이터 상태:
  - 신청 없음
  - pending 없음
- 실패 케이스 반환값 표준화

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/applications/page.tsx` (신규 또는 기존 approve UI 경로)
- `/app/admin/tournaments/[id]/applications/actions.ts`
- `/lib/api/applications.ts`
- `/lib/api/teams.ts` (approved teams helper 추가/교체)
- (필요 시) `/lib/api/bracket.ts` 또는 기존 “승인 팀 조회”를 호출하던 파일 1~2개
  - 단, “승인 팀 조회 부분”만 minimal diff로 교체

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 신청 취소/삭제
- 자동 승인 규칙
- 승인 사유/거절 사유 기록
- 팀/선수 데이터 검증(인원수 체크 등)
- 알림 발송

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] organizer가 대회별 참가 신청 목록을 볼 수 있다
- [ ] organizer가 승인/거절을 수행할 수 있다(applications.status 업데이트)
- [ ] 팀 대표는 apply 후 상태가 승인/거절로 바뀌는 것을 확인할 수 있다(T-0091 연동)
- [ ] “승인 팀 목록”을 가져오는 helper가 applications 기반으로 동작한다
- [ ] 기존 downstream에서 승인 팀 조회가 필요할 때 teams.status 의존이 제거된다(최소 범위)
- [ ] 로딩/에러/빈 상태 UI가 있다