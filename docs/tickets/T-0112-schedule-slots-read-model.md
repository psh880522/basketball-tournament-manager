# Vertical Slice Ticket

## 목표

기존 `schedule_slots` 테이블을 기반으로 Slot 구조를 읽어와  
새 스케줄 보드 UI에서 사용할 수 있는 조회 모델을 만든다.

이번 슬라이스에서는 Slot을 생성하거나 수정하지 않고  
DB에 저장된 Slot 데이터를 읽어 화면에 표시할 수 있는 구조만 만든다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- schedule_slots 데이터를 코트 / 디비전 / 조 / 토너먼트 구조로 조회 가능
- Slot에 연결된 match 정보를 함께 조회 가능
- break / buffer / maintenance 슬롯을 구분해 표시 가능

---

## DB

DB 스키마 변경 없음

이번 슬라이스에서는 기존 테이블을 그대로 사용한다.

사용 테이블

- schedule_slots
- matches
- divisions
- courts

참고

schedule_slots는 기존 컬럼을 사용한다.

- start_at
- end_at
- slot_type
- court_id
- division_id
- match_id
- sort_order
- stage_type
- label

조 구분값은 기존 match / bracket 데이터에서 조회 가능한 값을 우선 사용한다.

별도 스키마 추가 금지

---

## API

### getScheduleSlots

입력

- tournamentId

조회 대상

- schedule_slots

JOIN

- matches
- divisions
- courts
- 조 정보 조회에 필요한 기존 bracket / group 관련 데이터

정렬

- court_id
- division_id
- group_key
- stage_type
- sort_order
- start_at

출력 구조

코트 기준 구조로 반환

```text
courts[
  {
    court
    divisions[
      {
        division
        groups[
          {
            group_key
            slots[]
          }
        ]
        tournament_slots[]
      }
    ]
  }
]
```

slot 구조

```text
slot {
  id
  slot_type
  stage_type
  start_at
  end_at
  court_id
  division_id
  match_id
  label
  group_key
}
```

match가 존재하면 match 정보 포함

```text
match {
  id
  team_a
  team_b
  score_a
  score_b
}
```

---

## UI

경로

/admin/tournaments/[id]/schedule

읽기 전용 구조만 추가한다.

경기 리스트 UI 구조

```text
코트 섹션
 └ 디비전 섹션
    ├ A조
    │  └ 슬롯
    │     ├ 시간
    │     ├ 코트(드롭다운)
    │     └ 경기
    │        ├ match : 경기
    │        └ break time : "휴식시간"
    ├ B조
    ├ C조
    └ 토너먼트 섹션
       └ 슬롯
          ├ 시간
          ├ 코트(드롭다운)
          └ 경기
             ├ tournament : 경기 / 빈 경기
             └ break time : "휴식시간"
```

이번 슬라이스에서는

- drag & drop 없음
- 생성 버튼 없음
- 수정 없음

단순 조회 화면만 제공한다.

---

## 권한

organizer

- 조회 가능

team_manager
player
viewer

- 조회 가능

slot 수정 권한은 이번 슬라이스에서 제공하지 않는다.

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/schedule-slots.ts
- /app/admin/tournaments/[id]/schedule/page.tsx
- /app/admin/tournaments/[id]/schedule/components/*
- /types

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

제시한다.

---

## 제외 범위

- slot 생성
- slot 삭제
- slot drag and drop
- 리그 경기 생성
- 토너먼트 경기 생성
- 휴식시간 생성
- 자동 시간 배정
- 저장 버튼 기반 일괄 저장
- 기존 schedule generator 수정

---

## 완료 기준

- schedule_slots 데이터를 조회 가능
- 코트 / 디비전 / 조 / 토너먼트 구조로 UI 표시
- break / buffer / maintenance 슬롯 구분 표시
- match 연결 슬롯은 경기 정보 표시
- 기존 schedule / results / standings 기능 영향 없음