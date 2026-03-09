# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/matches` 운영자용 경기 목록 화면을 제공/개선한다
- division 필터로 경기 목록을 쉽게 볼 수 있다
- 각 경기의 기본 정보(팀, 시간, 코트, 상태)를 한 눈에 확인할 수 있다
- 스케줄 페이지(T-0103) 및 브라켓 생성(T-0105) 흐름과 자연스럽게 연결된다

---

## 전제
- matches가 생성되어 있어야 함(T-0105 또는 기존 조/경기 생성 완료)
- divisions 존재(T-0094)
- courts 존재(T-0102)
- match에 scheduled_at(또는 scheduled_time), court_id가 있을 수 있음(T-0103 이후)
- match를 division별로 분류할 수 있어야 함
  - match.division_id가 있거나
  - match → group → division 조인으로 판별 가능해야 함(현재 구조에 맞춤)

---

## DB
- 변경 없음

---

## API

### 1) listTournamentMatches(tournamentId, filters)
filters:
- divisionId?: string
- status?: 'scheduled'|'in_progress'|'completed' (선택)
- courtId?: string (선택)

반환(최소):
- matchId
- divisionId, divisionName
- teamAName, teamBName (또는 표시 가능한 라벨)
- scheduled_at (nullable)
- courtId, courtName (nullable)
- status
- score_a, score_b (nullable)
- created_at

정렬(권장):
1) scheduled_at asc (null은 뒤)
2) court.sort_order asc
3) created_at asc

### 2) listTournamentDivisions(tournamentId)
- divisions 목록(필터용)

### 3) listCourts(tournamentId)
- courts 목록(필터용)

---

## UI

### 경로
- `/admin/tournaments/[id]/matches`

### 상단
- 제목: “Matches”
- 보조 링크(선택):
  - “조/경기 생성” → `/admin/tournaments/[id]/bracket`
  - “스케줄 생성” → `/admin/tournaments/[id]/schedule`
  - “운영 홈” → `/admin/tournaments/[id]`

### 필터 바
- Division select:
  - 전체 + divisions 목록(sort_order asc)
- Court select(선택):
  - 전체 + courts 목록(sort_order asc)
- Status select(선택):
  - 전체 / scheduled / in_progress / completed

### 리스트/테이블 (편의 우선)
Row 표시:
- 시간: scheduled_at (없으면 “미배정”)
- 코트: courtName (없으면 “미배정”)
- division 배지
- 경기: Team A vs Team B
- 상태 배지(status)
- 점수(있으면): score_a : score_b

행 액션(최소 연결)
- “결과 입력” 링크:
  - 기존 결과 입력 페이지가 있다면 그 경로로 이동(경로는 프로젝트 실제 라우트 사용)
  - 없으면 이번 티켓에서는 숨김(새 페이지 생성 금지)

빈 상태
- 경기 없음: “아직 생성된 경기가 없습니다. 조/경기 생성에서 생성하세요.”
- 필터 결과 없음: “조건에 맞는 경기가 없습니다.”

---

## 에러 처리 규칙(필수)
- 로딩 상태
- 에러 메시지 UI
- 빈 데이터 상태

---

## 권한
- organizer 전용 화면

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`

(필터 UI는 Server Component 내 querystring 기반으로 단순 구현 권장.
복잡하면 Client 컴포넌트로 분리 가능)

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/matches/page.tsx` (신규 또는 개선)
- `/lib/api/matches.ts`
- `/lib/api/divisions.ts`
- `/lib/api/courts.ts`
- (필요 시) `/lib/api/groups.ts` (division 판별 join에 필요할 경우)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- match 수정/삭제
- 드래그 정렬
- 스케줄 직접 편집(스케줄 페이지에서만)
- public 경기 목록 UI
- 결과 입력 UI 신규 생성

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin/tournaments/[id]/matches`에서 경기 목록이 보인다
- [ ] division 필터가 동작한다
- [ ] (선택) court/status 필터가 동작한다
- [ ] 시간/코트/상태/점수(있으면)가 리스트에서 확인된다
- [ ] 로딩/에러/빈 상태 UI가 있다
- [ ] 브라켓/스케줄/운영 홈으로 이동 링크가 있다(가능하면)