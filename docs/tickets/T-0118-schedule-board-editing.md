# Vertical Slice Ticket

## 목표

schedule 페이지의 경기 리스트를 편집 가능한 운영 보드로 확장한다.

이번 슬라이스에서는 T-0117에서 생성된 slot들을 대상으로  
운영자가 코트를 배정하고, 같은 조 섹션 또는 같은 디비전의 토너먼트 섹션 안에서 순서를 조정할 수 있어야 한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- slot의 코트 변경
- 같은 조 섹션 안에서 slot 순서 이동
- 같은 디비전의 토너먼트 섹션 안에서 slot 순서 이동
- break slot과 match slot 모두 편집 가능
- 변경 결과가 즉시 DB에 반영
- 코트 배정 결과에 따라 화면이 자동 정렬된 구조로 다시 표시

이번 단계에서는 조 간 이동은 처리하지 않는다.

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- schedule_slots
- courts
- divisions
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

이번 슬라이스에서는 다음 값만 수정한다.

- court_id
- sort_order

조 정보 / 브래킷 구조 / 경기 자체는 수정하지 않는다.

---

## API

### updateSlotCourt

입력

- slotId
- courtId

동작

- schedule_slots.court_id 업데이트

validation

- organizer 권한 확인
- slot 존재 확인
- court 존재 확인
- 동일 tournament 소속 확인

---

### reorderGroupSlots

입력

- tournamentId
- divisionId
- groupKey
- orderedSlotIds[]

동작

- 같은 디비전, 같은 조 섹션 내 slot 순서 업데이트
- sort_order 재계산

validation

- organizer 권한 확인
- orderedSlotIds가 같은 조 섹션 slot인지 확인

---

### reorderTournamentSlots

입력

- tournamentId
- divisionId
- orderedSlotIds[]

동작

- 같은 디비전의 토너먼트 섹션 내 slot 순서 업데이트
- sort_order 재계산

validation

- organizer 권한 확인
- orderedSlotIds가 같은 토너먼트 섹션 slot인지 확인

---

## UI

경로

/admin/tournaments/[id]/schedule

경기 리스트를 편집 보드로 확장한다.

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

### 편집 동작

지원 범위

- 코트 dropdown 변경
- 같은 조 섹션 안에서 drag & drop 정렬
- 같은 디비전의 토너먼트 섹션 안에서 drag & drop 정렬

지원 슬롯 타입

- match
- break

토너먼트 슬롯은 빈 경기 상태도 표시 가능하다.

---

### 자동 정렬 규칙

코트 변경 후 화면은 자동 정렬된 구조로 다시 표시한다.

정렬 기준

- court
- division
- 조
- sort_order

토너먼트는 같은 디비전 내 토너먼트 섹션에서 sort_order 기준 표시

---

### 이번 슬라이스에서 하지 않는 것

- 조 간 이동
- 시간 자동 재배정
- 수동 시간 수정
- 저장 버튼 기반 match 동기화
- 경기 생성 기능
- 기존 bracket 구조 수정

---

## 권한

organizer

- 코트 변경 가능
- 순서 변경 가능

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
- 시간 자동 재배정
- 수동 시간 수정
- 동기화 저장
- bracket 페이지 경기 생성 로직 수정
- match 결과 입력 로직 수정
- standings 계산 로직 수정

---

## 완료 기준

- organizer가 slot의 코트 변경 가능
- 같은 조 섹션 안에서 slot 순서 이동 가능
- 같은 디비전의 토너먼트 섹션 안에서 slot 순서 이동 가능
- break / match slot 모두 편집 가능
- 변경 결과가 DB에 즉시 반영
- 경기 리스트가 자동 정렬된 구조로 다시 표시됨
- 기존 schedule / results / standings 기능 영향 없음