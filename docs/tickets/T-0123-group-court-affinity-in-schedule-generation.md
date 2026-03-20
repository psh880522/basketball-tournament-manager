# Vertical Slice Ticket

## 목표

schedule 페이지에서 스케줄 생성 시 같은 디비전의 같은 조 경기를 가능한 한 동일 코트에 배정하도록 생성 규칙을 추가한다.

이번 슬라이스에서는 스케줄 생성의 기본 배치 원칙을 다음과 같이 강화한다.

- 같은 조의 경기는 같은 코트에 우선 배정
- 같은 조의 경기들은 가능한 한 연속된 slot으로 배치
- 코트 수가 부족한 경우에도 조 단위 코트 일관성을 최대한 유지

이 슬라이스 완료 시 다음이 가능해야 한다.

- 스케줄 생성 결과에서 같은 조 경기가 같은 코트에 우선 배정됨
- 같은 조 경기들이 한 코트 내에서 연속 배치됨
- 코트 수가 부족한 경우에도 조 단위 배치 원칙이 최대한 유지됨
- 기존 토너먼트 / break 삽입 / 시간 배정 흐름과 충돌 없이 동작함

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- schedule_slots
- matches
- divisions
- courts

사용 컬럼

schedule_slots

- tournament_id
- division_id
- slot_type
- stage_type
- match_id
- court_id
- start_at
- end_at
- sort_order

matches

- id
- division_id
- court_id
- scheduled_at
- slot_id

이번 슬라이스에서는 배치 알고리즘만 변경한다.

신규 테이블 / 신규 컬럼 추가 금지

---

## API

### generateScheduleSlots

기존 스케줄 생성 로직을 확장한다.

입력

- tournamentId
- startTime
- matchDurationMinutes
- breakDurationMinutes

추가 배치 규칙

### 그룹 경기 배치 규칙

- 같은 디비전의 같은 조 경기는 동일 코트에 우선 배정한다
- 같은 조 경기들은 같은 코트에서 연속된 sort_order를 갖도록 생성한다
- 코트 수가 조 수보다 충분하면 조별로 코트를 분리 배정한다
- 코트 수가 조 수보다 부족하면 남는 조를 다음 코트 블록에 순차 배치하되, 한 조의 경기 자체는 가능한 한 같은 코트에 유지한다

예시

- 3개 조 / 3개 코트
  - A조 → 코트1
  - B조 → 코트2
  - C조 → 코트3

- 4개 조 / 2개 코트
  - A조 → 코트1
  - B조 → 코트2
  - C조 → 코트1 다음 블록
  - D조 → 코트2 다음 블록

### 토너먼트 경기 배치 규칙

- 기존 규칙 유지
- 조 고정 개념 없이 토너먼트 섹션 기준으로 배치

### break 삽입 규칙

- 기존 규칙 유지
- 하나의 디비전이 끝나면 break slot 삽입
- break slot은 해당 코트 흐름 안에 포함

validation

- organizer 권한 확인
- tournament 존재 확인
- 생성 대상 경기 존재 확인
- 코트 정보 존재 확인
- 조 정보(group_key 또는 동등한 조 식별 정보) 조회 가능 여부 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

이번 슬라이스에서는 신규 편집 UI를 추가하지 않는다.

스케줄 생성 결과의 기대 동작만 변경한다.

생성 결과 예시

```text
코트1
 └ U12
    ├ A조
    │  ├ 09:00 경기
    │  ├ 09:30 경기
    │  └ 10:00 경기

코트2
 └ U12
    ├ B조
    │  ├ 09:00 경기
    │  ├ 09:30 경기
    │  └ 10:00 경기
```

코트 수 부족 시 예시

```text
코트1
 └ U12
    ├ A조
    │  ├ 09:00 경기
    │  ├ 09:30 경기
    ├ C조
    │  ├ 10:00 경기
    │  ├ 10:30 경기

코트2
 └ U12
    ├ B조
    │  ├ 09:00 경기
    │  ├ 09:30 경기
    ├ D조
    │  ├ 10:00 경기
    │  ├ 10:30 경기
```

이번 슬라이스에서는

- 수동 코트 변경 UI 수정 없음
- drag & drop 규칙 수정 없음
- 동기화 저장 UI 수정 없음

생성 결과의 코트 배치 원칙만 개선한다.

---

## 권한

organizer

- 스케줄 생성 실행 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/schedule-slots.ts
- /app/admin/tournaments/[id]/schedule/actions.ts
- /app/admin/tournaments/[id]/schedule/page.tsx
- /types

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- 코트 수동 편집 로직 수정
- 조 내부 순서 수동 편집 로직 수정
- 시간 자동 배정 규칙 자체 변경
- break 수동 관리 로직 수정
- match 동기화 저장 로직 수정
- bracket 페이지 경기 생성 로직 수정

---

## 완료 기준

- 스케줄 생성 시 같은 조 경기가 같은 코트에 우선 배정됨
- 같은 조 경기들이 가능한 한 연속 slot으로 생성됨
- 코트 수 부족 시에도 조 단위 코트 일관성이 최대한 유지됨
- 기존 토너먼트 / break / 시간 배정 흐름과 충돌 없음
- 기존 schedule / results / standings 기능 영향 없음