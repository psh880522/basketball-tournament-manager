alter table public.schedule_slots
  add column if not exists stage_type text null,
  add column if not exists start_time timestamptz null,
  add column if not exists end_time timestamptz null,
  add column if not exists created_at timestamptz not null default now();

alter table public.matches
  add column if not exists slot_id uuid null;

update public.schedule_slots
  set slot_type = 'break'
  where slot_type not in ('match', 'break');

alter table public.schedule_slots
  drop constraint if exists schedule_slots_slot_type_check;

alter table public.schedule_slots
  add constraint schedule_slots_slot_type_check
  check (slot_type in ('match', 'break'));

alter table public.schedule_slots
  drop constraint if exists schedule_slots_stage_type_check;

alter table public.schedule_slots
  add constraint schedule_slots_stage_type_check
  check (stage_type is null or stage_type in ('group', 'tournament'));

alter table public.schedule_slots
  drop constraint if exists schedule_slots_break_match_check;

alter table public.schedule_slots
  add constraint schedule_slots_break_match_check
  check (slot_type <> 'break' or match_id is null);

alter table public.schedule_slots
  drop constraint if exists schedule_slots_time_check;

alter table public.schedule_slots
  add constraint schedule_slots_time_check
  check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and start_time < end_time)
  );

alter table public.schedule_slots
  drop constraint if exists schedule_slots_tournament_id_fkey;

alter table public.schedule_slots
  add constraint schedule_slots_tournament_id_fkey
  foreign key (tournament_id)
  references public.tournaments(id)
  on delete cascade;

alter table public.schedule_slots
  drop constraint if exists schedule_slots_division_id_fkey;

alter table public.schedule_slots
  add constraint schedule_slots_division_id_fkey
  foreign key (division_id)
  references public.divisions(id)
  on delete set null;

alter table public.schedule_slots
  drop constraint if exists schedule_slots_court_id_fkey;

alter table public.schedule_slots
  add constraint schedule_slots_court_id_fkey
  foreign key (court_id)
  references public.courts(id)
  on delete set null;

alter table public.schedule_slots
  drop constraint if exists schedule_slots_match_id_fkey;

alter table public.schedule_slots
  add constraint schedule_slots_match_id_fkey
  foreign key (match_id)
  references public.matches(id)
  on delete set null;

alter table public.matches
  drop constraint if exists matches_slot_id_fkey;

alter table public.matches
  add constraint matches_slot_id_fkey
  foreign key (slot_id)
  references public.schedule_slots(id)
  on delete set null;

create index if not exists schedule_slots_tournament_id_idx
  on public.schedule_slots (tournament_id);

create index if not exists schedule_slots_division_id_idx
  on public.schedule_slots (division_id);

create index if not exists schedule_slots_court_id_idx
  on public.schedule_slots (court_id);

create index if not exists schedule_slots_stage_type_idx
  on public.schedule_slots (stage_type);

create index if not exists schedule_slots_sort_order_idx
  on public.schedule_slots (sort_order);

create index if not exists schedule_slots_match_id_idx
  on public.schedule_slots (match_id);

create index if not exists matches_slot_id_idx
  on public.matches (slot_id);

alter table public.schedule_slots enable row level security;

drop policy if exists "schedule_slots_select_authenticated" on public.schedule_slots;
create policy "schedule_slots_select_authenticated"
  on public.schedule_slots
  for select
  using (auth.uid() is not null);

drop policy if exists "schedule_slots_insert_organizer" on public.schedule_slots;
create policy "schedule_slots_insert_organizer"
  on public.schedule_slots
  for insert
  with check (public.is_organizer());

drop policy if exists "schedule_slots_update_organizer" on public.schedule_slots;
create policy "schedule_slots_update_organizer"
  on public.schedule_slots
  for update
  using (public.is_organizer())
  with check (public.is_organizer());

drop policy if exists "schedule_slots_delete_organizer" on public.schedule_slots;
create policy "schedule_slots_delete_organizer"
  on public.schedule_slots
  for delete
  using (public.is_organizer());
