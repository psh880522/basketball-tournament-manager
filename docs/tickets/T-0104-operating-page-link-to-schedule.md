# Vertical Slice Ticket

## 목표
- 운영 페이지(`/admin/tournaments/[id]`)의 진행 단계 UI에서
  “코트 배정” 단계를 “스케줄 생성” 단계로 변경한다
- 해당 단계 카드에서 스케줄 페이지(`/admin/tournaments/[id]/schedule`)로 진입할 수 있게 한다
- 기존 운영 흐름을 깨지 않고 minimal diff로 UI 연결만 한다

---

## 전제
- T-0103 완료:
  - `/admin/tournaments/[id]/schedule` 페이지 존재
- T-0102 완료:
  - Edit 페이지에서 Courts 관리 가능(코트 추가/삭제)
- T-0093 완료:
  - 진행 단계 카드에 액션 버튼을 넣는 구조가 있음

---

## UI 변경 사항

### 대상 화면
- `/admin/tournaments/[id]` (운영 홈)

### 변경 내용
1) 진행 단계 카드 중 “코트 배정” 단계의 표시 텍스트 변경:
- 단계명: `코트 배정` → `스케줄 생성`
- 설명(있다면): “경기 시간/코트를 배정합니다” 등으로 변경

2) 액션 버튼 변경
- Primary 버튼:
  - label: `스케줄 생성`
  - href: `/admin/tournaments/[id]/schedule`

- Secondary 버튼(있는 경우):
  - label: `코트 설정`
  - href: `/admin/tournaments/[id]/edit`
  - (선택) Courts 섹션으로 스크롤/앵커가 있으면 사용, 없으면 edit로만 이동

---

## Guard(필수, Level 1)
스케줄 생성 버튼 활성 조건(간단):
- matches_count > 0 이어야 enabled
  - 아니면 disabled + 이유: “먼저 조/경기 생성을 완료하세요”
- courts_count > 0 이어야 enabled
  - 아니면 disabled + 이유: “코트를 먼저 추가하세요”

> 두 조건이 모두 만족해야 enabled.
> Guard 데이터는 기존 진행상태 계산에서 가져오거나,
> 간단히 API로 counts만 로드해도 됨(최소 변경 우선).

---

## 에러 처리
- 링크 이동 버튼이므로 별도 에러 처리 없음
- disabled 시 이유 텍스트는 반드시 표시

---

## 권한
- organizer 전용 화면(기존 유지)

---

## 고정 파일 구조 규칙
- Server Component: `/app/**/page.tsx`
- (필요 시) 진행/가드 helper: `/lib/api/*`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/page.tsx`
- `/app/admin/tournaments/[id]/ProgressIndicator.tsx` (또는 Step 컴포넌트)
- `/lib/api/tournamentProgress.ts` (또는 counts/guard 헬퍼)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 스케줄 확정(잠금)
- 코트 자동 배정 로직 변경
- 스케줄 페이지 기능 변경(T-0103 범위)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] 운영 페이지 진행단계에 “스케줄 생성” 단계가 표시된다
- [ ] 해당 카드에서 `/admin/tournaments/[id]/schedule`로 진입할 수 있다
- [ ] 경기 없거나 코트 없으면 버튼이 비활성 + 이유 표시된다
- [ ] minimal diff로 다른 기능에 영향이 없다