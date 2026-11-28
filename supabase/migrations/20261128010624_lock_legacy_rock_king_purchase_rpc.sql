-- Legacy client-priced purchase RPC is not used by the current site.
-- It accepts a client-supplied price and mutable login metadata, so it must
-- not remain callable by arbitrary authenticated clients.
REVOKE EXECUTE ON FUNCTION public.purchase_rock_king_item(text, bigint, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_rock_king_item(text, bigint, text, uuid)
  TO service_role;
