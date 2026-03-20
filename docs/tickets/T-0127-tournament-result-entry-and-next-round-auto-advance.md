# Vertical Slice Ticket

## 목표

`/admin/tournaments/[id]/result` 페이지에서 토너먼트 경기 결과를 입력하고 저장하면,  
승자가 다음 강 경기의 지정 슬롯에 자동 배치되도록 한다.

이번 슬라이스에서는 다음이 가능해야 한다.

- organizer가 토너먼트 경기 결과 입력 가능
- 결과 저장 시 승자 확정 가능
- 승자가 다음 라운드 경기의 지정 슬롯에 자동 배치됨
- 결승 경기 저장 시 자동 진출 없이 종료 상태로 처리 가능

참고:
- 리그 순위 확정 단계는 별도 섹션 없이 운영한다
- 리그 순위 계산이 완료되면 해당 순위는 자동 확정된 것으로 간주한다
- 따라서 토너먼트 팀 배치는 `T-0126`에서 계산된 최신 리그 순위를 기준으로 수행한다

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
- stage_type
- team_a_id
- team_b_id
- score_a
- score_b
- status

필수 전제

- 토너먼트 경기 간 다음 라운드 연결 정보가 기존 match 구조 또는 bracket 로직에서 조회 가능해야 한다
- 저장 시 승자를 다음 경기의 team_a_id 또는 team_b_id 중 지정된 위치에 배치할 수 있어야 한다

운영 규칙

- 리그 순위 계산 완료 = 리그 순위 자동 확정
- 토너먼트 팀 배치 이후 토너먼트 결과 입력 가능
- 토너먼트 결과 저장은 standings 계산 대상이 아니다

---

## API

### saveTournamentResult

입력

- matchId
- scoreA
- scoreB

동작

- 해당 토너먼트 경기 결과 저장
- 경기 상태를 완료 상태로 변경
- 승자 팀 판정
- 다음 라운드 경기 존재 여부 확인
- 다음 라운드가 있으면 지정 슬롯에 승자 자동 배치
- 다음 라운드가 없으면 종료 상태만 반영

validation

- organizer 권한 확인
- match 존재 확인
- `stage_type = tournament` 인 경기인지 확인
- scoreA / scoreB 유효성 확인
- 승패가 결정 가능한지 확인
- 다음 라운드 연결 정보 존재 여부 확인

자동 배치 규칙

- 준결승 저장 → 결승 지정 슬롯에 승자 자동 배치
- 8강 저장 → 4강 지정 슬롯에 승자 자동 배치
- 4강 저장 → 결승 지정 슬롯에 승자 자동 배치
- 결승 저장 → 우승 확정, 다음 경기 배치 없음

중복 / 충돌 방지 규칙

- 다음 경기의 동일 슬롯에 이미 다른 팀이 배치되어 있으면 에러 또는 명시적 재계산 필요
- 동일 경기 결과를 다시 저장할 때는 기존 다음 라운드 배치와 충돌 여부 확인 필요

---

### getTournamentBracketProgress

입력

- divisionId

출력

- 현재 토너먼트 경기 목록
- 각 경기의 팀 배치 상태
- 다음 라운드 자동 배치 상태
- 결승/종료 여부

---

## UI

경로

/admin/tournaments/[id]/result

### 토너먼트 결과 입력 섹션

입력

- 디비전 선택
- 토너먼트 경기 목록
- 각 경기별 점수 입력

버튼

- 저장

규칙

- 토너먼트 경기만 표시
- 리그 경기는 이 섹션에서 제외
- 저장 시 승자가 다음 강으로 자동 배치됨

---

### 토너먼트 진행 상태 섹션

표시 항목

- 현재 라운드별 경기 목록
- 각 경기의 팀 배치 상태
- 다음 라운드 배치 상태
- 결승 경기 여부

표시 예시

- 준결승1: Tigers vs Hawks
- 준결승2: Eagles vs Bears
- 결승: TBD vs TBD

저장 후 예시

- 준결승1 저장 완료
- 결승: Tigers vs TBD

---

### 저장 결과 메시지

예시

- 저장 완료
- 승자 Tigers가 결승 슬롯 1에 자동 배치되었습니다

결승 경기 저장 시 예시

- 저장 완료
- 우승 팀이 확정되었습니다

---

## 권한

organizer

- 토너먼트 결과 저장 가능
- 자동 진출 배치 결과 확인 가능

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

## 완료 기준

- organizer가 토너먼트 경기 결과 입력 가능
- 토너먼트 결과 저장 시 승자 판정 가능
- 저장 후 다음 라운드 경기 슬롯에 승자 자동 배치 가능
- 결승 경기 저장 시 다음 라운드 배치 없이 종료 처리 가능
- 자동 배치 결과가 result 페이지에 즉시 반영됨
- 리그 standings 계산 로직에는 영향 없음
- 기존 schedule / bracket / standings 기능 영향 없음