# Code Style Rules

## 파일 구조 원칙
- API: /lib/api
- 서버 액션: /app/**/actions.ts
- 클라이언트 폼: /app/**/Form.tsx

## import 규칙
- 가능한 경우 @/ alias 사용
- 상대 경로는 같은 폴더 내에서만 사용

## 에러 처리 규칙
- 사용자 메시지: 화면에 간결하게 표시
- 내부 원인: 서버 로그/에러 메시지로 파악

## 컴포넌트 분리 규칙
- Server page: 데이터 조회/권한 체크
- Client form: 입력/로딩/에러 처리

## 네이밍 규칙
- 함수: 동사+목적어 (예: listTeams, createTeam)
- 타입: 명사+역할 (예: TeamRow, TournamentCard)
