# Vertical Slice Ticket

## 목표
- 운영자가 대회 참가 신청 승인 화면에서
  - 신청 팀과 함께 **division 정보를 확인**할 수 있다
- (선택) division별로 신청 목록을 필터링할 수 있다
- 승인/거절 로직은 그대로 유지하고, UI/조회만 확장한다 (minimal diff)

---

## 전제(DB)
- T-0094 완료:
  - divisions 테이블
  - tournament_team_applications.division_id (not null)
- T-0092 완료:
  - Admin Approve가 applications 기반으로 동작 중

---

## DB
- 변경 없음

---

## API

### 1) listTournamentApplications(tournamentId, { divisionId? })
- 기존 함수 확장
- applications + teams + divisions join
- 반환 필드(최소):
  - applicationId
  - teamId
  - teamName
  - status (pending/approved/rejected)
  - divisionId
  - divisionName
  - created_at

정렬:
- pending 먼저, 그 다음 approved/rejected
- pending 내 created_at asc

필터(선택):
- divisionId가 주어지면 where division_id = divisionId

### 2) listTournamentDivisions(tournamentId)
- divisions 목록(정렬 sort_order asc)
- 필터 UI에 사용

> 승인/거절 API(setApplicationStatus)는 변경 없음

---

## UI

### 경로
- 기존 approve 화면 경로 유지:
  - 예: `/admin/tournaments/[id]/applications`

### 표시 변경(필수)
- 신청 리스트 row에 division 배지/텍스트 추가:
  - 예: `[중등부] 팀명 ... 상태`

### 필터(선택)
- 상단에 division 필터 UI 추가:
  - “전체”
  - divisions 목록(select)
- 선택 시 목록이 해당 division으로 필터링되어 표시

### 승인/거절 UX
- 기존과 동일:
  - 로딩 표시
  - 성공 시 상태 반영
  - 실패 시 에러 메시지

---

## 에러 처리 규칙(필수)
- 로딩 상태(목록 로딩, 승인/거절 처리)
- 에러 메시지 UI
- 빈 데이터 상태:
  - 신청 없음
  - pending 없음
  - (필터 적용 시) 해당 division 신청 없음

---

## 권한
- organizer만 접근 가능(기존 유지)

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/applications/page.tsx`
- `/app/admin/tournaments/[id]/applications/actions.ts` (승인/거절 기존 유지)
- `/lib/api/applications.ts` (join + 필터 확장)
- `/lib/api/divisions.ts` (listTournamentDivisions 재사용)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- division별 자동 승인 규칙
- 승인 사유/거절 사유 기록
- 신청 변경/취소
- division별 팀 정원 제한(추후)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] 승인 화면 리스트에 division 정보가 표시된다
- [ ] (선택) division 필터로 목록을 필터링할 수 있다
- [ ] 승인/거절 기능은 기존대로 정상 동작한다
- [ ] 로딩/에러/빈 상태 UI가 있다