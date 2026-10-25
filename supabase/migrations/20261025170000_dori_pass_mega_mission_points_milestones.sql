-- Cumulative Mega Dori Mission rewards: 25,000 Rocky Points + 1,200,000 Doldolcoin each week.
-- No frame is granted for the weekly claim. Frames/title are cumulative milestones only.
create table if not exists public.dori_pass_mega_mission_milestones (
 user_id uuid not null references auth.users(id) on delete cascade,
 milestone integer not null check (milestone in (25,50,75,100)),
 season_key text not null check (season_key ~ '^[0-9]{4}-[0-9]{2}$'),
 reward_key text not null,
 claimed_at timestamptz not null default now(),
 primary key(user_id,milestone)
);
alter table public.dori_pass_mega_mission_claims alter column rocky_points_reward set default 0;
update public.dori_pass_mega_mission_claims set rocky_points_reward=0;

create or replace function public.dori_pass_get_mega_mission()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare
 v_uid uuid:=auth.uid(); v_week_start date:=date_trunc('week',timezone('Asia/Seoul',now())::date::timestamp)::date;
 v_claimed boolean:=false; v_objectives jsonb; v_done integer:=0; v_multiplier numeric:=1; v_expires timestamptz;
 v_count integer:=0; v_milestones jsonb;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
 select exists(select 1 from public.dori_pass_mega_mission_claims where user_id=v_uid and week_start=v_week_start) into v_claimed;
 select count(*)::integer into v_count from public.dori_pass_mega_mission_claims where user_id=v_uid;
 select coalesce(doldolcoin_multiplier,1),doldolcoin_multiplier_expires_at into v_multiplier,v_expires from public.users where user_id=v_uid::text limit 1;
 if v_expires is null or v_expires<=now() then v_multiplier:=1; end if;
 select jsonb_agg(jsonb_build_object('key',o.key,'title',o.title,'description',o.description,'progress',least(o.target,o.progress),'raw_progress',o.progress,'target',o.target,'complete',o.progress>=o.target) order by o.sort_order),count(*) filter(where o.progress>=o.target)::integer into v_objectives,v_done
 from (
 select 'daily_missions'::text key,'임무의 지배자'::text title,'이번 주 일일 미션 보상을 50회 받으세요.'::text description,50::integer target,public.dori_pass_challenge_progress(v_uid,v_week_start,'daily_missions') progress,1 sort_order
 union all select 'collect_points','포인트 초신성','이번 주 로키 포인트를 20,000점 모으세요.',20000,public.dori_pass_challenge_progress(v_uid,v_week_start,'collect_points'),2
 union all select 'lucky_drop','행운의 폭풍','이번 주 랜덤박스를 20회 여세요.',20,public.dori_pass_challenge_progress(v_uid,v_week_start,'lucky_drop'),3
 union all select 'focus_routine','초집중 마스터','이번 주 5분 이상 집중 학습을 15회 완료하세요.',15,public.dori_pass_challenge_progress(v_uid,v_week_start,'focus_routine'),4
 union all select 'pass_steps','은하의 정복자','이번 주 패스 보상 노드를 20개 수령하세요.',20,public.dori_pass_challenge_progress(v_uid,v_week_start,'pass_steps'),5
 union all select 'market_maker','전설의 트레이더','이번 주 주식 거래 체결을 15회 기록하세요.',15,public.dori_pass_challenge_progress(v_uid,v_week_start,'market_maker'),6
 ) o;
 select coalesce(jsonb_agg(jsonb_build_object('milestone',m.milestone,'reward_key',m.reward_key,'claimed',c.milestone is not null) order by m.milestone),'[]'::jsonb)
 into v_milestones from (values (25,'일반 프레임'),(50,'엄청난 프레임'),(75,'최종 프레임'),(100,'최종 칭호 + 2,500만 돌돌코인')) m(milestone,reward_key)
 left join public.dori_pass_mega_mission_milestones c on c.user_id=v_uid and c.milestone=m.milestone;
 return jsonb_build_object('ok',true,'week_start',v_week_start,'week_end',v_week_start+6,'objectives',coalesce(v_objectives,'[]'::jsonb),'completed_objectives',coalesce(v_done,0),'total_objectives',6,'complete',coalesce(v_done,0)=6,'claimed',v_claimed,'claimable',coalesce(v_done,0)=6 and not v_claimed,'completion_count',v_count,'rocky_points_reward',25000,'base_coin_reward',1200000,'display_coin_reward',floor(1200000*v_multiplier)::bigint,'coin_multiplier',v_multiplier,'milestones',v_milestones,'rewards',jsonb_build_array(jsonb_build_object('kind','rocky_points','icon','💠','name','로키 포인트 대보급','amount',25000),jsonb_build_object('kind','coins','icon','🪙','name','돌돌코인 금고','amount',1200000)));
end $function$;

create or replace function public.dori_pass_claim_mega_mission()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp' as $function$
declare
 v_uid uuid:=auth.uid(); v_today date:=timezone('Asia/Seoul',now())::date;
 v_week_start date:=date_trunc('week',timezone('Asia/Seoul',now())::date::timestamp)::date;
 v_season text:=to_char(timezone('Asia/Seoul',now())::date,'YYYY-MM'); v_done integer:=0; v_inserted integer;
 v_coin_result jsonb; v_coins bigint; v_balance bigint; v_count integer:=0; v_milestone integer;
 v_milestone_reward text:=''; v_milestone_coins bigint:=0; v_cosmetics jsonb:='[]'::jsonb;
 v_reward_name text; v_reward_kind text; v_reward_rarity text; v_reward_icon text; v_reward_key text; v_multiplier numeric:=1;
