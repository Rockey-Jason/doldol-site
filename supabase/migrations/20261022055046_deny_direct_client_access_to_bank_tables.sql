-- Explicitly deny direct REST/Data API reads and writes; RPCs mediate every bank operation.
do $block$
declare t text;
begin
  foreach t in array array[
    'dori_bank_accounts','dori_bank_identity_map','dori_bank_deposit_products',
    'dori_bank_deposits','dori_bank_transactions','dori_bank_transfer_requests','dori_bank_audit_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I','Bank records are RPC only',t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)','Bank records are RPC only',t);
  end loop;
end;
$block$;
