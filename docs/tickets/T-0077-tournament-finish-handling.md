# Vertical Slice Ticket

## 목표

- 운영자가 대회를 “종료” 상태로 명확히 처리할 수 있다
- 종료된 대회는 핵심 운영 기능이 read-only로 전환된다
- 종료 후 사용자(관람자/팀대표)는 결과 확인 흐름으로 자연스럽게 이동한다

---

## 범위 요약 (중요)

- 이번 슬라이스는 “대회 종료 처리 + 종료 상태에 따른 UI 잠금”이 핵심이다
- 토너먼트 결과/순위 표시 페이지는 T-0078에서 구현한다
- DB 구조 변경은 최소화한다
- 자동 종료(결승 완료 시 자동)는 포함하지 않는다 (수동 종료 버튼)

---

## 종료 정의 (고정)

대회 종료의 의미:
- 운영자가 더 이상
  - 팀 승인/거절
  - 조/경기 생성
  - 코트 배정
  - 결과 입력/수정
  - 순위 계산
  - 토너먼트 생성/진행
  을 수행하지 않는 상태

---

## DB (MCP 필요 여부)

### 기본 원칙: 기존 status 활용 (권장)
- `tournaments.status`가 `draft/open/closed`만 있다면,
  - 종료는 `closed`를 “모집 마감 + 운영 종료”로 쓰지 말고
  - **finish 플래그를 별도로 둘지** 검토가 필요함

### 선택지
A) `tournaments.status`에 `finished` 추가 (추천)
- MVP 1차 완료 이후 실사용 관점에서 가장 명확

B) 별도 컬럼 `is_finished boolean` 추가
- status 의미 유지 가능
- 하지만 status와 중복 의미가 생김

> 이 티켓에서는 A를 우선 추천하되,
> 현재 코드/DB가 status enum/constraint를 강하게 쓰고 있으면
> B가 minimal diff일 수 있다.

### MCP 절차 (필요 시)
- 현재 tournaments.status 제약(enum/check) 확인
- 변경이 필요하면
  - `supabase/migrations/0077_tournament_finish.sql` 작성
  - status에 finished 허용 또는 is_finished 추가
  - RLS/제약 영향 확인

---

## API / Action

### Server Action: `finishTournament`
- 입력:
  - tournamentId
- 처리:
  - role=organizer 확인
  - (선택) 토너먼트 결승 종료 여부 확인
    - final match completed가 아니면 경고/차단 (정책 선택)
  - tournaments 상태를 finished로 업데이트
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

> “결승 완료 전에도 종료 가능” 여부는 MVP 정책 선택.
> 이번 티켓에서는 기본적으로:
> - final 완료 전 종료는 막지 않되 경고 UI를 표시(추천)

---

## UI

### 운영자 경로
- `/admin/tournaments/[id]` (T-0074 대시보드에 종료 버튼 추가)

### UI 요구사항
- 종료 버튼(“대회 종료”) 제공
- 클릭 시 확인(confirm) UI
  - “종료하면 운영 기능이 잠깁니다”
- 종료 후 표시:
  - “대회가 종료되었습니다”
  - 결과 보기 링크(`/tournament/[id]/result`)

### Read-only 전환(중요)
종료 상태(finished)일 때:
- 운영자 대시보드의 다음 액션 버튼 비활성화 + 안내
- 결과 입력/순위 계산/토너먼트 진행 등 운영 액션은
  - UI 비활성화(보조)
  - 서버 액션에서도 차단(T-0076 Guard Logic과 연동)

---

## Guard 연동 규칙

- T-0076 Guard Helper에서
  - tournament finished 상태면 모든 운영 step을 차단한다
- 예외:
  - 조회(SELECT)는 허용

---

## 권한
- organizer만 종료 가능
- team_manager/spectator는 종료 처리 불가

---

## 수정 허용 범위 (필수)

- `/app/admin/tournaments/[id]/page.tsx` (종료 버튼/상태 표시)
- `/app/admin/tournaments/[id]/actions.ts` (finishTournament)
- `/lib/api/tournaments.ts` (finish update helper)
- `/lib/api/tournamentGuards.ts` (finished 상태 차단 추가)
- (필요 시) `supabase/migrations/0077_tournament_finish.sql`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 자동 종료(결승 완료 트리거)
- 종료 취소(undo)
- 결과 공유 기능
- 통계/리포트

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] organizer가 대회를 finished로 변경할 수 있다
- [ ] 종료 후 운영 액션이 UI/서버에서 차단된다
- [ ] 종료 상태가 대시보드에 명확히 표시된다
- [ ] 종료 후 “결과 보기”로 유도된다
- [ ] (DB 변경이 있다면) 마이그레이션 적용 및 MCP로 확인했다
