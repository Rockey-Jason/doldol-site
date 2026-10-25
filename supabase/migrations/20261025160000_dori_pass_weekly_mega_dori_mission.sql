-- Weekly Mega Dori Mission backend and reward grant.
create table if not exists public.dori_pass_mega_mission_claims (
 user_id uuid not null references auth.users(id) on delete cascade, week_start date not null,
 season_key text not null check (season_key ~ '^[0-9]{4}-[0-9]{2}$'),
 rocky_points_reward integer not null default 8000 check (rocky_points_reward > 0),
 coin_reward bigint not null default 0, claimed_at timestamptz not null default now(),
 primary key(user_id,week_start)
);
alter table public.dori_pass_mega_mission_claims enable row level security;
drop policy if exists dori_pass_mega_claim_select_own on public.dori_pass_mega_mission_claims;
create policy dori_pass_mega_claim_select_own on public.dori_pass_mega_mission_claims for select to authenticated using (user_id=auth.uid());
revoke insert,update,delete on public.dori_pass_mega_mission_claims from anon,authenticated;
create or replace function public.dori_pass_get_mega_mission()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare
 v_uid uuid:=auth.uid(); v_week_start date:=date_trunc('week',timezone('Asia/Seoul',now())::date::timestamp)::date;
 v_season text:=to_char(timezone('Asia/Seoul',now())::date,'YYYY-MM'); v_claimed boolean:=false;
 v_objectives jsonb; v_done integer:=0; v_multiplier numeric:=1; v_expires timestamptz;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
 select exists(select 1 from public.dori_pass_mega_mission_claims where user_id=v_uid and week_start=v_week_start) into v_claimed;
 select coalesce(doldolcoin_multiplier,1),doldolcoin_multiplier_expires_at into v_multiplier,v_expires from public.users where user_id=v_uid::text limit 1;
 if v_expires is null or v_expires<=now() then v_multiplier:=1; end if;
 select jsonb_agg(jsonb_build_object('key',o.key,'title',o.title,'description',o.description,'progress',least(o.target,o.progress),'raw_progress',o.progress,'target',o.target,'complete',o.progress>=o.target) order by o.sort_order),count(*) filter(where o.progress>=o.target)::integer into v_objectives,v_done
 from (
 select 'daily_missions'::text key,'임무 수집가'::text title,'이번 주 일일 미션 보상을 15회 받으세요.'::text description,15::integer target,public.dori_pass_challenge_progress(v_uid,v_week_start,'daily_missions') progress,1 sort_order
 union all select 'collect_points','포인트 폭풍','이번 주 로키 포인트를 5,000점 모으세요.',5000,public.dori_pass_challenge_progress(v_uid,v_week_start,'collect_points'),2
 union all select 'lucky_drop','행운의 탐험가','이번 주 랜덤박스를 5회 여세요.',5,public.dori_pass_challenge_progress(v_uid,v_week_start,'lucky_drop'),3
 union all select 'focus_routine','집중력의 전설','이번 주 5분 이상 집중 학습을 5회 완료하세요.',5,public.dori_pass_challenge_progress(v_uid,v_week_start,'focus_routine'),4
 union all select 'pass_steps','은하 정복자','이번 주 패스 보상 노드를 5개 수령하세요.',5,public.dori_pass_challenge_progress(v_uid,v_week_start,'pass_steps'),5
 union all select 'market_maker','시장 개척자','이번 주 주식 거래 체결을 3회 기록하세요.',3,public.dori_pass_challenge_progress(v_uid,v_week_start,'market_maker'),6
 ) o;
 return jsonb_build_object('ok',true,'week_start',v_week_start,'week_end',v_week_start+6,'objectives',coalesce(v_objectives,'[]'::jsonb),'completed_objectives',coalesce(v_done,0),'total_objectives',6,'complete',coalesce(v_done,0)=6,'claimed',v_claimed,'claimable',coalesce(v_done,0)=6 and not v_claimed,'rocky_points_reward',8000,'base_coin_reward',1200000,'display_coin_reward',floor(1200000*v_multiplier)::bigint,'coin_multiplier',v_multiplier,'rewards',jsonb_build_array(jsonb_build_object('kind','rocky_points','icon','💠','name','로키 포인트 대보급','amount',8000),jsonb_build_object('kind','coins','icon','🪙','name','돌돌코인 금고','amount',1200000),jsonb_build_object('kind','title','icon','👑','name','메가 미션 정복자','rarity','Myth'),jsonb_build_object('kind','profile_frame','icon','🌌','name','메가 은하 프레임','rarity','Legendary')));
