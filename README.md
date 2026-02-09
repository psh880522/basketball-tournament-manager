# Basketball Tournament Manager

농구 대회 관리 서비스  
수직 슬라이스(Vertical Slice) 개발 방식 기반 프로젝트

## 핵심 원칙
- 기능은 항상 "사용자 흐름 끝까지" 구현
- 클라이언트 직접 DB write 금지
- Supabase SSR(createSupabaseServerClient) 사용
- 신규 기능은 티켓 → slice-new-feature.md 순서로만 개발

## 기술 스택
- Next.js (App Router, TypeScript)
- Supabase (Auth / DB / RLS)
- Vercel 배포
- Supabase MCP (개발 보조)

## 구조
- `app/` App Router routes
- `src/lib/` shared libraries (Supabase, auth, validation)
- `src/features/` feature slices
- `supabase/` database migrations and seed data
- `docs/tickets/` product tickets
- `docs/` documentation

## 구현된 기능 (요약)
- 인증: 매직링크 로그인, 콜백 처리, 대시보드 접근 제어
- 역할/권한: organizer, team_manager 기반 RLS/가드
- 공개 대회 목록/상세
- 관리자: 대회 생성, 상태 변경
- 팀 신청/승인/팀 보기
- 선수 CRUD
- 조 편성 + 조별 경기 자동 생성
- 코트 관리
- 경기 코트 배정

## 주요 관리자 경로
- /admin
- /admin/tournaments/[id]/bracket
- /admin/tournaments/[id]/courts
- /admin/tournaments/[id]/matches

## 개발 시작
```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## 문서
- docs/00-project-setup.md
- docs/01-vertical-slice-process.md
- docs/02-supabase-rls.md
- docs/03-supabase-mcp.md

