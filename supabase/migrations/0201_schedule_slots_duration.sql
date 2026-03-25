-- 각 슬롯의 소요시간(분) 저장
-- generateScheduleSlots 시 기본값으로 matchDurationMinutes 또는 breakDurationMinutes가 저장됨
-- 이후 사용자가 행 단위로 수정 가능
ALTER TABLE public.schedule_slots
  ADD COLUMN IF NOT EXISTS duration_minutes INT NULL;
