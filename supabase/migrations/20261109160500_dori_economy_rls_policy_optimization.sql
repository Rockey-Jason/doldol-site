-- DORI ECONOMY RLS policy optimization.
-- Evaluate auth.uid() once per statement rather than once per candidate row.
drop policy if exists dori_economy_inventory_own_read on public.dori_economy_inventory;
create policy dori_economy_inventory_own_read on public.dori_economy_inventory
  for select to authenticated using ((select auth.uid()) = auth_user_id);
drop policy if exists dori_economy_companies_public_read on public.dori_economy_companies;
create policy dori_economy_companies_public_read on public.dori_economy_companies
  for select to anon, authenticated using (is_public = true or (select auth.uid()) = owner_user_id);
drop policy if exists dori_economy_listings_public_read on public.dori_economy_listings;
create policy dori_economy_listings_public_read on public.dori_economy_listings
  for select to anon, authenticated using (status = 'active' or (select auth.uid()) = seller_user_id);
drop policy if exists dori_economy_ledger_own_read on public.dori_economy_ledger;
create policy dori_economy_ledger_own_read on public.dori_economy_ledger
  for select to authenticated using ((select auth.uid()) = auth_user_id);
