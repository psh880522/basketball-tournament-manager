# Vertical Slice Ticket

## 목표

Schedule Slot 기반 스케줄을 기존 Match 스케줄 구조와 동기화한다.

이번 슬라이스에서는 schedule 보드에서 편집되고 시간 배정된 결과를 저장할 때  
각 Match 슬롯의 정보를 Match 테이블의 스케줄 필드에 반영한다.

즉,

schedule_slots → matches

동기화를 수행하여 기존 경기 결과 입력 / 경기 목록 / 운영 화면과 충돌 없이  
새 스케줄 시스템을 사용할 수 있도록 한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- Slot 기반 스케줄을 저장
- Match 슬롯의 시간 / 코트 정보를 matches에 반영
- 기존 Match 기반 화면 정상 동작 유지
- 조 정보나 브래킷 구조는 변경하지 않음

---

## DB

DB 스키마 변경 없음

사용 테이블

- schedule_slots
- matches

사용 컬럼

schedule_slots

- id
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

기존 컬럼 유지

---

## API

### saveSchedule

입력

- tournamentId

동작

1. 해당 tournament의 schedule_slots 조회
2. slot_type = match 인 슬롯만 대상
3. match_id 존재 슬롯만 필터
4. 다음 값 matches 테이블에 반영

동기화 규칙

matches.slot_id

- slot_id = schedule_slots.id

matches.scheduled_at

- scheduled_at = schedule_slots.start_at

matches.court_id

- court_id = schedule_slots.court_id

주의

- match의 조 정보, 브래킷 구조, stage 소속은 변경하지 않는다
- schedule 저장은 스케줄 정보 동기화만 수행한다

validation

- organizer 권한 확인
- slot.match_id 존재 확인
- slot.start_at 존재 확인
- slot.court_id 존재 확인

---

### clearScheduleSync

입력

- tournamentId

동작

- 해당 tournament match의
  - slot_id
  - scheduled_at
  - court_id
  초기화

사용 목적

- 스케줄 초기화 후 재생성
- 새 slot 배치 재적용

validation

- organizer 권한 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

기존 스케줄 보드 상단에 저장 기능 추가

버튼

- 저장
- 스케줄 동기화 초기화

동작

저장 버튼

- saveSchedule 실행
- 성공 시 toast 표시

스케줄 동기화 초기화

- clearScheduleSync 실행
- schedule_slots 자체는 유지
- matches 스케줄 필드만 초기화

---

## UI 표시

Match 카드 표시

- 팀 정보
- 현재 코트
- 시간

break slot 표시

- label = "휴식시간"

tournament empty slot

- "빈 경기"

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

---

## 권한

organizer

- saveSchedule 실행 가능
- clearScheduleSync 실행 가능

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

- 조 정보 수정
- 브래킷 구조 수정
- schedule slot drag & drop 수정
- slot 생성 로직 수정
- 시간 자동 배정 수정
- standings 계산 로직 수정
- 결과 입력 로직 수정
- tournament bracket 생성 로직 수정

---

## 완료 기준

- saveSchedule 실행 가능
- match slot → match 스케줄 동기화
- matches.slot_id 저장
- matches.scheduled_at 저장
- matches.court_id 저장
- 조 정보 / 브래킷 구조 변경 없음
- 기존 결과 입력 화면 정상 동작
- 기존 match 목록 화면 정상 동작
- 기존 standings 기능 영향 없음