# Supabase RLS Rules

## 기본 원칙
- public 테이블 write 금지
- auth.uid() 기준 접근 제어

## 예시
```sql
create policy "user can read own data"
on profiles
for select
using (auth.uid() = user_id);

```

## 체크리스트
- insert/update/delete 정책 존재 여부
- service_role 외 write 경로 없는지