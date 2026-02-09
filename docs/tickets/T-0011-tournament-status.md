# Vertical Slice Ticket

## 목표
- organizer가 관리자 화면에서 대회 상태(status)를 변경할 수 있다
- status는 `draft / open / closed`만 허용된다
- public 목록/상세는 기존 규칙대로 `open / closed`만 노출된다(draft 비노출 유지)

---

## DB (MCP 필수)
- 대상: `tournaments` 테이블
- 변경 내용:
  - `status` 컬럼 존재 여부 확인
  - 허용 값 체크 제약(`draft | open | closed`) 존재 여부 확인
  - organizer만 UPDATE 가능하도록 RLS 정책 존재 여부 확인

### MCP 절차(반드시 수행)
1) Supabase MCP로 현재 스키마/제약/RLS 상태 조회
2) 필요한 변경사항이 있으면 SQL 생성
   - 컬럼 추가/보강
   - CHECK 제약 추가/보강
   - UPDATE RLS 정책 추가/보강
3) 변경 SQL을 `supabase/migrations/0011_tournament_status.sql`에 저장
4) 마이그레이션 적용 후 MCP로 변경 결과 재확인

### 주의
- 개발용 프로젝트에만 MCP 연결
- 기본은 read_only=true
- write가 필요한 경우에만 최소 범위로 해제
- MCP 확인 없이 스키마를 가정해서 작성하지 말 것

---

## API
- Server Action: `updateTournamentStatus`
  - 입력: `tournamentId`, `status`
  - 출력: `{ ok: boolean, error?: string }`
  - organizer만 호출 가능
  - status 값 검증(`draft | open | closed`) 필수

---

## UI
- `/admin/tournaments`
  - 대회 row마다 status select(draft/open/closed)
  - 저장 버튼
  - 상태 변경 중 로딩 표시
  - 실패 시 에러 메시지 표시
  - 성공 시 갱신 반영

---

## 권한
- organizer만:
  - 대회 status 변경 가능
- 비로그인/일반 유저:
  - 변경 불가
- public:
  - `open / closed` 대회만 조회 가능(기존 규칙 유지)

---

## 수정 허용 범위 (필수)

- `/lib/api/tournaments.ts`
- `/app/admin/tournaments/actions.ts`
- `/app/admin/tournaments/Form.tsx`
- `/app/admin/tournaments/page.tsx`
- `supabase/migrations/0011_tournament_status.sql`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

---

## 제외 범위 (비어 있으면 skip)

- 대회 생성
- 대회 삭제
- 팀/선수/경기/대진표/순위
- realtime
- 결제
- public 페이지 노출 규칙 변경

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

---

## 완료 기준 (Definition of Done)

- [ ] MCP로 `tournaments.status` 컬럼/제약/RLS 상태를 확인했다
- [ ] 필요한 경우 마이그레이션 파일이 생성되고 적용되었다
- [ ] organizer만 `/admin/tournaments`에서 status 변경이 가능하다
- [ ] status는 `draft/open/closed`만 저장된다
- [ ] 변경 중 로딩 상태가 UI에 표시된다
- [ ] 실패 시 에러 메시지가 UI에 표시된다
- [ ] public `/` 및 `/tournament/[id]`에서 draft는 노출되지 않는다
