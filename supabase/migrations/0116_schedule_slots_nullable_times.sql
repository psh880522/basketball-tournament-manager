alter table public.schedule_slots
  alter column start_at drop not null,
  alter column end_at drop not null;
