# Vertical Slice Ticket

## 목표

- 대회 목록 화면에서 사용자가 “지금 할 수 있는 행동”을 즉시 판단할 수 있게 한다
- 대회 상태(status)에 따라 카드 표시와 CTA를 명확히 분기한다
- 목록 정렬을 “실사용 기준”으로 개선한다
- 기존 Tournament List(Public Read) 기능을 유지하면서 UX를 개선한다

---

## 범위 요약 (중요)

- 이번 슬라이스는 UI/표현/정렬/CTA가 핵심이다
- DB 구조 변경은 없다
- 검색/필터/페이징은 포함하지 않는다
- 권한 모델은 기존 정책을 유지한다

---

## 대상 화면

### 경로
- `/tournaments` (목록 전용 페이지가 있으면 사용)
- 또는 기존 Tournament List가 `/`에서만 있었다면 `/tournaments`로 분리 가능
  - 단, 파일 변경은 허용 범위 내에서만

---

## UX 요구사항

### 1) 상태 배지(Status Badge)
각 대회 카드에 상태를 한국어로 표시한다:

- `draft` → “준비중”
- `open` → “모집중”
- `closed` → “모집마감”
- `finished`(UI 기준) → “종료”

> finished가 DB에 없다면, UI에서는 “closed + 토너먼트 종료” 같은 파생 상태를 쓰지 말고
> 이번 티켓에서는 draft/open/closed까지만 표시해도 된다.

---

### 2) 카드 CTA 분기

#### 공통
- 카드 전체 클릭 → `/tournament/[id]`

#### open
- 보조 CTA 버튼: “참가 신청”
  - 로그인 안됨 → `/login`
  - 로그인 됨 → `/tournament/[id]/apply`

#### closed
- 보조 CTA 버튼: “대회 보기”
  - `/tournament/[id]`

#### draft
- 일반 사용자에게는 “준비중” 표시만 하고 CTA 없음
- organizer에게만 “관리” 링크 노출 가능(선택)

---

### 3) 정렬 규칙(중요)

우선순위 정렬:

1. `open` 대회 우선
2. 그 다음 `closed`
3. 마지막 `draft`

각 그룹 내에서는:
- start_date 오름차순(가까운 대회 먼저)

---

### 4) 빈 상태 / 에러 상태

- 목록이 비어 있으면:
  - “등록된 대회가 없습니다”
- 조회 실패 시:
  - 기본 에러 메시지 + 재시도 안내

---

## 데이터 조회

- Server Component에서 Supabase 조회
- 최소 필드:
  - id, name, location, start_date, end_date, status

> 정렬은 DB에서 가능한 만큼 하고, 상태 그룹 정렬이 어려우면 서버에서 정렬한다.

---

## 권한

- 비로그인 사용자도 목록 조회 가능(기존 RLS 유지)
- CTA는 로그인 상태에 따라 분기한다

---

## 수정 허용 범위 (필수)

- `/app/tournaments/page.tsx` (또는 기존 목록 page)
- `/app/tournaments/TournamentCard.tsx` (필요 시 신규)
- `/lib/api/tournaments.ts` (정렬/조회 헬퍼 보강)

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 검색/필터/페이징
- 즐겨찾기
- 공유 링크
- 통계
- 실시간 업데이트

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] 대회 카드에 상태 배지가 표시된다
- [ ] 상태에 따라 CTA가 올바르게 분기된다
- [ ] open 대회가 목록 상단에 노출된다
- [ ] start_date 기준 정렬이 적용된다
- [ ] 빈 상태/에러 상태가 표시된다
- [ ] 모바일에서도 깨지지 않는다
