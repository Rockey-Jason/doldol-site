-- Rockey Study Focus Mode: persistent, per-user focus/break session history.
create table if not exists public.rockey_study_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '자유 공부'
    check (char_length(btrim(subject)) between 1 and 100),
  note text not null default ''
    check (char_length(note) <= 4000),
  session_type text not null
    check (session_type in ('focus', 'break')),
  status text not null
    check (status in ('completed', 'interrupted', 'skipped')),
  planned_seconds integer not null
    check (planned_seconds between 60 and 86400),
  actual_seconds integer not null default 0
    check (actual_seconds between 0 and 86400),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint rockey_study_focus_nonnegative_window check (ended_at >= started_at),
  constraint rockey_study_focus_actual_not_over_plan check (actual_seconds <= planned_seconds)
);

create index if not exists rockey_study_focus_sessions_user_started_idx
  on public.rockey_study_focus_sessions (user_id, started_at desc);

alter table public.rockey_study_focus_sessions enable row level security;

drop policy if exists "Rockey Study Focus users read own sessions"
  on public.rockey_study_focus_sessions;
create policy "Rockey Study Focus users read own sessions"
  on public.rockey_study_focus_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Focus users create own sessions"
  on public.rockey_study_focus_sessions;
create policy "Rockey Study Focus users create own sessions"
  on public.rockey_study_focus_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_focus_sessions from anon;
revoke all on table public.rockey_study_focus_sessions from authenticated;
grant select, insert on table public.rockey_study_focus_sessions to authenticated;
