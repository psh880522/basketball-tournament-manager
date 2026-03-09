# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/edit`의 Divisions 섹션에서
  각 division의 `group_size`를 설정/수정할 수 있다
- organizer만 수정 가능하다
- 로딩/에러/성공 상태가 명확하다
- DB 스키마 변경 없이(이미 group_size 존재), minimal diff로 구현한다

---

## 전제
- divisions 테이블에 `group_size` 컬럼이 이미 존재한다
- T-0095 (Divisions 관리 UI)가 존재하거나 유사한 Divisions 섹션이 있음

---

## DB
- 변경 없음 (필드 존재 전제)

---

## API

### 1) listDivisions(tournamentId)
- 기존 구현 확장(또는 확인)
- 반환에 `group_size` 포함:
  - id, name, sort_order, group_size

### 2) updateDivision(divisionId, { name?, sort_order?, group_size? })
- organizer만 가능
- group_size validation(최소):
  - number 타입
  - 2 이상 (상한은 DB/운영 룰 없으면 제한하지 않음)
- 반환:
  - 성공: `{ ok: true }`
  - 실패: `{ ok: false, error: string }`

> 이미 updateDivision이 있다면 payload에 group_size만 추가하는 minimal diff.

---

## UI

### 경로
- `/admin/tournaments/[id]/edit`

### Divisions 섹션 변경
각 division row에 `group_size` 입력 UI 추가:

- Label: "Group Size"
- Input: number
- 기본값: division.group_size
- 수정 방식(둘 중 하나 택; 구현 단순한 쪽 선택)
  - 옵션 A(추천, 단순): 인라인 편집 후 “저장” 버튼으로 row 단위 저장
  - 옵션 B: 입력 변경 시 즉시 저장(디바운스 필요) → 이번 티켓에서는 제외

권장 UI 예:
- [Division Name] [Group Size: (number)] [Save] [Delete]

### UX 규칙
- group_size가 비어있거나 2 미만이면:
  - Save 비활성 또는 에러 표시
- 저장 중 로딩 표시
- 저장 실패 시 에러 메시지 표시
- 저장 성공 시 “저장됨” 피드백(텍스트/배지)

---

## 에러 처리 규칙(필수)
- 로딩 상태: divisions 로딩
- 에러 메시지 UI: 로딩 실패/저장 실패
- 빈 데이터 상태: divisions 없음
- 실패 케이스 반환값 표준화

---

## 권한
- organizer만 접근/수정 가능
- team_manager/player는 접근 불가(기존 정책 유지)

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/*`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위 (필수)
- `/app/admin/tournaments/[id]/edit/page.tsx`
- `/app/admin/tournaments/[id]/edit/actions.ts`
- `/app/admin/tournaments/[id]/edit/Form.tsx` (Divisions 섹션이 여기 있으면)
- `/lib/api/divisions.ts`

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- group_size를 활용한 조 생성 로직 변경(다음 티켓)
- divisions 일괄 저장
- group_size 상한 정책/복잡한 검증

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] Edit 페이지 Divisions 섹션에서 group_size를 확인할 수 있다
- [ ] organizer가 group_size를 수정하고 저장할 수 있다
- [ ] 2 미만 입력은 차단/에러 처리된다
- [ ] 로딩/에러/빈 상태 UI가 있다
- [ ] DB 스키마 변경 없이 동작한다