# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/bracket` 조/경기 생성 콘솔(T-0105)에
  “미리보기(Preview)” 기능을 추가한다
- 운영자는 생성/덮어쓰기 실행 전에 다음을 확인할 수 있어야 한다:
  - 승인 팀 목록(division 기준)
  - group_size 기준 조 편성 결과(조별 팀 배치)
  - 생성될 경기 수(조별 + 합계)
- 실제 DB에 경기를 생성하거나 삭제하지 않는다(순수 계산/표시)

---

## 전제
- T-0105 구현 완료:
  - division 카드 UI
  - group_size 수정/저장
  - 경기 생성/덮어쓰기 재생성
- division별 승인 팀 조회가 가능해야 함(applications 기반)

---

## DB
- 변경 없음

---

## API

### 1) previewDivisionGeneration({ tournamentId, divisionId, groupSize? })
- organizer only
- 입력:
  - tournamentId
  - divisionId
  - groupSize (옵션)
    - 전달되면 “현재 입력 중인 값”으로 미리보기
    - 없으면 divisions.group_size 사용
- 조회:
  - approved teams for division (applications join teams)
- 계산(서버에서 수행):
  - 팀 리스트 정렬:
    - MVP: teamName asc 또는 created_at asc (셔플/seed는 제외)
  - 조 편성:
    - groupSize씩 순서대로 분할
    - 마지막 조는 남은 팀으로 구성(팀 수 < groupSize 가능)
  - 경기 수 계산:
    - 조 내 팀 수 = n일 때 경기 수 = n*(n-1)/2
- 반환:
  - division: { id, name, groupSize }
  - teams: [{ teamId, teamName }]
  - groupsPreview: [
      { groupIndex: 1, teams: [{teamId, teamName}], matchCount: number }
    ]
  - totals: { teamCount, groupCount, matchCount }

에러/검증:
- 승인 팀 < 2면:
  - `{ ok:false, error:"승인 팀이 2팀 이상 필요합니다" }`
- groupSize < 2면:
  - `{ ok:false, error:"group_size는 2 이상이어야 합니다" }`

---

## UI

### 대상 화면
- `/app/admin/tournaments/[id]/bracket/page.tsx` (T-0105 화면)

### Division 카드에 추가
- `미리보기` 버튼 추가 (생성 버튼 옆 또는 위)
- 클릭 시:
  - 해당 division의 preview 데이터를 로드
  - 카드 내부에 Preview 패널 표시(접기/펼치기 가능)

### Preview 패널 내용(최소)
1) 요약
- 승인 팀 수: X
- group_size: Y
- 조 개수: Z
- 생성될 경기 수(합계): M

2) 조 편성 결과
- Group 1: 팀A, 팀B, 팀C...
- Group 2: ...
- 각 조의 경기 수 함께 표시

3) 경고(있으면)
- 마지막 조 인원이 group_size보다 적음
- group_size가 너무 큼(예: 팀 수 < group_size) → “조 1개로 생성됩니다” 안내

### UX 규칙
- preview는 읽기 전용
- “덮어쓰기 재생성” 실행 전, preview를 보도록 강제하지는 않음(권장 UX: preview 버튼 강조)

---

## 에러 처리 규칙(필수)
- 로딩 상태(Preview 로딩 스피너)
- 에러 메시지 UI(승인 팀 부족 등)
- 빈 상태 UI(팀 0/1)

---

## 권한
- organizer 전용

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client UI(토글/패널): `/app/**/Form.tsx` 또는 카드 내부 client 컴포넌트

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/bracket/page.tsx`
- `/app/admin/tournaments/[id]/bracket/actions.ts`
- `/app/admin/tournaments/[id]/bracket/Form.tsx` (Preview 패널이 client면)
- `/lib/api/applications.ts` (division approved teams 조회 helper 재사용/확장)
- `/lib/api/divisions.ts` (group_size 조회)
- `/lib/api/bracketPreview.ts` (신규: preview 계산 helper)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 셔플/시드 고정(seed) 옵션
- 미리보기 결과를 저장/로그 남기기
- 프리뷰에서 조 편성 드래그 편집
- 다중 division 일괄 프리뷰

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] division 카드에서 “미리보기” 버튼이 보인다
- [ ] 클릭 시 승인팀/조편성/경기 수 프리뷰가 표시된다
- [ ] 프리뷰는 DB를 변경하지 않는다
- [ ] 로딩/에러/빈 상태 UI가 있다