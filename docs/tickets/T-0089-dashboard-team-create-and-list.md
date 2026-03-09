# Vertical Slice Ticket

## 목표
- `/dashboard`에서 로그인 유저가 “내 팀”을 확인할 수 있다
- `/dashboard`에서 팀을 생성할 수 있다
- 팀 생성 시 생성자는 자동으로 `team_members.role_in_team='manager'`로 등록된다
- 팀 카드에서 “선수 관리”로 이동할 수 있다 (다음 티켓에서 상세 구현)

---

## 전제(DB)
- T-0088이 완료되어 다음이 존재함:
  - `teams` (created_by 포함)
  - `team_members`
  - RLS 정책(팀 생성/멤버 삽입 허용 조건 포함)

---

## DB
- 추가 DB 변경 없음

---

## API

### 1) `listMyTeams()`
- 현재 로그인 유저 기준:
  - `team_members.user_id = auth.uid()` 인 팀 목록 조회
- 반환 최소 필드:
  - team_id, team_name, role_in_team
- 정렬:
  - created_at desc 또는 name asc (선택: created_at desc 추천)

### 2) `createTeam({ name, contact? })`
- 동작:
  1) teams INSERT (created_by = auth.uid())
  2) team_members INSERT (team_id, user_id=auth.uid(), role_in_team='manager')
- 트랜잭션 성격으로 처리(가능하면 RPC/서버에서 연속 처리)
- 반환:
  - 성공: `{ ok: true, teamId }`
  - 실패: `{ ok: false, error }`

> 클라이언트 직접 DB write 금지(기존 규칙 유지).
> Server Action에서 처리한다.

---

## UI

### 경로
- `/dashboard`

### 구성(최소)
1) 헤더: “Dashboard”
2) 섹션: “내 팀”
   - 팀 목록 카드/테이블
   - 빈 상태: “아직 팀이 없습니다. 팀을 만들어보세요.”
3) 버튼: “+ 팀 만들기”
   - 클릭 시 폼 표시(인라인 또는 별도 컴포넌트)
4) 팀 생성 폼 필드(최소):
   - 팀명(name) 필수
   - 연락처(contact) 선택
   - 제출 버튼(로딩/에러 포함)

### 팀 카드 액션
- “선수 관리” 버튼:
  - `/teams/[teamId]` 로 이동 (다음 티켓에서 상세 페이지 구현/연결)
- (선택) role_in_team 배지 표시(manager/player)

---

## 에러 처리 규칙(필수)
- 로딩 상태(팀 목록 로딩, 생성 중)
- 에러 메시지 UI(목록 조회 실패, 생성 실패)
- 빈 데이터 상태(팀 없음)
- 실패 케이스 반환값 표준화

---

## 권한
- 로그인 필수
- 유저는 자기 팀만 조회 가능
- 생성은 로그인 유저만 가능
- 생성 후 manager 멤버십 부여는 서버에서 강제

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

이 구조를 깨지 말 것.

---

## 수정 허용 범위 (필수)
- `/app/dashboard/page.tsx`
- `/app/dashboard/actions.ts`
- `/app/dashboard/Form.tsx` (팀 생성 폼)
- `/lib/api/teams.ts` (listMyTeams, createTeam helper)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 팀 수정/삭제 UI
- 팀 멤버 초대/관리
- 선수 CRUD 구현(다음 티켓)
- 대회 참가 신청(다음 티켓)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/dashboard`에 내 팀 목록이 표시된다
- [ ] 팀이 없으면 빈 상태 안내가 표시된다
- [ ] 팀 생성 폼으로 팀을 만들 수 있다
- [ ] 팀 생성 시 생성자가 team_members에 manager로 등록된다
- [ ] 팀 카드에서 `/teams/[teamId]`로 이동할 수 있다
- [ ] 로딩/에러/빈 상태 UI가 있다