# Project Setup

## 목적
- 최소 비용
- 유지보수 쉬운 구조
- AI 에이전트가 이해하기 쉬운 레포

## 디렉토리 규칙
- app/: 라우팅 및 UI
- src/lib/: 인프라 코드 (supabase, auth, validation)
- src/features/: 기능 단위 도메인
- tickets/: 수직 슬라이스 단위 요구사항
- docs/: 프로젝트 운영 문서

## Supabase 원칙
- 모든 write는 서버(Route Handler / Server Action)에서만
- RLS 필수
- anon key는 SSR에서만 사용
