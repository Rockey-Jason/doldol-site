-- DORI feedback and suggestion inbox.
-- The page stores only the signed-in account ID and the submitted report text.
-- Public clients can submit and read their own entries; only a verified admin can
-- read all entries or update their workflow status and response note.

create table public.dori_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'usability', 'other')),
  title text not null check (char_length(btrim(title)) between 5 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 4000),
  severity text not null default 'normal' check (severity in ('normal', 'important', 'urgent')),
  source_page text not null default '/' check (char_length(source_page) <= 300),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'in_progress', 'resolved', 'declined')),
  admin_note text check (admin_note is null or char_length(admin_note) <= 1600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dori_feedback_user_created_idx
  on public.dori_feedback (user_id, created_at desc);
create index dori_feedback_admin_queue_idx
  on public.dori_feedback (status, created_at desc);

alter table public.dori_feedback enable row level security;

-- Supabase applied the new-table Data API exposure default on 2026-10-30.
-- Explicit grants are required in addition to RLS.
grant select on public.dori_feedback to authenticated;
grant insert (user_id, category, title, description, severity, source_page)
  on public.dori_feedback to authenticated;
grant update (status, admin_note)
  on public.dori_feedback to authenticated;

create policy "Users read their own feedback; verified admins read all"
  on public.dori_feedback
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.admin_is_authorized())
  );

create policy "Signed-in users submit feedback as themselves"
  on public.dori_feedback
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
  );

create policy "Verified admins manage feedback status and notes"
  on public.dori_feedback
  for update
  to authenticated
  using ((select public.admin_is_authorized()))
  with check ((select public.admin_is_authorized()));

create or replace function public.set_dori_feedback_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.set_dori_feedback_updated_at() from public, anon, authenticated;

create trigger dori_feedback_set_updated_at
before update on public.dori_feedback
for each row execute function public.set_dori_feedback_updated_at();
