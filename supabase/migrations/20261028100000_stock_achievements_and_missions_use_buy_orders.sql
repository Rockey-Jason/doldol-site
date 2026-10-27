-- Stock achievements and Dori Pass missions now progress from valid BUY orders rather than executions.
-- A submitted buy order counts unless cancelled, expired, or rejected.
CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_achievement public.achievements%rowtype;
  v_user public.users%rowtype;
  v_achievements jsonb;
  v_reward_coin bigint;
  v_reward_exp bigint;
  v_new_exp bigint;
  v_old_level bigint;
  v_new_level bigint;
  v_news_count bigint := 0;
  v_box_count bigint := 0;
  v_condition_met boolean := false;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select * into v_achievement
  from public.achievements
  where id = p_achievement_id and enabled = true;

  if not found then
    return jsonb_build_object(
      'success', false,
      'already_claimed', false,
      'achievement_id', p_achievement_id,
      'reason', 'achievement_not_found'
    );
  end if;

  select * into v_user
  from public.users
  where user_id = v_uid::text
  for update;

  if not found then
    raise exception '사용자 정보를 찾을 수 없습니다.';
  end if;

  v_achievements := coalesce(v_user.user_achievement, '{}'::jsonb);

  if v_achievements ? p_achievement_id then
    return jsonb_build_object(
      'success', false,
      'already_claimed', true,
      'achievement_id', p_achievement_id
    );
  end if;

  if jsonb_typeof(coalesce(v_user.read_dori_news_numbers, '[]'::jsonb)) = 'array' then
    v_news_count := jsonb_array_length(coalesce(v_user.read_dori_news_numbers, '[]'::jsonb));
  end if;

  if p_achievement_id in ('first_box', 'tenth_box', 'hundred_box', 'thousand_box') then
    select count(*) into v_box_count
    from public.dori_box_history
    where user_id = v_uid;
  end if;

  case p_achievement_id
    when 'first_login' then v_condition_met := true;

    when 'first_chess' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid;

    when 'chess_win_talc' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'talc' and result = '1-0';

    when 'chess_win_sleeping' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'sleep' and result = '1-0';

    when 'chess_win_fur' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'fur' and result = '1-0';

    when 'chess_win_rockey' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'rockey' and result = '1-0';

    when 'chess_win_army' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'army' and result = '1-0';

    when 'chess_win_doronum' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'doronum' and result = '1-0';

    when 'chess_win_brilliant' then
      select count(*) > 0 into v_condition_met
      from public.chess_games where user_id = v_uid and bot_id = 'brilliant' and result = '1-0';

    when 'chess_10_win' then
      select count(*) >= 10 into v_condition_met
      from public.chess_games where user_id = v_uid and result = '1-0';

    when 'chess_100_win' then
      select count(*) >= 100 into v_condition_met
      from public.chess_games where user_id = v_uid and result = '1-0';

    when 'read_news' then
      v_condition_met := coalesce(v_user.read_dori_news, 0) >= 1 or v_news_count >= 1;

    when 'quiz_correct' then
      v_condition_met := v_user.quiz_right;

    when 'read_1_news' then
      v_condition_met := v_news_count >= 1;

    when 'read_10_news' then
      v_condition_met := v_news_count >= 10;

    when 'rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 100000000;

    when 'very_rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 1000000000000;

    when 'super_rich' then
      v_condition_met := coalesce(v_user.doldolcoin, 0) >= 10000000000000000;

    when 'rockey_7777777' then
      v_condition_met := coalesce(v_user.special_title_draws, 0) >= 7;

    when 'first_box' then
      v_condition_met := v_box_count >= 1;

    when 'tenth_box' then
      v_condition_met := v_box_count >= 10;

    when 'hundred_box' then
      v_condition_met := v_box_count >= 100;

    when 'thousand_box' then
      v_condition_met := v_box_count >= 1000;

    -- Stock-related achievements are based on submitted BUY orders, not executions.
    -- Cancelled/expired/rejected orders do not count. Legacy BUY trades are retained for compatibility.
    when 'first_dori_electronics' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=4 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=4 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockey_doronium' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=3 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=3 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockeypaper' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=1 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=1 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_bandoche' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=2 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=2 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_food' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=5 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=5 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_rockeycloth' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and stock_id=6 and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and stock_id=6 and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'first_stock' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_first_sell' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_10_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 10 into v_condition_met;
    when 'stock_50_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 50 into v_condition_met;
    when 'stock_100_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 100 into v_condition_met;
    when 'stock_500_trades' then
      select ((select count(*) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) +
              (select count(*) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY')) >= 500 into v_condition_met;
    when 'stock_buy_10_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10 into v_condition_met;
    when 'stock_buy_100_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100 into v_condition_met;
    when 'stock_buy_1000_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 1000 into v_condition_met;
    when 'stock_sell_10_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10 into v_condition_met;
    when 'stock_sell_100_shares' then
      select coalesce((select sum(original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(quantity) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100 into v_condition_met;
    when 'stock_volume_1m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 1000000 into v_condition_met;
    when 'stock_volume_10m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 10000000 into v_condition_met;
    when 'stock_volume_100m' then
      select coalesce((select sum(limit_price*original_quantity) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')),0) +
             coalesce((select sum(total_amount) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY'),0) >= 100000000 into v_condition_met;
    when 'stock_3_companies' then
      select (select count(distinct stock_id) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 3
        or (select count(distinct stock_id) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 3 into v_condition_met;
    when 'stock_6_companies' then
      select (select count(distinct stock_id) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 6
        or (select count(distinct stock_id) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 6 into v_condition_met;
    when 'stock_5_trading_days' then
      select (select count(distinct created_at::date) from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')) >= 5
        or (select count(distinct created_at::date) from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY') >= 5 into v_condition_met;
    when 'stock_round_trip' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>0) into v_condition_met;
    when 'stock_bulk_buy_100' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and original_quantity>=100 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>=100) into v_condition_met;
    when 'stock_bulk_buy_1000' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and original_quantity>=1000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and quantity>=1000) into v_condition_met;
    when 'stock_single_trade_1m' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and limit_price*original_quantity>=1000000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and total_amount>=1000000) into v_condition_met;
    when 'stock_single_trade_10m' then
      select exists(select 1 from public.dori_stock_orders where user_id=v_uid and upper(side)='BUY' and limit_price*original_quantity>=10000000 and upper(status) not in ('CANCELLED','EXPIRED','REJECTED'))
        or exists(select 1 from public.dori_stock_trades where user_id=v_uid and upper(trade_type)='BUY' and total_amount>=10000000) into v_condition_met;

    when 'attendance_7_days' then
      v_condition_met := (select count(*) >= 7 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_30_days' then
      v_condition_met := (select count(*) >= 30 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_100_days' then
      v_condition_met := (select count(*) >= 100 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_streak_7' then
      v_condition_met := (select coalesce(max(streak_count),0) >= 7 from public.user_daily_attendance where user_id=v_uid::text);

    when 'attendance_streak_30' then
      v_condition_met := (select coalesce(max(streak_count),0) >= 30 from public.user_daily_attendance where user_id=v_uid::text);

    when 'mission_10' then
      v_condition_met := (select count(*) >= 10 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_50' then
      v_condition_met := (select count(*) >= 50 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_100' then
      v_condition_met := (select count(*) >= 100 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_7_days' then
      v_condition_met := (select count(distinct mission_date) >= 7 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_30_days' then
      v_condition_met := (select count(distinct mission_date) >= 30 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'study_focus_1h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 3600 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_10h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 36000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_50h' then
      v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 180000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_50' then
      v_condition_met := (select count(*) >= 50 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_exam_1' then
      v_condition_met := exists(select 1 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_exam_5' then
      v_condition_met := (select count(*) >= 5 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_time_attack_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_time_attack_50' then
      v_condition_met := (select count(*) >= 50 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_100' then
      v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 100 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'bank_account_opened' then
      v_condition_met := exists(select 1 from public.dori_bank_accounts where auth_user_id=v_uid and lower(coalesce(status,'')) not in ('closed','deleted'));

    when 'bank_transfer_1' then
      v_condition_met := exists(select 1 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_transactions_10' then
      v_condition_met := (select count(*) >= 10 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_deposit_1' then
      v_condition_met := exists(select 1 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_5' then
      v_condition_met := (select count(*) >= 5 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_matured' then
      v_condition_met := exists(select 1 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_loan_1' then
      v_condition_met := exists(select 1 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_repaid_1' then
      v_condition_met := exists(select 1 from public.dori_bank_loans where auth_user_id=v_uid and (settled_at is not null or lower(coalesce(status,'')) in ('repaid','paid','settled','completed','상환완료')));

    when 'news_survey_1' then
      v_condition_met := (select count(*) >= 1 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_5' then
      v_condition_met := (select count(*) >= 5 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_20' then
      v_condition_met := (select count(*) >= 20 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'event_participation_1' then
      v_condition_met := (select count(*) >= 1 from public.event_participations where user_id=v_uid::text);

    when 'event_participation_10' then
      v_condition_met := (select count(*) >= 10 from public.event_participations where user_id=v_uid::text);

    when 'event_quiz_1' then
      v_condition_met := exists(select 1 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'event_quiz_10' then
      v_condition_met := (select count(*) >= 10 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'box_rare_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='RARE');

    when 'box_epic_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='EPIC');

    when 'box_legendary_reward' then
      v_condition_met := exists(select 1 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='LEGENDARY');

    when 'box_total_500' then
      v_condition_met := (select count(*) >= 500 from public.dori_box_history where user_id=v_uid);

    when 'box_total_5000' then
      v_condition_met := (select count(*) >= 5000 from public.dori_box_history where user_id=v_uid);

    when 'chess_25_win' then
      v_condition_met := (select count(*) >= 25 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_50_win' then
      v_condition_met := (select count(*) >= 50 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_250_win' then
      v_condition_met := (select count(*) >= 250 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_500_win' then
      v_condition_met := (select count(*) >= 500 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_play_100' then
      v_condition_met := (select count(*) >= 100 from public.chess_games where user_id=v_uid);

    when 'coin_1m' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=1000000;

    when 'coin_10m' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=10000000;

    when 'coin_1b' then
      v_condition_met := coalesce(v_user.doldolcoin,0)>=1000000000;

    when 'collection_5_items' then
      v_condition_met := (select count(distinct item_id) >= 5 from public.user_inventory where user_id=v_uid);

    when 'collection_10_items' then
      v_condition_met := (select count(distinct item_id) >= 10 from public.user_inventory where user_id=v_uid);

    when 'collection_25_items' then
      v_condition_met := (select count(distinct item_id) >= 25 from public.user_inventory where user_id=v_uid);

    when 'stock_dividend_1' then
      v_condition_met := exists(select 1 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_100k' then
      v_condition_met := (select coalesce(sum(amount),0) >= 100000 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_1m' then
      v_condition_met := (select coalesce(sum(amount),0) >= 1000000 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'attendance_200_days' then v_condition_met := (select count(*) >= 200 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_365_days' then v_condition_met := (select count(*) >= 365 from public.user_attendance_days where user_id=v_uid::text);

    when 'attendance_streak_14' then v_condition_met := (select coalesce(max(streak_count),0) >= 14 from public.user_daily_attendance where user_id=v_uid::text);

    when 'attendance_streak_100' then v_condition_met := (select coalesce(max(streak_count),0) >= 100 from public.user_daily_attendance where user_id=v_uid::text);

    when 'mission_200' then v_condition_met := (select count(*) >= 200 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_500' then v_condition_met := (select count(*) >= 500 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_1000' then v_condition_met := (select count(*) >= 1000 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_100_days' then v_condition_met := (select count(distinct mission_date) >= 100 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'mission_365_days' then v_condition_met := (select count(distinct mission_date) >= 365 from public.user_daily_missions where user_id=v_uid and completed_at is not null);

    when 'study_focus_100h' then v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 360000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_focus_200h' then v_condition_met := (select coalesce(sum(greatest(actual_seconds,0)),0) >= 720000 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_100' then v_condition_met := (select count(*) >= 100 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_sessions_250' then v_condition_met := (select count(*) >= 250 from public.rockey_study_focus_sessions where user_id=v_uid and actual_seconds>0);

    when 'study_exam_10' then v_condition_met := (select count(*) >= 10 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_exam_25' then v_condition_met := (select count(*) >= 25 from public.rockey_study_exam_records where user_id=v_uid);

    when 'study_time_attack_100' then v_condition_met := (select count(*) >= 100 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_time_attack_250' then v_condition_met := (select count(*) >= 250 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_500' then v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 500 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'study_questions_1000' then v_condition_met := (select coalesce(sum(greatest(question_count,0)),0) >= 1000 from public.rockey_study_time_attack_records where user_id=v_uid);

    when 'bank_transactions_50' then v_condition_met := (select count(*) >= 50 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_transactions_100' then v_condition_met := (select count(*) >= 100 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid);

    when 'bank_transfer_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_transfer_50' then v_condition_met := (select count(*) >= 50 from public.dori_bank_transactions t join public.dori_bank_accounts a on a.account_number=t.account_number where a.auth_user_id=v_uid and (lower(coalesce(t.tx_type,'')) like '%transfer%' or coalesce(t.tx_type,'') like '%송금%'));

    when 'bank_deposit_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_25' then v_condition_met := (select count(*) >= 25 from public.dori_bank_deposits where auth_user_id=v_uid);

    when 'bank_deposit_matured_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_deposit_matured_20' then v_condition_met := (select count(*) >= 20 from public.dori_bank_deposits where auth_user_id=v_uid and settled_at is not null);

    when 'bank_loan_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_10' then v_condition_met := (select count(*) >= 10 from public.dori_bank_loans where auth_user_id=v_uid);

    when 'bank_loan_repaid_5' then v_condition_met := (select count(*) >= 5 from public.dori_bank_loans where auth_user_id=v_uid and (settled_at is not null or lower(coalesce(status,'')) in ('repaid','paid','settled','completed','상환완료')));

    when 'news_survey_50' then v_condition_met := (select count(*) >= 50 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'news_survey_100' then v_condition_met := (select count(*) >= 100 from public.rockey_news_survey_responses where user_id=v_uid::text);

    when 'event_participation_25' then v_condition_met := (select count(*) >= 25 from public.event_participations where user_id=v_uid::text);

    when 'event_participation_50' then v_condition_met := (select count(*) >= 50 from public.event_participations where user_id=v_uid::text);

    when 'event_quiz_25' then v_condition_met := (select count(*) >= 25 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'event_quiz_50' then v_condition_met := (select count(*) >= 50 from public.rockey_news_event_attempts where user_id=v_uid::text and completed=true);

    when 'box_total_25' then v_condition_met := (select count(*) >= 25 from public.dori_box_history where user_id=v_uid);

    when 'box_total_250' then v_condition_met := (select count(*) >= 250 from public.dori_box_history where user_id=v_uid);

    when 'box_total_10000' then v_condition_met := (select count(*) >= 10000 from public.dori_box_history where user_id=v_uid);

    when 'box_rare_10' then v_condition_met := (select count(*) >= 10 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='RARE');

    when 'box_epic_10' then v_condition_met := (select count(*) >= 10 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='EPIC');

    when 'box_legendary_5' then v_condition_met := (select count(*) >= 5 from public.dori_box_history where user_id=v_uid and upper(coalesce(rarity,''))='LEGENDARY');

    when 'chess_5_win' then v_condition_met := (select count(*) >= 5 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_1000_win' then v_condition_met := (select count(*) >= 1000 from public.chess_games where user_id=v_uid and result='1-0');

    when 'chess_play_500' then v_condition_met := (select count(*) >= 500 from public.chess_games where user_id=v_uid);

    when 'coin_100k' then v_condition_met := coalesce(v_user.doldolcoin,0)>=100000;

    when 'coin_100m' then v_condition_met := coalesce(v_user.doldolcoin,0)>=100000000;

    when 'coin_10b' then v_condition_met := coalesce(v_user.doldolcoin,0)>=10000000000;

    when 'collection_50_items' then v_condition_met := (select count(distinct item_id) >= 50 from public.user_inventory where user_id=v_uid);

    when 'collection_100_items' then v_condition_met := (select count(distinct item_id) >= 100 from public.user_inventory where user_id=v_uid);

    when 'stock_dividend_10' then v_condition_met := (select count(*) >= 10 from public.dori_stock_dividend_payments where user_id=v_uid);

    when 'stock_dividend_10m' then v_condition_met := (select coalesce(sum(amount),0) >= 10000000 from public.dori_stock_dividend_payments where user_id=v_uid);

    else
      v_condition_met := false;

  end case;

  if not v_condition_met then
    return jsonb_build_object(
      'success', false,
      'already_claimed', false,
      'achievement_id', p_achievement_id,
      'reason', 'condition_not_met'
    );
  end if;

  v_reward_coin := coalesce(v_achievement.reward_doldolcoin, 0);
  IF v_user.doldolcoin_multiplier_expires_at IS NOT NULL AND v_user.doldolcoin_multiplier_expires_at > now() THEN
    v_reward_coin := floor(v_reward_coin * coalesce(v_user.doldolcoin_multiplier, 1))::bigint;
  END IF;
  v_reward_exp := coalesce(v_achievement.reward_exp, 0);
  v_new_exp := coalesce(v_user.exp, 0) + v_reward_exp;
  v_old_level := greatest(1, coalesce(v_user.exp_level, 1));

  v_new_level := case
    when v_new_exp >= 100000 then 11
    when v_new_exp >= 50000 then 10
    when v_new_exp >= 40000 then 9
    when v_new_exp >= 30000 then 8
    when v_new_exp >= 20000 then 7
    when v_new_exp >= 10000 then 6
    when v_new_exp >= 5000 then 5
    when v_new_exp >= 1000 then 4
    when v_new_exp >= 500 then 3
    when v_new_exp >= 100 then 2
    else 1
  end;

  v_achievements := jsonb_set(
    v_achievements,
    array[p_achievement_id],
    jsonb_build_object(
      'id', v_achievement.id,
      '이름', v_achievement.name,
      '설명', v_achievement.description,
      '희귀도', v_achievement.rarity,
      '보상', jsonb_build_object('돌돌코인', v_reward_coin, '경험치', v_reward_exp),
      '칭호', v_achievement.title,
      '아이콘', v_achievement.icon,
      '획득시간', now()
    ),
    true
  );

  update public.users
  set user_achievement = v_achievements,
      doldolcoin = coalesce(v_user.doldolcoin, 0) + v_reward_coin,
      exp = v_new_exp,
      exp_level = v_new_level
  where user_id = v_uid::text;

  return jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'achievement_id', v_achievement.id,
    'name', v_achievement.name,
    'description', v_achievement.description,
    'rarity', v_achievement.rarity,
    'icon', v_achievement.icon,
    'title', v_achievement.title,
    'reward_doldolcoin', v_reward_coin, 'base_reward_doldolcoin', coalesce(v_achievement.reward_doldolcoin, 0), 'coin_multiplier', CASE WHEN v_user.doldolcoin_multiplier_expires_at IS NOT NULL AND v_user.doldolcoin_multiplier_expires_at > now() THEN coalesce(v_user.doldolcoin_multiplier, 1) ELSE 1 END,
    'reward_exp', v_reward_exp,
    'old_exp', coalesce(v_user.exp, 0),
    'new_exp', v_new_exp,
    'old_level', v_old_level,
    'new_level', v_new_level
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dori_pass_challenge_progress(p_uid uuid, p_week_start date, p_key text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_count integer:=0;
  v_end date:=timezone('Asia/Seoul',now())::date;
  v_start_ts timestamptz:=(p_week_start::timestamp at time zone 'Asia/Seoul');
  v_end_ts timestamptz:=((timezone('Asia/Seoul',now())::date+1)::timestamp at time zone 'Asia/Seoul');
  v_season text:=to_char(timezone('Asia/Seoul',now())::date,'YYYY-MM');
begin
  case p_key
    when 'daily_missions' then
      select count(*)::integer into v_count from public.dori_pass_rocky_point_transactions
      where user_id=p_uid and season_key=v_season and transaction_type='daily_mission'
        and mission_date between p_week_start and v_end;
    when 'collect_points' then
      select coalesce(sum(amount),0)::integer into v_count from public.dori_pass_rocky_point_transactions
      where user_id=p_uid and season_key=v_season and mission_date between p_week_start and v_end;
    when 'lucky_drop' then
      select count(*)::integer into v_count from public.dori_box_history
      where user_id=p_uid and created_at>=v_start_ts and created_at<v_end_ts;
    when 'focus_routine' then
      select count(*)::integer into v_count from public.rockey_study_focus_sessions
      where user_id=p_uid and session_type='focus' and status='completed' and actual_seconds>=300
        and ended_at>=v_start_ts and ended_at<v_end_ts;
    when 'pass_steps' then
      select count(*)::integer into v_count from public.dori_pass_tier_claims
      where user_id=p_uid and season_key=v_season and claimed_at>=v_start_ts and claimed_at<v_end_ts;
    when 'market_maker' then
      select count(*)::integer into v_count from public.dori_stock_orders
      where user_id=p_uid and upper(side)='BUY'
        and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')
        and created_at>=v_start_ts and created_at<v_end_ts;
    else v_count:=0;
  end case;
  return coalesce(v_count,0);
end
$function$
;

CREATE OR REPLACE FUNCTION public.dori_pass_get_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid:=auth.uid();
  v_today date:=timezone('Asia/Seoul',now())::date;
  v_season_key text;
  v_start date;
  v_end date;
  v_week_start date;
  v_points bigint:=0;
  v_season_points integer:=0;
  v_coin_multiplier numeric:=1;
  v_coin_multiplier_expires timestamptz;
  v_tier integer:=0;
  v_claimed_tier integer:=0;
  v_next_cost integer:=0;
  v_next_required integer:=0;
  v_next_progress integer:=0;
  v_name text;
  v_today_earned integer:=0;
  v_today_claimed integer:=0;
  v_missions jsonb:='[]'::jsonb;
  v_tiers jsonb:='[]'::jsonb;
  v_challenges jsonb:='[]'::jsonb;
  v_achievements jsonb:='[]'::jsonb;
  v_cosmetics jsonb:='[]'::jsonb;
  v_claimed_challenges integer:=0;
  v_claimed_achievements integer:=0;
  v_domain_count integer:=0;
  r record;
  v_progress integer;
begin
  if v_uid is null then raise exception '로그인 후 돌이 패스를 이용할 수 있습니다.'; end if;
  v_season_key:=to_char(v_today,'YYYY-MM');
  v_start:=date_trunc('month',v_today::timestamp)::date;
  v_end:=(v_start+interval '1 month')::date;
  v_week_start:=date_trunc('week',v_today::timestamp)::date;

  insert into public.dori_pass_rocky_point_wallets(user_id,balance)
  values(v_uid,0) on conflict(user_id) do nothing;
  select balance into v_points from public.dori_pass_rocky_point_wallets where user_id=v_uid;
  select name,coalesce(doldolcoin_multiplier,1),doldolcoin_multiplier_expires_at
    into v_name,v_coin_multiplier,v_coin_multiplier_expires
  from public.users where user_id=v_uid::text limit 1;
  if v_coin_multiplier_expires is null or v_coin_multiplier_expires<=now() then
    v_coin_multiplier:=1;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text||'|missions|'||v_today::text,0));
  if not exists(select 1 from public.dori_pass_daily_missions where user_id=v_uid and mission_date=v_today) then
    insert into public.dori_pass_daily_missions(user_id,mission_date,slot,mission_key,title,description,target,reward_points)
    select v_uid,v_today,row_number() over(order by random())::integer,chosen.mission_key,chosen.title,chosen.description,chosen.target,chosen.reward_points
    from (
      select tpl.* from (values
        ('attendance','출석 도장','오늘의 출석 체크를 완료하세요.',1,180),
        ('daily_mission','일일 목표 달성','오늘의 일일 미션을 2개 완료하세요.',2,220),
        ('random_box','행운의 상자','랜덤박스를 1회 열어 보세요.',1,180),
        ('chess_game','전략가의 한 수','오늘 체스 대국을 1회 완료하세요.',1,280),
        ('study_focus','집중력 충전','5분 이상 집중 학습을 1회 완료하세요.',1,300),
        ('stock_trade','시장 탐험','주식 매수 주문을 1회 제출하세요.',1,220),
        ('bank_transaction','은행 이용','돌이 은행 거래를 1회 완료하세요.',1,200),
        ('study_plan','내일을 설계','오늘의 학습 계획을 저장하세요.',1,180)
      ) as tpl(mission_key,title,description,target,reward_points)
      where tpl.mission_key <> 'bank_transaction'
        or exists(select 1 from public.dori_bank_accounts a where a.auth_user_id=v_uid and a.status='active')
      order by random() limit 5
    ) chosen
    on conflict(user_id,mission_date,mission_key) do nothing;
  end if;

  for r in select slot,mission_key,target,claimed_at from public.dori_pass_daily_missions
    where user_id=v_uid and mission_date=v_today order by slot
  loop
    v_progress:=public.dori_pass_mission_progress(v_uid,v_today,r.mission_key);
    update public.dori_pass_daily_missions
    set progress=least(target,v_progress),
        completed_at=case when v_progress>=target then coalesce(completed_at,now()) else completed_at end
    where user_id=v_uid and mission_date=v_today and slot=r.slot and claimed_at is null;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'slot',m.slot,'key',m.mission_key,'title',m.title,'description',m.description,
    'target',m.target,'progress',least(m.target,public.dori_pass_mission_progress(v_uid,v_today,m.mission_key)),
    'reward_points',m.reward_points,
    'completed',(public.dori_pass_mission_progress(v_uid,v_today,m.mission_key)>=m.target),
    'claimed',(m.claimed_at is not null),
    'claimable',(m.claimed_at is null and public.dori_pass_mission_progress(v_uid,v_today,m.mission_key)>=m.target)
  ) order by m.slot),'[]'::jsonb),
  count(*) filter(where m.claimed_at is not null)::integer
  into v_missions,v_today_claimed
  from public.dori_pass_daily_missions m
  where m.user_id=v_uid and m.mission_date=v_today;

  select coalesce(sum(amount),0)::integer into v_today_earned
  from public.dori_pass_rocky_point_transactions
  where user_id=v_uid and season_key=v_season_key and mission_date=v_today;

  select coalesce(sum(amount),0)::integer into v_season_points
  from public.dori_pass_rocky_point_transactions
  where user_id=v_uid and season_key=v_season_key;

  select coalesce(max(g.tier),0)::integer into v_tier
  from generate_series(1,100) g(tier)
  where public.dori_pass_tier_total_required(g.tier)<=v_season_points;
  -- Preserve tiers that were already claimed before Rocky Points replaced the old EXP-style track.
  select coalesce(max(tier),0)::integer into v_claimed_tier
  from public.dori_pass_tier_claims where user_id=v_uid and season_key=v_season_key;
  v_tier:=greatest(v_tier,v_claimed_tier);
  if v_tier<100 then
    v_next_required:=public.dori_pass_tier_total_required(v_tier+1);
    if v_season_points < public.dori_pass_tier_total_required(v_tier) then
      -- Prior reward claims from the earlier pass version are preserved, but
      -- do not pretend those legacy claims generated Rocky Points this season.
      v_next_cost:=v_next_required;
      v_next_progress:=v_season_points;
    else
      v_next_cost:=public.dori_pass_tier_cost(v_tier+1);
      v_next_progress:=greatest(0,v_season_points-public.dori_pass_tier_total_required(v_tier));
    end if;
  end if;

  select coalesce(jsonb_agg(
    public.dori_pass_tier_reward(v_season_key,g.tier)||
    jsonb_build_object('display_coins',case when c.tier is not null then c.coin_reward else floor((public.dori_pass_tier_reward(v_season_key,g.tier)->>'coins')::numeric*v_coin_multiplier)::bigint end,'coin_multiplier',v_coin_multiplier,'claimed',c.tier is not null,
       'unlocked',g.tier<=v_tier,
       'claimable',g.tier<=v_tier and c.tier is null)
    order by g.tier
  ),'[]'::jsonb)
  into v_tiers
  from generate_series(1,100) g(tier)
  left join public.dori_pass_tier_claims c on c.user_id=v_uid and c.season_key=v_season_key and c.tier=g.tier;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',q.challenge_key,'title',q.title,'description',q.description,
    'target',q.target_count,'progress',least(q.target_count,q.current_count),
    'raw_progress',q.current_count,'rocky_points_reward',q.reward_points,
    'claimed',q.is_claimed,'claimable',(q.current_count>=q.target_count and not q.is_claimed)
  ) order by q.sort_order),'[]'::jsonb)
  into v_challenges
  from (
    select defs.*,
      public.dori_pass_challenge_progress(v_uid,v_week_start,defs.challenge_key) as current_count,
      exists(select 1 from public.dori_pass_challenge_claims cc
       where cc.user_id=v_uid and cc.season_key=v_season_key and cc.week_start=v_week_start and cc.challenge_key=defs.challenge_key) as is_claimed
    from (values
      ('daily_missions','임무 수집가','이번 주 일일 미션 보상을 10회 받으세요.','daily_missions',10,650,1),
      ('collect_points','포인트 러너','이번 주 로키 포인트를 2,500점 모으세요.','collect_points',2500,900,2),
      ('lucky_drop','행운 사냥꾼','이번 주 랜덤박스를 5회 열어 보세요.','lucky_drop',5,600,3),
      ('focus_routine','집중의 달인','이번 주 5분 이상 집중 학습을 3회 완료하세요.','focus_routine',3,800,4),
      ('pass_steps','패스 탐험가','이번 주 패스 보상 노드를 3개 수령하세요.','pass_steps',3,700,5),
      ('market_maker','시장 개척자','이번 주 주식 매수 주문을 2회 제출하세요.','market_maker',2,650,6)
    ) as defs(challenge_key,title,description,event_key,target_count,reward_points,sort_order)
  ) q;

  select count(*)::integer into v_claimed_challenges
  from public.dori_pass_challenge_claims where user_id=v_uid and season_key=v_season_key;
  select count(*)::integer into v_claimed_achievements
  from public.dori_pass_achievement_claims where user_id=v_uid and season_key=v_season_key;
  select count(distinct mission_key)::integer into v_domain_count
  from public.dori_pass_daily_missions
  where user_id=v_uid and mission_date>=v_start and mission_date<v_today+1 and claimed_at is not null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',a.achievement_key,'title',a.title,'description',a.description,
    'progress',least(a.target_value,a.current_value),'raw_progress',a.current_value,
    'target',a.target_value,'coin_reward',a.coin_reward,'display_coin_reward',case when a.is_claimed then coalesce(a.claimed_coin_reward,a.coin_reward) else floor(a.coin_reward*v_coin_multiplier)::bigint end,
    'claimed',a.is_claimed,'claimable',(a.current_value>=a.target_value and not a.is_claimed)
  ) order by a.sort_order),'[]'::jsonb)
  into v_achievements
  from (
    select defs.*,
      exists(select 1 from public.dori_pass_achievement_claims ac
        where ac.user_id=v_uid and ac.season_key=v_season_key and ac.achievement_key=defs.achievement_key) as is_claimed,
      (select ac.coin_reward from public.dori_pass_achievement_claims ac
        where ac.user_id=v_uid and ac.season_key=v_season_key and ac.achievement_key=defs.achievement_key limit 1) as claimed_coin_reward
    from (values
      ('first_100','로키 포인트 첫걸음','이번 시즌 로키 포인트 100점을 모으세요.',v_season_points,100,5000::bigint,1),
      ('tier_25','은하의 개척자','패스 25단계에 도달하세요.',v_tier,25,25000::bigint,2),
      ('tier_50','성장의 정점','패스 50단계에 도달하세요.',v_tier,50,75000::bigint,3),
      ('tier_100','시즌 정복자','패스 100단계를 완주하세요.',v_tier,100,500000::bigint,4),
      ('weekly_hero','주간 도전가','이번 시즌 주간 도전 보상을 8회 수령하세요.',v_claimed_challenges,8,100000::bigint,5),
      ('multi_domain','올라운더','이번 시즌 4종류 이상의 일일 미션 보상을 받으세요.',v_domain_count,4,50000::bigint,6)
    ) as defs(achievement_key,title,description,current_value,target_value,coin_reward,sort_order)
  ) a;

  select coalesce(jsonb_agg(jsonb_build_object(
    'key',cosmetic_key,'season_key',season_key,'tier',tier,'kind',kind,
    'name',display_name,'rarity',rarity,'icon',icon,'equipped',is_equipped,'claimed_at',claimed_at
  ) order by claimed_at desc),'[]'::jsonb)
  into v_cosmetics from public.dori_pass_cosmetics where user_id=v_uid;

  return jsonb_build_object(
    'ok',true,'user_name',coalesce(v_name,'탐험가'),
    'season',jsonb_build_object('key',v_season_key,
      'name',to_char(v_start,'YYYY.MM')||' · '||public.dori_pass_season_name(v_start),
      'start_date',v_start,'end_date',v_end,'days_total',v_end-v_start,
      'day_number',v_today-v_start+1,'days_left',greatest(0,v_end-v_today),'week_start',v_week_start),
    'rocky_points',v_points,'season_points',v_season_points,'coin_multiplier',v_coin_multiplier,
    'tier',v_tier,'max_tier',100,
    'next_tier_cost',v_next_cost,'next_tier_required',v_next_required,
    'next_tier_progress',v_next_progress,
    'next_tier_remaining',greatest(0,v_next_cost-v_next_progress),
    'today_points_earned',v_today_earned,'today_missions_claimed',v_today_claimed,
    'daily_missions',v_missions,'tiers',v_tiers,'challenges',v_challenges,
    'achievements',v_achievements,'cosmetics',v_cosmetics,
    'claimed_weekly_challenges',v_claimed_challenges,
    'claimed_season_achievements',v_claimed_achievements,
    'active_domains',v_domain_count
  );
end
$function$
;

CREATE OR REPLACE FUNCTION public.dori_pass_get_mega_mission()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
  select 'daily_missions'::text key,'임무의 지배자'::text title,'이번 주 일일 미션 보상을 25회 받으세요.'::text description,25::integer target,public.dori_pass_challenge_progress(v_uid,v_week_start,'daily_missions') progress,1 sort_order
  union all select 'collect_points','포인트 초신성','이번 주 로키 포인트를 10,000점 모으세요.',10000,public.dori_pass_challenge_progress(v_uid,v_week_start,'collect_points'),2
  union all select 'lucky_drop','행운의 폭풍','이번 주 랜덤박스를 20회 여세요.',20,public.dori_pass_challenge_progress(v_uid,v_week_start,'lucky_drop'),3
  union all select 'focus_routine','초집중 마스터','이번 주 5분 이상 집중 학습을 15회 완료하세요.',15,public.dori_pass_challenge_progress(v_uid,v_week_start,'focus_routine'),4
  union all select 'pass_steps','은하의 정복자','이번 주 패스 보상 노드를 20개 수령하세요.',20,public.dori_pass_challenge_progress(v_uid,v_week_start,'pass_steps'),5
  union all select 'market_maker','전설의 트레이더','이번 주 주식 매수 주문을 15회 제출하세요.',15,public.dori_pass_challenge_progress(v_uid,v_week_start,'market_maker'),6
 ) o;
 select coalesce(jsonb_agg(jsonb_build_object('milestone',m.milestone,'reward_key',m.reward_key,'claimed',c.milestone is not null) order by m.milestone),'[]'::jsonb)
 into v_milestones from (values
  (1,'100,000 돌돌코인'),(5,'1,000,000 돌돌코인'),(10,'고급진 프레임'),
  (20,'5,000,000 돌돌코인'),(30,'도로늄 등급 칭호')
 ) m(milestone,reward_key)
 left join public.dori_pass_mega_mission_milestones c on c.user_id=v_uid and c.milestone=m.milestone;
 return jsonb_build_object('ok',true,'week_start',v_week_start,'week_end',v_week_start+6,
  'objectives',coalesce(v_objectives,'[]'::jsonb),'completed_objectives',coalesce(v_done,0),
  'total_objectives',6,'complete',coalesce(v_done,0)=6,'claimed',v_claimed,
  'claimable',coalesce(v_done,0)=6 and not v_claimed,'completion_count',v_count,
  'rocky_points_reward',25000,'base_coin_reward',1200000,
  'display_coin_reward',floor(1200000*v_multiplier)::bigint,'coin_multiplier',v_multiplier,
  'milestones',v_milestones,
  'rewards',jsonb_build_array(jsonb_build_object('kind','rocky_points','icon','💠','name','로키 포인트 대보급','amount',25000),
  jsonb_build_object('kind','coins','icon','🪙','name','돌돌코인 금고','amount',1200000)));
end $function$
;

CREATE OR REPLACE FUNCTION public.dori_pass_mission_progress(p_uid uuid, p_date date, p_key text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_count integer:=0;
  v_start timestamptz:=(p_date::timestamp at time zone 'Asia/Seoul');
  v_end timestamptz:=((p_date+1)::timestamp at time zone 'Asia/Seoul');
begin
  case p_key
    when 'attendance' then
      select count(*)::integer into v_count from public.user_attendance_days
      where user_id=p_uid::text and attendance_date=p_date;
    when 'daily_mission' then
      select count(*)::integer into v_count from public.user_daily_missions
      where user_id=p_uid and mission_date=p_date and completed_at is not null;
    when 'random_box' then
      select count(*)::integer into v_count from public.dori_box_history
      where user_id=p_uid and created_at>=v_start and created_at<v_end;
    when 'chess_game' then
      select count(*)::integer into v_count from public.chess_games
      where user_id=p_uid and created_at>=v_start and created_at<v_end
        and result is not null and btrim(result) not in ('','*','pending','ongoing');
    when 'study_focus' then
      select count(*)::integer into v_count from public.rockey_study_focus_sessions
      where user_id=p_uid and session_type='focus' and status='completed'
        and actual_seconds>=300 and ended_at>=v_start and ended_at<v_end;
    when 'stock_trade' then
      select count(*)::integer into v_count from public.dori_stock_orders
      where user_id=p_uid and upper(side)='BUY'
        and upper(status) not in ('CANCELLED','EXPIRED','REJECTED')
        and created_at>=v_start and created_at<v_end;
    when 'bank_transaction' then
      select count(*)::integer into v_count
      from public.dori_bank_transactions t
      join public.dori_bank_accounts a on a.account_number=t.account_number and a.status='active'
      where a.auth_user_id=p_uid and t.created_at>=v_start and t.created_at<v_end;
    when 'study_plan' then
      select count(*)::integer into v_count from public.rockey_study_planner_days
      where user_id=p_uid and plan_date=p_date;
    else
      v_count:=0;
  end case;
  return coalesce(v_count,0);
end
$function$
;

update public.achievements
set name=case id
 when 'stock_first_sell' then '첫 매수 주문'
 when 'stock_10_trades' then '돌돌증권 단골 매수자'
 when 'stock_50_trades' then '시장 단골 매수자'
 when 'stock_100_trades' then '돌돌증권 베테랑 매수자'
 when 'stock_500_trades' then '돌돌증권 매수의 전설'
 when 'stock_sell_10_shares' then '누적 매수 10주'
 when 'stock_sell_100_shares' then '누적 매수 100주'
 when 'stock_round_trip' then '첫 주식 매수'
 else name end,
 title=case id
 when 'stock_first_sell' then '첫 매수 주문'
 when 'stock_10_trades' then '돌돌증권 단골 매수자'
 when 'stock_50_trades' then '시장 단골 매수자'
 when 'stock_100_trades' then '돌돌증권 베테랑 매수자'
 when 'stock_500_trades' then '돌돌증권 매수의 전설'
 when 'stock_sell_10_shares' then '누적 매수 10주'
 when 'stock_sell_100_shares' then '누적 매수 100주'
 when 'stock_round_trip' then '첫 주식 매수'
 else title end,
 description=case id
 when 'stock_first_sell' then '돌돌증권에서 매수 주문을 처음 제출했다.'
 when 'stock_10_trades' then '매수 주문을 총 10회 제출했다.'
 when 'stock_50_trades' then '매수 주문을 총 50회 제출했다.'
 when 'stock_100_trades' then '매수 주문을 총 100회 제출했다.'
 when 'stock_500_trades' then '매수 주문을 총 500회 제출했다.'
 when 'stock_sell_10_shares' then '매수 주문의 누적 수량이 10주 이상이다.'
 when 'stock_sell_100_shares' then '매수 주문의 누적 수량이 100주 이상이다.'
 when 'stock_round_trip' then '돌돌증권에서 매수 주문을 1회 이상 제출했다.'
 else description end
where id in ('stock_first_sell','stock_10_trades','stock_50_trades','stock_100_trades','stock_500_trades','stock_sell_10_shares','stock_sell_100_shares','stock_round_trip');
