# Vertical Slice Ticket

## 목표
- 조별 리그 순위 결과(T-0051 standings)를 기반으로 **토너먼트 대진표를 자동 생성**한다
- division 단위로 토너먼트를 생성한다
- 시드 규칙에 따라 상위 팀 vs 하위 팀 매칭을 보장한다
  - 예: 8강 → 1–8, 2–7, 3–6, 4–5
- MVP 1차 완료 기준으로 **“토너먼트 진입”이 가능해야 한다**

---

## 범위 요약 (중요)
- 이번 슬라이스는 **토너먼트 1라운드(예: 8강) 생성까지만** 포함한다
- 승자 자동 진출, 다음 라운드 생성은 포함하지 않는다(T-0061)
- 조별 리그 경기/순위 계산 로직은 변경하지 않는다
- 토너먼트 UI는 최소한의 리스트 형태로만 제공한다

---

## 전제 조건 (필수)
- 대상 division의 조별 리그 순위(T-0051)가 **이미 계산되어 있어야 한다**
- tournament.status = `closed`
- standings가 없는 경우 토너먼트 생성 불가

---

## DB (MCP 필수)

### 대상 테이블
- `matches` (토너먼트 경기 생성)
- `standings` (읽기)
- `teams` (읽기)

### matches 토너먼트 경기 사용 규칙
- `group_id = null` → 토너먼트 경기
- `round` 사용:
  - 예: `quarterfinal`, `semifinal`, `final`
  - MVP에서는 `quarterfinal`만 생성
- `status = 'scheduled'`
- `score_a/score_b/winner_team_id = null`

### 제약/정책
- 동일 division에 대해 **중복 토너먼트 생성 방지**
- 토너먼트 경기 생성 후에는 조별 리그 데이터 변경 불가(논리적 제약)

---

### MCP 절차 (반드시 수행)
1) MCP로 matches/standings 테이블 구조 및 RLS 확인
2) 토너먼트 경기 생성에 필요한 INSERT 권한 확인
3) 중복 생성 방지 조건 확인/보강
4) SQL을 `supabase/migrations/0060_generate_seeded_bracket.sql`에 저장
5) 적용 후 MCP로 결과 재확인

⚠️ MCP 확인 없이 스키마/RLS를 가정해서 작성하지 말 것  
⚠️ 개발용 프로젝트에만 MCP 연결

---

## 시드 생성 로직 (핵심)

### 입력 데이터
- standings (division 단위)
- rank ASC 정렬 결과

### 토너먼트 진출 팀 수 결정
- 기본값: 8팀
- standings 팀 수 < 8:
  - 이번 슬라이스에서는 **에러 반환**
  - (플레이인/자동 진출은 후속)

### 매칭 규칙 (고정)
| Match | Team A | Team B |
|---|---|---|
| QF1 | 1위 | 8위 |
| QF2 | 2위 | 7위 |
| QF3 | 3위 | 6위 |
| QF4 | 4위 | 5위 |

> standings.rank 기준으로만 판단하며, 조 정보는 사용하지 않는다.

---

## API / Action

### Server Action: `generateSeededBracket`
- 입력:
  - tournamentId
  - divisionId
- 처리:
  - role=organizer 확인
  - tournament.status === `closed` 확인
  - standings 존재 여부 확인
  - standings 팀 수 >= 8 확인
  - 기존 토너먼트 match 존재 시 실패
  - 시드 매칭 로직 실행
  - matches insert (round = `quarterfinal`)
- 출력:
  - `{ ok: true }`
  - `{ ok: false, error }`

---

## UI

### 관리자 페이지
- `/admin/tournaments/[id]/bracket/tournament`

### 구성
- division 선택
- “토너먼트 생성” 버튼
- 생성 후:
  - 8강 매치 리스트 표시
    - 1위 vs 8위
    - 2위 vs 7위
    - 3위 vs 6위
    - 4위 vs 5위

### 상태 UI
- 로딩 상태 표시
- 실패 시 에러 메시지 표시
- standings 미계산 시:
  - “순위가 계산되지 않아 토너먼트를 생성할 수 없습니다”

---

## 권한
- organizer만 생성 가능
- team_manager / spectator는 조회만 가능(조회 범위는 기존 RLS 유지)

---

## 수정 허용 범위 (필수)

- `/lib/api/bracket.ts`
- `/lib/api/matches.ts`
- `/lib/api/standings.ts`
- `/app/admin/tournaments/[id]/bracket/tournament/actions.ts`
- `/app/admin/tournaments/[id]/bracket/tournament/page.tsx`
- `supabase/migrations/0060_generate_seeded_bracket.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 다음 라운드(4강/결승) 생성
- 승자 자동 진출
- 경기 결과 입력
- 토너먼트 스케줄링
- realtime
- 시각적 브라켓 트리 UI

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 토너먼트 관련 RLS/제약을 확인했다
- [ ] standings 기반 시드 매칭이
