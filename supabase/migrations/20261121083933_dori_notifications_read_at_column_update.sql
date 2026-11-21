-- Allow signed-in users to mark only their own notification read state.
-- The existing UPDATE RLS policy remains the row-level ownership boundary.
GRANT UPDATE (read_at) ON TABLE public.dori_notifications TO authenticated;
