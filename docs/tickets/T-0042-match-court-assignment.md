# Vertical Slice Ticket

## 목표
- organizer가 생성된 경기(match)에 코트(A/B 등)를 배정/수정할 수 있다
- 코트 배정은 경기 진행 스케줄의 일부로 관리된다
- 대진표(경기 구조)는 변경하지 않고, “코트만” 수정한다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **코트 배정/변경**까지만 포함한다
- 경기 시간(scheduled_time) 수정은 포함하지 않는다
- 대진표 구조, 팀 매칭, 결과 입력은 건드리지 않는다

---

## DB (MCP 필수)

### 대상 테이블
- `matches` (보강)
- `courts` (기존 T-0041)

### matches 보강 컬럼
- `court_id uuid null` (FK → courts.id)

### 제약/정책
- court_id는 동일 tournament의 court만 참조 가능해야 함(앱 레벨 검증)
- 한 경기에는 하나의 코트만 배정 가능
- organizer만 update 가능

### RLS
- organizer:
  - matches SELECT / UPDATE 가능
- team_manager:
  - 본인 팀이 포함된 match SELECT 가능
- public:
  - 이번 슬라이스에서는 접근 불가(선택)

---

### MCP 절차 (반드시 수행)
1) MCP로 matches 테이블에 `court_id` 컬럼 존재 여부 확인
2) FK/정책 보강 필요 시 SQL 생성
3) `supabase/migrations/0042_match_court_assignment.sql`에 저장
4) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## API / Action

### Server Action: `assignCourtToMatch`
- 입력:
  - matchId
  - courtId (null 허용 → 배정 해제)
- 처리:
  - role=organizer 확인
  - match 존재 여부 확인
  - court가 match.tournament_id와 동일한지 확인
  - matches.court_id update
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/matches`

### 구성
- division / group 기준 경기 목록 표시
- 각 경기 row에:
  - 팀 A vs 팀 B
  - 현재 배정된 코트 표시
  - 코트 선택 select (A코트 / B코트 / 미배정)
  - 저장 버튼

### 상태 UI
- 로딩 상태 표시
- 실패 시 에러 메시지 표시
- 성공 시 즉시 반영

### 빈 상태
- 생성된 경기가 없으면:
  - “아직 생성된 경기가 없습니다”

---

## 권한
- organizer만 코트 배정/수정 가능
- team_manager / player / spectator는 수정 불가
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/matches.ts`
- `/lib/api/courts.ts` (조회 헬퍼만 사용)
- `/app/admin/tournaments/[id]/matches/actions.ts`
- `/app/admin/tournaments/[id]/matches/Form.tsx`
- `/app/admin/tournaments/[id]/matches/page.tsx`
- `supabase/migrations/0042_match_court_assignment.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 경기 시간(scheduled_time) 설정
- 결과 입력
- 순위 계산
- 토너먼트 시드 생성
- realtime
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 matches.court_id 컬럼/FK/RLS를 확인했다
- [ ] organizer만 코트 배정 UI 접근 가능하다
- [ ] 경기별 코트 선택/변경이 정상 동작한다
- [ ] 배정 해제(null)도 가능하다
- [ ] 로딩/에러 UI가 표시된다
