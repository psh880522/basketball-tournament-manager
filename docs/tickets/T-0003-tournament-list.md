# Vertical Slice Ticket

## 목표
- 누구나 대회 목록을 조회할 수 있다
- 대회 상세 페이지에서 단일 대회 정보를 확인할 수 있다
- 대회 데이터는 읽기 전용으로 제공된다

## DB
- tournaments table (read only)
  - id
  - name
  - location
  - start_date
  - end_date
  - status
- status가 `draft`인 대회는 조회 대상에서 제외

## API
- (외부 API 없음)
- 서버 컴포넌트에서 Supabase SSR을 통한 직접 조회
  - getPublicTournaments
  - getPublicTournamentById

## UI
- `/`
  - 대회 목록 리스트
  - 대회명 / 기간 / 장소 표시
  - 대회 클릭 시 `/tournament/[id]` 이동
- `/tournament/[id]`
  - 대회 상세 정보 표시
  - 존재하지 않는 대회는 404 처리

## 권한
- 비로그인 사용자 포함 누구나 접근 가능
- write 권한 없음 (read-only)

## 수정 허용 범위 (필수)

- `app/page.tsx`
- `app/tournament/[id]/page.tsx`
- `src/lib/supabase/server.ts`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

## 제외 범위 (비어 있으면 skip)

- 대회 생성/수정/삭제
- 관리자 기능
- 팀/선수/경기 정보
- realtime
- 대시보드

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

## 완료 기준 (Definition of Done)

- [ ] 비로그인 상태에서 `/` 접근 가능
- [ ] 공개 상태(open/closed) 대회만 목록에 노출
- [ ] 대회 클릭 시 상세 페이지로 이동
- [ ] 잘못된 id 접근 시 404 처리
- [ ] DB write가 발생하지 않음
- [ ] 기존 Auth / Profiles 슬라이스와 충돌 없음
