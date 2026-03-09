# Vertical Slice Ticket

## 목표
- 서비스 전역(Global)에 상단 네비게이션을 추가한다
- 로그인 상태 및 역할(role)에 따라 메뉴가 다르게 보이도록 한다
- 로그아웃 기능을 Server Action으로 구현한다
- UI는 간결하고 모바일에서도 깨지지 않도록 한다
- 기존 기능 로직에는 영향을 주지 않는다 (minimal diff)

---

## 설계 개요

### 전역 Header 구성

위치:
- `/app/layout.tsx`에서 GlobalHeader를 렌더링

구성:
- 좌측: 로고/서비스명 → `/`
- 중앙:
  - Guest: 대회
  - User: 대회 / 대시보드
  - Organizer: 대회 / 대시보드 / Admin
- 우측:
  - Guest: 로그인 / 가입
  - User: 프로필 드롭다운(로그아웃 포함)

---

## 역할별 메뉴 규칙

### Guest (비로그인)
- 대회 → `/`
- 로그인 → `/login`
- 가입 → `/signup` (존재할 경우)

### 로그인 사용자
- 대회 → `/`
- 대시보드 → `/dashboard`

### Organizer
- 대회 → `/`
- 대시보드 → `/dashboard`
- Admin → `/admin`

---

## 로그아웃 설계

### 방식
- Server Action 기반 로그아웃
- Supabase SSR(createSupabaseServerClient) 사용
- signOut() 실행 후 `/`로 redirect

### UX
- 우측 프로필 버튼 클릭 → 드롭다운
  - 로그아웃

- 로그아웃 시:
  - 세션 제거
  - 홈으로 이동
  - 보호 페이지 접근 시 로그인 페이지로 리다이렉트

---

## 구현 구조

### 1) 전역 레이아웃 수정
- `/app/layout.tsx`
  - `<GlobalHeader />` 추가

### 2) GlobalHeader (Server Component)
- `/components/nav/GlobalHeader.tsx`
  - 세션/role 조회
  - 메뉴 분기 렌더

### 3) 모바일 메뉴용 Client 컴포넌트
- `/components/nav/NavMenu.tsx`
  - 햄버거 버튼
  - 토글 상태 관리

### 4) 로그아웃 Server Action
- `/app/actions/auth.ts`
  - logoutAction()

---

## Tailwind UI 가이드

Header:
- `sticky top-0 z-50 border-b bg-white/80 backdrop-blur`

컨테이너:
- `max-w-6xl mx-auto px-4 h-14 flex items-center justify-between`

메뉴:
- 데스크탑: `hidden md:flex gap-6`
- 모바일: `md:hidden` 햄버거

Active 링크:
- `font-semibold underline`

---

## 에러 처리

- 로그아웃 실패 시:
  - 기본 홈으로 이동 시도
  - 에러 메시지 표시(optional)

---

## 권한

- 메뉴 노출은 세션 기반
- Organizer 메뉴는 role 체크 필수
- 보호 페이지 접근은 기존 가드 로직 유지

---

## 수정 허용 범위 (필수)

- `/app/layout.tsx`
- `/components/nav/GlobalHeader.tsx`
- `/components/nav/NavMenu.tsx`
- `/app/actions/auth.ts`
- `/lib/auth/*` (필요 시 helper 추가)

그 외 파일 수정 금지.
필요하면 먼저 변경 필요 이유 + 대안 2개 + 추천 1개 제시.

---

## 제외 범위

- 프로필 상세 페이지
- 권한/역할 변경 UI
- 다국어 지원
- 네비게이션 고도화(사이드바, 브레드크럼)

---

## 완료 기준 (Definition of Done)

- [ ] 모든 페이지 상단에 Global Header가 보인다
- [ ] Guest / User / Organizer에 따라 메뉴가 다르게 보인다
- [ ] Organizer만 Admin 메뉴가 보인다
- [ ] 로그아웃이 정상 동작하고 홈으로 이동한다
- [ ] 모바일 화면에서 메뉴가 깨지지 않는다
- [ ] 기존 기능 동작에 영향이 없다