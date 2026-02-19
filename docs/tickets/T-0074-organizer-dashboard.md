# Vertical Slice Ticket

## 목표

- 운영자가 대회 운영 전체 흐름을 **한 화면에서 파악**할 수 있다
- 현재 대회 진행 단계를 명확히 표시한다
- "다음에 무엇을 해야 하는지" 시스템이 안내한다
- 기존 기능을 연결하는 허브 역할을 한다

---

## 범위 요약 (중요)

- 이번 슬라이스는 **운영자 대시보드 UI + 상태 계산 로직**만 포함한다
- 실제 실행 기능(조 생성/순위 계산 등)은 기존 페이지로 이동만 한다
- 자동 실행 기능은 포함하지 않는다
- DB 구조 변경은 최소화한다

---

## 전제 조건

- Tournament / Team / Match / Standing / Bracket 기능은 이미 구현되어 있다
- tournament.status는 draft / open / closed 상태를 사용 중이다

---

## 핵심 개념 — Tournament Progress State

대회는 다음 단계 중 하나에 위치한다:

1. TEAM_APPROVAL
2. GROUP_STAGE_GENERATED
3. MATCH_IN_PROGRESS
4. STANDINGS_READY
5. BRACKET_READY
6. TOURNAMENT_FINISHED

> 이 상태는 DB에 저장하지 않고,  
> **현재 데이터 상태를 기반으로 계산한다 (derived state)**

---

## 상태 판단 로직 (중요)

### 1. TEAM_APPROVAL
- approved 팀이 0개 이상 존재
- 조 생성 안 된 상태

### 2. GROUP_STAGE_GENERATED
- groups 존재
- matches(group_id not null) 존재
- completed match 없음

### 3. MATCH_IN_PROGRESS
- group matches 중 일부 completed
- standings 없음

### 4. STANDINGS_READY
- standings 존재
- 토너먼트 match 없음

### 5. BRACKET_READY
- 토너먼트 matches 존재
- final match 미완료

### 6. TOURNAMENT_FINISHED
- final match completed

---

## API / Helper

### getTournamentProgressState(tournamentId)

- 입력:
  - tournamentId
- 처리:
  - teams / groups / matches / standings 조회
  - 위 규칙에 따라 상태 계산
- 출력:
  - {
      state: string,
      nextAction: string,
      nextActionUrl: string
    }

---

## UI

### 페이지 경로

`/admin/tournaments/[id]`

---

### 화면 구성

#### 1. 상단 요약 카드
- 대회명
- 현재 상태 (예: “조별 리그 진행 중”)
- 간단한 설명 텍스트

#### 2. 다음 할 일 영역 (핵심)
- 큰 CTA 버튼 1개
  - 예: “팀 승인하기”
  - 예: “조 생성하기”
  - 예: “순위 계산하기”
  - 예: “토너먼트 생성하기”
- 조건 불충족 시 비활성화 + 안내 문구

#### 3. 진행 단계 표시 (간단 Step Indicator)
[팀 승인] → [조 생성] → [경기 진행] → [순위 계산] → [토너먼트] → [종료]

현재 단계 강조 표시

---

## 권한

- organizer만 접근 가능
- team_manager / spectator 접근 불가

---

## 수정 허용 범위 (필수)

- `/lib/api/tournamentProgress.ts`
- `/app/admin/tournaments/[id]/page.tsx`
- `/app/admin/tournaments/[id]/ProgressIndicator.tsx`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위

- 상태 DB 저장
- 자동 단계 전환
- 알림
- UI 디자인 고도화

---

## 완료 기준 (Definition of Done)

- [ ] 운영자가 현재 대회 진행 단계를 한 눈에 볼 수 있다
- [ ] 다음 행동이 명확히 안내된다
- [ ] 상태 계산이 정확히 작동한다
- [ ] 잘못된 단계 이동이 안내된다
- [ ] organizer만 접근 가능하다
