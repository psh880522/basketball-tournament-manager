# Vertical Slice Ticket

## 목표

schedule 페이지에서 현재 생성된 경기들을 기준으로 스케줄을 자동 생성한다.

이번 슬라이스에서 "스케줄 생성"은 다음을 한 번에 수행하는 통합 액션이다.

- 현재 생성된 리그 경기 포함
- 현재 생성된 토너먼트 경기 포함
- 코트별 > 디비전별 > 조별 > 토너먼트 순으로 slot 자동 생성/배치
- 하나의 디비전이 끝나면 휴식시간 slot 자동 추가
- 시작 시간 / 경기 시간 / 휴식 시간을 기준으로 시간 자동 배정

이 슬라이스 완료 시 다음이 가능해야 한다.

- organizer가 schedule 페이지에서 스케줄 생성 가능
- 생성된 경기들이 `schedule_slots`에 자동 반영됨
- 디비전 종료 구간마다 휴식시간 slot이 자동 추가됨
- 생성된 slot에 시간(`start_at`, `end_at`)이 함께 배정됨
- 생성 결과가 경기 리스트에서 확인 가능

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
- label
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

이번 슬라이스에서는 신규 테이블 추가 금지

---

## API

### generateScheduleSlots

입력

- tournamentId
- startTime
- matchDurationMinutes
- breakDurationMinutes

동작

1. 해당 tournament의 생성된 리그 경기 조회
2. 해당 tournament의 생성된 토너먼트 경기 조회
3. 코트별 > 디비전별 > 조별 > 토너먼트 순으로 정렬 기준 생성
4. 정렬 기준에 맞춰 `schedule_slots` 생성
5. 하나의 디비전이 끝날 때마다 break slot 추가
6. 생성된 slot들에 대해 시간 자동 배정 수행

slot 생성 규칙

### 리그 경기 slot

- slot_type = match
- stage_type = group
- match_id = 리그 경기 id
- label = null
- court_id = 자동 배치 결과값
- start_at = 자동 배정 결과값
- end_at = 자동 배정 결과값

### 토너먼트 경기 slot

- slot_type = match
- stage_type = tournament
- match_id = 토너먼트 경기 id 또는 null
- label = null
- court_id = 자동 배치 결과값
- start_at = 자동 배정 결과값
- end_at = 자동 배정 결과값

### 휴식시간 slot

- slot_type = break
- stage_type = group 또는 tournament 또는 null
- match_id = null
- label = 휴식시간
- court_id = 자동 배치 결과값
- start_at = 자동 배정 결과값
- end_at = 자동 배정 결과값

시간 배정 규칙

- match slot은 `matchDurationMinutes` 사용
- break slot은 `breakDurationMinutes` 사용
- 각 코트에서 앞 slot의 종료 시간 다음에 다음 slot 시작
- 입력된 `startTime`을 각 코트의 시작 기준으로 사용

validation

- organizer 권한 확인
- tournament 존재 확인
- 생성 대상 경기 존재 확인
- startTime 존재 확인
- matchDurationMinutes > 0
- breakDurationMinutes >= 0
- 중복 생성 방지 필요

중복 생성 방지 규칙

- 이미 해당 tournament의 schedule_slots가 존재하면 재생성 금지
- 재생성이 필요하면 명시적 초기화 후 다시 생성하는 방식으로 제한

---

### clearGeneratedScheduleSlots

입력

- tournamentId

동작

- 해당 tournament의 schedule_slots 삭제 또는 초기화
- break slot 포함 전체 초기화
- matches의 기존 경기 자체는 삭제하지 않음

validation

- organizer 권한 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

상단 생성 액션

입력

- 시작 시간
- 경기 시간
- 휴식 시간

버튼

- 스케줄 생성
- 스케줄 초기화

동작

스케줄 생성

- 현재 생성된 리그 경기 + 토너먼트 경기를 기준으로 slot 자동 생성
- 코트별 > 디비전별 > 조별 > 토너먼트 순 자동 배치
- 디비전 종료 시 휴식시간 자동 추가
- 시간 자동 배정
- 생성 후 경기 리스트 갱신

스케줄 초기화

- 현재 생성된 schedule_slots 제거
- 경기 자체는 유지
- 이후 다시 스케줄 생성 가능

---

### 경기 리스트

생성 결과 반영 구조

```text
코트 섹션
 └ 디비전 섹션
    ├ A조
    │  └ 슬롯
    │     ├ 시간
    │     ├ 코트(드롭다운)
    │     └ 경기
    │        ├ match : 경기
    │        └ break time( "휴식시간" 텍스트)
    ├ B조
    ├ C조
    └ 토너먼트 섹션
       └ 슬롯
          ├ 시간
          ├ 코트(드롭다운)
          └ 경기
             ├ tournament(경기/ 빈 경기)
             └ break time( "휴식시간" 텍스트)
```

이번 슬라이스에서는

- 코트 변경 없음
- drag & drop 없음
- 동기화 저장 없음

생성 결과 반영만 수행한다.

---

## 권한

organizer

- 스케줄 생성 가능
- 스케줄 초기화 가능
- 생성 결과 조회 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/schedule-slots.ts
- /app/admin/tournaments/[id]/schedule/page.tsx
- /app/admin/tournaments/[id]/schedule/actions.ts
- /app/admin/tournaments/[id]/schedule/components/*
- /types

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- bracket 페이지의 경기 생성 로직 수정
- 코트 이동 편집
- 조 내부 순서 변경
- 수동 시간 수정
- 저장 버튼 기반 match 동기화
- 기존 schedule editor 제거
- match 결과 입력 로직 수정
- standings 계산 로직 수정

---

## 완료 기준

- organizer가 schedule 페이지에서 스케줄 생성 가능
- 시작 시간 / 경기 시간 / 휴식 시간 입력 가능
- 현재 생성된 리그/토너먼트 경기가 `schedule_slots`에 반영됨
- 디비전 종료 시 break slot 자동 생성됨
- 생성 시 시간 자동 배정까지 완료됨
- 생성 결과가 경기 리스트에 표시됨
- 중복 생성 방지 규칙 동작
- 기존 schedule / results / standings 기능 영향 없음