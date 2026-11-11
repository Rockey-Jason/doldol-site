-- Remove inherited anonymous/public Data API access from the feedback inbox.
-- Only authenticated users can submit and read their own rows; verified admins
-- can read the queue and update the status/response columns, subject to RLS.
revoke all privileges on table public.dori_feedback from anon, public;

grant select on public.dori_feedback to authenticated;
grant insert (user_id, category, title, description, severity, source_page)
  on public.dori_feedback to authenticated;
grant update (status, admin_note)
  on public.dori_feedback to authenticated;
