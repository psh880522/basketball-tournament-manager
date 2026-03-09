# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]` 운영 화면(T-0074)을 Level 1로 개선한다
  1) 상단 Summary Bar(KPI 5개) 추가
  2) Step Progress UI(단계형) 정리
  3) 위험 작업 영역 분리(상태 변경/종료/삭제)
- 기능 로직은 기존 구현을 최대한 재사용하고, UI/표현 중심으로 개선한다

---

## KPI (Summary Bar에 표시할 5개, 고정)
1. 승인 팀 수: approved_teams_count
2. 전체 팀 수: total_teams_count
3. 완료 경기 수: completed_matches_count
4. 전체 경기 수: total_matches_count
5. 토너먼트 생성 여부: has_bracket (final match 존재 여부로 파생)

추가로 텍스트로:
- tournament.name
- tournament.status
- 현재 단계 텍스트(derived)

---

## 단계(Step Progress) 정의 (고정, 7단계)
1. 팀 승인
2. 조/경기 생성
3. 코트 배정
4. 경기 결과 입력
5. 순위 확정
6. 토너먼트 생성
7. 종료

각 단계 상태: done / active / pending

---

## 단계 상태 계산 규칙 (Level 1 단순화)
- 팀 승인
  - done: approved_teams_count > 0 AND (pending/rejected 없이 운영자가 승인 완료로 간주 가능한 상태)
  - active: approved_teams_count == 0 AND total_teams_count > 0
- 조/경기 생성
  - done: total_matches_count > 0
  - active: total_matches_count == 0 AND approved_teams_count > 1
- 코트 배정
  - active: total_matches_count > 0 (배정 여부 완벽 판정은 제외, 단계는 안내용)
- 경기 결과 입력
  - active: total_matches_count > 0 AND completed_matches_count < total_matches_count
  - done: total_matches_count > 0 AND completed_matches_count == total_matches_count
- 순위 확정
  - active: standings 존재 여부로 판단(가능하면) / 없으면 “pending” 유지
- 토너먼트 생성
  - done: has_bracket == true
  - active: standings 준비됨 AND has_bracket == false (가능하면)
- 종료
  - done: tournament.status == finished (또는 프로젝트의 종료 상태 규칙)
  - pending: 그 외

> 완벽한 도메인 판정이 아니라 “운영 안내” 목적의 단순 규칙이다.
> 기존 T-0074/0075 진행 상태 계산 helper가 있으면 최대한 재사용한다.

---

## UI 구성 (필수)
`/admin/tournaments/[id]` 화면을 아래 섹션으로 재배치한다.

### 1) Summary Bar (상단)
- 대회명 + 상태 배지
- KPI 5개를 카드/그리드로 표시
- “현재 단계” 텍스트 표시

### 2) Step Progress
- 7단계가 세로(모바일)/가로(데스크탑)로 표시
- 각 단계에:
  - 단계명
  - 상태 텍스트(done/active/pending)
- active 단계 강조

### 3) 운영 액션 영역
- 기존 운영 기능 링크/버튼들을 “업무 영역”으로 묶어 배치
  - 팀 승인
  - 경기/결과/순위 관련
  - 토너먼트 관련
- 버튼/링크는 기존 페이지로 연결(기능 추가 없음)

### 4) 위험 작업 영역 (맨 아래, 분리)
제목: “⚠ 운영 위험 작업”
포함:
- 상태 변경(Quick Status, T-0086 연결)
- 대회 종료(T-0077 연결)
- 삭제(Soft delete, T-0084 연결)

위험 영역은 시각적으로 구분(배경/테두리 등)하고 confirm UX 유지

---

## 데이터 조회
- 기존에 사용 중인 조회를 재사용한다
- 최소로 필요한 데이터:
  - tournament: id, name, status
  - teams count(총/approved)
  - matches count(총/완료)
  - has_bracket 판단용 final match 존재 여부(또는 기존 토너먼트 존재 판단)

---

## 권한
- organizer만 접근 가능(기존 정책 유지)

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/page.tsx`
- `/app/admin/tournaments/[id]/ProgressIndicator.tsx` (이미 있다면 개선)
- `/lib/api/tournamentProgress.ts` (타입/상수/헬퍼 보강 수준)
- `/lib/api/tournaments.ts`
- `/lib/api/teams.ts`
- `/lib/api/matches.ts`
- `/components/ui/*` (Tailwind 컴포넌트 사용/확장 수준)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- KPI 확장(추가 지표)
- 실시간 업데이트(realtime)
- 상세 운영 로그/히스토리
- 코트 배정 여부의 정밀 판정
- standings/토너먼트 생성 가능 조건의 정밀 판정

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] 운영 화면 상단에 Summary Bar + KPI 5개가 표시된다
- [ ] Step Progress(7단계)가 done/active/pending으로 표시된다
- [ ] 운영 액션 영역과 위험 작업 영역이 분리되어 있다
- [ ] 기존 기능 링크/버튼이 동작하고 기능 로직 변화는 없다
- [ ] 로딩/에러/빈 상태(팀/경기 없음) UI가 깨지지 않는다
- [ ] 모바일에서도 레이아웃이 깨지지 않는다