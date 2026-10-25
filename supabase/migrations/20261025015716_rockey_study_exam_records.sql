-- Rockey Study Exam Room: private per-user exam plans, scores and checklists.
create table if not exists public.rockey_study_exam_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  exam_date date not null,
  term_label text not null default '' check (char_length(term_label) <= 100),
  target_average numeric(5,2) not null default 90
    check (target_average >= 0 and target_average <= 100),
  notes text not null default '' check (char_length(notes) <= 12000),
  subjects jsonb not null default '[]'::jsonb
    check (jsonb_typeof(subjects) = 'array' and jsonb_array_length(subjects) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rockey_study_exam_records_user_date_idx
  on public.rockey_study_exam_records (user_id, exam_date asc);

alter table public.rockey_study_exam_records enable row level security;

drop policy if exists "Rockey Study Exam Room users read own records"
  on public.rockey_study_exam_records;
create policy "Rockey Study Exam Room users read own records"
  on public.rockey_study_exam_records
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Exam Room users create own records"
  on public.rockey_study_exam_records;
create policy "Rockey Study Exam Room users create own records"
  on public.rockey_study_exam_records
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Exam Room users update own records"
  on public.rockey_study_exam_records;
create policy "Rockey Study Exam Room users update own records"
  on public.rockey_study_exam_records
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Rockey Study Exam Room users delete own records"
  on public.rockey_study_exam_records;
create policy "Rockey Study Exam Room users delete own records"
  on public.rockey_study_exam_records
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_exam_records from anon;
revoke all on table public.rockey_study_exam_records from authenticated;
grant select, insert, update, delete on table public.rockey_study_exam_records to authenticated;
