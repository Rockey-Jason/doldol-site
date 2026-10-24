-- Dori World exploration progress.
-- World level is derived from the authenticated user's existing server-side EXP.
-- This table stores only personal exploration/checklist state; it never grants EXP or coins.

create table if not exists public.dori_world_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visited_districts text[] not null default '{}'::text[],
  last_district text,
  completed_missions text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dori_world_progress_visited_districts_check
    check (visited_districts <@ array['plaza','bank','finance','news','shop','library','games','war','ai','factory']::text[]),
  constraint dori_world_progress_last_district_check
    check (last_district is null or last_district = any(array['plaza','bank','finance','news','shop','library','games','war','ai','factory']::text[]))
);

alter table public.dori_world_progress
  add column if not exists completed_missions text[] not null default '{}'::text[];

alter table public.dori_world_progress
  drop constraint if exists dori_world_progress_completed_missions_check;

alter table public.dori_world_progress
  add constraint dori_world_progress_completed_missions_check
  check (completed_missions <@ array[
    'plaza_profile','news_read','news_quiz','bank_balance','bank_history',
    'finance_chart','finance_trade','shop_inventory','library_read',
    'games_play','war_try','ai_chat','factory_prepare'
  ]::text[]);

alter table public.dori_world_progress enable row level security;

drop policy if exists "Users can read their own Dori World progress" on public.dori_world_progress;
create policy "Users can read their own Dori World progress"
  on public.dori_world_progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own Dori World progress" on public.dori_world_progress;
create policy "Users can create their own Dori World progress"
  on public.dori_world_progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own Dori World progress" on public.dori_world_progress;
create policy "Users can update their own Dori World progress"
  on public.dori_world_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.dori_world_progress from anon;
grant select, insert, update on table public.dori_world_progress to authenticated;
