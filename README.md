# 🏀 농구대회 관리 서비스

## 프로젝트 요약
조별 리그 기반 농구대회를 엑셀/구글폼/메신저 없이 **하나의 웹 서비스**로 운영할 수 있게 만드는 관리 플랫폼입니다. 팀 모집부터 경기 생성, 결과 입력, 순위 산정, 토너먼트 진행까지 실제 운영 흐름을 end-to-end로 구현했습니다.

## 핵심 기능
- 대회 생성 및 상태 관리 (draft / open / closed / finished)
- 팀 등록 및 운영자 승인, 선수 관리
- Division별 조 편성 및 리그 경기 자동 생성
- 코트 관리 및 경기별 코트 배정
- 결과 입력 및 완료 처리(승자 계산 포함)
- Division 단위 순위 산정 + dirty 플래그 기반 재계산
- 토너먼트 시드 생성 및 라운드 진행

## 기술 스택
- Frontend: Next.js (App Router), TypeScript, Tailwind CSS
- Backend: Supabase (Postgres, Auth, RLS)
- Hosting: Vercel

## 시스템 구성
- UI: App Router 기반 페이지/폼 분리 (Server Component + Client Form)
- API: `lib/api/*`에서 DB 접근 및 도메인 로직 집약
- Auth/Roles: Supabase Auth + RLS 정책
- 데이터: tournament/division/team/player/match/court/standings

## AI 활용 개발 프로세스
이 프로젝트는 **AI 코딩 에이전트 기반의 개발 루프**를 핵심으로 설계했습니다.

1) 티켓 작성
- 요구사항/범위/권한/완료 기준을 명시한 티켓 작성
- 변경 허용 범위와 제외 범위를 명확히 지정

2) Coding Agent 실행
- 티켓을 기준으로 vertical slice 단위로 구현
- UI → API → DB → RLS까지 일괄 처리
- 최소 변경(minimal diff) 원칙 준수

3) 개발/검증
- 테스트/타입체크를 통해 기능 정상 동작 확인
- 문제 발생 시 티켓 갱신 → 에이전트 재실행

### 에이전트 규칙/프롬프트 구조
- 규칙: 변경 범위 제한, 최소 변경 원칙, 보안/권한(RLS) 준수
- 프롬프트 구성: 목표 → 범위 → 고정 규칙 → 출력 형식 순으로 명시
- 결과는 항상 “변경 목록 → 코드 → 실행 방법 → 검증 체크리스트”로 정리

#### 간단 예시 (티켓/프롬프트)
```
[티켓]
- 목표: 결과 입력 → standings dirty 처리
- 범위: results/actions.ts, lib/api/matches.ts, lib/api/divisions.ts
- 제외: UI 변경 금지

[프롬프트]
목표/범위/규칙/출력 형식을 명시하고, 최소 diff로 구현할 것
```

## 티켓/작업 로그
- docs/tickets 디렉터리에 기능별 티켓(T-xxxx) 관리
- 각 티켓에는 목표/범위/완료 기준/제외 범위가 포함됨

## 실행 방법
1. Repository clone
2. Supabase 프로젝트 생성 및 환경 변수 설정
3. DB 마이그레이션 실행
4. `npm run dev`

---

> 이 프로젝트는 **AI를 활용한 개발 프로세스를 실험**하는 것을 목표로 한 포트폴리오용 서비스입니다.
