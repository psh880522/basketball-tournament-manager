# Vertical Slice Ticket

## 목표
- 토너먼트 경기 결과를 기반으로 **승자를 다음 라운드에 자동 진출**시킨다
- 라운드 단위로 토너먼트가 정상적으로 진행된다
- MVP 1차 완료 기준으로 “토너먼트 종료까지 진행 가능”해야 한다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **승자 진출 + 다음 라운드 경기 생성**까지만 포함한다
- 토너먼트 생성(T-0060) 이후 단계만 다룬다
- 토너먼트 결과 입력 UI는 **T-0050 재사용**
- 브라켓 시각화(UI 트리)는 포함하지 않는다

---

## 전제 조건 (필수)
- T-0060을 통해 토너먼트 1라운드(예: 8강)가 이미 생성되어 있어야 한다
- 대상 match.status = `completed`
- winner_team_id가 반드시 존재해야 한다

---

## DB (MCP 필수)

### 대상 테이블
- `matches` (토너먼트 경기 조회/생성)

### matches 사용 규칙 (토너먼트)
- `group_id = null`
- `round` 값:
  - `quarterfinal`
  - `semifinal`
  - `final`
- `status = 'scheduled' | 'completed'`
- score/winner 규칙은 T-0050과 동일

### 제약/정책
- 다음 라운드가 이미 존재하면 **중복 생성 금지**
- 결승 종료 후에는 더 이상 라운드 생성 불가

---

### MCP 절차 (반드시 수행)
1) MCP로 matches 테이블 구조/RLS 확인
2) 토너먼트 match INSERT/UPDATE 권한 확인
3) 중복 라운드 생성 방지 조건 확인/보강
4) SQL을 `supabase/migrations/0061_tournament_progression.sql`에 저장
5) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마/RLS를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## 라운드 진행 로직 (핵심)

### 1) 현재 라운드 판별
- quarterfinal → semifinal
- semifinal → final
- final → 종료

### 2) 승자 수집
- 현재 라운드의 matches에서:
  - status = `completed`
  - winner_team_id 존재
- 모든 match가 completed가 아니면 실패 반환

### 3) 다음 라운드 매칭 규칙
- **브라켓 순서 유지**
  - QF1 승자 vs QF4 승자 → SF1
  - QF2 승자 vs QF3 승자 → SF2
- SF 승자 2팀 → Final

> 매칭 순서는 **T-0060에서 생성된 순서(slot/order)** 를 그대로 따른다.  
> (order/slot 컬럼이 없다면 생성 시점 순서를 기준으로 고정)

---

## API / Action

### Server Action: `advanceTournamentRound`
- 입력:
  - tournamentId
  - divisionId
  - currentRound (`quarterfinal | semifinal`)
- 처리:
  - role=organizer 확인
  - currentRound matches 조회
  - 모든 match가 completed인지 확인
  - winner_team_id 수집
  - 다음 round 존재 여부 확인
  - 다음 round matches 생성
- 출력:
  - `{ ok: true, nextRound }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/bracket/tournament`

### 구성
- 현재 라운드 표시
- “다음 라운드 생성” 버튼
- 생성 후:
  - 다음 라운드 경기 리스트 표시

### 상태 UI
- 로딩 상태 표시
- 실패 시 에러 메시지 표시:
  - “아직 완료되지 않은 경기가 있습니다”
  - “이미 다음 라운드가 생성되었습니다”
- 결승 종료 시:
  - “토너먼트가 종료되었습니다” 표시

---

## 권한
- organizer만 라운드 진행 가능
- team_manager / spectator는 조회만 가능

---

## 수정 허용 범위 (필수)

- `/lib/api/bracket.ts`
- `/lib/api/matches.ts`
- `/app/admin/tournaments/[id]/bracket/tournament/actions.ts`
- `/app/admin/tournaments/[id]/bracket/tournament/page.tsx`
- `supabase/migrations/0061_tournament_progression.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 토너먼트 결과 공개 페이지
- 브라켓 트리 시각화
- 자동 진행(결과 입력 시 자동)
- realtime
- 통계
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 토너먼트 관련 RLS/제약을 확인했다
- [ ] 현재 라운드의 모든 경기 완료 전에는 진행할 수 없다
- [ ] 승자가 올바르게 다음 라운드에 매칭된다
- [ ] 중복 라운드 생성이 방지된다
- [ ] 결승 종료 시 토너먼트가 정상 종료된다
- [ ] organizer만 진행 가능하다
