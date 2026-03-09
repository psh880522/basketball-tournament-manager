# Vertical Slice Ticket

## 목표
- `/admin` 대회 목록에서 status를 빠르게 변경할 수 있다
- 위험한 전이는 confirm을 요구한다
- **finished로 변경하면 되돌릴 수 없고**, finished에서 다른 상태로 변경은 금지된다
- 서버 액션에서 최종적으로 전이를 강제한다(가드)

---

## 정책 (고정)
- allowed (기본): draft/open/closed 간 전이는 모두 허용
- allowed with confirm:
  - closed → open (모집 재오픈)
  - open → draft (모집 취소/준비중)
  - closed → draft (롤백)
  - any(not finished) → finished (대회 종료)
- forbidden:
  - finished → any (항상 금지)

> confirm은 UI에서, 최종 차단은 서버에서 수행한다.

---

## DB
- 변경 없음

---

## API / Server Action

### `changeTournamentStatus(tournamentId, nextStatus)`
- organizer 권한 체크
- 현재 status 조회
- 규칙 적용:
  - current=finished면 항상 실패
  - nextStatus가 finished면 허용(단, UI confirm은 필수)
  - draft/open/closed 간 전이는 허용
- 반환:
  - 성공: `{ ok: true }`
  - 실패: `{ ok: false, error: string }`

---

## UI

### 경로
- `/admin` (T-0083의 목록 UI에 추가)

### 각 대회 row에 추가
- 상태 배지 옆에 “상태 변경” UI 제공 (둘 중 하나 택)
  - 옵션 A(추천): 작은 select + “적용” 버튼
  - 옵션 B: “변경” 버튼 클릭 → 팝오버에서 상태 선택

### confirm 규칙
다음 케이스는 confirm 모달 표시:
- nextStatus = finished
  - 문구: “대회를 종료하면 운영 기능이 잠기며 되돌릴 수 없습니다. 계속할까요?”
- current=closed && next=open
  - 문구: “모집을 다시 오픈합니다. 계속할까요?”
- current=open && next=draft
  - 문구: “모집을 취소하고 준비중으로 돌립니다. 계속할까요?”
- current=closed && next=draft
  - 문구: “상태를 준비중으로 롤백합니다. 계속할까요?”

### finished 상태 UI
- finished인 row는:
  - 상태 변경 UI 비활성화(또는 숨김)
  - 안내 툴팁/텍스트: “종료된 대회는 변경할 수 없습니다”

### 공통 UI 상태
- 변경 중 로딩 표시
- 실패 시 에러 메시지 표시
- 성공 시 리스트 상태 즉시 갱신(optimistic 또는 revalidate)

> 스타일은 Tailwind(components/ui Button/Badge 등) 사용

---

## 권한
- organizer만 status 변경 가능
- organizer만 `/admin` 접근 가능(기존 정책 유지)

---

## 수정 허용 범위 (필수)
- `/app/admin/page.tsx` (또는 목록 컴포넌트)
- `/app/admin/actions.ts` (changeTournamentStatus server action)
- `/lib/api/tournaments.ts`
- `/components/ui/Button.tsx` (필요 시)
- `/components/ui/Badge.tsx` (필요 시)

그 외 파일 수정은 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 상태 변경 이력/로그
- 자동 진행/워크플로 엔진
- 종료 해제(undo finish)
- 알림 발송

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin`에서 status를 변경할 수 있다
- [ ] 위험 전이 및 finished 전이에 confirm이 동작한다
- [ ] finished에서 다른 상태로 전환은 UI/서버에서 차단된다
- [ ] 성공/실패/로딩 상태가 사용자에게 보인다
- [ ] organizer만 변경 가능하다