# 대시보드 권한별 플로우 프롬프트

목표: 대시보드에 organizer/team_manager/onboarding 섹션을 구성한다.

## 섹션 정의
- Organizer: 주최 대회 카드 + 관리 링크
- Team Manager: 관리 팀 카드 + 결제/대회 링크
- Onboarding: 팀 만들기/대회 만들기/대회 둘러보기

## 링크/CTA 스펙
- /tournaments
- /tournaments/new
- /teams
- /teams/payments
- /admin/tournaments/{id}/applications
- /admin/tournaments/{id}/payments
- /admin/tournaments/{id}/matches

## 변경 범위 제한
- 지정된 파일만 수정
- 새 파일 생성은 사전 합의
