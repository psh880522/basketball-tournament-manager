alter table public.divisions
  drop column if exists application_open_at,
  drop column if exists application_close_at;
