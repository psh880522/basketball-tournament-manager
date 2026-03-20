# Vertical Slice Ticket

## 목표

`/admin/tournaments/[id]/result` 페이지에서 리그 순위를 확정하고,  
확정된 리그 순위를 기준으로 토너먼트 경기의 팀을 배치할 수 있도록 한다.

이번 슬라이스에서는 다음이 가능해야 한다.

- organizer가 리그 순위 확정 가능
- 리그 순위 확정 이후 토너먼트 팀 배치 가능
- 확정된 순위를 기준으로 토너먼트 경기의 빈 슬롯에 팀 자동 배치
- 리그 순위 확정 이전에는 토너먼트 팀 배치 불가

이번 슬라이스는 **리그 순위 확정 + 토너먼트 팀 배치까지만** 포함한다.  
토너먼트 결과 입력과 다음 강 자동 배치는 포함하지 않는다.

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- divisions
- standings
- matches
- teams

사용 컬럼

divisions

- id
- standings_dirty
- tournament_size
- include_tournament_slots

standings

- division_id
- team_id
- rank

matches

- id
- division_id
- stage_type
- team_a_id
- team_b_id

이번 슬라이스에서는 기존 토너먼트 경기 구조를 그대로 사용한다.

운영 규칙

- 리그 순위 확정은 해당 division의 현재 standings를 공식 시드로 확정하는 의미
- 토너먼트 팀 배치는 확정된 standings 기준으로 수행
- 토너먼트 팀 배치 대상은 `stage_type = tournament` 경기 중 팀 미배정 경기
- 리그 순위 계산 대상은 여전히 group stage 경기만이다

---

## API

### confirmLeagueStandings

입력

- divisionId

동작

- 해당 division의 현재 standings 상태 확인
- standings_dirty = false 인 경우에만 확정 가능
- 현재 standings 순위를 공식 시드 기준으로 사용 가능 상태로 전환

validation

- organizer 권한 확인
- division 존재 확인
- standings 존재 확인
- standings_dirty = false 확인

---

### seedTournamentTeamsFromConfirmedStandings

입력

- divisionId

동작

- 해당 division의 확정된 standings 조회
- 토너먼트 경기(`stage_type = tournament`) 조회
- tournament_size 기준으로 필요한 상위 순위 팀 선택
- 시드 규칙에 따라 토너먼트 경기의 team_a_id / team_b_id 배치

기본 시드 예시

- 4강
  - 1위 vs 4위
  - 2위 vs 3위

- 8강 이상도 동일하게 상위/하위 시드 대칭 배치 원칙 적용

validation

- organizer 권한 확인
- division 존재 확인
- 리그 순위 확정 상태 확인
- tournament_size 유효성 확인
- 토너먼트 경기 존재 확인
- 이미 팀이 배치된 토너먼트 경기가 있으면 중복 배치 금지 또는 명시적 초기화 필요

---

### getTournamentSeedingPreview

입력

- divisionId

출력

- 현재 standings 기준 예상 토너먼트 시드 배치표
- 예:
  - 준결승1: 1위 vs 4위
  - 준결승2: 2위 vs 3위

---

## UI

경로

/admin/tournaments/[id]/result

### 리그 순위 확정 섹션

입력

- 디비전 선택

버튼

- 리그 순위 확정

동작

- 현재 standings_dirty 상태 확인
- standings_dirty = false 인 경우만 확정 가능
- 확정 후 상태 메시지 표시

설명

- 리그 순위 확정 이후 토너먼트 팀 배치가 가능합니다

---

### 토너먼트 팀 배치 섹션

입력

- 디비전 선택

표시

- 현재 리그 순위
- 예상 토너먼트 시드 배치 미리보기

버튼

- 토너먼트 팀 배치

동작

- 확정된 리그 순위를 기준으로 토너먼트 경기 팀 배치 수행
- 배치 후 토너먼트 경기 목록 갱신

---

### 토너먼트 배치 미리보기 섹션

표시 예시

- 1위 Tigers vs 4위 Bears
- 2위 Hawks vs 3위 Eagles

표시 규칙

- division의 tournament_size 기준
- 현재 standings 기준
- 실제 저장 전 미리보기 가능

---

### 상태 표시

- standings_dirty = true 이면 "리그 순위 확정 불가: 순위 재계산 필요"
- 확정 완료 시 "리그 순위 확정됨"
- 팀 배치 완료 시 "토너먼트 팀 배치 완료"

---

## 권한

organizer

- 리그 순위 확정 가능
- 토너먼트 팀 배치 가능
- 배치 미리보기 조회 가능

team_manager
player
viewer

- 조회만 가능

---

## 수정 허용 범위

- /app/admin/tournaments/[id]/result/page.tsx
- /app/admin/tournaments/[id]/result/actions.ts
- /app/admin/tournaments/[id]/result/components/*
- /lib/api/results.ts
- /lib/api/standings.ts
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

- 리그 결과 입력
- 리그 순위 계산
- 토너먼트 결과 입력
- 저장 시 다음 강 자동 배치
- schedule 페이지 수정
- bracket 페이지 수정

---

## 완료 기준

- organizer가 리그 순위 확정 가능
- standings_dirty = false 일 때만 확정 가능
- 확정된 순위 기준으로 토너먼트 팀 배치 가능
- tournament_size 기준으로 상위 순위 팀이 토너먼트 경기에 배치됨
- 배치 미리보기 확인 가능
- 이미 배치된 토너먼트 경기의 중복 배치 방지 규칙 동작
- 기존 schedule / bracket / standings 기능 영향 없음