# Active Vertical Slice Ticket

⚠️ 이 파일에는 반드시 **하나의 티켓만** 존재해야 한다.
⚠️ 실행 후에는 다른 티켓으로 교체한다.
⚠️ 티켓 본문은 원본(T-xxxx 파일)과 동일해야 한다.

---

# Vertical Slice Ticket

## 목표
- division 단위로 Standings(순위)를 계산/표시한다
- 경기 결과 저장(= 점수 저장 + 상태 scheduled/completed 설정) 시 해당 division을 `standings_dirty=true`로 만든다
- `/admin/tournaments/[id]/standings` 페이지에서 division별 섹션으로 순위를 나열하고,
  dirty인 division은 “순위 계산 필요”를 표시하며 “순위 계산” 버튼으로 재계산할 수 있다

---

## 전제
- 결과 입력 페이지(T-0108)가 존재하며, 저장 버튼과 완료 버튼이 통합되어 있음
- match status는 `scheduled | completed` 로 단순화되어 있음
- match에 score_a/score_b, status, winner_team_id가 존재(또는 기존 명칭 사용)
- standings 테이블(또는 동등 구조)이 존재하며 division 기준으로 standings를 조회/저장할 수 있음
- match를 division 기준으로 분류 가능해야 함
  - match.division_id 또는 match → group → division join

---

## DB (필수: Supabase MCP 사용)

### 1) divisions에 standings_dirty 추가
- `standings_dirty boolean not null default false`

> Supabase MCP로 컬럼 추가 + 마이그레이션 생성/저장
- `supabase/migrations/0109_division_standings_dirty.sql` (예시)

### 2) RLS
- organizer:
  - divisions standings_dirty update 허용
  - standings upsert 허용
- public/team_manager:
  - standings/divisions SELECT 정책은 기존 요구사항을 따르되,
    이번 티켓에서는 organizer 화면 구현 중심(정책 확장은 별도 티켓으로 분리 가능)

---

## 정책(고정)

### 1) Dirty Flag
- `divisions.standings_dirty`
  - false: 최신
  - true: 결과 변경으로 재계산 필요

### 2) Dirty 전환
- 결과 저장(saveMatchResult) 시:
  - 해당 match가 속한 division의 `standings_dirty=true`

### 3) 계산 반영 대상 경기
- standings 계산은 `status=completed` 경기만 반영

### 4) 승자 계산
- score_a/score_b 입력 후:
  - score_a > score_b → winner_team_id = team_a
  - score_b > score_a → winner_team_id = team_b
- 동점 입력은 MVP에서 금지(에러) (프로젝트 정책이 다르면 그 정책 우선)

### 5) 순위 결정 기준(고정)
1) 승수
2) 승자승
3) 다득점
4) 저실점

---

## API / Server Actions

### A) 결과 저장 (T-0108 연결)
#### 1) saveMatchResult({ matchId, scoreA, scoreB, status })
- organizer only
- status는 `scheduled|completed`
- 동작:
  1) score 저장
  2) status 저장
  3) (status=completed이면) winner_team_id 계산/저장
  4) match의 divisionId 조회
  5) divisions.standings_dirty = true 업데이트
- 반환:
  - `{ ok:true } | { ok:false, error }`

> 기존 T-0108의 저장 액션이 있다면 이 정책으로 “통합”되도록 최소 수정.

---

### B) Standings 조회/계산

#### 2) listStandingsPageData(tournamentId)
- organizer only
- 반환:
  - divisions: id, name, sort_order, standings_dirty
  - standings: division별 standings rows
- divisions 정렬: sort_order asc
- standings 정렬: rank asc

#### 3) calculateDivisionStandings({ tournamentId, divisionId })
- organizer only
- 로직:
  1) 해당 division의 completed matches 로드
  2) 팀별 누적:
     - wins, losses
     - points_for, points_against, points_diff
  3) 승자승 계산(동률 팀들에 대해 head-to-head로 tie-break)
  4) 정렬:
     - wins desc
     - head_to_head desc
     - points_for desc
     - points_against asc
  5) standings upsert(divisionId + teamId 기준)
     - rank 재부여(1..N)
  6) divisions.standings_dirty = false
- 반환:
  - `{ ok:true } | { ok:false, error }`

> 승자승 구현이 복잡하면:
> - MVP에서는 “동률 그룹 내 head-to-head만 계산” 수준으로 제한
> - 그래도 어렵다면 먼저 wins/득실/다득점까지만 적용 후 승자승은 제외(하지만 이 티켓 목표에 포함되므로 가능한 구현)

---

## UI

### 1) Standings 페이지 신규/개선
- 경로: `/admin/tournaments/[id]/standings`

구성:
- 상단: Tournament Standings
- 아래: division별 섹션(또는 탭)

각 division 섹션:
- 제목: division name
- dirty 표시:
  - `⚠ 순위 계산 필요` 배지
- 버튼: `순위 계산`
  - 클릭 → calculateDivisionStandings 호출
  - 로딩/에러 표시

테이블:
- Rank | Team | W | L | PF | PA | Diff

빈 상태:
- completed match가 없으면 안내:
  - “완료된 경기가 없습니다”

---

## 운영 동선 연결(권장, minimal)
- 운영 페이지(`/admin/tournaments/[id]`) 진행 단계 카드 “순위/스탠딩” 버튼이
  `/admin/tournaments/[id]/standings`로 연결되어 있어야 함
  (이미 연결되어 있으면 변경 없음)

---

## 에러 처리 규칙(필수)
- 로딩 상태:
  - 페이지 로드
  - 계산 버튼 클릭 시
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
- Client UI(계산 버튼/로딩): `/app/**/Form.tsx` 또는 division 섹션 컴포넌트

---

## 수정 허용 범위 (필수)
- `supabase/migrations/0109_division_standings_dirty.sql` (필수: MCP로 생성)
- `/app/admin/tournaments/[id]/standings/page.tsx` (신규 또는 개선)
- `/app/admin/tournaments/[id]/standings/actions.ts` (신규)
- `/app/admin/tournaments/[id]/standings/Form.tsx` (신규, 필요 시)
- `/lib/api/standings.ts` (신규 또는 확장)
- `/lib/api/matches.ts` (division 기준 completed matches 조회)
- `/lib/api/divisions.ts` (dirty 업데이트 포함)
- `/app/admin/tournaments/[id]/results/actions.ts` (결과 저장 시 dirty=true 반영; 기존 액션 통합)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 자동(즉시) standings 재계산
- standings public 공개 정책 변경(RLS 확장)
- 완료 취소(uncomplete) 및 감사 로그
- 토너먼트 진출 자동 생성(별도 티켓)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] divisions에 standings_dirty가 추가되었다(MCP 마이그레이션 포함)
- [ ] 결과 저장 시 해당 division이 standings_dirty=true로 변경된다
- [ ] `/admin/tournaments/[id]/standings`에서 division별로 순위를 볼 수 있다
- [ ] dirty인 division에 “순위 계산 필요”가 표시된다
- [ ] “순위 계산” 버튼으로 해당 division standings가 계산/저장되고 dirty=false가 된다
- [ ] 승수 → 승자승 → 다득점 → 저실점 기준 정렬이 적용된다
- [ ] 로딩/에러/빈 상태 UI가 있다