begin
 if v_uid is null then raise exception '로그인이 필요합니다.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text||'|mega-dori|'||v_week_start::text,0));
 if exists(select 1 from public.dori_pass_mega_mission_claims where user_id=v_uid and week_start=v_week_start) then return jsonb_build_object('ok',false,'reason','already_claimed'); end if;
 select count(*)::integer into v_done from (
  select public.dori_pass_challenge_progress(v_uid,v_week_start,'daily_missions')>=50 done
  union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'collect_points')>=20000
  union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'lucky_drop')>=20
  union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'focus_routine')>=15
  union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'pass_steps')>=20
  union all select public.dori_pass_challenge_progress(v_uid,v_week_start,'market_maker')>=15
 ) x where done;
 if v_done<6 then return jsonb_build_object('ok',false,'reason','not_completed','completed_objectives',v_done,'total_objectives',6); end if;
 insert into public.dori_pass_mega_mission_claims(user_id,week_start,season_key,rocky_points_reward)
 values(v_uid,v_week_start,v_season,25000) on conflict(user_id,week_start) do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then return jsonb_build_object('ok',false,'reason','already_claimed'); end if;
 insert into public.dori_pass_rocky_point_wallets(user_id,balance) values(v_uid,0) on conflict(user_id) do nothing;
 insert into public.dori_pass_rocky_point_transactions(user_id,season_key,transaction_type,source_key,amount,mission_date,metadata)
 values(v_uid,v_season,'weekly_challenge','mega-dori:'||v_week_start::text,25000,v_today,jsonb_build_object('challenge_key','mega_dori','week_start',v_week_start))
 on conflict(user_id,transaction_type,source_key) do nothing;
 if not found then raise exception '메가 미션 로키 포인트 기록을 생성하지 못했습니다.'; end if;
 update public.dori_pass_rocky_point_wallets set balance=balance+25000,updated_at=now() where user_id=v_uid returning balance into v_balance;
 v_coin_result:=public.award_doldolcoin(1200000);
 v_coins:=coalesce((v_coin_result->>'awarded_amount')::bigint,1200000);
 v_multiplier:=coalesce((v_coin_result->>'multiplier')::numeric,1);
 update public.dori_pass_mega_mission_claims set coin_reward=v_coins where user_id=v_uid and week_start=v_week_start;
 select count(*)::integer into v_count from public.dori_pass_mega_mission_claims where user_id=v_uid;
 for v_milestone in select x from unnest(array[25,50,75,100]) x where x<=v_count order by x loop
  v_reward_name:=case v_milestone when 25 then '일반 프레임' when 50 then '엄청난 프레임' when 75 then '최종 프레임' else '메가 정복자' end;
  v_reward_kind:=case when v_milestone=100 then 'title' else 'profile_frame' end;
  v_reward_rarity:=case v_milestone when 25 then 'Rare' when 50 then 'Epic' else 'Doronum' end;
  v_reward_icon:=case v_milestone when 25 then '🖼️' when 50 then '💠' when 75 then '🌠' else '👑' end;
  v_reward_key:='mega-dori-milestone-'||v_milestone::text;
  insert into public.dori_pass_mega_mission_milestones(user_id,milestone,season_key,reward_key)
  values(v_uid,v_milestone,v_season,v_reward_key) on conflict(user_id,milestone) do nothing;
  if found then
   if v_milestone=100 then
    v_coin_result:=public.award_doldolcoin(25000000);
    v_milestone_coins:=coalesce((v_coin_result->>'awarded_amount')::bigint,25000000);
    v_milestone_reward:='최종 칭호 메가 정복자 + '||to_char(v_milestone_coins,'FM999,999,999,999')||' 돌돌코인';
    insert into public.dori_pass_cosmetics(user_id,season_key,tier,cosmetic_key,kind,display_name,rarity,icon)
    values(v_uid,v_season,100,v_reward_key,'title','메가 정복자','Doronum','👑')
    on conflict(user_id,cosmetic_key) do nothing;
   else
    insert into public.dori_pass_cosmetics(user_id,season_key,tier,cosmetic_key,kind,display_name,rarity,icon)
    values(v_uid,v_season,v_milestone,v_reward_key,'profile_frame',v_reward_name,v_reward_rarity,v_reward_icon)
    on conflict(user_id,cosmetic_key) do nothing;
    v_milestone_reward:=case when v_milestone_reward='' then v_reward_name else v_milestone_reward||' · '||v_reward_name end;
   end if;
   v_cosmetics:=v_cosmetics||jsonb_build_array(jsonb_build_object('kind',v_reward_kind,'name',v_reward_name,'rarity',v_reward_rarity,'icon',v_reward_icon));
  end if;
 end loop;
 return jsonb_build_object('ok',true,'completion_count',v_count,'rocky_points_reward',25000,'rocky_points_balance',v_balance,'coins',v_coins,'base_coins',1200000,'multiplier',v_multiplier,'milestone_reward',nullif(v_milestone_reward,''),'milestone_coins',v_milestone_coins,'cosmetics',v_cosmetics);
end $function$;
revoke all on function public.dori_pass_get_mega_mission() from public,anon;
revoke all on function public.dori_pass_claim_mega_mission() from public,anon;
grant execute on function public.dori_pass_get_mega_mission() to authenticated;
grant execute on function public.dori_pass_claim_mega_mission() to authenticated;
