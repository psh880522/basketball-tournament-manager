# Vertical Slice Ticket

## 목표

Division에 토너먼트 운영 설정을 추가한다.

추가되는 설정

- tournament_size (예: 4 / 8 / 16)
- include_tournament_slots

이 설정은 이후 다음 기능에서 사용된다.

- 토너먼트 생성
- 스케줄 슬롯 생성

---

## DB

Supabase MCP 사용

divisions 테이블 컬럼 추가

- tournament_size int null
- include_tournament_slots boolean default false

migration 생성

supabase/migrations/0110_division_operating_config.sql

---

## API

updateDivisionConfig

입력

- divisionId
- group_size
- tournament_size
- include_tournament_slots

validation

- group_size >= 2
- tournament_size null 허용

---

## UI

경로

/admin/tournaments/[id]/edit

division 설정 필드 추가

- group_size
- tournament_size
- include_tournament_slots

include_tournament_slots

checkbox

label

토너먼트 슬롯 자동 생성

설명

리그 경기 스케줄 생성 시 토너먼트 슬롯도 함께 생성됩니다

---

## 권한

organizer만 수정 가능

team_manager / player / viewer

읽기만 가능

---

## 수정 허용 범위

- /app/admin/tournaments/[id]/edit/page.tsx
- /app/admin/tournaments/[id]/edit/actions.ts
- /app/admin/tournaments/[id]/edit/Form.tsx
- /lib/api/divisions.ts
- supabase/migrations/0110_division_operating_config.sql

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- 토너먼트 경기 생성
- 토너먼트 스케줄 생성
- schedule slots
- dummy team

---

## 완료 기준

- divisions 테이블에 tournament_size 추가
- divisions 테이블에 include_tournament_slots 추가
- migration 생성
- division edit 화면에서 설정 수정 가능
- 저장 시 정상 반영
- organizer만 수정 가능