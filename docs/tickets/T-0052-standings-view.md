# Vertical Slice Ticket

## 목표
- 계산된 조별 리그 순위(standings)를 **읽기 전용 화면**으로 제공한다
- 팀 대표와 관람자가 각 조의 순위를 확인할 수 있다
- 순위 데이터는 T-0051에서 계산·저장된 결과만 사용한다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **조회(View) 전용**이다
- 순위 계산 로직은 포함하지 않는다
- 실시간 업데이트(realtime)는 포함하지 않는다
- 토너먼트 관련 UI는 포함하지 않는다

---

## DB (MCP 필수)

### 대상 테이블
- `standings` (읽기)
- `teams` (팀명 표시용)
- `groups` (조 정보 표시용)
- `divisions` (부문 구분 표시용)
- `tournaments` (public 접근 조건 판단용: status)

### 요구사항(정확히)
- standings가 없는 경우 “아직 순위가 계산되지 않았습니다”를 표시한다
- RLS가 다음 요구사항을 만족해야 한다:
  - organizer: 전체 조회 가능
  - team_manager: **본인 팀이 속한 group standings만** 조회 가능
  - spectator(public): **tournament.status = `closed`인 경우에만** 조회 가능 (권장)

> ⚠️ 현재 RLS가 organizer만 허용이라면, 위 요구사항을 만족하기 위해
> standings/divisions/groups에 대해 **SELECT 정책 추가가 필요**하다.
> 이는 범위 확장이 아니라 티켓 DoD 충족을 위한 필수 작업이다.

### RLS 최소 변경 원칙
- 이번 슬라이스에서 허용하는 DB 변경은 **SELECT 정책 추가/보강**만이다.
- INSERT/UPDATE/DELETE 권한은 열지 않는다.

### MCP 절차(반드시 수행)
1) MCP로 standings/divisions/groups/tournaments 현재 RLS 상태 확인
2) 요구사항을 만족하지 못하면 **SELECT 정책만** 최소로 추가/보강
3) SQL을 `supabase/migrations/0052_standings_view_rls.sql`에 저장
4) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마/RLS를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## API / Query

### Query Helper: `getGroupStandings`
- 입력:
  - tournamentId
  - divisionId
  - groupId
- 처리:
  - standings + teams join
  - rank ASC 정렬
- 출력:
  - standings 목록
  - 비어 있으면 빈 배열 반환

---

## UI

### Public / Team 페이지
- `/tournament/[id]/standings`

### 구성
1. Division 선택 (중등부 / 고등부 / 일반부)
2. Group 선택 (A조 / B조 …)
3. 순위 테이블 표시

#### 테이블 컬럼
- 순위(rank)
- 팀명
- 승
- 패
- 득점(points_for)
- 실점(points_against)
- 득실차(points_diff)

### 상태 UI
- 로딩 상태 표시
- 에러 메시지 표시
- 빈 상태:
  - standings 없음 → “아직 순위가 계산되지 않았습니다”
  - group 없음 → “조 정보가 없습니다”

---

## 권한
- organizer: 모든 조/부문 조회 가능
- team_manager: 본인 팀이 속한 조 조회 가능
- spectator(public):
  - tournament.status = `closed` 일 때만 조회 가능
  - 로그인 없이 접근 가능(선택)

---

## 수정 허용 범위 (필수)

- `/lib/api/standings.ts`
- `/lib/api/teams.ts` (조회 보조)
- `/lib/api/groups.ts`
- `/lib/api/divisions.ts`
- `/app/tournament/[id]/standings/page.tsx`
- `supabase/migrations/0052_standings_view_rls.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 순위 계산 실행
- 자동 새로고침 / realtime
- 토너먼트 진출 표시
- 경기 상세 링크
- 통계 그래프
- 결제/광고

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 standings/divisions/groups RLS를 확인했다
- [ ] 필요한 경우 SELECT-only RLS 정책이 마이그레이션으로 추가/적용되었다
- [ ] standings 데이터가 rank 기준으로 정상 표시된다
- [ ] division / group 전환 시 데이터가 올바르게 바뀐다
- [ ] standings 미계산 상태가 명확히 표시된다
- [ ] team_manager / spectator 권한에 맞게 접근이 제한된다
- [ ] 로딩/에러/빈 상태 UI가 표시된다
