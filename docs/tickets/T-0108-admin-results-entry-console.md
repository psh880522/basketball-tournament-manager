# Vertical Slice Ticket

## 목표
- 운영자(organizer)가 대회 경기 결과를 빠르게 입력/수정할 수 있는 전용 페이지를 만든다
- `/admin/tournaments/[id]/results`에서:
  - 경기 목록을 필터링(division 중심)해서 보고
  - 각 경기의 score를 입력/저장하고
  - 완료 처리(status=completed)까지 할 수 있다
- 이미 입력된 결과(완료 포함)도 수정 가능해야 한다
  - 수정 시 winner_team_id를 재계산한다
- 기존 “결과 입력” 버튼/동선을 이 페이지로 연결한다

---

## 전제
- matches가 존재함(T-0105 / 기존 조·경기 생성 완료)
- match에 다음 필드가 존재(또는 기존 명칭 사용):
  - score_a, score_b (nullable)
  - status (scheduled / in_progress / completed)
  - winner_team_id (nullable)
  - scheduled_at(or scheduled_time) (nullable)
  - court_id (nullable)
- match를 division 기준으로 분류 가능해야 함
  - match.division_id 또는 match → group → division join

---

## DB
- 변경 없음 (필드가 없으면 별도 DB 티켓으로 분리. 이번 티켓은 UI/API 중심)

---

## 정책(고정)
- score_a/score_b는 nullable로 유지 (scheduled 상태에서도 null 가능)
- “완료 처리” 시에만 score가 필수
- completed 상태의 경기 결과도 수정 허용
  - 수정 후 winner_team_id 재계산
- 동점 규칙:
  - MVP: 동점 허용 여부는 기존 정책을 따른다
  - 기본값(권장): 동점 불가 → 동점 입력 시 에러
  - (만약 동점이 가능한 리그 규칙이면 winner_team_id는 null 허용)
  - 프로젝트 기존 규칙이 있으면 그 규칙을 우선 적용

---

## API / Server Actions

### 1) listMatchesForResultEntry(tournamentId, filters)
filters:
- divisionId?: string (기본: 첫 division 또는 전체)
- status?: 'all'|'pending'|'completed'
  - pending = scheduled + in_progress
- courtId?: string (선택)
- q?: string (팀명 검색, 선택)

반환(최소):
- matchId
- divisionId, divisionName
- courtId, courtName (nullable)
- scheduled_at (nullable)
- teamAId, teamAName
- teamBId, teamBName
- status
- score_a, score_b
- winner_team_id

정렬(권장):
1) scheduled_at asc (null은 뒤)
2) court.sort_order asc
3) created_at asc

### 2) saveMatchScore({ matchId, scoreA, scoreB })
- organizer only
- scoreA/scoreB는 int >= 0
- 저장:
  - score_a = scoreA
  - score_b = scoreB
- status는 변경하지 않음(입력만 저장)
- winner_team_id는:
  - status=completed인 경우에만 재계산/업데이트
  - 아니면 변경하지 않음(또는 null 유지)

반환: `{ ok: true } | { ok:false, error }`

### 3) completeMatch({ matchId, scoreA, scoreB })
- organizer only
- scoreA/scoreB 필수
- (동점 불가 정책이면) scoreA != scoreB 검증
- 처리:
  - score_a, score_b 업데이트
  - winner_team_id 계산:
    - scoreA > scoreB → teamAId
    - scoreB > scoreA → teamBId
    - 동점 허용이면 null
  - status = 'completed'
- 반환 표준화

> “완료 취소”는 제외(다음 티켓)

---

## UI

### 경로
- `/admin/tournaments/[id]/results`

### 상단
- 제목: “Result Entry”
- 링크:
  - 운영 홈 → `/admin/tournaments/[id]`
  - 경기 목록 → `/admin/tournaments/[id]/matches`
  - (선택) 스케줄 → `/admin/tournaments/[id]/schedule`

### 필터 바(필수)
- Division select: 전체 + divisions 목록
- Status select:
  - 기본: Pending(미완료)
  - Completed(완료)
  - All(전체)
- (선택) Court select: 전체 + courts

### 결과 입력 테이블(필수)
Row 구성:
- 시간/코트 (없으면 “미배정”)
- division 배지
- Team A vs Team B
- score 입력 2칸 (number)
  - 초기값: 기존 score_a/score_b (null이면 빈칸)
- 버튼:
  - `저장` (score만 저장)
  - `완료` (score 저장 + status completed)
- 상태 배지:
  - scheduled/in_progress/completed
- 저장 상태:
  - 저장 중 spinner
  - 저장 성공 “저장됨”
  - 실패 에러 메시지(행 단위)

### 수정 UX(필수)
- completed 경기에서도 score 입력 가능
- 저장/완료 버튼 동작:
  - completed에서 “저장” → score 업데이트 + winner 재계산
  - completed에서 “완료” → 동일 동작(이미 완료면 저장과 동일하게 처리 가능)

### 키보드(선택)
- Enter로 저장
- 저장 성공 시 다음 row로 포커스 이동 (추후 개선 가능, MVP에서는 선택)

### 빈 상태
- 해당 조건에 경기 없음 안내
- 조/경기 생성 유도 링크 `/admin/tournaments/[id]/bracket`

---

## 운영페이지 연결(필수)
- 운영 홈(`/admin/tournaments/[id]`) 진행 단계 “경기 결과 입력” Primary 버튼이
  `/admin/tournaments/[id]/results`로 이동하도록 변경한다
  (기존에 matches로 가던 동선이 있으면 교체)

---

## 에러 처리 규칙(필수)
- 로딩 상태(목록 로드)
- 에러 메시지 UI
- 빈 데이터 상태
- 실패 케이스 반환값 표준화

---

## 권한
- organizer 전용

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/results/page.tsx` (신규)
- `/app/admin/tournaments/[id]/results/actions.ts` (신규)
- `/app/admin/tournaments/[id]/results/Form.tsx` (신규)
- `/lib/api/matches.ts` (list/save/complete helper)
- `/lib/api/divisions.ts`
- `/lib/api/courts.ts`
- `/app/admin/tournaments/[id]/page.tsx` 또는 진행단계 컴포넌트 (결과 입력 버튼 경로 변경만)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 완료 취소(uncomplete)
- 심판/기록원 계정 분리
- 실시간 공개 화면 변경
- 승자승/순위 재계산 트리거 고도화(기존 계산 방식 유지)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin/tournaments/[id]/results` 페이지가 존재한다
- [ ] division/status 필터로 경기 목록을 볼 수 있다
- [ ] 경기 score를 저장할 수 있다(미완료 포함)
- [ ] 완료 처리 시 status=completed + winner_team_id 계산이 된다
- [ ] completed 경기 결과도 수정 가능하며 winner_team_id가 재계산된다
- [ ] 운영페이지의 “결과 입력” 동선이 results 페이지로 연결된다
- [ ] 로딩/에러/빈 상태 UI가 있다