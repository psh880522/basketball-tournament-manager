# Vertical Slice Ticket

## 목표
- organizer가 팀 참가 신청(pending)을 승인/거절할 수 있다
- 승인/거절 결과는 `teams.status`로 저장된다
- 대회가 `open` 상태일 때만 승인/거절이 가능하다

---

## DB (MCP 필수)

### 대상
- `teams` 테이블: status update 필요
- `tournaments` 테이블: 상태(open) 확인 필요

### 변경/보강 요구
1) `teams.status` 허용 값
- `pending | approved | rejected` CHECK 제약 존재/보강

2) RLS (핵심)
- organizer만 `teams` UPDATE 가능(승인/거절)
- organizer는 `teams` SELECT 가능(대회별 목록 조회)
- team_manager는 본인(captain) 팀 SELECT 가능(기존 T-0020 범위)
- 이번 슬라이스에서는 delete 금지

3) 업데이트 범위 제한(권장)
- organizer update 시 `status` 컬럼만 변경 가능하도록(가능하면) 정책/SQL로 제한
  - 최소 구현에서는 “UPDATE 허용 + 앱 레벨에서 status만 업데이트”로 처리해도 됨

### MCP 절차(반드시 수행)
1) MCP로 teams/tournaments 스키마, 제약, RLS 상태 조회
2) 필요한 SQL 생성(제약/RLS 정책 추가·보강)
3) `supabase/migrations/0021_admin_approve_teams.sql`에 저장
4) 마이그레이션 적용 후 MCP로 결과 재확인

### 주의
- 개발용 프로젝트에만 MCP 연결
- 기본 read_only=true
- write가 필요한 경우에만 최소 범위로 해제
- MCP 확인 없이 스키마를 가정해서 작성하지 말 것

---

## API

### Server Action: `updateTeamApplicationStatus`
- 입력:
  - `tournamentId`
  - `teamId`
  - `status` = `approved | rejected`
- 처리:
  - 로그인/role 확인: organizer만
  - tournament 상태 확인: `open` 아니면 실패
  - team이 해당 tournament 소속인지 확인
  - 현재 team.status가 `pending`인지 확인(이미 처리된 건 실패)
  - teams.status 업데이트
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error: string }`

---

## UI

### `/admin/tournaments/[id]/teams`
- organizer 가드 (미허용 시 notFound 또는 /dashboard redirect로 일관되게)
- 표시:
  - 대회 정보(이름/상태) 요약
  - pending 팀 목록(팀명, 연락처, 신청자)
- 액션:
  - 각 팀 row에 Approve / Reject 버튼
  - 로딩 상태 표시(버튼 disable + "처리중...")
  - 실패 시 에러 메시지 표시
  - 성공 시 목록 갱신(승인된 팀은 pending 목록에서 사라짐)
- 빈 상태:
  - pending 팀이 없으면 "대기 중인 신청이 없습니다" 표시

---

## 권한
- organizer만 접근/승인/거절 가능
- team_manager/player/spectator 접근 불가
- 비로그인 접근 불가
- 승인/거절은 tournament.status가 `open`일 때만 가능

---

## 수정 허용 범위 (필수)

- `/lib/api/teams.ts`
- `/app/admin/tournaments/[id]/teams/actions.ts`
- `/app/admin/tournaments/[id]/teams/Form.tsx`
- `/app/admin/tournaments/[id]/teams/page.tsx`
- `supabase/migrations/0021_admin_approve_teams.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 팀 신청 생성(T-0020 범위)
- 선수 등록
- 대진표 생성
- 경기 결과/순위
- realtime
- 결제
- 대회 상태 변경(T-0011 범위)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 teams/tournaments 스키마·제약·RLS 상태를 확인했다
- [ ] 필요한 경우 마이그레이션이 생성/적용되었다
- [ ] organizer만 `/admin/tournaments/[id]/teams` 접근 가능하다
- [ ] pending 팀 목록이 표시되고, 없으면 빈 상태 UI가 표시된다
- [ ] Approve/Reject 시 로딩/성공/실패 UI가 동작한다
- [ ] 승인/거절은 `open` 대회에서만 가능하고, 그 외는 실패 메시지가 뜬다
