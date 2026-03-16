# Vertical Slice Ticket

## 목표

리그 경기 생성과 토너먼트 경기 생성은 bracket 페이지에서 수행하고,  
schedule 페이지에서는 생성 결과를 `schedule_slots`에 반영하여 조회할 수 있도록 연결한다.

이번 슬라이스에서는 각 생성 기능이 독립적으로 동작해야 한다.

- 리그 경기 생성은 bracket 페이지에서 수행
- 토너먼트 경기 생성은 bracket 페이지에서 수행
- 휴식시간 슬롯 생성은 schedule 페이지에서 수행

이 슬라이스 완료 시 다음이 가능해야 한다.

- bracket 페이지에서 생성한 리그 경기 결과가 schedule_slots에 반영됨
- bracket 페이지에서 생성한 토너먼트 경기 결과가 schedule_slots에 반영됨
- schedule 페이지에서 특정 디비전의 휴식시간 슬롯 생성 가능
- 생성 결과가 schedule 페이지 경기 리스트에서 확인 가능

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- schedule_slots
- matches
- divisions
- teams

기존 컬럼 사용

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

- slot_id
- scheduled_at
- court_id

이번 슬라이스에서는 신규 테이블 추가 금지

---

## API

### seedGroupMatchSlotsFromBracket

입력

- tournamentId
- divisionId

동작

- bracket 페이지에서 생성된 리그 경기 기준으로 slot 생성
- 각 경기의 조 정보에 따라 해당 조 섹션용 `schedule_slots` 생성
- 생성되는 slot 규칙
  - slot_type = match
  - stage_type = group
  - match_id = 리그 경기 id
  - label = null
  - court_id = null 허용
  - start_at = null 허용
  - end_at = null 허용

validation

- division 존재 확인
- 해당 division의 리그 경기 존재 확인
- 중복 생성 방지 규칙 필요

중복 생성 방지 규칙

- 동일 division의 group stage match slot이 이미 있으면 재생성 금지
- 재생성이 필요하면 명시적 삭제/초기화 후 다시 생성하는 방식으로 제한

---

### seedTournamentMatchSlotsFromBracket

입력

- tournamentId
- divisionId
- assign_to_tournament boolean

동작

- bracket 페이지에서 생성된 토너먼트 경기 기준으로 slot 생성
- 토너먼트 섹션용 `schedule_slots` 생성
- 생성되는 slot 규칙
  - slot_type = match
  - stage_type = tournament
  - match_id = 토너먼트 경기 id 또는 null
  - label = null
  - court_id = null 허용
  - start_at = null 허용
  - end_at = null 허용

validation

- division 존재 확인
- 토너먼트 경기 존재 확인
- 동일 division의 tournament stage slot 중복 생성 방지

assign_to_tournament 처리

- true 이면 생성된 토너먼트 경기를 slot에 연결
- false 이면 빈 tournament slot 생성 허용

---

### seedBreakSlots

입력

- tournamentId
- divisionId
- sectionType
- groupKey null 허용

동작

- 해당 디비전의 특정 조 섹션 또는 토너먼트 섹션에 휴식시간 slot 생성
- 생성되는 slot 규칙
  - slot_type = break
  - stage_type = group 또는 tournament
  - match_id = null
  - label = 휴식시간
  - court_id = null 허용
  - start_at = null 허용
  - end_at = null 허용

validation

- division 존재 확인
- organizer 권한 확인
- sectionType = group 인 경우 groupKey 필요
- sectionType = tournament 인 경우 groupKey는 null

---

## UI

### bracket 페이지

경로

/admin/tournaments/[id]/bracket

기능

- 리그 경기 생성
- 토너먼트 경기 생성

생성 완료 후 schedule_slots 반영 액션 실행 가능해야 한다.

---

### schedule 페이지

경로

/admin/tournaments/[id]/schedule

휴식시간 생성 기능만 제공한다.

입력

- 디비전 선택(드롭다운)
- 섹션 선택(group / tournament)
- group 선택(A / B / C ...) - group 섹션일 때만 표시

버튼

- 생성

규칙

- break slot 생성 시 해당 조 또는 토너먼트 섹션에 추가
- label은 "휴식시간"으로 표시

---

### 경기 리스트

읽기/생성 결과 반영 구조

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

- drag & drop 없음
- 코트 드롭다운 수정 동작 없음
- 시간 자동 배정 없음

생성 결과 반영만 수행한다.

---

## 권한

organizer

- bracket 페이지에서 리그 경기 생성 가능
- bracket 페이지에서 토너먼트 경기 생성 가능
- schedule 페이지에서 휴식시간 생성 가능
- 생성 결과 조회 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/schedule-slots.ts
- /lib/api/matches.ts
- /app/admin/tournaments/[id]/bracket/*
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

- slot drag and drop
- 코트 이동 편집
- 시간 자동 배정
- 저장 버튼 기반 일괄 저장
- 기존 schedule generator 전면 교체
- 기존 schedule editor 제거
- match 결과 입력 로직 수정
- standings 계산 로직 수정

---

## 완료 기준

- bracket 페이지에서 생성한 리그 경기 결과가 slot으로 반영됨
- bracket 페이지에서 생성한 토너먼트 경기 결과가 slot으로 반영됨
- organizer가 디비전/섹션 기준 break slot 생성 가능
- 생성 결과가 `schedule_slots`에 저장됨
- 생성 결과가 경기 리스트에 반영됨
- 조 / 토너먼트 / break slot이 구분 표시됨
- 기존 schedule / results / standings 기능 영향 없음