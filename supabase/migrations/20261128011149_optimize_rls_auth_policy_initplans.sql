-- Preserve each policy's existing roles, command, and access semantics.
-- Wrap auth.uid() in scalar subqueries so Postgres can evaluate it once per
-- statement instead of re-evaluating the helper for every candidate row.

ALTER POLICY "Users can read own reward claims" ON public.coin_reward_claims
  USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own full throttle save" ON public.dori_full_throttle_saves
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can read their own full throttle save" ON public.dori_full_throttle_saves
  USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can update their own full throttle save" ON public.dori_full_throttle_saves
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "dori_pass_mega_claim_select_own" ON public.dori_pass_mega_mission_claims
  USING (user_id = (select auth.uid()));

ALTER POLICY "dori customization delete own" ON public.dori_site_customization
  USING ((select auth.uid()) = user_id);
ALTER POLICY "dori customization insert own" ON public.dori_site_customization
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "dori customization select own" ON public.dori_site_customization
  USING ((select auth.uid()) = user_id);
ALTER POLICY "dori customization update own" ON public.dori_site_customization
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "dori_stock_holdings_self_select" ON public.dori_stock_holdings
  USING (user_id = (select auth.uid())::text);
ALTER POLICY "dori_stock_trades_select_own" ON public.dori_stock_trades
  USING ((select auth.uid()) = user_id);
ALTER POLICY "dori_stock_transactions_self_select" ON public.dori_stock_transactions
  USING (user_id = (select auth.uid())::text);

ALTER POLICY "Users can read their own event participations" ON public.event_participations
  USING (((select auth.uid())::text = user_id));

ALTER POLICY "rockey_calendar_comments_author_delete" ON public.rockey_calendar_event_comments
  USING (user_id = (select auth.uid()));
ALTER POLICY "rockey_calendar_comments_member_insert" ON public.rockey_calendar_event_comments
  WITH CHECK (
    (user_id = (select auth.uid()))
    AND EXISTS (
      SELECT 1
      FROM public.rockey_calendar_events e
      WHERE e.id = rockey_calendar_event_comments.event_id
        AND public.rockey_calendar_is_member(e.room_id)
    )
  );

ALTER POLICY "rockey_calendar_events_author_or_owner_delete" ON public.rockey_calendar_events
  USING (((select auth.uid()) = creator_id) OR public.rockey_calendar_is_owner(room_id));
ALTER POLICY "rockey_calendar_events_author_or_owner_update" ON public.rockey_calendar_events
  USING (((select auth.uid()) = creator_id) OR public.rockey_calendar_is_owner(room_id))
  WITH CHECK (
    public.rockey_calendar_is_member(room_id)
    AND (((select auth.uid()) = creator_id) OR public.rockey_calendar_is_owner(room_id))
  );
ALTER POLICY "rockey_calendar_events_member_insert" ON public.rockey_calendar_events
  WITH CHECK (((select auth.uid()) = creator_id) AND public.rockey_calendar_is_member(room_id));

ALTER POLICY "rockey_calendar_invites_involved_read" ON public.rockey_calendar_invites
  USING (((select auth.uid()) = invitee_id) OR ((select auth.uid()) = invited_by));

ALTER POLICY "Admins can read news survey responses" ON public.rockey_news_survey_responses
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (select auth.uid())::text
        AND u.is_admin IS TRUE
        AND COALESCE(u.user_level, 0) >= 10
    )
  );

ALTER POLICY "users_read_own_attendance_days" ON public.user_attendance_days
  USING (user_id = (select auth.uid())::text);

ALTER POLICY "custom own read" ON public.user_customization
  USING ((select auth.uid()) = user_id);
ALTER POLICY "custom own update" ON public.user_customization
  USING ((select auth.uid()) = user_id);
ALTER POLICY "custom own write" ON public.user_customization
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "inventory own read" ON public.user_inventory
  USING ((select auth.uid()) = user_id);

ALTER POLICY "자신의 칭호만 조회" ON public.user_titles
  USING ((select auth.uid()) = user_id);

ALTER POLICY "rockey site policy" ON public.users
  USING (((select auth.uid())::text = user_id));
ALTER POLICY "user_insert_policy" ON public.users
  WITH CHECK (((select auth.uid())::text = user_id));
ALTER POLICY "users_update" ON public.users
  USING (((select auth.uid())::text = user_id))
  WITH CHECK (((select auth.uid())::text = user_id));
