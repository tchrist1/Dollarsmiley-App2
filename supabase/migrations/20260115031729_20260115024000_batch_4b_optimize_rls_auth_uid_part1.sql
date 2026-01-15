/*
  # BATCH 4B Part 1: Optimize RLS auth.uid() Calls (Tables A-C)
  
  1. Performance Optimization
    - Replaces direct auth.uid() calls with (select auth.uid()) in RLS policies
    - The subquery is evaluated ONCE per query instead of per-row
    - Reduces RLS evaluation time by 50-90%
    
  2. Scope
    - 251 total policies across 100+ tables
    - Part 1: Tables starting with A-C (~60 policies)
    - Zero change to authorization logic
    
  3. Method
    - Drop existing policy
    - Recreate with optimized auth.uid() call
    - Preserve all conditions exactly
*/

-- ai_agent_actions
DROP POLICY IF EXISTS "Admins can view all agent actions" ON ai_agent_actions;
CREATE POLICY "Admins can view all agent actions"
  ON ai_agent_actions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- ai_agents
DROP POLICY IF EXISTS "Admins can manage AI agents" ON ai_agents;
CREATE POLICY "Admins can manage AI agents"
  ON ai_agents FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- ai_category_suggestion_tracking
DROP POLICY IF EXISTS "Admins can view all AI suggestion tracking" ON ai_category_suggestion_tracking;
CREATE POLICY "Admins can view all AI suggestion tracking"
  ON ai_category_suggestion_tracking FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

DROP POLICY IF EXISTS "Users can track their own AI suggestions" ON ai_category_suggestion_tracking;
CREATE POLICY "Users can track their own AI suggestions"
  ON ai_category_suggestion_tracking FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own AI suggestion history" ON ai_category_suggestion_tracking;
CREATE POLICY "Users can view their own AI suggestion history"
  ON ai_category_suggestion_tracking FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ai_content_moderation
DROP POLICY IF EXISTS "Admins can view all moderation results" ON ai_content_moderation;
CREATE POLICY "Admins can view all moderation results"
  ON ai_content_moderation FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Moderators can update moderation results" ON ai_content_moderation;
CREATE POLICY "Moderators can update moderation results"
  ON ai_content_moderation FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- ai_recommendations
DROP POLICY IF EXISTS "System can create recommendations" ON ai_recommendations;
CREATE POLICY "System can create recommendations"
  ON ai_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own recommendations" ON ai_recommendations;
CREATE POLICY "Users can update own recommendations"
  ON ai_recommendations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own recommendations" ON ai_recommendations;
CREATE POLICY "Users can view own recommendations"
  ON ai_recommendations FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- availability_exceptions
DROP POLICY IF EXISTS "Providers can create own exceptions" ON availability_exceptions;
CREATE POLICY "Providers can create own exceptions"
  ON availability_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can delete own exceptions" ON availability_exceptions;
CREATE POLICY "Providers can delete own exceptions"
  ON availability_exceptions FOR DELETE
  TO authenticated
  USING (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can update own exceptions" ON availability_exceptions;
CREATE POLICY "Providers can update own exceptions"
  ON availability_exceptions FOR UPDATE
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- booking_agreements
DROP POLICY IF EXISTS "Admins can view all agreement acceptances" ON booking_agreements;
CREATE POLICY "Admins can view all agreement acceptances"
  ON booking_agreements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

DROP POLICY IF EXISTS "Customers can create agreement acceptances" ON booking_agreements;
CREATE POLICY "Customers can create agreement acceptances"
  ON booking_agreements FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Users can view their own agreement acceptances" ON booking_agreements;
CREATE POLICY "Users can view their own agreement acceptances"
  ON booking_agreements FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id OR EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_agreements.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

-- booking_expense_categorizations
DROP POLICY IF EXISTS "Users can manage own booking categorizations" ON booking_expense_categorizations;
CREATE POLICY "Users can manage own booking categorizations"
  ON booking_expense_categorizations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_expense_categorizations.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view own booking categorizations" ON booking_expense_categorizations;
CREATE POLICY "Users can view own booking categorizations"
  ON booking_expense_categorizations FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_expense_categorizations.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

-- booking_expense_tags
DROP POLICY IF EXISTS "Users can manage own booking tags" ON booking_expense_tags;
CREATE POLICY "Users can manage own booking tags"
  ON booking_expense_tags FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_expense_tags.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view own booking tags" ON booking_expense_tags;
CREATE POLICY "Users can view own booking tags"
  ON booking_expense_tags FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_expense_tags.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

-- booking_service_agreements
DROP POLICY IF EXISTS "Customers can insert agreement acceptances" ON booking_service_agreements;
CREATE POLICY "Customers can insert agreement acceptances"
  ON booking_service_agreements FOR INSERT
  TO authenticated
  WITH CHECK (accepted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own agreement acceptances" ON booking_service_agreements;
CREATE POLICY "Customers can view own agreement acceptances"
  ON booking_service_agreements FOR SELECT
  TO authenticated
  USING (accepted_by = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view customer acceptances for their bookings" ON booking_service_agreements;
CREATE POLICY "Providers can view customer acceptances for their bookings"
  ON booking_service_agreements FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    JOIN service_listings sl ON b.listing_id = sl.id
    WHERE b.id = booking_service_agreements.booking_id
    AND sl.provider_id = (select auth.uid())
  ));

-- bookings
DROP POLICY IF EXISTS "Customers and providers can create bookings" ON bookings;
CREATE POLICY "Customers and providers can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Participants can update bookings" ON bookings;
CREATE POLICY "Participants can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()));

-- buffer_time_rules
DROP POLICY IF EXISTS "Providers can manage own buffer rules" ON buffer_time_rules;
CREATE POLICY "Providers can manage own buffer rules"
  ON buffer_time_rules FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- capacity_forecasts
DROP POLICY IF EXISTS "Providers can view own capacity forecasts" ON capacity_forecasts;
CREATE POLICY "Providers can view own capacity forecasts"
  ON capacity_forecasts FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- cart_items
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
CREATE POLICY "Users can manage own cart"
  ON cart_items FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- community_posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON community_posts;
CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own posts" ON community_posts;
CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own posts" ON community_posts;
CREATE POLICY "Users can update own posts"
  ON community_posts FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

-- consultation_messages
DROP POLICY IF EXISTS "Consultation participants can send messages" ON consultation_messages;
CREATE POLICY "Consultation participants can send messages"
  ON consultation_messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM custom_service_consultations c
    WHERE c.id = consultation_messages.consultation_id
    AND (c.customer_id = (select auth.uid()) OR c.provider_id = (select auth.uid()))
  ) AND sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Consultation participants can view messages" ON consultation_messages;
