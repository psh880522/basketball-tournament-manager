create table if not exists schedule_slots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  division_id uuid null references divisions(id) on delete set null,
  court_id uuid null references courts(id) on delete set null,
  slot_type text not null check (slot_type in ('break','maintenance','buffer','tournament')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  label text null,
  match_id uuid null references matches(id) on delete set null,
  sort_order int not null default 0
);

create index if not exists schedule_slots_tournament_id_idx
  on schedule_slots (tournament_id);
