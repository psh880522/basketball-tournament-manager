# Vertical Slice Ticket

## 목표

schedule 페이지에서 생성·편집된 스케줄을 기존 `matches` 스케줄 구조에 동기화한다.

이번 슬라이스에서는 schedule 보드에서 확정된 결과를 저장할 때  
각 경기 slot의 시간 / 코트 / slot 연결 정보를 `matches` 테이블에 반영한다.

즉,

`schedule_slots -> matches`

동기화를 수행하여 기존 경기 목록 / 결과 입력 / 운영 화면이  
새 스케줄 보드 결과를 그대로 사용할 수 있도록 한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- organizer가 schedule 페이지에서 동기화 저장 가능
- match slot의 시간 / 코트 / slot_id가 `matches`에 반영됨
- break slot은 동기화 대상에서 제외됨
- 기존 match 기반 화면 정상 동작 유지

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- schedule_slots
- matches

사용 컬럼

schedule_slots

- id
- tournament_id
- slot_type
- match_id
- court_id
- start_at
- end_at

matches

- id
- slot_id
- scheduled_at
- court_id

이번 슬라이스에서는 데이터 동기화만 수행한다.

조 정보 / 브래킷 구조 / 경기 생성 로직 수정 금지

---

## API

### syncScheduleToMatches

입력

- tournamentId

동작

1. 해당 tournament의 `schedule_slots` 조회
2. `slot_type = match` 인 slot만 대상
3. `match_id` 존재 슬롯만 대상
4. 각 slot의 정보를 대응하는 `matches` row에 반영

동기화 규칙

- `matches.slot_id = schedule_slots.id`
- `matches.scheduled_at = schedule_slots.start_at`
- `matches.court_id = schedule_slots.court_id`

validation

- organizer 권한 확인
- `match_id` 존재 확인
- `start_at` 존재 확인
- `court_id` 존재 확인
- 동일 tournament 소속 match인지 확인

동기화 제외 규칙

- `slot_type = break` 는 제외
- `match_id = null` 인 tournament empty slot은 제외
- 시간 또는 코트가 비어 있는 slot은 제외 또는 에러 처리

---

### clearScheduleSync

입력

- tournamentId

동작

- 해당 tournament의 `matches`에서 아래 값만 초기화
  - `slot_id`
  - `scheduled_at`
  - `court_id`

주의

- `schedule_slots`는 유지
- 경기 자체는 삭제하지 않음
- 브래킷 구조는 변경하지 않음

validation

- organizer 권한 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

상단 운영 액션 영역에 버튼 추가

버튼

- 동기화 저장
- 동기화 초기화

동작

동기화 저장

- `syncScheduleToMatches` 실행
- 성공 시 저장 완료 메시지 표시

동기화 초기화

- `clearScheduleSync` 실행
- 기존 match 스케줄 필드만 초기화
- schedule 보드 데이터는 유지

---

### 경기 리스트

기존 구조 유지

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

이번 슬라이스에서는 경기 리스트 편집 방식은 변경하지 않는다.

---

## 권한

organizer

- 동기화 저장 가능
- 동기화 초기화 가능

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

- 스케줄 생성 로직 수정
- 코트 변경 편집 수정
- 조 내부 순서 변경 수정
- 시간 자동 재배정
- 조 정보 수정
- 브래킷 구조 수정
- match 결과 입력 로직 수정
- standings 계산 로직 수정

---

## 완료 기준

- organizer가 동기화 저장 실행 가능
- match slot의 시간 / 코트 / slot_id가 `matches`에 저장됨
- break slot은 동기화되지 않음
- empty tournament slot은 동기화되지 않음
- 동기화 초기화 실행 가능
- 기존 경기 목록 / 결과 입력 / standings 기능 영향 없음