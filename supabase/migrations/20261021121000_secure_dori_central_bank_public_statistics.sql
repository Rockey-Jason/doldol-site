-- Keep the public economy dashboard aggregate-only without a public SECURITY DEFINER RPC.
create table if not exists public.dori_central_bank_public_statistics (
  id smallint primary key default 1 check (id = 1),
  registered_users bigint not null default 0 check (registered_users >= 0),
  user_held_doldolcoin numeric(30,0) not null default 0 check (user_held_doldolcoin >= 0),
  active_stocks bigint not null default 0 check (active_stocks >= 0),
  updated_at timestamptz not null default now()
);

alter table public.dori_central_bank_public_statistics enable row level security;
drop policy if exists "central bank public statistics are read only" on public.dori_central_bank_public_statistics;
create policy "central bank public statistics are read only"
  on public.dori_central_bank_public_statistics for select to anon, authenticated using (true);
revoke all on table public.dori_central_bank_public_statistics from anon, authenticated;
grant select on table public.dori_central_bank_public_statistics to anon, authenticated;

lock table public.users in share row exclusive mode;
lock table public.dori_stocks in share row exclusive mode;
insert into public.dori_central_bank_public_statistics
  (id, registered_users, user_held_doldolcoin, active_stocks, updated_at)
select 1, (select count(*) from public.users),
  (select coalesce(sum(coalesce(u.doldolcoin, 0)), 0)::numeric(30,0) from public.users u),
  (select count(*) from public.dori_stocks s where s.is_active is true), clock_timestamp()
on conflict (id) do update set registered_users=excluded.registered_users,
  user_held_doldolcoin=excluded.user_held_doldolcoin,
  active_stocks=excluded.active_stocks, updated_at=excluded.updated_at;

create or replace function public.dori_central_bank_track_user_statistics()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_user_delta bigint := 0; v_coin_delta numeric(30,0) := 0;
begin
  if tg_op = 'INSERT' then
    v_user_delta := 1; v_coin_delta := coalesce(new.doldolcoin, 0);
  elsif tg_op = 'DELETE' then
    v_user_delta := -1; v_coin_delta := -coalesce(old.doldolcoin, 0);
  else
    v_coin_delta := coalesce(new.doldolcoin, 0) - coalesce(old.doldolcoin, 0);
  end if;
  if v_user_delta <> 0 or v_coin_delta <> 0 then
    update public.dori_central_bank_public_statistics
    set registered_users=greatest(0,registered_users+v_user_delta),
        user_held_doldolcoin=user_held_doldolcoin+v_coin_delta,
        updated_at=clock_timestamp() where id=1;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function public.dori_central_bank_track_user_statistics() from public, anon, authenticated;

drop trigger if exists dori_cb_users_insert_stats on public.users;
create trigger dori_cb_users_insert_stats after insert on public.users
  for each row execute function public.dori_central_bank_track_user_statistics();
drop trigger if exists dori_cb_users_coin_update_stats on public.users;
create trigger dori_cb_users_coin_update_stats after update of doldolcoin on public.users
  for each row execute function public.dori_central_bank_track_user_statistics();
drop trigger if exists dori_cb_users_delete_stats on public.users;
create trigger dori_cb_users_delete_stats after delete on public.users
  for each row execute function public.dori_central_bank_track_user_statistics();

create or replace function public.dori_central_bank_track_stock_statistics()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_delta bigint := 0;
begin
  if tg_op='INSERT' then
    v_delta := case when coalesce(new.is_active,false) then 1 else 0 end;
  elsif tg_op='DELETE' then
    v_delta := case when coalesce(old.is_active,false) then -1 else 0 end;
  else
    v_delta := (case when coalesce(new.is_active,false) then 1 else 0 end)
             - (case when coalesce(old.is_active,false) then 1 else 0 end);
  end if;
  if v_delta <> 0 then
    update public.dori_central_bank_public_statistics
    set active_stocks=greatest(0,active_stocks+v_delta),updated_at=clock_timestamp()
    where id=1;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function public.dori_central_bank_track_stock_statistics() from public, anon, authenticated;

drop trigger if exists dori_cb_stocks_insert_stats on public.dori_stocks;
create trigger dori_cb_stocks_insert_stats after insert on public.dori_stocks
  for each row execute function public.dori_central_bank_track_stock_statistics();
drop trigger if exists dori_cb_stocks_active_update_stats on public.dori_stocks;
create trigger dori_cb_stocks_active_update_stats after update of is_active on public.dori_stocks
  for each row execute function public.dori_central_bank_track_stock_statistics();
drop trigger if exists dori_cb_stocks_delete_stats on public.dori_stocks;
create trigger dori_cb_stocks_delete_stats after delete on public.dori_stocks
  for each row execute function public.dori_central_bank_track_stock_statistics();

create or replace function public.dori_central_bank_public_summary()
returns jsonb language sql stable security invoker set search_path = ''
as $function$
  select jsonb_build_object('registered_users',s.registered_users,
    'user_held_doldolcoin',s.user_held_doldolcoin,
    'active_stocks',s.active_stocks,'as_of',s.updated_at)
  from public.dori_central_bank_public_statistics s where s.id=1;
$function$;
revoke all on function public.dori_central_bank_public_summary() from public, anon, authenticated;
grant execute on function public.dori_central_bank_public_summary() to anon, authenticated;

create index if not exists dori_central_bank_policy_updated_by_idx
  on public.dori_central_bank_policy(updated_by) where updated_by is not null;
create index if not exists dori_central_bank_announcements_created_by_idx
  on public.dori_central_bank_announcements(created_by) where created_by is not null;
create index if not exists dori_central_bank_announcements_updated_by_idx
  on public.dori_central_bank_announcements(updated_by) where updated_by is not null;
create index if not exists dori_central_bank_audit_actor_user_id_idx
  on public.dori_central_bank_audit_logs(actor_user_id) where actor_user_id is not null;
