# Vertical Slice Ticket

## 목표

- 랜딩 페이지(`/`)에서 사용자가 즉시 로그인/가입을 시작할 수 있다
- 랜딩에서 “모집 중(open)”과 “진행 중(in-progress)” 대회 리스트를 보여준다
- 각 리스트에서 바로 다음 행동(상세 보기/참가 신청)으로 이어지게 한다

---

## 범위 요약 (중요)

- 이번 티켓은 **랜딩 페이지 UI/UX 개선**이 핵심이다
- DB 구조 변경은 없다
- 대회 상태/진행중 판정은 **기존 데이터로 파생(derived)** 하며, 최소 규칙으로 구현한다
- 검색/필터/페이징/디자인 고도화는 포함하지 않는다

---

## 랜딩 UI 요구사항

### 경로
- `/app/page.tsx`

---

## 1) 상단 Auth CTA 영역 (필수)

### 표시 규칙
- 비로그인 상태:
  - “로그인” 버튼 → `/login`
  - “회원가입” 버튼 → `/signup`
- 로그인 상태:
  - “대회 둘러보기” → `/tournaments`
  - “내 팀” → `/team` (존재하면)
  - organizer면 “관리자” → `/admin` (선택)

> 로그인 여부 판단은 기존 Supabase 세션 기반으로 처리한다.

---

## 2) 대회 리스트 섹션 (필수)

랜딩에 2개 섹션을 만든다:

### A. 모집 중 대회 (Open)
- 조건:
  - `tournaments.status = 'open'`
- 표시:
  - 대회명, 기간, 장소, 상태 배지(모집중)
- CTA:
  - “상세 보기” → `/tournament/[id]`
  - (선택) “참가 신청” → 로그인 여부에 따라
    - 비로그인: `/login`
    - 로그인: `/tournament/[id]/apply`

### B. 진행 중 대회 (In Progress)
- DB에 별도 상태가 없다면 아래 파생 규칙을 사용한다 (minimal rule)

#### 진행중 파생 규칙 (권장)
- 조건:
  - `tournaments.status = 'closed'`
  - AND 해당 tournament에 `matches`가 존재
  - AND `matches` 중 `status != 'completed'`가 하나라도 존재
- 즉, “모집은 마감(closed)인데 경기는 아직 남아 있는 상태”를 진행중으로 본다

- 표시:
  - 대회명, 기간, 장소, 상태 배지(진행중)
- CTA:
  - “대회 보기” → `/tournament/[id]`
  - (선택) “현황/결과” → `/tournament/[id]/result` (있으면)

> finished 판단은 이번 티켓 범위에서 강제하지 않는다.
> 단, 진행중 목록에서 “경기 미완료가 남아있는지”만 본다.

---

## 3) 빈 상태 / 에러 상태

- open 대회 없음:
  - “현재 모집 중인 대회가 없습니다”
- 진행중 대회 없음:
  - “현재 진행 중인 대회가 없습니다”
- 조회 실패:
  - 기본 에러 메시지 + 재시도 안내

---

## 데이터 조회 (Server Component)

### 필요한 데이터
- open tournaments: tournaments where status='open'
- in-progress tournaments: tournaments where status='closed' + matches 조건

### 구현 방식 (권장)
- `/lib/api/tournaments.ts`에 helper 추가:
  - `getOpenTournaments()`
  - `getInProgressTournaments()`
- in-progress는 두 단계로 조회 가능:
  1) closed tournaments 목록
  2) 각 tournament의 matches 상태 집계(최소 쿼리로)

> 성능 최적화(집계 SQL/뷰)는 이번 티켓에서 제외.
> 필요한 만큼만 minimal 구현.

---

## UI 컴포넌트

- T-0080에서 만든 공통 컴포넌트 재사용:
  - `Button`, `Card`, `Badge`

---

## 권한

- 랜딩은 비로그인 접근 가능
- 대회 리스트 조회는 기존 public read 정책을 따른다
- “참가 신청” CTA는 로그인 여부로만 분기(실제 권한은 apply 페이지/서버에서 강제)

---

## 수정 허용 범위 (필수)

- `/app/page.tsx`
- `/lib/api/tournaments.ts`
- `/lib/api/matches.ts` (진행중 판별에 필요 시)
- `/components/ui/Button.tsx` (props/variant 보강 수준)
- `/components/ui/Card.tsx`
- `/components/ui/Badge.tsx`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 검색/필터/페이징
- 대회 생성/관리 진입 UX 고도화
- 진행중/종료 상태의 완벽한 판정(복잡 로직)
- Realtime 현황판

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] 비로그인 시 랜딩에서 로그인/회원가입 버튼이 보이고 이동한다
- [ ] 로그인 시 랜딩에서 기본 이동 버튼(대회/내팀/관리자)이 적절히 보인다
- [ ] 모집 중(open) 대회 리스트가 표시된다 (없으면 빈 상태)
- [ ] 진행 중(in-progress) 대회 리스트가 표시된다 (없으면 빈 상태)
- [ ] 각 카드 CTA가 올바르게 동작한다
- [ ] Tailwind 스타일이 적용되어 레이아웃이 깨지지 않는다
