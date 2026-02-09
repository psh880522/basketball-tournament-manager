# RLS Recursion Fix Command

목적: infinite recursion 에러를 최소 변경으로 해결한다.

입력
- 에러 로그
- 관련 정책 SQL
- 관련 테이블/뷰 목록

출력
1) 재귀 원인 요약(1~2줄)
2) 최소 SQL 패치(정책/함수)
3) 검증 시나리오(역할별 3단계)

보안 규칙
- 권한 범위를 넓히지 않는다.
- security definer 함수가 필요하면 명확히 표기한다.
