alter table schedule_slots
  drop constraint if exists schedule_slots_slot_type_check;

alter table schedule_slots
  add constraint schedule_slots_slot_type_check
  check (slot_type in ('break','maintenance','buffer','match','tournament_placeholder'));
