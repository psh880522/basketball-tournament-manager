# Vertical Slice Ticket

## 목표
- `/admin`에서 **대회 목록**이 표시된다
- 목록은 **실사용 우선 정렬**로 노출된다
  - open → closed → draft → finished (있으면)
  - 각 그룹 내 start_date 오름차순
- “삭제된 대회 보기” 토글이 있고,
  - OFF: deleted_at is null만
  - ON : deleted 포함 목록 표시 (복구 버튼은 T-0084에서)

---

## DB
- DB 변경 없음 (이 티켓에서는 조회/표시만)
- deleted_at 컬럼은 T-0084에서 추가

---

## API
- `listAdminTournaments({ includeDeleted: boolean })`
  - organizer 권한 전제
  - includeDeleted=false면 삭제 제외
  - includeDeleted=true면 삭제 포함
- 정렬은 가능한 DB에서 처리, 어려우면 서버에서 정렬(최소 구현)

---

## UI
- `/admin` : Admin Console 대회 목록 화면
- 구성:
  - 상단 헤더: “Admin Console”
  - 버튼: “+ 새 대회 생성” → `/admin/tournaments/new`
  - 토글: “삭제된 대회 보기”
  - 대회 리스트(테이블/카드)
    - 대회명 / 기간 / 장소 / 상태 배지
    - 액션 버튼:
      - 운영 → `/admin/tournaments/[id]`
      - 수정 → `/admin/tournaments/[id]/edit`
      - 삭제 → (T-0084에서 동작 연결, 이 티켓에서는 버튼만 노출 가능)

---

## 권한
- organizer만 접근 가능 (서버에서 강제)

---

## 수정 허용 범위 (필수)
- `/app/admin/page.tsx`
- `/app/admin/TournamentList.tsx` (필요 시 신규)
- `/lib/api/tournaments.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 생성 폼 구현(링크만)
- 수정 폼 구현(링크만)
- 삭제/복구 실제 동작 (T-0084에서)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] `/admin`에서 대회 목록이 보인다
- [ ] 정렬이 open→closed→draft→finished + start_date 오름차순으로 적용된다
- [ ] “삭제된 대회 보기” 토글이 동작하며 리스트가 바뀐다(데이터가 있을 때)
- [ ] 운영/수정 링크가 올바른 경로로 이동한다
- [ ] organizer만 접근 가능하다