# Vertical Slice Ticket

## 목표

schedule 페이지에서 스케줄 생성 이후 슬롯은 시간 기준으로 고정하고,  
운영자는 슬롯 자체를 이동하는 대신 슬롯 안의 경기만 교체할 수 있도록 한다.

또한 휴식시간은 별도 섹션으로 노출하지 않고, 각 조 섹션 또는 토너먼트 섹션 안에서  
시간 순서에 맞는 break slot으로 표시한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- 스케줄 생성 후 slot의 시간 / 코트 / 순서는 고정됨
- 운영자는 같은 편집 범위 안에서 경기만 drag & drop 또는 교체 가능
- 경기 순서를 바꿔도 slot 시간은 그대로 유지됨
- 휴식시간은 디비전 상단 별도 섹션이 아니라 각 섹션의 시간 순서 slot으로 표시됨
- 기존 match 동기화 구조는 그대로 유지 가능

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
- division_id
- slot_type
- stage_type
- match_id
- label
- court_id
- start_at
- end_at
- sort_order

이번 슬라이스에서는 slot의 시간/코트/순서 구조는 고정된 것으로 취급한다.

편집 시 변경 대상

- match_id

고정 대상

- court_id
- start_at
- end_at
- sort_order

break slot 규칙

- slot_type = break
- match_id = null
- 각 조 섹션 또는 토너먼트 섹션의 시간 순서 리스트 안에 표시
- 별도 break 섹션 생성 금지

---

## API

### swapSlotMatchAssignments

입력

- sourceSlotId
- targetSlotId

동작

- 두 slot의 match_id를 교체한다
- slot 자체의 시간 / 코트 / sort_order는 변경하지 않는다

validation

- organizer 권한 확인
- 두 slot 모두 같은 tournament 소속인지 확인
- 두 slot 모두 slot_type = match 인지 확인
- break slot과의 교체 금지
- sourceSlotId != targetSlotId 확인

---

### assignMatchToEmptySlot

입력

- slotId
- matchId

동작

- 빈 tournament slot 또는 비어 있는 match slot에 match 연결
- slot 시간 / 코트 / 순서는 유지

validation

- organizer 권한 확인
- slot 존재 확인
- match 존재 확인
- slot_type = match 인지 확인
- break slot에는 할당 금지
- 같은 tournament 소속 확인

---

### unassignMatchFromSlot

입력

- slotId

동작

- 해당 slot의 match_id를 null 로 변경
- 시간 / 코트 / 순서는 유지

validation

- organizer 권한 확인
- slot_type = match 인지 확인
- break slot에는 적용 금지

---

## UI

경로

/admin/tournaments/[id]/schedule

기존 경기 리스트 보드의 편집 모델을 변경한다.

### 경기 리스트 구조

```text
코트 섹션
 └ 디비전 섹션
    ├ [A조]
    │   ├ 슬롯
    │   │  ├ 시간
    │   │  ├ 코트(드롭다운)
    │   │  └ 내용
    │   │     ├ [경기]
    │   │     └ [휴식시간] break time
    │   ├ 슬롯
    │   │  ...
    ├ [B조]
    │   ├ 슬롯
    │   │  ...
    ├ [C조]
    │   ├ 슬롯
    │   │  ...
    └ [토너먼트]
        ├ 슬롯
        │  ├ 시간
        │  ├ 코트(드롭다운)
        │  └ 내용
        │     ├ [토너먼트] 경기 / 빈 경기
        │     └ [휴식시간] break time
```

휴식시간 표시 규칙

- 별도 섹션으로 분리하지 않는다
- 각 조 섹션 또는 토너먼트 섹션의 시간 순서 slot으로 표시한다
- 예: 10:00 ~ 10:10 휴식시간

---

### 편집 동작

지원 범위

- 경기 카드 drag & drop
- 두 match slot 간 경기 교체
- 빈 tournament slot에 경기 배치
- slot에서 경기 제거
- 코트 dropdown 변경은 기존 방식 유지 가능

지원하지 않는 것

- slot 자체 이동
- 경기 이동에 따라 시간 함께 이동
- break slot과 경기 교체
- break slot을 별도 상단 섹션으로 표시

---

### 카드 표시 규칙

group match slot 예시

- 09:00 - 09:30
- 코트 1
- [A조] Tigers vs Hawks

break slot 예시

- 10:00 - 10:10
- 코트 1
- [휴식시간]

tournament empty slot 예시

- 11:00 - 11:30
- 코트 2
- [토너먼트] 빈 경기

---

## 권한

organizer

- 경기 교체 가능
- 빈 slot에 경기 배치 가능
- 경기 제거 가능

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

- 스케줄 생성 로직 재작성
- 시간 자동 재배정 로직 수정
- break slot 자동 생성 규칙 수정
- match 동기화 저장 로직 수정
- bracket 페이지 경기 생성 로직 수정
- standings 계산 로직 수정
- 결과 입력 로직 수정

---

## 완료 기준

- 경기 순서를 바꿔도 slot 시간은 유지됨
- slot 자체 이동 없이 경기만 교체 가능
- 휴식시간은 별도 섹션이 아니라 각 조/토너먼트 섹션의 시간 순서 위치에 표시됨
- break slot과 경기 교체는 불가
- 빈 tournament slot에 경기 배치 가능
- 기존 schedule / results / standings 기능 영향 없음