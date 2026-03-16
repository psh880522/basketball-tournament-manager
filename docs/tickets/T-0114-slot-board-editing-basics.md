# Vertical Slice Ticket

## 목표

경기 리스트 보드에서 Slot의 코트를 변경하고,  
같은 조 섹션 또는 같은 토너먼트 섹션 안에서 Slot 순서를 조정할 수 있는 기본 편집 기능을 추가한다.

이번 슬라이스에서는 생성된 Slot을 **코트별 / 디비전별 / 조별 / 토너먼트 섹션 구조에서 편집**할 수 있도록 한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- Slot의 코트를 변경
- 같은 조 섹션 안에서 Slot 순서 이동
- 토너먼트 섹션 안에서 Slot 순서 이동
- Match 슬롯과 Break 슬롯 모두 이동 가능
- 이동 결과가 DB에 반영

이번 단계에서는 조 간 이동은 처리하지 않는다.

---

## DB

신규 스키마 변경 없음

사용 테이블

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
- label
- court_id
- start_at
- end_at
- sort_order

이번 슬라이스에서는 slot의 **sort_order**와 **court_id**만 수정한다.

---

## API

### reorderGroupSlots

입력

- divisionId
- groupKey
- orderedSlotIds[]

동작

- 동일 조 섹션 내 slot 순서 업데이트
- sort_order 갱신

validation

- organizer 권한 확인
- orderedSlotIds가 해당 조 섹션 slot인지 확인

---

### reorderTournamentSlots

입력

- divisionId
- orderedSlotIds[]

동작

- 동일 디비전 토너먼트 섹션 내 slot 순서 업데이트
- sort_order 갱신

validation

- organizer 권한 확인
- orderedSlotIds가 해당 토너먼트 섹션 slot인지 확인

---

### updateSlotCourt

입력

- slotId
- courtId

동작

- slot court 변경

validation

- court 존재 확인
- organizer 권한 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

경기 리스트 보드 편집 기능 추가

### 경기 리스트 구조

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

### Drag & Drop

지원 범위

- 같은 조 섹션 안에서 순서 이동
- 같은 디비전의 토너먼트 섹션 안에서 순서 이동

지원 슬롯 타입

- match
- break

tournament 슬롯은 **빈 슬롯도 이동 가능**

조 간 이동은 지원하지 않는다.

---

### 코트 변경

Slot 카드 내

코트 dropdown 제공

선택 시

- schedule_slots.court_id 업데이트

코트 변경 후 화면은 자동 정렬된 구조로 다시 표시한다.

---

### UI 제한

이번 슬라이스에서는 다음 기능 제공하지 않는다.

- 조 간 이동
- 시간 변경
- 자동 시간 배정
- 저장 버튼 기반 일괄 저장
- bulk slot 생성

---

## 권한

organizer

- slot 순서 조정
- slot 코트 변경

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /lib/api/schedule-slots.ts
- /lib/api/schedule.ts
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
- 자동 시간 배정
- 대회 시작시간 설정
- 경기 시간 설정
- 휴식시간 설정
- 저장 버튼 기반 일괄 저장
- schedule generator 교체
- results 로직 수정
- standings 로직 수정

---

## 완료 기준

- Slot의 court 변경 가능
- 같은 조 섹션 안에서 slot 순서 이동 가능
- 토너먼트 섹션 안에서 slot 순서 이동 가능
- group / tournament / break 슬롯 모두 편집 가능
- 이동 결과 DB 반영
- 조회 화면에 이동 결과 반영
- 기존 schedule / results / standings 기능 영향 없음