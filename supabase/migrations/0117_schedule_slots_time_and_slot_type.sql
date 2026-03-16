alter table public.schedule_slots
  drop constraint if exists schedule_slots_time_check;

alter table public.schedule_slots
  add constraint schedule_slots_time_check
  check (
    (start_at is null and end_at is null)
    or (start_at is not null and end_at is not null and start_at < end_at)
  );

alter table public.schedule_slots
  drop constraint if exists schedule_slots_slot_type_check;

alter table public.schedule_slots
  add constraint schedule_slots_slot_type_check
  check (
    slot_type in (
      'match',
      'break',
      'buffer',
      'maintenance',
      'tournament',
      'tournament_placeholder'
    )
  );

alter table public.schedule_slots
  drop column if exists start_time,
  drop column if exists end_time;
