-- ROCKEY BUILD 02: social, weapon/map catalogues, seasons, replays and ranked ladder.
-- Applied to Supabase as migration 20261030120902_rockey_build_02_social_seasons_catalogues_replays.
-- Existing Dori Site wallets, stocks, banks and achievements are intentionally untouched.

create table if not exists public.rockey_seasons (
  id uuid primary key default gen_random_uuid(),
  season_code text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default false,
  reward_description text not null default '',
  created_at timestamptz not null default now(),
  constraint rockey_season_dates check (ends_at > starts_at)
);
create table if not exists public.rockey_maps (
  map_id text primary key,
  display_name text not null,
  description text not null default '',
  difficulty text not null default 'standard',
  map_data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.rockey_weapons (
  weapon_code text primary key,
  display_name text not null,
  category text not null,
  weapon_data jsonb not null default '{}'::jsonb,
  sort_order smallint not null default 0,
  is_active boolean not null default true
);
create table if not exists public.rockey_season_rewards (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.rockey_seasons(id) on delete cascade,
  min_season_points integer not null check (min_season_points >= 0),
  item_code text not null,
  item_type text not null check (item_type in ('weapon_skin','character_skin','effect','title','banner')),
  display_name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  constraint rockey_season_reward_unique unique (season_id,min_season_points),
  constraint rockey_season_reward_item_unique unique (season_id,item_code)
);
create table if not exists public.rockey_season_reward_claims (
  season_id uuid not null references public.rockey_seasons(id) on delete cascade,
  reward_id uuid not null references public.rockey_season_rewards(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  item_code text not null,
  claimed_at timestamptz not null default now(),
  primary key (season_id,reward_id,auth_user_id)
);
create table if not exists public.rockey_replays (
  match_id uuid primary key references public.rockey_matches(id) on delete cascade,
  map_id text not null,
  mode text not null,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  frame_rate smallint not null default 5,
  frames jsonb not null default '[]'::jsonb,
  participants jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint rockey_replay_frames_array check (jsonb_typeof(frames) = 'array')
);

alter table public.rockey_profiles
  add column if not exists matches_played integer not null default 0 check (matches_played >= 0),
  add column if not exists season_id uuid references public.rockey_seasons(id),
  add column if not exists season_points integer not null default 0 check (season_points >= 0),
  add column if not exists last_match_at timestamptz;
alter table public.rockey_matches
  add column if not exists season_id uuid references public.rockey_seasons(id),
  add column if not exists replay_available boolean not null default false;
alter table public.rockey_match_players
  add column if not exists weapon_code text not null default 'R16',
  add column if not exists weapon_stats jsonb not null default '{}'::jsonb;

create index if not exists rockey_seasons_active_idx on public.rockey_seasons(is_active,starts_at,ends_at);
create index if not exists rockey_season_rewards_season_idx on public.rockey_season_rewards(season_id,min_season_points);
create index if not exists rockey_season_claims_user_idx on public.rockey_season_reward_claims(auth_user_id,season_id);
create index if not exists rockey_replays_created_idx on public.rockey_replays(created_at desc);
create index if not exists rockey_profiles_ladder_idx on public.rockey_profiles(rank_rating desc,wins desc);

insert into public.rockey_seasons(season_code,name,starts_at,ends_at,is_active,reward_description)
values ('S01','FOUNDATION SEASON','2026-10-30T00:00:00Z','2027-01-28T00:00:00Z',true,'첫 번째 경쟁 시즌. 랭크 포인트를 모아 시즌 전용 칭호와 배너를 획득하세요.')
on conflict (season_code) do nothing;

insert into public.rockey_maps(map_id,display_name,description,difficulty,map_data)
values
('training_facility','TRAINING FACILITY','정밀 조준과 이동을 훈련하는 기본 전장.','easy','{"palette":"blue","environment":"facility","cover":[{"x":0,"z":0,"hx":2.4,"hz":2.4,"top":3},{"x":-9,"z":-7,"hx":3.2,"hz":1.1,"top":2.2},{"x":9,"z":-7,"hx":3.2,"hz":1.1,"top":2.2},{"x":-9,"z":7,"hx":3.2,"hz":1.1,"top":2.2},{"x":9,"z":7,"hx":3.2,"hz":1.1,"top":2.2},{"x":-17,"z":0,"hx":1.2,"hz":4.2,"top":4.4},{"x":17,"z":0,"hx":1.2,"hz":4.2,"top":4.4}]}'),
('neon_district','NEON DISTRICT','네온 간판과 좁은 골목이 교차하는 근접전 전장.','standard','{"palette":"magenta","environment":"city","cover":[{"x":0,"z":-10,"hx":5,"hz":1.2,"top":3.5},{"x":0,"z":10,"hx":5,"hz":1.2,"top":3.5},{"x":-12,"z":0,"hx":1.4,"hz":5,"top":4},{"x":12,"z":0,"hx":1.4,"hz":5,"top":4},{"x":-7,"z":-5,"hx":1.7,"hz":1.7,"top":2.4},{"x":7,"z":5,"hx":1.7,"hz":1.7,"top":2.4}]}'),
('frostline','FROSTLINE','빙결 연구기지. 긴 시야와 엄폐물 사이의 교전이 핵심.','hard','{"palette":"ice","environment":"snow","cover":[{"x":0,"z":0,"hx":1.6,"hz":7,"top":2.4},{"x":-11,"z":-9,"hx":3.5,"hz":1.2,"top":3.2},{"x":11,"z":9,"hx":3.5,"hz":1.2,"top":3.2},{"x":-12,"z":8,"hx":2.2,"hz":2.2,"top":2.8},{"x":12,"z":-8,"hx":2.2,"hz":2.2,"top":2.8}]}'),
('orbital_dock','ORBITAL DOCK','우주 정거장 적재 구역. 수직 구조와 중앙 통로를 활용하라.','hard','{"palette":"cyan","environment":"space","cover":[{"x":-10,"z":0,"hx":2.4,"hz":7,"top":4.5},{"x":10,"z":0,"hx":2.4,"hz":7,"top":4.5},{"x":0,"z":-12,"hx":7,"hz":1.2,"top":3},{"x":0,"z":12,"hx":7,"hz":1.2,"top":3},{"x":0,"z":0,"hx":2,"hz":2,"top":2.8}]}'),
('canyon_relay','CANYON RELAY','협곡 통신 중계소. 측면 우회와 장거리 저격에 유리하다.','standard','{"palette":"amber","environment":"canyon","cover":[{"x":-12,"z":-10,"hx":4,"hz":1.3,"top":4},{"x":12,"z":10,"hx":4,"hz":1.3,"top":4},{"x":-12,"z":10,"hx":1.3,"hz":4,"top":3},{"x":12,"z":-10,"hx":1.3,"hz":4,"top":3},{"x":0,"z":0,"hx":3,"hz":1.3,"top":2.4}]}')
on conflict (map_id) do update
set display_name=excluded.display_name,description=excluded.description,difficulty=excluded.difficulty,map_data=excluded.map_data,is_active=true;

insert into public.rockey_weapons(weapon_code,display_name,category,weapon_data,sort_order)
values
('R16','R-16','ASSAULT','{"damage":24,"headshotMultiplier":1.7,"fireInterval":115,"magazine":30,"reserve":90,"reloadMs":1700,"range":68,"spread":0.008}',1),
('R9','R-9','PISTOL','{"damage":34,"headshotMultiplier":1.9,"fireInterval":260,"magazine":12,"reserve":48,"reloadMs":1400,"range":58,"spread":0.004}',2),
('VIPER','VIPER','SMG','{"damage":18,"headshotMultiplier":1.5,"fireInterval":72,"magazine":36,"reserve":144,"reloadMs":1800,"range":44,"spread":0.018}',3),
('THUNDER','THUNDER','SHOTGUN','{"damage":9,"pellets":7,"headshotMultiplier":1.2,"fireInterval":780,"magazine":8,"reserve":40,"reloadMs":2100,"range":24,"spread":0.075}',4),
('LONGSHOT','LONGSHOT','SNIPER','{"damage":88,"headshotMultiplier":1.65,"fireInterval":1250,"magazine":5,"reserve":25,"reloadMs":2400,"range":110,"spread":0.001}',5),
('HELIX','HELIX','DMR','{"damage":36,"headshotMultiplier":1.7,"fireInterval":330,"magazine":12,"reserve":60,"reloadMs":1950,"range":88,"spread":0.003}',6),
('BASTION','BASTION','LMG','{"damage":21,"headshotMultiplier":1.45,"fireInterval":94,"magazine":60,"reserve":180,"reloadMs":3100,"range":56,"spread":0.024}',7),
('NOVA','NOVA','HEAVY PISTOL','{"damage":42,"headshotMultiplier":1.8,"fireInterval":410,"magazine":8,"reserve":40,"reloadMs":1550,"range":64,"spread":0.003}',8),
('ARC','ARC','ENERGY','{"damage":28,"headshotMultiplier":1.55,"fireInterval":190,"magazine":24,"reserve":96,"reloadMs":2050,"range":74,"spread":0.006}',9),
('PULSE','PULSE','BURST','{"damage":25,"headshotMultiplier":1.6,"fireInterval":205,"magazine":21,"reserve":84,"reloadMs":1850,"range":78,"spread":0.005}',10)
on conflict (weapon_code) do update
set display_name=excluded.display_name,category=excluded.category,weapon_data=excluded.weapon_data,sort_order=excluded.sort_order,is_active=true;

insert into public.rockey_season_rewards(season_id,min_season_points,item_code,item_type,display_name,description)
select s.id,r.min_points,r.item_code,r.item_type,r.display_name,r.description
from public.rockey_seasons s
cross join (values
 (100,'S01_BRONZE_BANNER','banner','S01 BRONZE','시즌 랭크 포인트 100 달성'),
 (500,'S01_SILVER_TITLE','title','S01 SILVER','시즌 랭크 포인트 500 달성'),
 (1000,'S01_GOLD_EFFECT','effect','S01 GOLD AURA','시즌 랭크 포인트 1,000 달성'),
 (1600,'S01_DIAMOND_BANNER','banner','S01 DIAMOND','시즌 랭크 포인트 1,600 달성'),
 (2400,'S01_ELITE_TITLE','title','S01 ELITE','시즌 랭크 포인트 2,400 달성')
) as r(min_points,item_code,item_type,display_name,description)
where s.season_code='S01'
on conflict (season_id,min_season_points) do update
set item_code=excluded.item_code,item_type=excluded.item_type,display_name=excluded.display_name,description=excluded.description;

alter table public.rockey_seasons enable row level security;
alter table public.rockey_maps enable row level security;
alter table public.rockey_weapons enable row level security;
alter table public.rockey_season_rewards enable row level security;
alter table public.rockey_season_reward_claims enable row level security;
alter table public.rockey_replays enable row level security;

drop policy if exists rockey_seasons_read on public.rockey_seasons;
create policy rockey_seasons_read on public.rockey_seasons for select to authenticated using (true);
drop policy if exists rockey_maps_read on public.rockey_maps;
create policy rockey_maps_read on public.rockey_maps for select to authenticated using (is_active);
drop policy if exists rockey_weapons_read on public.rockey_weapons;
create policy rockey_weapons_read on public.rockey_weapons for select to authenticated using (is_active);
drop policy if exists rockey_season_rewards_read on public.rockey_season_rewards;
create policy rockey_season_rewards_read on public.rockey_season_rewards for select to authenticated using (true);
drop policy if exists rockey_season_claims_read_self on public.rockey_season_reward_claims;
create policy rockey_season_claims_read_self on public.rockey_season_reward_claims for select to authenticated using (auth_user_id = (select auth.uid()));
drop policy if exists rockey_replays_read_participants on public.rockey_replays;
create policy rockey_replays_read_participants on public.rockey_replays for select to authenticated
using (exists (select 1 from public.rockey_match_players mp where mp.match_id=rockey_replays.match_id and mp.auth_user_id=(select auth.uid())));

revoke all on public.rockey_seasons,public.rockey_maps,public.rockey_weapons,public.rockey_season_rewards,
  public.rockey_season_reward_claims,public.rockey_replays from anon,authenticated;
grant select on public.rockey_seasons,public.rockey_maps,public.rockey_weapons,public.rockey_season_rewards,
  public.rockey_season_reward_claims,public.rockey_replays to authenticated;
grant all on public.rockey_seasons,public.rockey_maps,public.rockey_weapons,public.rockey_season_rewards,
  public.rockey_season_reward_claims,public.rockey_replays to service_role;

create or replace function public.rockey_get_leaderboard(p_limit integer default 50)
returns table (auth_user_id uuid,display_name text,rank_tier text,rank_rating integer,season_points integer,wins integer,losses integer,kills bigint,matches_played integer)
language sql stable security definer set search_path = pg_catalog, public as $$
  select p.auth_user_id,p.display_name,p.rank_tier,p.rank_rating,p.season_points,p.wins,p.losses,p.kills,p.matches_played
  from public.rockey_profiles p
  order by p.rank_rating desc,p.wins desc,p.kills desc
  limit greatest(1,least(coalesce(p_limit,50),100));
$$;

create or replace function public.rockey_get_active_season()
returns table (id uuid,season_code text,name text,starts_at timestamptz,ends_at timestamptz,reward_description text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select s.id,s.season_code,s.name,s.starts_at,s.ends_at,s.reward_description
  from public.rockey_seasons s
  where s.is_active=true and now() between s.starts_at and s.ends_at
  order by s.starts_at desc limit 1;
$$;

create or replace function public.rockey_claim_season_rewards(p_auth_user_id uuid,p_season_id uuid)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_points integer; v_reward record; v_count integer := 0;
begin
  select season_points into v_points from public.rockey_profiles
  where auth_user_id=p_auth_user_id and season_id=p_season_id;
  if v_points is null then return 0; end if;
  for v_reward in
    select r.id,r.item_code,r.item_type from public.rockey_season_rewards r
    where r.season_id=p_season_id and r.min_season_points<=v_points
      and not exists (select 1 from public.rockey_season_reward_claims c
        where c.season_id=p_season_id and c.reward_id=r.id and c.auth_user_id=p_auth_user_id)
  loop
    insert into public.rockey_season_reward_claims(season_id,reward_id,auth_user_id,item_code)
    values(p_season_id,v_reward.id,p_auth_user_id,v_reward.item_code)
    on conflict do nothing;
    if found then
      insert into public.rockey_inventory(auth_user_id,item_code,item_type)
      values(p_auth_user_id,v_reward.item_code,v_reward.item_type)
      on conflict (auth_user_id,item_code) do nothing;
      v_count:=v_count+1;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.rockey_process_match_result(p_match_id uuid)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_match public.rockey_matches%rowtype; v_player record; v_delta integer; v_rating integer; v_count integer:=0;
begin
  select * into v_match from public.rockey_matches where id=p_match_id for update;
  if not found or v_match.status<>'completed' then return 0; end if;
  for v_player in
    update public.rockey_match_players set processed_at=now()
    where match_id=p_match_id and processed_at is null
    returning auth_user_id,kills,deaths,headshots,placement,weapon_code,weapon_stats,team_id
  loop
    v_delta:=case when v_match.mode<>'ranked' then 0 when v_player.placement=1 then 24 else -18 end;
    update public.rockey_profiles
      set wins=wins+case when v_player.placement=1 then 1 else 0 end,
          losses=losses+case when v_player.placement=1 then 0 else 1 end,
          kills=kills+v_player.kills,deaths=deaths+v_player.deaths,headshots=headshots+v_player.headshots,
          matches_played=matches_played+1,total_xp=total_xp+50+(v_player.kills*10),
          rank_rating=greatest(0,rank_rating+v_delta),
          season_points=case when v_match.mode='ranked' then
            (case when season_id is distinct from v_match.season_id then 0 else season_points end)+greatest(0,v_delta)
            else case when season_id is distinct from v_match.season_id then 0 else season_points end end,
          season_id=coalesce(v_match.season_id,season_id),last_match_at=now(),
          rank_tier=case
            when greatest(0,rank_rating+v_delta)>=3500 then 'ELITE'
            when greatest(0,rank_rating+v_delta)>=3000 then 'GRANDMASTER'
            when greatest(0,rank_rating+v_delta)>=2500 then 'MASTER'
            when greatest(0,rank_rating+v_delta)>=2100 then 'DIAMOND'
            when greatest(0,rank_rating+v_delta)>=1750 then 'PLATINUM'
            when greatest(0,rank_rating+v_delta)>=1400 then 'GOLD'
            when greatest(0,rank_rating+v_delta)>=1000 then 'SILVER'
            when greatest(0,rank_rating+v_delta)>=500 then 'BRONZE'
            else 'UNRANKED' end,
          updated_at=now()
      where auth_user_id=v_player.auth_user_id returning rank_rating into v_rating;
    update public.rockey_match_players set rating_delta=v_delta,xp_earned=50+(v_player.kills*10)
    where match_id=p_match_id and auth_user_id=v_player.auth_user_id;
    insert into public.rockey_weapon_mastery(auth_user_id,weapon_code,mastery_xp,kills)
    values(v_player.auth_user_id,v_player.weapon_code,(v_player.kills*20)+(v_player.headshots*5),v_player.kills)
    on conflict (auth_user_id,weapon_code) do update
      set mastery_xp=rockey_weapon_mastery.mastery_xp+excluded.mastery_xp,
          kills=rockey_weapon_mastery.kills+excluded.kills;
    if v_match.season_id is not null then
      perform public.rockey_claim_season_rewards(v_player.auth_user_id,v_match.season_id);
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.rockey_get_leaderboard(integer) from public,anon;
revoke all on function public.rockey_get_active_season() from public,anon;
revoke all on function public.rockey_claim_season_rewards(uuid,uuid) from public,anon,authenticated;
revoke all on function public.rockey_process_match_result(uuid) from public,anon,authenticated;
grant execute on function public.rockey_get_leaderboard(integer) to authenticated,service_role;
grant execute on function public.rockey_get_active_season() to authenticated,service_role;
grant execute on function public.rockey_claim_season_rewards(uuid,uuid) to service_role;
grant execute on function public.rockey_process_match_result(uuid) to service_role;
