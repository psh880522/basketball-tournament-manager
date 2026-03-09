# Vertical Slice Ticket

## 목표
운영 페이지(`/admin/tournaments/[id]`) 진행 단계 카드 액션을 개선한다.

1) “승인팀 보기” 버튼을
- 조/경기 생성 카드 → 팀 승인 카드로 이동

2) 조/경기 생성 카드에
- “생성된 경기 목록 보기” 버튼을 추가한다

---

## 전제
- T-0093(진행단계 카드 액션 통합) 구현이 되어 있음

---

## UI 변경 사항

### 팀 승인 카드 (Step 1)
- Primary: 신청 관리 → `/admin/tournaments/[id]/applications`
- Secondary: 승인팀 보기 → `/admin/tournaments/[id]/applications?status=approved`
  - (가능하면 division 필터도 이후 확장 가능)

### 조/경기 생성 카드 (Step 2)
- Primary: 조/경기 생성 → 기존 경로 유지
- Secondary: 생성된 경기 목록 → 신규/기존 경기 목록 페이지로 이동
  - 우선 경로를 `/admin/tournaments/[id]/matches` 로 통일

---

## Guard
- 승인팀 보기: 항상 enabled
- 경기 목록 보기:
  - total_matches_count > 0 이면 enabled
  - 아니면 disabled + 이유: “생성된 경기가 없습니다”

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/page.tsx`
- `/app/admin/tournaments/[id]/ProgressIndicator.tsx` (또는 Step 컴포넌트)
- `/lib/api/tournamentProgress.ts` (enabled/reason 보강 시)

그 외 파일 수정 금지.

---

## 제외 범위
- matches 페이지 구현(별도 티켓 T-0100에서 다룸 가능)
- Guard 정교화

---

## 완료 기준 (Definition of Done)
- [ ] 승인팀 보기 버튼이 팀 승인 카드에 있다
- [ ] 조/경기 생성 카드에 경기 목록 보기 버튼이 있다
- [ ] 경기 없음이면 버튼 비활성 + 이유 표시