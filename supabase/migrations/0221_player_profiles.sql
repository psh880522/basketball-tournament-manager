-- 0221_player_profiles.sql
-- 선수 전용 프로필 정보 테이블 생성
-- 역할: profiles 테이블에서 player role 전용 데이터를 분리하여 저장
-- 생성 시점: promote_to_player() RPC 호출 시 행 자동 생성 (ON CONFLICT DO NOTHING)

CREATE TABLE public.player_profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender        text           DEFAULT NULL,  -- '남성' | '여성'
  position      text           DEFAULT NULL,  -- '포인트가드' | '슈팅가드' | '스몰포워드' | '파워포워드' | '센터'
  sub_position  text           DEFAULT NULL,  -- 서브 포지션 (선택)
  height_cm     smallint       DEFAULT NULL,  -- 신장 (cm, 선택)
  weight_kg     smallint       DEFAULT NULL,  -- 체중 (kg, 선택)
  career_level  text           DEFAULT NULL,  -- '입문' | '아마추어' | '세미프로' | '기타'
  region        text           DEFAULT NULL,  -- 활동 지역 (선택)
  jersey_number smallint       DEFAULT NULL,  -- 등번호 (선택)
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.player_profiles IS '선수(player role) 전용 프로필 정보. promote_to_player() 호출 시 행이 생성됨.';
COMMENT ON COLUMN public.player_profiles.gender IS '성별: 남성 | 여성';
COMMENT ON COLUMN public.player_profiles.position IS '주 포지션: 포인트가드 | 슈팅가드 | 스몰포워드 | 파워포워드 | 센터';
COMMENT ON COLUMN public.player_profiles.sub_position IS '서브 포지션 (선택)';
COMMENT ON COLUMN public.player_profiles.career_level IS '경력 수준: 입문 | 아마추어 | 세미프로 | 기타';

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
