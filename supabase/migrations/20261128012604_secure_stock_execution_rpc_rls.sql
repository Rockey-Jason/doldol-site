-- Run the stock execution feed with the caller's privileges.
-- The table's existing SELECT policy limits authenticated users to rows
-- where they are the buyer or seller; this function must honor that policy.

CREATE OR REPLACE FUNCTION public.get_dori_stock_recent_executions(
  p_stock_id bigint,
  p_limit integer DEFAULT 30
)
RETURNS TABLE(
  id bigint,
  price bigint,
  quantity bigint,
  notional bigint,
  executed_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT
    e.id,
    e.price,
    e.quantity,
    e.notional,
    e.executed_at
  FROM public.dori_stock_executions AS e
  WHERE e.stock_id = p_stock_id
  ORDER BY e.executed_at DESC, e.id DESC
  LIMIT GREATEST(1, LEAST(100, COALESCE(p_limit, 30)));
$function$;

GRANT SELECT ON TABLE public.dori_stock_executions TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_dori_stock_recent_executions(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dori_stock_recent_executions(bigint, integer) TO authenticated, service_role;
