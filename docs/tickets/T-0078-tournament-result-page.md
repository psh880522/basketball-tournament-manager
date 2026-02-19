# Vertical Slice Ticket

## 목표

- 대회 종료 후 사용자가 최종 결과를 한 화면에서 확인할 수 있다
- 최소 구성으로 다음 정보를 제공한다:
  - 우승팀
  - 토너먼트 결과 요약(라운드별 매치)
  - 조별 리그 최종 순위(standings)
- 비로그인 관람자도 접근 가능해야 한다(공개 범위는 기존 정책/상태 기준)

---

## 범위 요약 (중요)

- 이번 슬라이스는 “결과 조회(View)” 전용이다
- 결과 계산/토너먼트 진행 로직은 포함하지 않는다
- 실시간 업데이트(realtime)는 포함하지 않는다
- 공유/출력(PDF/이미지)은 포함하지 않는다

---

## 대상 화면

### 경로
- `/tournament/[id]/result`

---

## 데이터 요구사항

### 1) Tournament 기본 정보
- name, location, start_date, end_date, status/finished

### 2) 우승팀 결정 규칙 (고정)
- 토너먼트 `final` 라운드 match의 `winner_team_id`가 우승팀
- final match가 없거나 미완료면:
  - “아직 우승팀이 확정되지 않았습니다” 표시

### 3) 토너먼트 결과 요약
- 토너먼트 matches: `group_id is null`
- 라운드별로 묶어서 표시:
  - quarterfinal
  - semifinal
  - final
- 각 match는:
  - 팀A vs 팀B
  - 점수(있으면)
  - 상태(scheduled/completed)

### 4) 조별 리그 최종 순위
- standings 데이터를 division/group 단위로 표시
- 최소 표시:
  - rank, team_name, wins, losses, points_for, points_against, points_diff

> standings가 없으면:
> “아직 순위가 계산되지 않았습니다” 표시

---

## UI 구성

### 섹션 구성(권장)
1. Header: 대회명 + 상태(종료)
2. Champion: 우승팀 카드
3. Tournament Bracket Summary: 라운드별 경기 리스트
4. Group Standings Summary: division/group 선택 또는 전체 나열(간단)

### 상태 UI
- 로딩 상태
- 에러 메시지
- 데이터 없음 상태:
  - 토너먼트 미생성/미완료
  - standings 없음

---

## 접근 권한 (중요)

기본 정책:
- 대회가 종료(예: finished 또는 status=closed)된 경우에만 public 공개

권한 요구사항:
- organizer: 항상 접근 가능
- team_manager: 종료된 대회 결과 접근 가능
- spectator(public): 종료된 대회 결과 접근 가능

> RLS가 현재 막혀 있으면, T-0052에서 했던 방식처럼
> SELECT-only 정책을 최소로 추가해야 할 수 있다.
> 이 티켓에서는 “필요 시” 마이그레이션을 허용 범위에 포함한다.

---

## DB / RLS (필요 시, MCP)

### 대상
- `matches` (토너먼트 결과)
- `standings`
- `teams`
- `tournaments`
- `divisions/groups` (standings 표시용)

### MCP 절차 (필요 시)
1) MCP로 위 테이블의 SELECT 정책 확인
2) spectator/public이 “종료된 대회”만 읽을 수 있도록 SELECT-only 정책 최소 추가
3) `supabase/migrations/0078_tournament_result_public_rls.sql`에 저장
4) 적용 후 MCP로 재확인

---

## 수정 허용 범위 (필수)

- `/app/tournament/[id]/result/page.tsx`
- `/lib/api/tournaments.ts`
- `/lib/api/matches.ts`
- `/lib/api/standings.ts`
- `/lib/api/teams.ts`
- (필요 시) `supabase/migrations/0078_tournament_result_public_rls.sql`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 결과 공유 링크/이미지
- PDF 출력
- 브라켓 트리 시각화(그래픽)
- 실시간 업데이트
- 상세 통계/선수 기록

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] `/tournament/[id]/result`에서 대회 정보가 표시된다
- [ ] final winner가 있으면 우승팀이 표시된다
- [ ] 토너먼트 matches가 라운드별로 표시된다
- [ ] standings가 표시된다(없으면 빈 상태)
- [ ] 종료된 대회만 public 접근 가능하다(정책 기반)
- [ ] 로딩/에러/빈 상태 UI가 있다
