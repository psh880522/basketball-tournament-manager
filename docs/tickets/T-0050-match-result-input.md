# Vertical Slice Ticket

## 목표
- organizer가 조별 리그 경기(match)의 결과를 입력할 수 있다
- 입력된 결과는 이후 순위 계산(T-0051)의 기반 데이터가 된다
- 경기 결과 입력은 조별 리그 경기만 대상으로 한다

---

## 범위 요약 (중요)
- 이번 슬라이스는 **경기 결과 입력(score/승자 확정)** 까지만 포함한다
- 순위 계산, 토너먼트 생성은 포함하지 않는다
- 경기 구조(조/대진)는 변경하지 않는다

---

## DB (MCP 필수)

### 대상 테이블
- `matches` (보강)

### matches 보강 컬럼(정정)
- `score_a int null`
- `score_b int null`
- `winner_team_id uuid null` (FK → teams.id)
- `status text` (`scheduled | completed`)

### 제약(정정)
- score_a, score_b는 `status='completed'`일 때만 존재한다.
- `score_a`, `score_b`는 0 이상이어야 한다(값이 있을 때).
- `winner_team_id`는 team_a_id 또는 team_b_id 중 하나여야 한다.
- 무승부 불가(동점은 운영자가 규칙에 따라 조정 후 입력).
- 상태-널 연동 CHECK (권장, 스키마로 강제):
  - `status='scheduled'` → `score_a is null AND score_b is null AND winner_team_id is null`
  - `status='completed'` → `score_a is not null AND score_b is not null AND winner_team_id is not null`

### RLS
- organizer:
  - matches SELECT / UPDATE 가능
- team_manager / public:
  - 이번 슬라이스에서는 결과 입력 불가
  - SELECT 여부는 기존 정책 유지

---

### MCP 절차 (반드시 수행)
1) MCP로 matches 테이블 컬럼/제약/RLS 상태 확인
2) 필요한 컬럼/제약/정책 SQL 생성
3) `supabase/migrations/0050_match_result_input.sql`에 저장
4) 마이그레이션 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## API / Action

### Server Action: `submitMatchResult`
- 입력:
  - matchId
  - scoreA
  - scoreB
- 처리:
  - role=organizer 확인
  - match 존재 여부 확인
  - match.status === `scheduled` 인지 확인
  - score 유효성 검증
  - winner_team_id 계산
  - matches 업데이트:
    - score_a
    - score_b
    - winner_team_id
    - status = `completed`
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/matches`

### 구성
- 경기 목록 표시
  - 조 정보
  - 팀 A vs 팀 B
  - 현재 상태(scheduled/completed)
- 각 경기 row에:
  - 점수 입력 필드(scoreA / scoreB)
  - “결과 저장” 버튼

### 상태 UI
- 로딩 상태 표시
- 실패 시 에러 메시지 표시
- 완료된 경기는:
  - 점수 표시
  - 입력 필드 비활성화(수정 불가, MVP 기준)

### 빈 상태
- 결과 입력 가능한 경기가 없을 경우:
  - “입력할 경기가 없습니다”

---

## 권한
- organizer만 결과 입력 가능
- team_manager / player / spectator 수정 불가
- 비로그인 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/matches.ts`
- `/app/admin/tournaments/[id]/matches/actions.ts`
- `/app/admin/tournaments/[id]/matches/Form.tsx`
- `/app/admin/tournaments/[id]/matches/page.tsx`
- `supabase/migrations/0050_match_result_input.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 결과 수정/취소
- 순위 계산
- 토너먼트 생성
- realtime 반영
- 통계
- 알림
- 결제

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 matches 결과 관련 컬럼/제약/RLS를 확인했다
- [ ] organizer만 결과 입력 UI 접근 가능하다
- [ ] 점수 입력 후 결과가 정상 저장된다
- [ ] 승자(winner_team_id)가 올바르게 계산된다
- [ ] 완료된 경기는 재입력이 불가능하다
- [ ] 로딩/에러 UI가 표시된다
