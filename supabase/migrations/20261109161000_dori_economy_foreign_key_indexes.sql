-- Index foreign-key columns used by inventory, ledger and marketplace lookups.
create index if not exists dori_economy_inventory_asset_idx on public.dori_economy_inventory(asset_id);
create index if not exists dori_economy_ledger_asset_idx on public.dori_economy_ledger(asset_id);
create index if not exists dori_economy_listings_asset_idx on public.dori_economy_listings(asset_id);
