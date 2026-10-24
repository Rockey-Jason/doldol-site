-- Dori/Rockey Study Planner: one saved plan per user per calendar day.
-- Every exposed table is protected by RLS; no service-role key is used client-side.

create table if not exists public.rockey_study_planner_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  day_title text not null default '오늘의 학습 계획'
    check (char_length(btrim(day_title)) between 1 and 120),
  notes text not null default ''
    check (char_length(notes) <= 12000),
  focus_goal_minutes integer not null default 60
    check (focus_goal_minutes between 0 and 1440),
  tasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(tasks) = 'array' and jsonb_array_length(tasks) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rockey_study_planner_days_user_date_unique unique (user_id, plan_date)
);

create index if not exists rockey_study_planner_days_user_date_idx
  on public.rockey_study_planner_days (user_id, plan_date desc);

alter table public.rockey_study_planner_days enable row level security;

drop policy if exists "Rockey Study Planner users read own daily plans"
  on public.rockey_study_planner_days;
create policy "Rockey Study Planner users read own daily plans"
  on public.rockey_study_planner_days
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Planner users create own daily plans"
  on public.rockey_study_planner_days;
create policy "Rockey Study Planner users create own daily plans"
  on public.rockey_study_planner_days
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Planner users update own daily plans"
  on public.rockey_study_planner_days;
create policy "Rockey Study Planner users update own daily plans"
  on public.rockey_study_planner_days
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Planner users delete own daily plans"
  on public.rockey_study_planner_days;
create policy "Rockey Study Planner users delete own daily plans"
  on public.rockey_study_planner_days
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_planner_days from anon;
revoke all on table public.rockey_study_planner_days from authenticated;
grant select, insert, update, delete on table public.rockey_study_planner_days to authenticated;
