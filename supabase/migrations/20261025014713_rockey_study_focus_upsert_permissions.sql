-- Permit idempotent session upserts for a user's own focus records.
-- No DELETE permission is granted; history remains protected from accidental removal.
drop policy if exists "Rockey Study Focus users update own sessions"
  on public.rockey_study_focus_sessions;
create policy "Rockey Study Focus users update own sessions"
  on public.rockey_study_focus_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.rockey_study_focus_sessions from anon;
revoke all on table public.rockey_study_focus_sessions from authenticated;
grant select, insert, update on table public.rockey_study_focus_sessions to authenticated;
