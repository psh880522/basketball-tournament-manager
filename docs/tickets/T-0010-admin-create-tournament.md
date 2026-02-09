# Vertical Slice Ticket

## 목표
- organizer만 대회를 생성할 수 있다
- organizer는 관리자 화면에서 본인이 만든 대회 목록을 볼 수 있다
- public(비로그인 포함)은 open/closed 대회만 목록/상세에서 조회할 수 있다

## DB
- tournaments table 생성 또는 보강
  - id, name, location, start_date, end_date, format, max_teams, status, created_by, created_at, updated_at
- RLS 정책
  - public select: status in ('open','closed')만 허용
  - organizer select: 전체 허용(draft 포함)
  - organizer insert: organizer만 가능(created_by=auth.uid())
  - update/delete: 이번 슬라이스에서 제외(정책 추가하지 않음)

## API
- `POST /api/admin/tournaments`
  - organizer만 호출 가능
  - body: name*, location, start_date*, end_date*, format, max_teams
  - created_by는 서버에서 auth.uid()로 강제
  - response: 201 `{ id }`

## UI
- `/admin/tournaments`
  - organizer 가드
  - 내가 만든 대회 목록 표시(status 포함)
  - "새 대회 만들기" 링크 제공
- `/admin/tournaments/new`
  - organizer 가드
  - 대회 생성 폼
  - submit 시 API 호출 후 목록으로 이동

## 권한
- organizer만:
  - 관리자 화면 접근
  - 대회 생성(insert)
  - draft 포함 조회 가능(관리자 화면)
- 그 외 사용자:
  - 관리자 화면 접근 불가
  - public에서는 open/closed만 조회 가능

## 수정 허용 범위 (필수)

- `supabase/migrations/0010_tournaments.sql`
- `src/lib/supabase/server.ts`
- `src/lib/auth/roles.ts` (필요 시)
- `app/admin/tournaments/new/page.tsx`
- `app/admin/tournaments/page.tsx`
- `app/api/admin/tournaments/route.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

## 제외 범위 (비어 있으면 skip)

- 대회 수정/삭제
- 팀/선수/경기/대진표/순위
- 결제
- realtime
- public 목록/상세 노출 규칙 변경(기존 open/closed만 유지)

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

## 완료 기준 (Definition of Done)

- [ ] organizer만 `/admin/tournaments` 및 `/admin/tournaments/new` 접근 가능
- [ ] organizer가 대회를 생성하면 DB에 insert 된다(status=draft)
- [ ] 생성된 대회가 관리자 목록에 즉시 표시된다
- [ ] public `/` 목록과 `/tournament/[id]`에서는 draft가 노출되지 않는다
- [ ] organizer가 아닌 사용자는 API로 insert 시도 시 실패한다(403 또는 RLS 차단)
- [ ] 모든 write는 서버(Route Handler)에서만 수행된다
- [ ] 기존 T-0001/T-0002/T-0003 동작에 영향이 없다
