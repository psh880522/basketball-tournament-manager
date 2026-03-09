# Vertical Slice Ticket

## 목표
- Admin Console에서 대회를 **Soft delete(숨김)** 할 수 있다
- “삭제된 대회 보기” 토글 ON 상태에서 **복구(restore)** 할 수 있다
- 삭제/복구는 organizer만 가능하다
- public/team_manager에게는 deleted_at이 있는 대회가 노출되지 않는다

---

## DB (필수: Supabase MCP 사용)
- `tournaments` 테이블에 컬럼 추가:
  - `deleted_at timestamptz null`

### 작업 지침
- Supabase MCP로:
  1) 스키마 변경(컬럼 추가)
  2) 마이그레이션 파일 생성
  3) 필요한 RLS/정책까지 함께 정리

---

## RLS/정책 (필요 시)
- organizer:
  - tournaments update 허용 (deleted_at set/unset)
  - tournaments select 시 deleted 포함 가능(관리자 화면에서)
- public/team_manager:
  - tournaments select 시 `deleted_at is null`만

> 이미 정책이 존재한다면 minimal diff로 보강한다.

---

## API
- `softDeleteTournament(tournamentId)`
  - organizer 체크
  - `deleted_at = now()`
- `restoreTournament(tournamentId)`
  - organizer 체크
  - `deleted_at = null`
- `listAdminTournaments({ includeDeleted })`는 T-0083 구현을 재사용/확장

반환값 규칙:
- 성공: `{ ok: true }`
- 실패: `{ ok: false, error: string }`

---

## UI
- `/admin` 목록에서:
  - 삭제 버튼 클릭 → confirm UI 표시
  - 확인 시 soft delete 실행
  - 성공 시 목록에서 즉시 제거(토글 OFF 상태)
- 토글 “삭제된 대회 보기” ON 상태에서:
  - deleted_at not null 항목은 “삭제됨” 배지 표시
  - “복구” 버튼 노출
  - 복구 클릭 시 restore 실행, 성공 시 정상 항목으로 전환

에러/로딩:
- 삭제/복구 버튼에 로딩 상태
- 실패 시 에러 메시지 표시

---

## 권한
- organizer만 삭제/복구 가능
- organizer 외에는 `/admin` 접근 불가(기존 정책 유지)

---

## 수정 허용 범위 (필수)
- `/app/admin/page.tsx`
- `/app/admin/actions.ts` (삭제/복구 server action)
- `/lib/api/tournaments.ts`
- `supabase/migrations/0084_soft_delete_tournaments.sql` (또는 프로젝트 규칙에 맞는 파일명)

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위
- 완전 삭제(hard delete)
- 삭제 사유 기록
- 삭제/복구 히스토리 로그
- 복구 가능 기간 제한

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)
- [ ] MCP로 tournaments.deleted_at 컬럼이 추가되고 마이그레이션이 존재한다
- [ ] organizer가 `/admin`에서 삭제(confirm 포함)할 수 있다
- [ ] 토글 ON 시 삭제된 대회를 볼 수 있고 복구할 수 있다
- [ ] public/team_manager에게 삭제된 대회가 노출되지 않는다(RLS/조회 필터로 보장)
- [ ] 로딩/에러 UI가 존재한다