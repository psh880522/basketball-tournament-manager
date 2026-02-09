# RLS 오류 수정 프롬프트

목표: RLS 오류를 수정하되 보안 약화 없이 최소 변경으로 해결한다.

## 분류
- infinite recursion
- permission denied

## 출력 규칙
- SQL 패치만 출력
- 정책/함수 변경 내용만 포함

## 보안 원칙
- SELECT 범위를 불필요하게 넓히지 않는다.
- WRITE는 항상 엄격히 제한한다.
