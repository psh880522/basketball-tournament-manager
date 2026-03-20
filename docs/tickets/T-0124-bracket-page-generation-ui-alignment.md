# Vertical Slice Ticket

## 목표

`/admin/tournaments/[id]/bracket` 페이지를 경기 생성 전용 콘솔 역할에 맞게 정리한다.

이번 슬라이스에서는 bracket 페이지에서 다음이 가능해야 한다.

- 디비전별 리그 경기 생성
- 디비전별 토너먼트 경기 생성
- 토너먼트 생성 규칙 안내 확인
- 생성된 경기 현황 확인
- schedule 페이지로 넘어가기 전 경기 생성 상태 점검

이 슬라이스 완료 시 다음이 가능해야 한다.

- organizer가 bracket 페이지에서 리그 경기 생성 가능
- organizer가 bracket 페이지에서 토너먼트 경기 생성 가능
- 같은 디비전에 리그 경기가 있는 경우 / 없는 경우의 토너먼트 생성 규칙이 UI에 명확히 표시됨
- 생성 결과 요약이 bracket 페이지에서 확인 가능
- schedule 페이지는 경기 생성이 아닌 스케줄 생성/배치 전용 역할로 분리됨

---

## DB

DB 스키마 변경 없음

기존 테이블 사용

- matches
- divisions
- teams
- tournaments

이번 슬라이스에서는 DB 구조를 변경하지 않는다.

기존 경기 생성 로직과 기존 데이터 모델을 그대로 사용한다.

신규 테이블 / 신규 컬럼 추가 금지

---

## API

기존 경기 생성 로직을 재사용한다.

### createLeagueMatches

입력

- tournamentId
- divisionId
- groupSize

동작

- 해당 디비전의 리그 경기 생성
- 조 정보 포함 생성

validation

- organizer 권한 확인
- division 존재 확인
- groupSize >= 2
- 생성 대상 팀 존재 확인
- 중복 생성 방지 규칙 확인

---

### createTournamentMatches

입력

- tournamentId
- divisionId
- tournamentSize

동작

- 해당 디비전의 토너먼트 경기 생성

생성 규칙

- 같은 디비전에 리그 경기가 이미 생성되어 있으면
  - 토너먼트 경기만 생성
  - 팀은 미배정 상태로 생성

- 같은 디비전에 리그 경기가 생성되어 있지 않으면
  - 일반 토너먼트 대진처럼
  - 팀이 배정된 상태로 생성

validation

- organizer 권한 확인
- division 존재 확인
- tournamentSize 유효성 확인
- 중복 생성 방지 규칙 확인

---

### getBracketGenerationSummary

입력

- tournamentId

출력

- 디비전별 리그 경기 수
- 디비전별 토너먼트 경기 수
- 조별 경기 생성 여부
- 토너먼트 생성 여부
- schedule 페이지로 넘길 수 있는 상태 요약

---

## UI

경로

/admin/tournaments/[id]/bracket

### 상단 요약 영역

표시 항목

- 대회명
- 디비전 목록
- 디비전별 리그 경기 생성 여부
- 디비전별 토너먼트 경기 생성 여부

---

### 리그 경기 생성 섹션

입력

- 디비전 선택
- 그룹 크기

버튼

- 리그 경기 생성

설명

- 선택한 디비전에 리그 경기를 생성한다
- 생성된 경기들은 이후 schedule 페이지에서 스케줄 생성 대상으로 사용된다

---

### 토너먼트 경기 생성 섹션

입력

- 디비전 선택
- 토너먼트 크기

버튼

- 토너먼트 경기 생성

설명

- 같은 디비전에 리그 경기가 이미 있으면
  - 경기만 생성되고 팀은 미배정 상태로 생성된다

- 같은 디비전에 리그 경기가 없으면
  - 일반 토너먼트처럼 팀이 배정된 상태로 생성된다

---

### 생성 결과 요약 섹션

표시 항목 예시

- U12
  - 리그 경기: 생성됨 / 미생성
  - 토너먼트 경기: 생성됨 / 미생성

- U15
  - 리그 경기: 생성됨 / 미생성
  - 토너먼트 경기: 생성됨 / 미생성

---

### 경기 구조 확인 섹션

표시 항목

- A조 / B조 / C조 등 조별 경기 목록
- 토너먼트 라운드 구조
- 팀 배정 여부
- 미배정 토너먼트 경기 여부

---

### 페이지 역할 제한

이번 슬라이스에서 bracket 페이지는 경기 생성 전용이다.

포함하지 않는 기능

- 스케줄 생성
- 코트 배정
- 시간 배정
- 휴식시간 추가
- match 동기화 저장

이 기능들은 schedule 페이지에서 처리한다.

---

## 권한

organizer

- 리그 경기 생성 가능
- 토너먼트 경기 생성 가능
- 생성 결과 확인 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /app/admin/tournaments/[id]/bracket/page.tsx
- /app/admin/tournaments/[id]/bracket/actions.ts
- /app/admin/tournaments/[id]/bracket/components/*
- /lib/api/brackets.ts
- /lib/api/matches.ts
- /types

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- schedule 페이지 UI 수정
- 스케줄 생성 로직 수정
- 코트 배정 로직 수정
- 시간 자동 배정 로직 수정
- break slot 생성 로직 수정
- match 동기화 저장 로직 수정
- standings 계산 로직 수정
- 결과 입력 로직 수정

---

## 완료 기준

- organizer가 bracket 페이지에서 리그 경기 생성 가능
- organizer가 bracket 페이지에서 토너먼트 경기 생성 가능
- 토너먼트 생성 규칙이 UI에 명확히 표시됨
- 생성 결과 요약을 bracket 페이지에서 확인 가능
- bracket 페이지와 schedule 페이지의 역할이 UI상 명확히 분리됨
- 기존 results / standings / schedule 기능 영향 없음