ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS tournament_size int;

ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS include_tournament_slots boolean NOT NULL DEFAULT false;
