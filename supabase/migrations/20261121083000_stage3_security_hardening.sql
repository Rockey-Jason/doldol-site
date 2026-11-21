-- Stage 3 security hardening
-- Keep trigger execution intact while preventing direct RPC execution.
-- PostgreSQL checks EXECUTE permission when a trigger is created; the existing
-- trigger continues to fire after client-role EXECUTE is revoked.

REVOKE EXECUTE ON FUNCTION public.audit_dori_stock_order_change()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_dori_stock_order_change()
  TO service_role;

-- This function explicitly requires auth.uid() and is a signed-in user action.
-- Remove anonymous/PUBLIC invocation while retaining authenticated access.
REVOKE EXECUTE ON FUNCTION public.submit_news_survey(integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_news_survey(integer, text)
  TO authenticated, service_role;

-- Intentionally unchanged:
-- get_dori_stock_recent_executions(bigint, integer) is read-only, returns only
-- public market execution fields, and clamps the requested limit to 1..100.
