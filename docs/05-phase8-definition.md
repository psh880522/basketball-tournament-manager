# Phase 8 — End-to-End Usability Phase

## 🎯 Phase 목표

> 이미 구현된 기능들을 연결하여,
> 처음 방문한 사용자부터 운영자까지
> **대회를 실제로 처음부터 끝까지 사용할 수 있게 만든다.**

이 Phase는 새로운 도메인 추가가 아니라,
기존 기능을 실사용 가능한 흐름으로 통합하는 단계다.

---

# 전체 구조

```
Phase 8
├─ A. Landing & Discovery
├─ B. Tournament Detail & Apply Flow
├─ C. Organizer Operation Flow
└─ D. Finish & Result
```

---

# 🔹 Block A — Landing & Discovery

## 목적

* 서비스의 목적을 명확히 전달한다
* 현재 참여 가능한 대회를 즉시 보여준다
* 다음 행동(참가/운영)이 명확해야 한다

## 요구사항

### 1. 랜딩 페이지 `/`

* 서비스 한 줄 설명
* 현재 `open` 상태 대회 목록 표시
* 명확한 CTA 버튼

  * “대회 참가하기”
  * “대회 운영하기”

### 2. 대회 상태 시각화

* 모집 중
* 모집 종료
* 진행 중
* 종료

## 제외 범위

* 마케팅 페이지 확장
* 디자인 고도화
* 통계 수치 노출

## 관련 티켓

* T-0070 Landing Page 구성
* T-0071 Tournament List UX 개선

---

# 🔹 Block B — Tournament Detail & Apply Flow

## 목적

* 사용자가 대회 정보를 보고 참가 여부를 판단할 수 있어야 한다
* 신청 후 현재 상태를 명확히 인지할 수 있어야 한다

## 요구사항

### 1. 대회 상세 페이지 `/tournament/[id]`

* 대회 일정
* 부문(Division) 목록
* 참가 가능 여부 표시

### 2. 상태 기반 UX

* `open` → 팀 신청 버튼 노출
* `closed` → 신청 종료 안내

### 3. 신청 상태 표시

* 승인 대기 중
* 참가 확정
* 거절됨

## 제외 범위

* 신청 수정 기능
* 알림 발송
* 자동 승인

## 관련 티켓

* T-0072 Tournament Detail UX 보강
* T-0073 Team Apply Result 상태 표시

---

# 🔹 Block C — Organizer Operation Flow

## 목적

* 운영자가 다음에 무엇을 해야 하는지 고민하지 않게 한다
* 현재 대회 진행 단계를 한눈에 보여준다

## 운영 순서 (고정 흐름)

1. 팀 승인
2. 조 생성
3. 경기 생성
4. 코트 배정
5. 경기 결과 입력
6. 순위 계산
7. 토너먼트 생성
8. 토너먼트 진행
9. 종료

## 요구사항

### 1. 운영자 대시보드 `/admin/tournaments/[id]`

* 현재 단계 표시
* 다음 할 일 버튼 1개만 활성화

### 2. 단계 잠금(Guard Logic)

* 완료된 단계는 재실행 불가
* 조건 미충족 시 버튼 비활성화

## 제외 범위

* 자동 워크플로 엔진
* 히스토리 로그 시스템
* 실시간 자동 진행

## 관련 티켓

* T-0074 Organizer Tournament Dashboard
* T-0075 Tournament Progress State Indicator
* T-0076 Step Lock / Guard Logic

---

# 🔹 Block D — Finish & Result

## 목적

* 대회 종료 상태를 명확히 표현한다
* 최종 결과를 한 화면에서 확인 가능해야 한다

## 요구사항

### 1. 대회 종료 처리

* tournament.status = `finished` (UI 기준)
* 종료 후 read-only 전환

### 2. 결과 페이지 `/tournament/[id]/result`

* 우승팀 표시
* 토너먼트 결과 요약
* 최종 순위 표시

## 제외 범위

* PDF 출력
* SNS 공유
* 결과 이미지 자동 생성

## 관련 티켓

* T-0077 Tournament Finish Handling
* T-0078 Tournament Result Page

---

# Phase 8 완료 기준 (Definition of Done)

* 랜딩 → 대회 탐색 → 신청 → 승인 → 경기 진행 → 순위 → 토너먼트 → 종료까지
  사용자와 운영자가 끊김 없이 진행 가능
* 운영자는 “다음에 할 일”을 시스템에서 안내받는다
* 종료된 대회는 결과 확인만 가능하며 수정 불가
* 기존 도메인 구조를 변경하지 않고 UX 연결만으로 완성한다

---

# 핵심 원칙

* 새로운 알고리즘 추가 ❌
* DB 구조 대규모 변경 ❌
* 기존 기능 연결 및 UX 정리 ⭕
* 실사용 흐름 완성 ⭕

---

> Phase 8은 기능 확장이 아니라
> **"만들어진 시스템을 실제로 사용할 수 있게 만드는 단계"**다.
