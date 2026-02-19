# Vertical Slice Ticket

## 목표

- 운영자가 대회 운영 단계별 기능을 **순서대로만 실행**할 수 있게 한다
- 이미 완료된 단계는 **중복 실행을 방지**한다
- 선행 조건이 충족되지 않으면 실행 버튼이 비활성화되거나 실패해야 한다
- T-0074에서 계산한 Progress State(derived state)를 기준으로 Guard 한다

---

## 범위 요약 (중요)

- 이번 슬라이스는 “가드/잠금” 로직을 **서버에서 강제**하는 것이 핵심이다
- UI 비활성화는 보조이며, **서버 액션에서 최종 차단**해야 한다
- DB 구조 변경은 원칙적으로 하지 않는다 (필요 시 최소)
- 자동 실행/워크플로 엔진은 포함하지 않는다

---

## Guard 대상 액션 (고정)

아래 액션들은 “대회 운영 단계”로 간주하고 가드 대상이다:

1. 팀 승인 완료 이후 조/경기 생성 실행 (T-0040)
2. 코트 배정 (T-0042)  ※ 배정 자체는 반복 가능하나, 생성 전에는 불가
3. 결과 입력 (T-0050)  ※ 경기 생성 전에는 불가
4. 순위 계산 실행 (T-0051)
5. 토너먼트 생성 (T-0060)
6. 토너먼트 라운드 진행 (T-0061)

> 각 기능이 이미 별도 페이지/액션으로 존재하므로,
> 이번 티켓은 “중앙 Guard 헬퍼”를 만들고
> 각 액션에서 이를 호출해 차단한다.

---

## Guard 원칙 (핵심)

### 1) 서버 강제
- 모든 Server Action 시작 시 Guard 체크를 수행한다
- 실패 시 `{ ok: false, error: '...' }` 형태로 반환한다

### 2) Derived State 기반
- DB에 별도 progress 상태를 저장하지 않는다
- T-0074와 동일하게, 현재 데이터(teams/groups/matches/standings/bracket)로 판단한다

### 3) Minimal Diff
- 각 액션 파일에 Guard 한 줄 추가 정도로 끝내는 것이 목표

---

## Guard 규칙 정의

### 공통 전제
- role = organizer만 통과 (기존 정책과 동일)

### A. 조/경기 생성 (Group & Match Generation)
- 허용 조건:
  - approved 팀 수 >= 2 (또는 기존 로직의 최소 팀 수)
  - group이 아직 없거나, group stage matches가 아직 없음
- 차단 조건:
  - 이미 groups 존재 + group matches 존재 → “이미 조/경기가 생성되었습니다”

### B. 코트 배정 (Match Court Assignment)
- 허용 조건:
  - group matches 존재
- 차단 조건:
  - group matches 없음 → “먼저 조/경기를 생성하세요”

> 코트 배정은 경기별 수정이므로 “한 번만”이 아니라 반복 가능.
> 단, 선행 조건(경기 존재)만 강제한다.

### C. 결과 입력 (Match Result Input)
- 허용 조건:
  - group matches 존재
- 차단 조건:
  - group matches 없음

> 결과 입력은 개별 match 단위에서 status 조건은 기존 T-0050을 따른다.

### D. 순위 계산 (Standing Calculation)
- 허용 조건:
  - completed group match >= 1 (최소 1경기라도 완료)
  - standings 계산 대상 group/team이 존재
- 차단 조건:
  - completed match 없음 → “완료된 경기가 없습니다”

### E. 토너먼트 생성 (Generate Seeded Bracket)
- 허용 조건:
  - tournament.status = closed
  - standings 존재
  - 토너먼트 matches( group_id null, round=quarterfinal ) 아직 없음
  - (팀 수) standings count >= 8 (현재 규칙)
- 차단 조건:
  - standings 없음
  - 이미 토너먼트 생성됨

### F. 토너먼트 라운드 진행 (Advance Round)
- 허용 조건:
  - current round matches가 모두 completed
  - next round matches가 아직 없음
- 차단 조건:
  - 미완료 경기 존재
  - 이미 다음 라운드 생성됨
  - final completed 상태에서 추가 진행 시도

---

## API / Helper

### 중앙 Guard Helper: `assertTournamentStepAllowed`
- 위치: `/lib/api/tournamentGuards.ts`
- 입력:
  - tournamentId
  - divisionId? (필요 시)
  - stepKey: 'GENERATE_GROUP_STAGE' | 'ASSIGN_COURT' | 'SUBMIT_RESULT' | 'RECALC_STANDINGS' | 'GENERATE_BRACKET' | 'ADVANCE_ROUND'
- 처리:
  - organizer 체크
  - 필요한 데이터 조회
  - 위 규칙 검증
- 출력:
  - 통과: void 또는 `{ ok: true }`
  - 실패: `{ ok: false, error }`

> 구현 방식은 “throw” 또는 “결과 반환” 중 하나로 통일.
> 프로젝트 기존 패턴을 따른다.

---

## 적용 범위 (어디에 Guard를 붙이나)

- 기존 Server Action들에 “시작 부분 Guard 호출”을 추가한다.
  - 조/경기 생성 actions
  - 코트 배정 actions
  - 결과 입력 actions
  - 순위 계산 actions
  - 토너먼트 생성 actions
  - 토너먼트 진행 actions

---

## UI

- T-0074 Dashboard의 “다음 할 일” 버튼은
  - Guard 조건이 충족될 때만 enabled로 표시한다 (보조)
- 각 기능 페이지에서 Guard 실패 시
  - 에러 메시지를 표시한다

---

## 권한

- organizer만 해당 단계 실행 가능
- team_manager/spectator는 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/tournamentGuards.ts` (신규)
- `/lib/api/tournamentProgress.ts` (공용 타입/상수 정리 수준)
- 각 기능의 Server Action 파일(Guard 호출 1~3줄 수준으로만)
  - `/app/**/actions.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- DB에 progress 저장
- 자동 단계 전환
- 워크플로 엔진화
- 상세 운영 로그

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] Guard Helper가 구현되어 공용으로 사용된다
- [ ] 조/경기 생성 중복 실행이 서버에서 차단된다
- [ ] standings 없이는 토너먼트 생성이 서버에서 차단된다
- [ ] 미완료 경기 존재 시 다음 라운드 생성이 차단된다
- [ ] UI에서 비활성화/에러 메시지가 일관되게 표시된다
