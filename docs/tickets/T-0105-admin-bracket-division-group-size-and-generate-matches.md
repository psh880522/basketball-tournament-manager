# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/bracket` 화면을 “조/경기 생성 콘솔”로 개선한다
- division별로:
  1) group_size를 인라인 수정/저장할 수 있다
  2) 경기 생성(조별 리그) 실행이 가능하다
  3) 기존 경기가 있어도 “덮어쓰기(재생성)”로 다시 생성할 수 있다
- 경기 생성/재생성 완료 후 `/admin/tournaments/[id]` 운영 화면으로 이동한다

---

## UI 설계 (옵션 A: division 카드)

### 상단 Tournament Summary
- 대회명
- division 수
- (선택) 승인 팀 수 총합 / 생성된 경기 수 총합

### 본문: Divisions 카드 리스트(정렬: sort_order asc)
각 division 카드에 포함:

1) Header
- division명
- 승인 팀 수 (해당 division approved applications 기준)
- 생성된 경기 수 (해당 division matches count)

2) group_size Quick Edit
- number input: group_size
- 저장 버튼
- validation: 2 이상

3) 생성 액션
- 버튼 2개:
  - `경기 생성` (경기가 없을 때 주로 사용)
  - `덮어쓰기 재생성` (항상 보이되 confirm 필요)
- 보조 링크:
  - `승인 팀 보기` → `/admin/tournaments/[id]/applications?status=approved&divisionId=...` (가능하면)
  - `생성된 경기 보기` → `/admin/tournaments/[id]/matches?divisionId=...` (존재 시)

4) 상태/에러 표시
- 로딩(저장/생성)
- 실패 메시지

---

## 동작/정책

### A) group_size 저장
- divisions.group_size 업데이트
- organizer만 가능

### B) 경기 생성 (생성/덮어쓰기)
- 입력: tournamentId, divisionId, overwrite(boolean)
- 공통 사전 검증(필수):
  - 해당 division 승인 팀 수 >= 2
  - group_size >= 2
  - (선택) group_size가 승인 팀 수보다 큰 경우 경고 또는 허용
- overwrite=false:
  - 해당 division에 기존 matches가 있으면 실패(“이미 경기가 존재합니다. 덮어쓰기를 사용하세요.”)
- overwrite=true:
  - confirm(필수):
    - 체크박스 “기존 경기가 삭제되고 재생성됩니다”
    - (선택) OVERWRITE 입력
  - 삭제 범위:
    - 해당 division에 속한 matches(및 필요 시 groups/round 관련 레코드)
  - 이후 새로 생성

### C) 생성 완료 후 이동
- 생성/재생성 성공 시:
  - redirect(`/admin/tournaments/[id]`)
- 실패 시:
  - 현재 페이지에 에러 표시(redirect 하지 않음)

---

## 생성 로직 (MVP 수준)
- “조별 리그 전” 전제:
  - 승인 팀을 group_size 기준으로 조에 배정
  - 각 조는 round-robin matches 생성

팀 배정 규칙(간단):
- 승인 팀 리스트를 sort(또는 shuffle 옵션은 제외)
- 순서대로 group_size씩 자르기
- 마지막 조는 남은 팀으로 구성(팀 수 < group_size 가능)

round-robin:
- 조 내 모든 팀 1회씩 매칭

> shuffle/seed/미리보기는 이번 티켓 제외(추후)

---

## DB/관계 전제
- division별로 matches를 식별/필터링할 수 있어야 한다
- 방법은 프로젝트 현재 구조에 맞춘다:
  - match에 division_id가 있으면 직접 사용
  - 없으면 match → group → division join을 통해 “division 소속”이 판정되어야 한다

overwrite 삭제도 동일한 “division 소속 판정” 기준으로 수행.

---

## API / Server Actions

### 1) listDivisionsWithStats(tournamentId)
- divisions 목록 + stats
  - approved_teams_count (applications join)
  - matches_count (division 기준)
- 반환: divisionId, name, group_size, sort_order, approvedCount, matchCount

### 2) updateDivisionGroupSize(divisionId, group_size)
- organizer only
- validation: group_size >= 2

### 3) generateDivisionMatches({ tournamentId, divisionId, overwrite })
- organizer only
- 검증 + (overwrite면 삭제) + 생성
- 성공 시 redirect(`/admin/tournaments/[id]`)
- 실패 시 `{ ok:false, error }`

---

## 에러 처리 규칙(필수)
- 로딩 상태(division 목록 로드, 저장 중, 생성 중)
- 에러 메시지 UI
- 빈 상태:
  - divisions 없음
  - 승인 팀 없음
- 실패 케이스 반환값 표준화

---

## 권한
- organizer 전용 화면

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/bracket/page.tsx`
- `/app/admin/tournaments/[id]/bracket/actions.ts`
- `/app/admin/tournaments/[id]/bracket/Form.tsx` (필요 시)
- `/lib/api/divisions.ts`
- `/lib/api/applications.ts` (approved count)
- `/lib/api/matches.ts` (division 기준 count/삭제/생성 helper)
- (필요 시) `/lib/api/groups.ts` (division 소속 판정/삭제에 필요할 경우)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 생성 미리보기(Preview)
- shuffle/seed 옵션
- 생성 기록/로그
- 스케줄 자동 생성 연동(스케줄 페이지는 별도)
- 완료 경기 존재 시 덮어쓰기 차단/강제 정책(고도화)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] bracket 화면에서 division 카드 목록이 보인다
- [ ] 각 division에서 group_size를 수정/저장할 수 있다
- [ ] 각 division에서 경기 생성이 가능하다
- [ ] 덮어쓰기 재생성 시 confirm 후 기존 경기 삭제 + 재생성 된다
- [ ] 생성/재생성 성공 후 운영 화면(`/admin/tournaments/[id]`)으로 이동한다
- [ ] 로딩/에러/빈 상태 UI가 있다