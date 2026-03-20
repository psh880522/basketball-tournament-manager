# Vertical Slice Ticket

## 목표

schedule 페이지에서 스케줄을 다시 생성하거나 동기화 저장하기 전에  
운영상 문제가 되는 상태를 사전에 검증하고, 재생성 시 안전하게 초기화할 수 있도록 한다.

이번 슬라이스에서는 다음을 제공해야 한다.

- 스케줄 생성 전 검증
- 동기화 저장 전 검증
- 재생성 시 안전한 초기화 절차
- 운영자가 어떤 문제가 있는지 즉시 알 수 있는 오류 메시지

이 슬라이스 완료 시 다음이 가능해야 한다.

- court 미배정 / 시간 미배정 / 중복 배정 상태를 사전에 검출
- break slot 포함 전체 스케줄 재생성 시 안전하게 초기화 가능
- 동기화 저장 전에 저장 불가 이유를 명확히 확인 가능
- 잘못된 상태가 `matches`로 반영되는 것을 방지

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- schedule_slots
- matches
- courts
- divisions

사용 컬럼

schedule_slots

- id
- tournament_id
- division_id
- slot_type
- stage_type
- match_id
- court_id
- start_at
- end_at
- sort_order
- label

matches

- id
- slot_id
- scheduled_at
- court_id

이번 슬라이스에서는 검증 / 초기화 로직만 추가한다.

---

## API

### validateScheduleBeforeSync

입력

- tournamentId

동작

해당 tournament의 schedule_slots를 검사하여 다음 오류를 수집한다.

검사 항목

- `slot_type = match` 인데 `match_id` 없음
- `slot_type = match` 인데 `court_id` 없음
- `slot_type = match` 인데 `start_at` 또는 `end_at` 없음
- 동일 court 에서 시간 겹침 존재
- 동일 match 가 여러 slot에 연결됨
- `start_at >= end_at`
- 같은 섹션 내부 sort_order 중복 또는 누락

출력

- `isValid`
- `errors[]`
- `warnings[]`

---

### resetScheduleBoard

입력

- tournamentId

동작

- 해당 tournament의 `schedule_slots` 전체 삭제 또는 초기화
- break slot 포함 제거
- `matches.slot_id`, `matches.scheduled_at`, `matches.court_id`는 건드리지 않음

사용 목적

- 스케줄 보드만 다시 생성하고 싶은 경우

validation

- organizer 권한 확인

---

### regenerateScheduleBoard

입력

- tournamentId
- startTime
- matchDurationMinutes
- breakDurationMinutes

동작

1. `resetScheduleBoard` 수행
2. `T-0117`의 `generateScheduleSlots` 재실행
3. 재생성 결과 반환

validation

- organizer 권한 확인
- 시작 시간 / 경기 시간 / 휴식 시간 유효성 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

상단 운영 액션 영역 확장

버튼

- 검증
- 스케줄 재생성

동작

검증

- `validateScheduleBeforeSync` 실행
- 오류 / 경고 목록 표시

스케줄 재생성

- 현재 보드 초기화 후 다시 생성
- 시작 시간 / 경기 시간 / 휴식 시간 입력값 재사용
- 완료 후 경기 리스트 갱신

---

### 검증 결과 UI

표시 항목 예

- 코트 미배정 경기 N건
- 시간 미배정 경기 N건
- 동일 코트 시간 충돌 N건
- 중복 연결 경기 N건
- 정렬 오류 N건

오류가 있으면

- 동기화 저장 버튼 비활성화 또는 경고 표시 후 차단

---

## 권한

organizer

- 검증 실행 가능
- 스케줄 재생성 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/schedule-slots.ts
- /lib/api/matches.ts
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

- bracket 페이지 경기 생성 로직 수정
- 조 정보 수정
- 브래킷 구조 수정
- 결과 입력 로직 수정
- standings 계산 로직 수정
- 새로운 DB 테이블 추가

---

## 완료 기준

- organizer가 schedule 검증 가능
- 오류 / 경고 목록 확인 가능
- 유효하지 않은 상태에서 동기화 저장 차단 가능
- 스케줄 재생성 가능
- 재생성 후 경기 리스트 정상 반영
- 기존 경기 목록 / 결과 입력 / standings 기능 영향 없음