end $function$;
create or replace function public.dori_pass_claim_mega_mission()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare
 v_uid uuid:=auth.uid(); v_today date:=timezone('Asia/Seoul',now())::date; v_week_start date:=date_trunc('week',timezone('Asia/Seoul',now())::date::timestamp)::date;
 v_season text:=to_char(timezone('Asia/Seoul',now())::date,'YYYY-MM'); v_done integer:=0; v_inserted integer; v_coin_result jsonb; v_coins bigint; v_balance bigint;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||'|mega-dori|'||v_week_start::text,0));
 if exists(select 1 from public.dori_pass_mega_mission_claims where user_id=v_uid and week_start=v_week_start) then return jsonb_build_object('ok',false,'reason','already_claimed'); end if;
 select count(*)::integer into v_done from (select public.dori_pass_challenge_progress(v_uid,v_week_start,'daily_missions')>=15 done union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'collect_points')>=5000 union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'lucky_drop')>=5 union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'focus_routine')>=5 union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'pass_steps')>=5 union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'market_maker')>=3) x where done;
 if v_done<6 then return jsonb_build_object('ok',false,'reason','not_completed','completed_objectives',v_done,'total_objectives',6); end if;
 insert into public.dori_pass_mega_mission_claims(user_id,week_start,season_key,rocky_points_reward) values(v_uid,v_week_start,v_season,8000) on conflict(user_id,week_start) do nothing;
 get diagnostics v_inserted=row_count; if v_inserted=0 then return jsonb_build_object('ok',false,'reason','already_claimed'); end if;
 insert into public.dori_pass_rocky_point_wallets(user_id,balance) values(v_uid,0) on conflict(user_id) do nothing;
 insert into public.dori_pass_rocky_point_transactions(user_id,season_key,transaction_type,source_key,amount,mission_date,metadata) values(v_uid,v_season,'weekly_challenge','mega-dori:'||v_week_start::text,8000,v_today,jsonb_build_object('challenge_key','mega_dori','week_start',v_week_start)) on conflict(user_id,transaction_type,source_key) do nothing;
 if not found then raise exception '메가 미션 로키 포인트 기록을 생성하지 못했습니다.'; end if;
 update public.dori_pass_rocky_point_wallets set balance=balance+8000,updated_at=now() where user_id=v_uid returning balance into v_balance;
 v_coin_result:=public.award_doldolcoin(1200000); v_coins:=coalesce((v_coin_result->>'awarded_amount')::bigint,1200000);
 update public.dori_pass_mega_mission_claims set coin_reward=v_coins where user_id=v_uid and week_start=v_week_start;
 insert into public.dori_pass_cosmetics(user_id,season_key,tier,cosmetic_key,kind,display_name,rarity,icon) values(v_uid,v_season,100,'mega-dori-title-'||v_week_start::text,'title','메가 미션 정복자','Myth','👑'),(v_uid,v_season,100,'mega-dori-frame-'||v_week_start::text,'profile_frame','메가 은하 프레임','Legendary','🌌') on conflict(user_id,cosmetic_key) do nothing;
 return jsonb_build_object('ok',true,'rocky_points_reward',8000,'rocky_points',v_balance,'coins',v_coins,'base_coins',1200000,'multiplier',coalesce((v_coin_result->>'multiplier')::numeric,1),'cosmetics',jsonb_build_array(jsonb_build_object('kind','title','name','메가 미션 정복자','rarity','Myth','icon','👑'),jsonb_build_object('kind','profile_frame','name','메가 은하 프레임','rarity','Legendary','icon','🌌')));
end $function$;
revoke all on function public.dori_pass_get_mega_mission() from public,anon;
revoke all on function public.dori_pass_claim_mega_mission() from public,anon;
grant execute on function public.dori_pass_get_mega_mission() to authenticated;
grant execute on function public.dori_pass_claim_mega_mission() to authenticated;
