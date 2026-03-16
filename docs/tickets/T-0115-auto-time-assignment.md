# Vertical Slice Ticket

## 목표

코트 배정과 섹션 내부 순서를 기준으로 각 Slot에 시간을 자동 배정하는 기능을 추가한다.

운영자는 다음 값을 입력할 수 있어야 한다.

- 대회 시작 시간
- 경기 시간
- 휴식 시간

그리고 "스케줄 생성" 버튼을 눌러 코트별 Slot 순서를 기준으로  
자동으로 시간(start_at / end_at)을 배정한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- 코트별 Slot 순서를 기준으로 자동 시간 배정
- match 슬롯은 경기 시간 기준으로 시간 배정
- break 슬롯은 휴식 시간 기준으로 시간 배정
- 결과가 schedule_slots.start_at / end_at 에 저장
- 화면이 코트 기준으로 자동 정렬된 결과를 표시

---

## DB

DB 스키마 변경 없음

사용 테이블

- schedule_slots

사용 컬럼

- id
- tournament_id
- division_id
- slot_type
- stage_type
- court_id
- start_at
- end_at
- sort_order

기존 데이터 구조 유지

---

## API

### generateScheduleTimes

입력

- tournamentId
- startTime
- matchDurationMinutes
- breakDurationMinutes

동작

1. 해당 tournament의 schedule_slots 조회
2. court_id 기준으로 그룹화
3. 각 court 내에서 다음 기준으로 정렬
   - division
   - 조 섹션 또는 토너먼트 섹션
   - sort_order
4. startTime부터 순차적으로 시간 배정

시간 배정 규칙

match slot

- start_at = 현재 시간
- end_at = start_at + matchDuration

break slot

- start_at = 현재 시간
- end_at = start_at + breakDuration

슬롯 배정 후

- 다음 슬롯 시작 시간 = 이전 end_at

validation

- organizer 권한 확인
- matchDurationMinutes > 0
- breakDurationMinutes >= 0
- startTime 존재 확인
- court_id 없는 slot은 시간 배정 대상에서 제외

---

## UI

경로

/admin/tournaments/[id]/schedule

경기 리스트 상단에 시간 배정 패널 추가

입력 필드

- 대회 시작 시간 (datetime)
- 경기 시간 (minutes)
- 휴식 시간 (minutes)

버튼

- 스케줄 생성

동작

- 버튼 클릭 시 generateScheduleTimes 실행
- 완료 후 Slot UI 갱신

---

## UI 표시

경기 리스트 구조

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

Slot 카드에 시간 표시

표시 형식

- HH:mm - HH:mm

예

- 09:00 - 09:30

break slot

- 동일하게 시간 표시
- label = "휴식시간"

---

## 권한

organizer

- 시간 자동 배정 실행 가능

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

- 조 간 이동
- slot 생성
- 리그 경기 생성
- 토너먼트 경기 생성
- 휴식시간 생성
- 저장 버튼 기반 일괄 저장
- schedule generator 완전 교체
- match 결과 입력 로직 수정
- standings 계산 로직 수정

---

## 완료 기준

- 시작 시간 / 경기 시간 / 휴식 시간 입력 가능
- 스케줄 생성 버튼 실행 가능
- 코트별 Slot 순서 기준 시간 자동 배정
- match / break 슬롯 모두 시간 반영
- court_id 없는 slot은 제외됨
- schedule_slots.start_at / end_at 저장
- Slot UI에 시간 표시
- 기존 schedule / results / standings 기능 영향 없음