# 🎯 프로젝트 정의 — 농구대회 관리 서비스 (MVP, 업데이트 정합본)

> ※ 이 문서는 초기 MVP 정의를 유지하되, 실제로 진행된 슬라이스 / 확정된 운영 규칙 / 구조 변경을 반영한 버전이다.

---

## 1. 핵심 문제

현재 농구대회 운영 방식은 다음 도구들이 혼합되어 사용됨:
- 구글폼
- 엑셀
- 카카오톡
- 수기 대진표

이로 인해 발생하는 문제:
- 관리 비용 증가
- 입력/집계 오류 빈번
- 실시간 정보 공유 불가
- 운영자 의존도 과다

---

## 2. MVP 목표 (현실 반영)

다음 플로우를 하나의 시스템에서 끊김 없이 제공한다.

1. 대회 개설
2. 팀 등록 및 승인
3. 선수 등록
4. 조 편성 및 조별 리그 경기 자동 생성
5. 경기 운영(코트 배정)
6. 경기 결과 입력
7. 순위 자동 계산
8. (확장) 토너먼트 생성 및 실시간 현황 공개

> ⚠️ MVP 1차 완료 기준은 “조별 리그 운영 자동화”까지.  
> 토너먼트/실시간 대시보드는 후속 Phase로 분리한다.

---

## 3. 전체 시스템 구조

### 사용자 타입
1. 관리자 (Organizer)
2. 팀 대표 (Team Manager)
3. 참가 선수 (Player)
4. 관람자 (Spectator, 읽기 전용)

---

## 4. 핵심 기능 모듈

- Auth / Roles
- 대회 관리
- 부문(Division) 관리
- 팀 관리 (신청/승인)
- 선수 등록
- 조 편성 (조당 팀 수 유동)
- 조별 리그 경기 자동 생성
- 코트 관리
- 경기별 코트 배정
- 경기 결과 입력
- 순위 계산
- 현황 대시보드 (후속)
- 결제 (옵션, MVP 제외)

---

## 5. 기술 스택 (빠른 MVP 기준)

- Frontend: Next.js (App Router, TypeScript)
- Backend: Supabase
- Auth: Supabase Auth
- DB: Supabase Postgres
- Hosting: Vercel
- 결제: Toss 또는 Stripe (후속 단계)

---

## 6. 데이터 모델 (핵심 설계)

### Tournament
- id
- name
- start_date
- end_date
- status (draft / open / closed)

### Division
- id
- tournament_id
- name (중등부 / 고등부 / 일반부)
- group_size (조당 팀 수, 유동)

### Team
- id
- tournament_id
- division_id
- team_name
- captain_user_id
- contact
- status (pending / approved / rejected)

### Player
- id
- team_id
- name
- number
- position

### Group
- id
- division_id
- name (A조, B조…)
- order

### GroupTeam
- group_id
- team_id

### Court
- id
- tournament_id
- name (A코트, B코트)

### Match
- id
- tournament_id
- division_id
- group_id (nullable)
- team_a_id
- team_b_id
- court_id (nullable)
- scheduled_time (후속)
- status (scheduled / completed)
- score_a / score_b (후속)

### Standing (후속)
- group_id
- team_id
- wins
- points_for
- points_against
- rank

---

## 7. 대회 운영 규칙

### 대회 상태
- draft: 준비 중 (비공개)
- open: 팀 신청 가능
- closed: 신청 종료 / 경기 진행 가능

### 기본 경기 구조
- 조별 리그 → (순위 확정 후) 토너먼트

### 조별 리그 순위 결정 기준
1) 승수 → 2) 승자승 → 3) 다득점 → 4) 저실점

---

## 8. 화면 구성

### Public / Team
- `/` : 대회 목록
- `/tournament/[id]` : 대회 홈
- `/tournament/[id]/apply` : 팀 신청
- `/team` : 내 팀 조회
- `/team/players` : 선수 관리

### Admin
- `/admin/tournaments`
- `/admin/tournaments/[id]/teams`
- `/admin/tournaments/[id]/bracket` (조 편성 + 경기 생성)
- `/admin/tournaments/[id]/courts`
- `/admin/tournaments/[id]/matches` (코트 배정)

---

## 9. 권한 모델

### 관리자만 가능
- 팀 참가 승인/거절
- 조 편성 및 경기 생성
- 코트 관리 및 경기 코트 배정
- 경기 결과 입력(후속)
- 순위 계산(후속)
- 토너먼트 생성(후속)

### 팀 대표만 가능
- 팀 생성/신청
- 선수 등록/수정/삭제

### 관람자
- 공개 데이터 읽기 전용(후속 강화)

---

## 10. 개발 방식 — 수직 슬라이스

- 기능 단위 = 사용자 플로우 단위
- UI → API → DB → RLS → 검증까지 한 번에 구현
- 모든 신규 기능은:
  1) `docs/tickets/T-xxxx-*.md` 작성
  2) `docs/tickets/_active.md`에 복사
  3) Agent 실행 → 검증 → PR

---

## 11. 단계별 개발 로드맵 (정합)

### Phase 1 — 인증 & 공개
- T-0001 Auth Login
- T-0002 Profiles & Roles
- T-0003 Tournament List

### Phase 2 — 대회 관리
- T-0010 Admin Create Tournament
- T-0011 Tournament Status

### Phase 3 — 팀 등록 & 승인
- T-0020 Team Apply
- T-0021 Admin Approve Teams
- T-0022 Team View

### Phase 4 — 선수
- T-0030 Player CRUD

### Phase 5 — 조별 리그 운영 (핵심 MVP)
- T-0040 Group & Match Generation
- T-0041 Court Management
- T-0042 Match Court Assignment

### Phase 6 — 결과 & 순위 (남은 핵심)
- T-0050 Match Result Input (조별 리그)
- T-0051 Group Standing Calculation
- T-0052 Group Standings View

### Phase 7 — 토너먼트 & 확장
- T-0060 Generate Seeded Bracket (1–8, 2–7, 3–6, 4–5…)
- T-0061 Tournament Progression
- T-0062 Dashboard / Realtime (선택)

---

## 12. MVP 범위 제한 (중요)

### 반드시 제외
- 결제
- 문자 발송
- 푸시 알림
- 복잡한 통계
- 영상 중계
