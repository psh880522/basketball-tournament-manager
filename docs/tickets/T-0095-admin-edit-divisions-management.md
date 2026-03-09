# Vertical Slice Ticket

## 목표
- `/admin/tournaments/[id]/edit` 화면에 Divisions 관리 섹션을 추가한다
- organizer는 해당 대회의 divisions를 추가/수정/삭제할 수 있다
- public/team_manager는 접근 불가
- divisions는 sort_order 기준으로 정렬된다

---

## 전제(DB)
- T-0094 완료:
  - divisions 테이블 존재
  - tournament_team_applications.division_id 존재
  - RLS 설정 완료

---

## DB 변경
- 없음 (이미 생성됨)

---

## API

### 1) listDivisions(tournamentId)
- 반환:
  - id
  - name
  - sort_order
- 정렬:
  - sort_order asc

### 2) createDivision(tournamentId, { name })
- organizer만 가능
- sort_order:
  - 기존 max(sort_order)+1
- 반환:
  - { ok: true }

### 3) updateDivision(divisionId, { name })
- organizer만 가능

### 4) deleteDivision(divisionId)
- organizer만 가능
- 단, 해당 division을 사용하는 application이 존재하면:
  - 삭제 불가
  - 에러 메시지 반환

---

## UI

### 경로
- `/admin/tournaments/[id]/edit`

### 구성
기존 Edit 폼 아래에:

## Divisions 섹션

1) Division 목록
   - 이름
   - 정렬 순서
   - 수정 버튼
   - 삭제 버튼

2) "+ Division 추가" 버튼
   - 인라인 입력 폼:
     - name (필수)
   - 저장 버튼
   - 취소 버튼

3) 삭제 UX
   - confirm 필요
   - 사용 중이면 에러 표시

---

## UX 규칙
- divisions 최소 1개 이상 유지하도록 강제할지 여부:
  - 이번 티켓에서는 강제하지 않음 (간단 구현)
- 빈 상태:
  - "등록된 division이 없습니다"

---

## 에러 처리 규칙
- 로딩 상태 (목록/생성/수정/삭제)
- 에러 메시지 UI
- 삭제 불가 사유 표시

---

## 권한
- organizer만 접근 가능
- team_manager/player 접근 시 redirect 또는 403

---

## 고정 파일 구조 규칙
- DB 접근: `/lib/api/divisions.ts`
- Server Component: `/app/**/page.tsx`
- Server Action: `/app/**/actions.ts`
- Client Form: `/app/**/Form.tsx`

---

## 수정 허용 범위
- `/app/admin/tournaments/[id]/edit/page.tsx`
- `/app/admin/tournaments/[id]/edit/actions.ts`
- `/app/admin/tournaments/[id]/edit/Form.tsx` (필요 시)
- `/lib/api/divisions.ts`

그 외 파일 수정 금지

---

## 제외 범위
- apply 페이지 수정
- 승인 화면 수정
- 경기 생성/운영 로직 수정
- division별 통계

---

## 완료 기준 (Definition of Done)
- [ ] Edit 화면에 Divisions 섹션이 보인다
- [ ] organizer가 division을 추가할 수 있다
- [ ] organizer가 division을 수정할 수 있다
- [ ] organizer가 division을 삭제할 수 있다
- [ ] 사용 중인 division은 삭제되지 않는다
- [ ] 정렬이 sort_order 기준으로 동작한다
- [ ] 로딩/에러/빈 상태 UI가 있다