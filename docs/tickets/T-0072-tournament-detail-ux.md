# Vertical Slice Ticket

## 목표

- `/tournament/[id]`에서 사용자가 대회 참가 여부를 판단할 수 있을 만큼 정보가 충분히 보인다
- 대회 상태(draft/open/closed)에 따라 CTA와 안내가 명확히 바뀐다
- 부문(Division) 및 기본 운영 정보를 확인할 수 있다
- “팀 신청” 플로우로 자연스럽게 연결된다

---

## 범위 요약 (중요)

- 이번 슬라이스는 대회 상세 화면의 **정보 구성 + 상태 기반 CTA**가 핵심이다
- DB 구조 변경은 없다
- 팀 신청 폼 자체(T-0020)는 재사용하고, 이 티켓에서는 “진입 UX”만 다듬는다
- 공개 범위/권한은 기존 정책을 유지한다

---

## 대상 화면

### 경로
- `/tournament/[id]`

---

## 상세 화면 구성 요구사항

### 1) 상단 요약 영역 (Summary)
표시 항목(가능한 범위 내):
- 대회명
- 날짜/기간 (start_date ~ end_date)
- 장소(location)
- 상태 배지
  - draft: “준비중”
  - open: “모집중”
  - closed: “모집마감”

### 2) 부문(Division) 섹션
- 해당 토너먼트의 division 목록 표시
  - 예: 중등부 / 고등부 / 일반부
- division별 정보(가능한 범위 내):
  - 조당 팀 수(group_size) 표시 (있다면)
- division이 없으면:
  - “부문 정보가 없습니다” 표시

### 3) 참여 안내 섹션
- 상태별 안내 문구:
  - open: “현재 팀 참가 신청을 받고 있습니다”
  - closed: “참가 신청이 마감되었습니다”
  - draft: “대회 준비중입니다”

---

## CTA 규칙 (중요)

### 로그인 여부는 UI에서 분기한다

#### open 상태
- “팀 참가 신청” 버튼 표시
  - 비로그인 → `/login`
  - 로그인 → `/tournament/[id]/apply`

#### closed 상태
- “대회 현황 보기” 버튼(선택)
  - `/tournament/[id]/standings` (존재하면)
  - 없으면 `/tournament/[id]`에 안내만

#### draft 상태
- 일반 사용자에게는 CTA 없음
- organizer에게만 “관리하기” 링크(선택)
  - `/admin/tournaments/[id]`

---

## 데이터 조회

- Server Component에서 Supabase 조회
- 최소 조회 대상:
  - tournament (id, name, location, start_date, end_date, status)
  - divisions (id, name, group_size, tournament_id)
- 데이터가 없으면 404 또는 “존재하지 않는 대회입니다”

---

## UI 상태 처리

- 로딩 상태
- 에러 메시지
- 빈 데이터(division 없음) 상태

---

## 권한

- 비로그인 사용자도 대회 상세를 볼 수 있어야 함(기존 RLS 유지)
- organizer 전용 링크는 세션 기반으로 표시만 분기(권한 체크는 기존 admin 라우트에서 강제)

---

## 수정 허용 범위 (필수)

- `/app/tournament/[id]/page.tsx`
- `/lib/api/tournaments.ts`
- `/lib/api/divisions.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 팀 신청 폼 자체 구현/수정
- 참가 신청 수정/취소
- 알림 발송
- 실시간 현황판
- 검색/필터

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] `/tournament/[id]`에서 대회 정보(일정/장소/상태)가 표시된다
- [ ] division 목록이 표시된다 (없으면 빈 상태 표시)
- [ ] 상태에 따라 CTA가 정확히 분기된다
- [ ] 비로그인 사용자는 login으로 유도된다
- [ ] 에러/빈 상태 UI가 표시된다
- [ ] 모바일에서도 깨지지 않는다
