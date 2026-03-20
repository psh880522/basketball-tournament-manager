alter table public.matches
  alter column team_a_id drop not null;

alter table public.matches
  alter column team_b_id drop not null;
