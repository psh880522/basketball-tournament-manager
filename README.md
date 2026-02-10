# 🏀 농구대회 관리 서비스

## ✅ MVP 1차 완료 (Phase 1–7)

본 프로젝트는 **농구대회 운영의 핵심 플로우를 처음부터 끝까지 디지털로 처리할 수 있는 MVP 1차 버전**을 완료했다.

### MVP 1차에서 가능한 것

* 대회 생성 및 상태 관리 (draft / open / closed)
* 팀 등록 및 관리자 승인
* 선수 등록 및 관리
* 부문(Division)별 조 편성 (조당 팀 수 유동)
* 조별 리그 경기 자동 생성
* 코트(A/B 등) 관리 및 경기별 코트 배정
* 경기 결과 입력
* 조별 리그 순위 자동 계산
  (승수 → 승자승 → 다득점 → 저실점)
* 조별 리그 결과 기반 토너먼트 진입
* 시드 기반 토너먼트 생성 (예: 1–8, 2–7, 3–6, 4–5)
* 토너먼트 라운드 진행 및 우승 결정

즉, **팀 모집 → 조별 리그 → 순위 산정 → 토너먼트 → 우승 결정**까지
실제 대회를 운영하는 데 필요한 전 과정을 하나의 시스템에서 처리할 수 있다.

### MVP 1차 범위에서 제외한 것

* 실시간 점수/대시보드
* 경기 시간 스케줄링 자동화
* 결제 및 알림
* 브라켓 시각화(UI 트리)
* 고급 통계

위 항목들은 MVP 이후 확장 단계로 계획되어 있다.

---

## 📄 README 구조

### 1. 프로젝트 개요

조별 리그 기반 농구대회를 엑셀·구글폼·카카오톡 없이 **하나의 웹 서비스로 운영**하기 위한 프로젝트.

### 2. 문제 정의

현재 농구대회 운영은 여러 도구에 분산되어 있으며, 이로 인해 관리 비용 증가, 오류, 실시간 공유 불가 문제가 발생한다.

### 3. MVP 범위

**Included**

* Tournament / Team / Player 관리
* Group Stage 자동 생성
* Match / Court 관리
* Result 입력
* Standings 계산
* Tournament 진입 및 진행

**Excluded (Post-MVP)**

* Realtime dashboard
* Payment
* Notification
* Advanced statistics

### 4. 시스템 구조

* Frontend: Next.js (App Router, TypeScript)
* Backend: Supabase
* Auth: Supabase Auth
* DB: Supabase Postgres
* Hosting: Vercel

### 5. 핵심 도메인 모델

* Tournament
* Division
* Team
* Player
* Group / GroupTeam
* Match
* Court
* Standing

### 6. 개발 방식

본 프로젝트는 **Vertical Slice 방식**으로 개발되었다.

* 기능 단위 = 사용자 플로우 단위
* UI → API → DB → RLS → 검증까지 한 번에 구현
* 모든 기능은 티켓(T-xxxx) 단위로 관리

### 7. 로드맵

**Phase 1–7 (MVP 1차 완료)**

* Auth / Roles
* Tournament / Team / Player
* Group Stage
* Match / Court
* Result / Standings
* Tournament Bracket & Progression

**Next Phase**

* Realtime Dashboard
* Scheduling
* Public View 확장

### 8. 실행 방법

1. Repository clone
2. Supabase 프로젝트 생성
3. 환경변수 설정 (.env)
4. DB 마이그레이션 실행
5. `npm run dev`

### 9. 프로젝트 의의

* 실제 스포츠 대회 운영 문제 해결
* 게임 로직과 유사한 대진/순위 알고리즘 구현
* RLS 기반 권한 설계
* MVP → 확장 구조가 명확한 설계

---

> 이 프로젝트는 **조별 리그 기반 농구대회를 실제로 운영할 수 있는 MVP를 끝까지 완성한 사례**다.
