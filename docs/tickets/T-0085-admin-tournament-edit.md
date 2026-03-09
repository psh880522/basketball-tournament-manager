# Vertical Slice Ticket

## 목표
- 운영자가 대회를 수정할 수 있다
- `/admin/tournaments/[id]/edit`에서 대회 정보를 편집하고 저장할 수 있다
- status 변경도 가능하되, **finished 상태에서는 status 변경 불가**(잠금)
- 저장 성공/실패/로딩 UI가 명확하다

---

## 정책 (중요)
- status 전이는 기본적으로 자유(draft/open/closed 상호 이동 가능)
- 단, `finished` → (any) 는 금지
- `any` → `finished` 는 허용(단, confirm은 T-0086의 Quick Status에서 강제, 이 티켓에서는 최소 경고 문구만)

---

## DB
- 변경 없음
- (전제) tournaments에 status 컬럼이 존재하고, finished를 쓰고 있다면 그대로 사용

---

## API
- `getTournamentForEdit(tournamentId)` : 편집용 데이터 조회
- `updateTournament(tournamentId, payload)`
  - organizer 권한 체크
  - finished 상태일 때:
    - status 변경 요청이 들어오면 실패
  - 반환:
    - 성공: `{ ok: true }`
    - 실패: `{ ok: false, error: string }`

payload(최소):
- name
- location
- start_date
- end_date
- status (draft/open/closed/finished)

---

## UI

### 경로
- `/admin/tournaments/[id]/edit`

### 구성
- 상단: “대회 수정” + 뒤로가기(`/admin`)
- 폼 필드:
  - 대회명
  - 장소
  - 시작일/종료일
  - 상태(status) select
- 버튼:
  - 저장
  - 취소(또는 뒤로가기)

### status UI 규칙
- tournament가 finished면:
  - status select disabled
  - 안내 문구: “종료된 대회는 상태를 변경할 수 없습니다”
- tournament가 not finished면:
  - status select enabled

### 공통 UI 상태 처리
- 로딩 상태
- 에러 메시지 UI
- 저장 성공 시 redirect(`/admin`) 또는 toast 후 이동

> 스타일은 Tailwind(components/ui Button/Card 등) 사용

---

## 권한
- organizer만 접근/저장 가능

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/edit/page.tsx`
- `/app/admin/tournaments/[id]/edit/Form.tsx`
- `/app/admin/tournaments/[id]/edit/actions.ts`
- `/lib/api/tournaments.ts`

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 대회 삭제(soft delete/restore는 T-0084)
- divisions/groups/matches 설정 편집
- 고급 validation(겹치는 일정 등)
- 감사 로그

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin/tournaments/[id]/edit`에서 기존 값이 로드된다
- [ ] name/location/dates/status를 수정하고 저장할 수 있다
- [ ] finished 대회에서 status 변경이 UI/서버에서 차단된다
- [ ] 로딩/에러/성공 상태가 명확히 표시된다
- [ ] organizer만 접근 가능하다