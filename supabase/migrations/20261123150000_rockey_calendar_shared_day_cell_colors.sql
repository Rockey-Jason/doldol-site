create table if not exists public.rockey_calendar_day_colors (
  room_id uuid not null references public.rockey_calendar_rooms(id) on delete cascade,
  calendar_date date not null,
  color text not null check (color in (
    '#5B8DEF', '#62B98A', '#E5BE62', '#DD8295',
    '#A18AE0', '#52B8C8', '#E49A60', '#8296AA'
  )),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (room_id, calendar_date)
);

create index if not exists rockey_calendar_day_colors_date_idx
  on public.rockey_calendar_day_colors(calendar_date);

alter table public.rockey_calendar_day_colors enable row level security;

grant select, insert, update, delete
  on public.rockey_calendar_day_colors to authenticated;

drop policy if exists rockey_calendar_day_colors_member_read
  on public.rockey_calendar_day_colors;
create policy rockey_calendar_day_colors_member_read
  on public.rockey_calendar_day_colors
  for select to authenticated
  using (public.rockey_calendar_is_member(room_id));

drop policy if exists rockey_calendar_day_colors_member_insert
  on public.rockey_calendar_day_colors;
create policy rockey_calendar_day_colors_member_insert
  on public.rockey_calendar_day_colors
  for insert to authenticated
  with check (
    updated_by = (select auth.uid())
    and public.rockey_calendar_is_member(room_id)
  );

drop policy if exists rockey_calendar_day_colors_member_update
  on public.rockey_calendar_day_colors;
create policy rockey_calendar_day_colors_member_update
  on public.rockey_calendar_day_colors
  for update to authenticated
  using (public.rockey_calendar_is_member(room_id))
  with check (
    updated_by = (select auth.uid())
    and public.rockey_calendar_is_member(room_id)
  );

drop policy if exists rockey_calendar_day_colors_member_delete
  on public.rockey_calendar_day_colors;
create policy rockey_calendar_day_colors_member_delete
  on public.rockey_calendar_day_colors
  for delete to authenticated
  using (public.rockey_calendar_is_member(room_id));

create or replace function public.rockey_calendar_touch_day_color()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

revoke all on function public.rockey_calendar_touch_day_color() from public, anon, authenticated;
drop trigger if exists rockey_calendar_day_colors_touch
  on public.rockey_calendar_day_colors;
create trigger rockey_calendar_day_colors_touch
  before insert or update on public.rockey_calendar_day_colors
  for each row execute function public.rockey_calendar_touch_day_color();

do $publication$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rockey_calendar_day_colors'
  ) then
    alter publication supabase_realtime
      add table public.rockey_calendar_day_colors;
  end if;
end;
$publication$;

comment on table public.rockey_calendar_day_colors is
  'Shared per-room monthly calendar date background colors.';
