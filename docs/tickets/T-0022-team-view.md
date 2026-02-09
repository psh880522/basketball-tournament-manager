# Vertical Slice Ticket

## 목표
- team_manager가 `/team`에서 본인(캡틴) 팀 정보를 확인할 수 있다
- 팀 신청 상태(pending/approved/rejected)를 확인할 수 있다
- 팀이 속한 대회 정보를 함께 확인할 수 있다

---

## DB (MCP 필수)

### 대상
- `teams` 테이블: 본인 팀 select 필요
- `tournaments` 테이블: 팀의 tournament 정보 join 필요

### 요구사항
- team_manager는 `teams.captain_user_id = auth.uid()` 인 row를 SELECT 할 수 있어야 한다
- organizer는 이번 슬라이스에서 별도 확장하지 않아도 됨(최소 변경)
- tournaments는 public read 정책이 이미 존재하나,
  `/team`에서는 draft/open/closed 여부와 관계없이 "내 팀이 속한 대회"는 표시해야 한다.
  (즉, 팀을 신청한 대회가 draft/open/closed 어떤 상태든 team_manager가 볼 수 있어야 함)

### MCP 절차(반드시 수행)
1) MCP로 teams/tournaments RLS 정책을 확인한다
2) `/team` 조회 요구사항을 만족하지 못하면 정책을 보강한다
3) 필요한 SQL을 `supabase/migrations/0022_team_view.sql`에 저장한다
4) 적용 후 MCP로 결과 재확인

### 주의
- 개발용 프로젝트에만 MCP 연결
- 기본 read_only=true
- write가 필요한 경우에만 최소 범위로 해제
- MCP 확인 없이 스키마를 가정해서 작성하지 말 것

---

## API
- (외부 API 없음)
- 서버 컴포넌트에서 DB 조회
  - `getMyTeamsWithTournament()` (권장)

---

## UI
- `/team`
  - 로그인 필수
  - role: team_manager(또는 organizer)만 접근
  - 로딩/에러/빈 상태 UI 포함
  - 표시:
    - 팀명
    - 연락처
    - 상태(pending/approved/rejected)
    - 대회명
    - 대회 기간(start_date~end_date)
    - 대회 상태(draft/open/closed)

### 빈 상태
- 팀이 없으면: "신청한 팀이 없습니다" + `/tournament` 목록으로 안내 링크(가능하면)

---

## 권한
- 접근:
  - team_manager만
  - organizer는 선택(허용해도 되나 최소 변경 우선)
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/teams.ts`
- `/app/team/page.tsx`
- `supabase/migrations/0022_team_view.sql` (필요 시)

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 팀 정보 수정
- 신청 취소
- 선수 등록
- 승인/거절 기능(T-0021 범위)
- realtime
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 teams/tournaments RLS를 확인했다
- [ ] 필요한 경우 마이그레이션이 생성/적용되었다
- [ ] team_manager만 `/team` 접근 가능하다
- [ ] `/team`에서 팀 정보와 신청 상태가 표시된다
- [ ] 팀이 속한 대회 정보가 함께 표시된다
- [ ] 팀이 없을 때 빈 상태 UI가 표시된다
