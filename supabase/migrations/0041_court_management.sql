do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courts'
      and column_name = 'display_order'
  ) then
    alter table public.courts add column display_order integer;
  end if;
end $$;

alter table public.courts
  drop constraint if exists courts_unique_tournament_name;
alter table public.courts
  add constraint courts_unique_tournament_name
  unique (tournament_id, name);

drop policy if exists "courts_delete_organizer" on public.courts;
create policy "courts_delete_organizer"
  on public.courts
  for delete
  using (public.is_organizer());
