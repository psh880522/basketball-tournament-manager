# Vertical Slice Ticket

## 목표
- 이메일 로그인 후 `/dashboard`에서 `Hello {user.email}` 표시
- 로그인하지 않은 사용자는 `/login`으로 리다이렉트
- 메일 링크(OTP/Magic Link) 클릭 시 세션이 생성되고 `/dashboard`로 이동
- 새로고침/재접속에도 세션 유지(쿠키 기반)

## DB
- (없음) 이번 슬라이스에서는 테이블/마이그레이션 변경 없음

## API
- `GET /auth/callback` : `code`를 `exchangeCodeForSession`으로 세션 교환 후 redirect
  - 입력: query params `code`, `next`(옵션)
  - 출력: `next` 또는 `/dashboard`로 302 리다이렉트
  - 에러: `/login?error=...`로 302 리다이렉트

## UI
- `/login`
  - 이메일 입력 폼
  - 제출 시 `signInWithOtp` 호출
  - 성공 시 “이메일을 확인하세요” 안내 표시
  - 에러 시 오류 메시지 표시(쿼리 `error` 포함 시 노출)
- `/dashboard`
  - 서버에서 유저 조회 후 `Hello {user.email}` 표시
  - 비로그인 시 `/login` 리다이렉트

## 권한
- `/dashboard` : 로그인 사용자만 접근 가능
- `/login` : 누구나 접근 가능
- `/auth/callback` : 누구나 접근 가능(세션 교환용)

## 수정 허용 범위 (필수)

- `app/login/page.tsx`
- `app/auth/callback/route.ts`
- `app/dashboard/page.tsx`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `.env.example`

그 외 파일 수정은 금지.  
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개를 제시한다.

## 제외 범위 (비어 있으면 skip)

- 소셜 로그인(구글/애플 등)
- 프로필/권한(Role) 테이블 및 RLS
- 팀/대회/관리자 기능
- DB 마이그레이션/시드 데이터
- 홈(`/`) 라우트 및 기타 페이지 변경

범위 밖 작업은 TODO로 남기지 말고 완전히 제외.

## 완료 기준 (Definition of Done)

- [ ] `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 후 `pnpm dev`로 실행된다
- [ ] `/login`에서 이메일 입력 후 OTP/Magic Link 발송이 성공한다
- [ ] 메일 링크 클릭 → `/auth/callback` 처리 성공 → `/dashboard`로 이동한다
- [ ] `/dashboard`에서 `Hello {user.email}`이 표시된다
- [ ] 로그인 없이 `/dashboard` 접근 시 `/login`으로 리다이렉트된다
- [ ] 새로고침 후에도 로그인 세션이 유지된다
