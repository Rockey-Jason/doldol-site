-- Rockey Study persistence: account-scoped time-attack results and settings.
-- Browser access is limited to the authenticated owner by row-level security.

create table if not exists public.rockey_study_time_attack_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz not null default now(),
  question_count integer not null check (question_count between 1 and 200),
  limit_seconds integer not null check (limit_seconds between 5 and 3600),
  total_elapsed_ms bigint not null check (total_elapsed_ms >= 0),
  remaining_total_ms bigint not null default 0 check (remaining_total_ms >= 0),
  timeout_count integer not null default 0 check (timeout_count between 0 and question_count),
  early_count integer not null default 0 check (early_count between 0 and question_count),
  questions jsonb not null,
  created_at timestamptz not null default now(),
  constraint rockey_study_time_attack_questions_array
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = question_count),
  constraint rockey_study_time_attack_result_counts
    check (timeout_count + early_count = question_count)
);

create index if not exists rockey_study_time_attack_records_user_completed_idx
  on public.rockey_study_time_attack_records (user_id, completed_at desc);

alter table public.rockey_study_time_attack_records enable row level security;

drop policy if exists "Rockey Study users read own time attack records"
  on public.rockey_study_time_attack_records;
create policy "Rockey Study users read own time attack records"
  on public.rockey_study_time_attack_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study users insert own time attack records"
  on public.rockey_study_time_attack_records;
create policy "Rockey Study users insert own time attack records"
  on public.rockey_study_time_attack_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study users delete own time attack records"
  on public.rockey_study_time_attack_records;
create policy "Rockey Study users delete own time attack records"
  on public.rockey_study_time_attack_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_time_attack_records from anon;
revoke all on table public.rockey_study_time_attack_records from authenticated;
grant select, insert, delete on table public.rockey_study_time_attack_records to authenticated;

create table if not exists public.rockey_study_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  time_limit_seconds integer not null default 60 check (time_limit_seconds between 5 and 3600),
  question_count integer not null default 10 check (question_count between 1 and 200),
  updated_at timestamptz not null default now()
);

alter table public.rockey_study_preferences enable row level security;

drop policy if exists "Rockey Study users read own preferences"
  on public.rockey_study_preferences;
create policy "Rockey Study users read own preferences"
  on public.rockey_study_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study users insert own preferences"
  on public.rockey_study_preferences;
create policy "Rockey Study users insert own preferences"
  on public.rockey_study_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study users update own preferences"
  on public.rockey_study_preferences;
create policy "Rockey Study users update own preferences"
  on public.rockey_study_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_preferences from anon;
revoke all on table public.rockey_study_preferences from authenticated;
grant select, insert, update on table public.rockey_study_preferences to authenticated;
