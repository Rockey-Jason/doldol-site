-- ROCKEY core schema. Existing Dori Site tables are not modified.
create table if not exists public.rockey_profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  site_user_id text not null unique,
  display_name text not null default 'ROCKEY PLAYER',
  level integer not null default 1 check (level >= 1),
  total_xp bigint not null default 0 check (total_xp >= 0),
  rank_tier text not null default 'UNRANKED' check (rank_tier in ('UNRANKED','BRONZE','SILVER','GOLD','PLATINUM','DIAMOND','MASTER','GRANDMASTER','ELITE')),
  rank_rating integer not null default 0,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  kills bigint not null default 0 check (kills >= 0),
  deaths bigint not null default 0 check (deaths >= 0),
  headshots bigint not null default 0 check (headshots >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rockey_friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rockey_friendships_distinct_users check (user_a_id <> user_b_id),
  constraint rockey_friendships_canonical_order check (user_a_id < user_b_id),
  constraint rockey_friendships_requester check (requested_by in (user_a_id,user_b_id)),
  constraint rockey_friendships_pair_unique unique (user_a_id,user_b_id)
);
create table if not exists public.rockey_matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('1v1','2v2','3v3','ranked','ffa')),
  map_id text not null,
  status text not null default 'waiting' check (status in ('waiting','playing','completed','cancelled')),
  winner_team smallint,
  server_region text,
  started_at timestamptz,
  ended_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.rockey_match_players (
  match_id uuid not null references public.rockey_matches(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  team_id smallint,
  kills integer not null default 0 check (kills >= 0),
  deaths integer not null default 0 check (deaths >= 0),
  assists integer not null default 0 check (assists >= 0),
  headshots integer not null default 0 check (headshots >= 0),
  damage integer not null default 0 check (damage >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  rating_delta integer not null default 0,
  placement smallint,
  processed_at timestamptz,
  primary key (match_id,auth_user_id)
);
create table if not exists public.rockey_invites (
  id uuid primary key default gen_random_uuid(),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  room_code_hash text not null unique,
  mode text not null check (mode in ('1v1','2v2','3v3')),
  status text not null default 'pending' check (status in ('pending','accepted','expired','cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.rockey_loadouts (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 5),
  primary_weapon text not null default 'R16',
  secondary_weapon text not null default 'R9',
  cosmetic_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (auth_user_id,slot)
);
create table if not exists public.rockey_inventory (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  item_code text not null,
  item_type text not null check (item_type in ('weapon_skin','character_skin','effect','title','banner')),
  acquired_at timestamptz not null default now(),
  primary key (auth_user_id,item_code)
);
create table if not exists public.rockey_weapon_mastery (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  weapon_code text not null,
  mastery_xp bigint not null default 0 check (mastery_xp >= 0),
  kills bigint not null default 0 check (kills >= 0),
  primary key (auth_user_id,weapon_code)
);
create index if not exists rockey_matches_created_idx on public.rockey_matches(created_at desc);
create index if not exists rockey_match_players_user_idx on public.rockey_match_players(auth_user_id,match_id);
create index if not exists rockey_invites_expiry_idx on public.rockey_invites(expires_at);
create index if not exists rockey_friendships_a_idx on public.rockey_friendships(user_a_id,status);
create index if not exists rockey_friendships_b_idx on public.rockey_friendships(user_b_id,status);

alter table public.rockey_profiles enable row level security;
alter table public.rockey_friendships enable row level security;
alter table public.rockey_matches enable row level security;
alter table public.rockey_match_players enable row level security;
alter table public.rockey_invites enable row level security;
alter table public.rockey_loadouts enable row level security;
alter table public.rockey_inventory enable row level security;
alter table public.rockey_weapon_mastery enable row level security;

drop policy if exists rockey_profiles_read on public.rockey_profiles;
create policy rockey_profiles_read on public.rockey_profiles for select to authenticated
  using (auth_user_id = (select auth.uid()));
drop policy if exists rockey_friendships_read_participants on public.rockey_friendships;
create policy rockey_friendships_read_participants on public.rockey_friendships for select to authenticated
  using ((select auth.uid()) in (user_a_id,user_b_id));
drop policy if exists rockey_matches_read_participants on public.rockey_matches;
create policy rockey_matches_read_participants on public.rockey_matches for select to authenticated
  using (exists (select 1 from public.rockey_match_players mp where mp.match_id = rockey_matches.id and mp.auth_user_id = (select auth.uid())));
drop policy if exists rockey_match_players_read_self on public.rockey_match_players;
create policy rockey_match_players_read_self on public.rockey_match_players for select to authenticated
  using (auth_user_id = (select auth.uid()));
drop policy if exists rockey_invites_read_participants on public.rockey_invites;
create policy rockey_invites_read_participants on public.rockey_invites for select to authenticated
  using ((select auth.uid()) in (host_user_id,target_user_id));
drop policy if exists rockey_loadouts_read_self on public.rockey_loadouts;
create policy rockey_loadouts_read_self on public.rockey_loadouts for select to authenticated
  using (auth_user_id = (select auth.uid()));
drop policy if exists rockey_inventory_read_self on public.rockey_inventory;
create policy rockey_inventory_read_self on public.rockey_inventory for select to authenticated
  using (auth_user_id = (select auth.uid()));
drop policy if exists rockey_mastery_read_self on public.rockey_weapon_mastery;
create policy rockey_mastery_read_self on public.rockey_weapon_mastery for select to authenticated
  using (auth_user_id = (select auth.uid()));

revoke all on public.rockey_profiles,public.rockey_friendships,public.rockey_matches,public.rockey_match_players,
  public.rockey_invites,public.rockey_loadouts,public.rockey_inventory,public.rockey_weapon_mastery from anon,authenticated;
grant select on public.rockey_profiles,public.rockey_friendships,public.rockey_matches,public.rockey_match_players,
  public.rockey_invites,public.rockey_loadouts,public.rockey_inventory,public.rockey_weapon_mastery to authenticated;
grant all on public.rockey_profiles,public.rockey_friendships,public.rockey_matches,public.rockey_match_players,
  public.rockey_invites,public.rockey_loadouts,public.rockey_inventory,public.rockey_weapon_mastery to service_role;

create or replace function public.rockey_process_match_result(p_match_id uuid)
returns integer language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  match_player record;
  processed_count integer := 0;
  did_win boolean;
begin
  for match_player in
    update public.rockey_match_players set processed_at = now()
    where match_id = p_match_id and processed_at is null
    returning auth_user_id, kills, deaths, placement
  loop
    did_win := match_player.placement = 1;
    update public.rockey_profiles
      set wins = wins + case when did_win then 1 else 0 end,
          losses = losses + case when did_win then 0 else 1 end,
          kills = kills + match_player.kills,
          deaths = deaths + match_player.deaths,
          total_xp = total_xp + 50 + (match_player.kills * 10),
          updated_at = now()
      where auth_user_id = match_player.auth_user_id;
    processed_count := processed_count + 1;
  end loop;
  return processed_count;
end;
$$;
revoke all on function public.rockey_process_match_result(uuid) from public,anon,authenticated;
grant execute on function public.rockey_process_match_result(uuid) to service_role;