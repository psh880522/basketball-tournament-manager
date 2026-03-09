ALTER TABLE divisions
  ADD COLUMN standings_dirty boolean NOT NULL DEFAULT false;

ALTER TABLE standings
  ALTER COLUMN group_id DROP NOT NULL;
