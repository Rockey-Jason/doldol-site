-- Remove DORI ECONOMY — GRAND CAPITAL.
-- This migration intentionally leaves the existing Dori Bank, Dori Stocks,
-- Doronium Factory, user balances, and their data untouched.

drop function if exists public.dori_economy_buy_listing(uuid, bigint, uuid);
drop function if exists public.dori_economy_buy_supply(text, integer, uuid);
drop function if exists public.dori_economy_cancel_listing(uuid, uuid);
drop function if exists public.dori_economy_create_company(text, text, text, text, bigint, uuid);
drop function if exists public.dori_economy_create_listing(text, bigint, bigint, uuid);

drop table if exists public.dori_economy_listings cascade;
drop table if exists public.dori_economy_inventory cascade;
drop table if exists public.dori_economy_ledger cascade;
drop table if exists public.dori_economy_requests cascade;
drop table if exists public.dori_economy_companies cascade;
drop table if exists public.dori_economy_treasury cascade;
drop table if exists public.dori_economy_catalog cascade;
