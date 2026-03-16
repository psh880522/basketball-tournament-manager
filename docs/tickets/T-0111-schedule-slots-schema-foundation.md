# Vertical Slice Ticket

## 목표

Slot 기반 스케줄 시스템의 DB 기반을 추가한다.

이번 슬라이스에서는 새로운 스케줄 저장 구조만 도입하고,
기존 Match 중심 스케줄 구조는 유지한다.

이 슬라이스 완료 시 다음이 가능해야 한다.

- Schedule Slot을 저장할 수 있는 테이블 존재
- Slot이 그룹 / 토너먼트 / 휴식시간 문맥을 표현 가능
- Match가 Slot과 연결될 수 있는 구조 준비
- 기존 schedule / results / standings 기능은 그대로 동작

---

## DB

Supabase MCP 사용

신규 테이블 생성

schedule_slots

컬럼

- id uuid pk
- tournament_id uuid not null
- division_id uuid null
- slot_type text not null
- stage_type text null
- match_id uuid null
- label text null
- court_id uuid null
- start_time timestamptz null
- end_time timestamptz null
- sort_order integer not null default 0
- created_at timestamptz not null default now()

slot_type 허용 값

- match
- break

stage_type 허용 값

- group
- tournament

표현 규칙

- 그룹 경기 슬롯
  - slot_type = match
  - stage_type = group
  - match_id = 리그 경기 id

- 토너먼트 경기 슬롯
  - slot_type = match
  - stage_type = tournament
  - match_id = 토너먼트 경기 id 또는 null

- 휴식시간 슬롯
  - slot_type = break
  - stage_type = group 또는 tournament 또는 null
  - match_id = null
  - label = 휴식시간

---

### matches 테이블 수정

컬럼 추가

- slot_id uuid null

FK

- matches.slot_id → schedule_slots.id
- schedule_slots.match_id → matches.id
- schedule_slots.tournament_id → tournaments.id
- schedule_slots.division_id → divisions.id
- schedule_slots.court_id → courts.id

기존 컬럼 유지

- matches.scheduled_at
- matches.court_id

삭제 금지

---

### 인덱스

schedule_slots

- tournament_id
- division_id
- court_id
- stage_type
- sort_order
- match_id

matches

- slot_id

---

### 제약 조건

- slot_type 이 break 인 경우 match_id 는 null 이어야 한다
- slot_type 이 match 인 경우 label 은 null 허용
- start_time 과 end_time 은 둘 다 null 허용
- start_time 이 있으면 end_time 도 함께 저장되어야 한다
- start_time < end_time 이어야 한다

---

### migration 생성

- supabase/migrations/0111_schedule_slots_schema_foundation.sql

---

### RLS 정책

schedule_slots 읽기

- organizer
- team_manager
- player
- viewer

schedule_slots 쓰기

- organizer만 가능

matches.slot_id 반영

- organizer만 가능

기존 matches RLS와 충돌 없이 최소 범위로 추가한다.

---

## API

이번 슬라이스에서는 신규 생성/편집 API를 추가하지 않는다.

허용 범위

- schedule_slots 조회를 위한 최소 read helper 추가 가능
- 타입 정의 / mapper 추가 가능

금지

- slot 생성 API
- slot 수정 API
- slot drag and drop API
- 시간 자동 배정 API

---

## UI

이번 슬라이스에서는 새 UI를 추가하지 않는다.

허용 범위

- 개발 확인용 최소 read-only 디버그 출력
- 타입 연결을 위한 최소 수정

금지

- schedule 보드 UI 추가
- 생성 버튼 추가
- drag and drop 추가

---

## 권한

organizer

- schedule_slots 쓰기 가능
- matches.slot_id 수정 가능

team_manager
player
viewer

- 조회만 가능
- 수정 불가

---

## 수정 허용 범위

- /lib/api/schedule.ts
- /lib/api/matches.ts
- /types
- supabase/migrations/0111_schedule_slots_schema_foundation.sql
- schedule_slots 관련 RLS 정의 파일

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- Slot 생성 UI
- 리그 경기 생성
- 토너먼트 경기 생성
- 휴식시간 생성
- schedule 보드 UI
- drag and drop
- 자동 시간 배정
- 저장 버튼 기반 일괄 저장
- 기존 schedule editor 교체

---

## 완료 기준

- schedule_slots 테이블 생성
- matches.slot_id 컬럼 추가
- FK / 인덱스 / 제약 조건 생성
- migration 생성
- organizer만 schedule_slots 쓰기 가능
- 기존 schedule / results / standings 기능이 깨지지 않음