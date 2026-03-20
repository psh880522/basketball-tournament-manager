# Vertical Slice Ticket

## 목표

`/admin/tournaments/[id]/result` 페이지에서 리그 경기 결과를 입력하고,  
리그 경기만을 대상으로 순위를 계산할 수 있도록 한다.

이번 슬라이스에서는 다음이 가능해야 한다.

- organizer가 리그 경기 결과 입력 가능
- 리그 경기 결과 저장 시 standings_dirty 반영
- 리그 경기만 대상으로 순위 계산 가능
- 현재 리그 순위가 result 페이지에서 확인 가능

이번 슬라이스는 **리그 결과 입력 + 리그 순위 계산까지만** 포함한다.  
리그 순위 확정과 토너먼트 팀 배치는 포함하지 않는다.

---

## DB

DB 스키마 신규 변경 없음

기존 테이블 사용

- matches
- divisions
- standings
- teams

사용 컬럼

matches

- id
- division_id
- score_a
- score_b
- status
- stage_type

divisions

- id
- standings_dirty

standings

- division_id
- team_id
- wins
- losses
- points_for
- points_against
- rank

이번 슬라이스에서는 기존 standings 구조를 그대로 사용한다.

중요 규칙

- standings 계산 대상은 `stage_type = group` 인 경기만 포함
- `stage_type = tournament` 는 standings 계산에서 제외

---

## API

### saveLeagueResult

입력

- matchId
- scoreA
- scoreB

동작

- 해당 리그 경기 결과 저장
- 경기 상태를 완료 상태로 변경
- 해당 division의 `standings_dirty = true` 설정

validation

- organizer 권한 확인
- match 존재 확인
- `stage_type = group` 인 경기인지 확인
- scoreA / scoreB 유효성 확인

---

### calculateLeagueStandings

입력

- divisionId

동작

- 해당 division의 리그 경기(`stage_type = group`)만 조회
- 기존 순위 규칙으로 standings 계산
- standings 테이블 갱신
- `divisions.standings_dirty = false` 설정

순위 기준

1. 승수
2. 승자승
3. 다득점
4. 저실점

validation

- organizer 권한 확인
- division 존재 확인

---

### getLeagueStandings

입력

- divisionId

출력

- 현재 division standings 목록
- rank 순 정렬

---

## UI

경로

/admin/tournaments/[id]/result

### 리그 결과 입력 섹션

입력

- 디비전 선택
- 리그 경기 목록
- 각 경기별 점수 입력

버튼

- 저장

규칙

- 리그 경기만 표시
- 토너먼트 경기는 이 섹션에서 제외
- 저장 시 standings_dirty 반영

---

### 리그 순위 계산 섹션

입력

- 디비전 선택

버튼

- 리그 순위 계산

동작

- 현재 저장된 리그 경기 결과만 대상으로 계산
- 계산 후 standings 목록 갱신

---

### 리그 순위 표시 섹션

표시 항목

- 순위
- 팀명
- 승
- 패
- 득점
- 실점

표시 규칙

- rank 오름차순
- 현재 division standings 표시

---

### UI 상태 표시

- standings_dirty = true 이면 "순위 재계산 필요" 표시
- standings_dirty = false 이면 "최신 순위" 표시

---

## 권한

organizer

- 리그 결과 저장 가능
- 리그 순위 계산 가능
- 리그 순위 조회 가능

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
- /types

그 외 파일 수정 금지.

필요하면 먼저

- 변경 필요 이유
- 대안 2개
- 추천 1개

를 제시한다.

---

## 제외 범위

- 리그 순위 확정
- 토너먼트 팀 배치
- 토너먼트 결과 입력
- 저장 시 다음 강 자동 배치
- schedule 페이지 수정
- bracket 페이지 수정

---

## 완료 기준

- organizer가 리그 경기 결과 입력 가능
- 리그 결과 저장 시 standings_dirty 가 true 로 변경됨
- 리그 순위 계산 시 group stage 경기만 반영됨
- tournament 경기 결과는 standings 계산에서 제외됨
- standings 계산 후 standings_dirty 가 false 로 변경됨
- result 페이지에서 현재 리그 순위 확인 가능
- 기존 schedule / bracket / standings 기능 영향 없음