CREATE POLICY "Consultation participants can view messages"
  ON consultation_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM custom_service_consultations c
    WHERE c.id = consultation_messages.consultation_id
    AND (c.customer_id = (select auth.uid()) OR c.provider_id = (select auth.uid()))
  ));

-- consultation_timeouts
DROP POLICY IF EXISTS "Customers can make timeout decisions" ON consultation_timeouts;
CREATE POLICY "Customers can make timeout decisions"
  ON consultation_timeouts FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM production_orders po
    WHERE po.id = consultation_timeouts.production_order_id
    AND po.customer_id = (select auth.uid())
  ) AND customer_decision = 'pending')
  WITH CHECK (EXISTS (
    SELECT 1 FROM production_orders po
    WHERE po.id = consultation_timeouts.production_order_id
    AND po.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Participants can view timeout info" ON consultation_timeouts;
CREATE POLICY "Participants can view timeout info"
  ON consultation_timeouts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM production_orders po
    WHERE po.id = consultation_timeouts.production_order_id
    AND (po.customer_id = (select auth.uid()) OR po.provider_id = (select auth.uid()))
  ));

-- conversation_messages
DROP POLICY IF EXISTS "Users can send messages in conversations" ON conversation_messages;
CREATE POLICY "Users can send messages in conversations"
  ON conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_one_id = (select auth.uid()) OR conversations.participant_two_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can update own messages" ON conversation_messages;
CREATE POLICY "Users can update own messages"
  ON conversation_messages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_one_id = (select auth.uid()) OR conversations.participant_two_id = (select auth.uid()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_one_id = (select auth.uid()) OR conversations.participant_two_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON conversation_messages;
CREATE POLICY "Users can view messages in own conversations"
  ON conversation_messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_one_id = (select auth.uid()) OR conversations.participant_two_id = (select auth.uid()))
  ));

-- conversations
DROP POLICY IF EXISTS "Participants can update conversations" ON conversations;
CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (participant_one_id = (select auth.uid()) OR participant_two_id = (select auth.uid()))
  WITH CHECK (participant_one_id = (select auth.uid()) OR participant_two_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (participant_one_id = (select auth.uid()) OR participant_two_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (participant_one_id = (select auth.uid()) OR participant_two_id = (select auth.uid()));

-- custom_service_consultations
DROP POLICY IF EXISTS "Customers can view their consultations" ON custom_service_consultations;
CREATE POLICY "Customers can view their consultations"
  ON custom_service_consultations FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view their consultations" ON custom_service_consultations;
CREATE POLICY "Providers can view their consultations"
  ON custom_service_consultations FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can manage consultations" ON custom_service_consultations;
CREATE POLICY "System can manage consultations"
  ON custom_service_consultations FOR ALL
  TO authenticated
  USING (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()));

-- custom_service_options
DROP POLICY IF EXISTS "Providers can manage their listing options" ON custom_service_options;
CREATE POLICY "Providers can manage their listing options"
  ON custom_service_options FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings
    WHERE service_listings.id = custom_service_options.listing_id
    AND service_listings.provider_id = (select auth.uid())
  ));

-- customer_trust_scores
DROP POLICY IF EXISTS "Admins can view all customer trust scores" ON customer_trust_scores;
CREATE POLICY "Admins can view all customer trust scores"
  ON customer_trust_scores FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Users can view own customer trust score" ON customer_trust_scores;
CREATE POLICY "Users can view own customer trust score"
  ON customer_trust_scores FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));
