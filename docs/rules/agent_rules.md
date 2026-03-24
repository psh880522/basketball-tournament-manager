# Agent Rules

## Minimal Diff 원칙
- 기존 구조/스타일/패턴을 유지하고 필요한 부분만 수정한다.
- 불필요한 리네이밍, 파일 이동, 공용화는 금지한다.

## 새 라이브러리 금지
- 패키지 추가 금지
- 새 프레임워크/플러그인 도입 금지

## Server/Client 경계
- DB write(insert/update/delete)는 서버에서만 수행한다.
- Server Component는 조회 전용으로 유지한다.
- Client Component는 입력/상태/폼 처리만 담당한다.

## Supabase 접근 원칙
- 서버에서는 createSupabaseServerClient() 사용
- 클라이언트 직접 DB 접근 금지
- select 컬럼은 명시 (“*” 금지)

## 타입 정책
- any 금지
- 최소 타입을 명시하고, 필요한 필드만 선택한다.

## 출력 형식
- 변경 파일 목록을 먼저 제시한다.
- 이후 코드 또는 변경 내용을 제공한다.

## 금지 사항
- 대규모 리팩터링
- 불필요한 삭제/이동
- 테스트/빌드 설정의 임의 변경
