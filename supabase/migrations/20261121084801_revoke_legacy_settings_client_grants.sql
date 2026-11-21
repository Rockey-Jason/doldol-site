-- These two legacy flag tables have RLS enabled and no policies.
-- No current application code, view, trigger, or database function consumes them.
-- Remove stale API-role table grants while preserving owner and service_role access.
-- Keep the tables and their existing records intact.
REVOKE ALL PRIVILEGES ON TABLE public.setting, public.settings
  FROM anon, authenticated;
