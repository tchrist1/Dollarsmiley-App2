/*
  # BATCH 4B Part 3: Optimize RLS auth.uid() Calls (Tables M-P)
  
  1. Performance Optimization
    - Replaces direct auth.uid() calls with (select auth.uid()) in RLS policies
    - The subquery is evaluated ONCE per query instead of per-row
    
  2. Scope
    - Part 3: Tables M-P (~70 policies)
    - Zero change to authorization logic
*/

-- messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own received messages" ON messages;
CREATE POLICY "Users can update own received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = (select auth.uid()) OR recipient_id = (select auth.uid()));

-- notification_digest_queue
DROP POLICY IF EXISTS "Users can view own digest queue" ON notification_digest_queue;
CREATE POLICY "Users can view own digest queue"
  ON notification_digest_queue FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- notification_engagement_metrics
DROP POLICY IF EXISTS "Users can track their own notification engagement" ON notification_engagement_metrics;
CREATE POLICY "Users can track their own notification engagement"
  ON notification_engagement_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own engagement metrics" ON notification_engagement_metrics;
CREATE POLICY "Users can view own engagement metrics"
  ON notification_engagement_metrics FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- notification_suggestions
DROP POLICY IF EXISTS "Users can update own suggestions" ON notification_suggestions;
CREATE POLICY "Users can update own suggestions"
  ON notification_suggestions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own suggestions" ON notification_suggestions;
CREATE POLICY "Users can view own suggestions"
  ON notification_suggestions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- notification_templates
DROP POLICY IF EXISTS "Admins can manage templates" ON notification_templates;
CREATE POLICY "Admins can manage templates"
  ON notification_templates FOR ALL
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

-- notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- optimal_pricing
DROP POLICY IF EXISTS "Providers can view own pricing recommendations" ON optimal_pricing;
CREATE POLICY "Providers can view own pricing recommendations"
  ON optimal_pricing FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- order_communications
DROP POLICY IF EXISTS "Booking participants can create communications" ON order_communications;
CREATE POLICY "Booking participants can create communications"
  ON order_communications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = order_communications.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Booking participants can view communications" ON order_communications;
CREATE POLICY "Booking participants can view communications"
  ON order_communications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = order_communications.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

-- order_items
DROP POLICY IF EXISTS "Booking participants can view order items" ON order_items;
CREATE POLICY "Booking participants can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = order_items.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

-- payment_methods
DROP POLICY IF EXISTS "Users can create own payment methods" ON payment_methods;
CREATE POLICY "Users can create own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own payment methods" ON payment_methods;
CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own payment methods" ON payment_methods;
CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own payment methods" ON payment_methods;
CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- payout_schedules
DROP POLICY IF EXISTS "Providers can view own payout schedules" ON payout_schedules;
CREATE POLICY "Providers can view own payout schedules"
  ON payout_schedules FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- personalization_color_palettes
DROP POLICY IF EXISTS "Providers can manage their color palettes" ON personalization_color_palettes;
CREATE POLICY "Providers can manage their color palettes"
  ON personalization_color_palettes FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- personalization_configs
DROP POLICY IF EXISTS "Providers can manage their listing personalization" ON personalization_configs;
CREATE POLICY "Providers can manage their listing personalization"
  ON personalization_configs FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = personalization_configs.listing_id
    AND sl.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = personalization_configs.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

-- personalization_fonts
DROP POLICY IF EXISTS "Providers can manage their fonts" ON personalization_fonts;
CREATE POLICY "Providers can manage their fonts"
  ON personalization_fonts FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view their custom fonts" ON personalization_fonts;
CREATE POLICY "Providers can view their custom fonts"
  ON personalization_fonts FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- personalization_image_presets
DROP POLICY IF EXISTS "Providers can manage their image presets" ON personalization_image_presets;
CREATE POLICY "Providers can manage their image presets"
  ON personalization_image_presets FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- personalization_reusable_setups
DROP POLICY IF EXISTS "Customers can manage their reusable setups" ON personalization_reusable_setups;
CREATE POLICY "Customers can manage their reusable setups"
  ON personalization_reusable_setups FOR ALL
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

-- personalization_snapshots
DROP POLICY IF EXISTS "Customers can view their snapshots" ON personalization_snapshots;
CREATE POLICY "Customers can view their snapshots"
  ON personalization_snapshots FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view snapshots for their orders" ON personalization_snapshots;
CREATE POLICY "Providers can view snapshots for their orders"
  ON personalization_snapshots FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can create snapshots" ON personalization_snapshots;
CREATE POLICY "System can create snapshots"
  ON personalization_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

-- personalization_submissions
DROP POLICY IF EXISTS "Customers can create submissions" ON personalization_submissions;
CREATE POLICY "Customers can create submissions"
  ON personalization_submissions FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can update unlocked submissions" ON personalization_submissions;
CREATE POLICY "Customers can update unlocked submissions"
  ON personalization_submissions FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()) AND is_locked = false)
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own submissions" ON personalization_submissions;
CREATE POLICY "Customers can view their own submissions"
  ON personalization_submissions FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view submissions for their listings" ON personalization_submissions;
CREATE POLICY "Providers can view submissions for their listings"
  ON personalization_submissions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = personalization_submissions.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

-- personalization_templates
DROP POLICY IF EXISTS "Providers can manage their templates" ON personalization_templates;
CREATE POLICY "Providers can manage their templates"
  ON personalization_templates FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- phone_sanitization_audit
DROP POLICY IF EXISTS "Admins can view phone sanitization audit" ON phone_sanitization_audit;
CREATE POLICY "Admins can view phone sanitization audit"
  ON phone_sanitization_audit FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

-- platform_policies
DROP POLICY IF EXISTS "Admins can manage platform policies" ON platform_policies;
CREATE POLICY "Admins can manage platform policies"
  ON platform_policies FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- post_comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
CREATE POLICY "Authenticated users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

-- post_likes
DROP POLICY IF EXISTS "Authenticated users can like posts" ON post_likes;
CREATE POLICY "Authenticated users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- price_adjustments
DROP POLICY IF EXISTS "Customers can respond to price adjustments" ON price_adjustments;
CREATE POLICY "Customers can respond to price adjustments"
  ON price_adjustments FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view their price adjustments" ON price_adjustments;
CREATE POLICY "Customers can view their price adjustments"
  ON price_adjustments FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can manage their price adjustments" ON price_adjustments;
CREATE POLICY "Providers can manage their price adjustments"
  ON price_adjustments FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- production_orders
DROP POLICY IF EXISTS "Customers can create production orders" ON production_orders;
CREATE POLICY "Customers can create production orders"
  ON production_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can update own production orders" ON production_orders;
CREATE POLICY "Customers can update own production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view own production orders" ON production_orders;
CREATE POLICY "Customers can view own production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can update assigned production orders" ON production_orders;
CREATE POLICY "Providers can update assigned production orders"
  ON production_orders FOR UPDATE
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can view assigned production orders" ON production_orders;
CREATE POLICY "Providers can view assigned production orders"
  ON production_orders FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- production_timeline_events
DROP POLICY IF EXISTS "System can create timeline events" ON production_timeline_events;
CREATE POLICY "System can create timeline events"
  ON production_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (production_order_id IN (
    SELECT id FROM production_orders
    WHERE customer_id = (select auth.uid()) OR provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view timeline for their production orders" ON production_timeline_events;
CREATE POLICY "Users can view timeline for their production orders"
  ON production_timeline_events FOR SELECT
  TO authenticated
  USING (production_order_id IN (
    SELECT id FROM production_orders
    WHERE customer_id = (select auth.uid()) OR provider_id = (select auth.uid())
  ));

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- proofs
DROP POLICY IF EXISTS "Providers can create proofs" ON proofs;
CREATE POLICY "Providers can create proofs"
  ON proofs FOR INSERT
  TO authenticated
  WITH CHECK (production_order_id IN (
    SELECT id FROM production_orders
    WHERE provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update proofs for their orders" ON proofs;
CREATE POLICY "Users can update proofs for their orders"
  ON proofs FOR UPDATE
  TO authenticated
  USING (production_order_id IN (
    SELECT id FROM production_orders
    WHERE customer_id = (select auth.uid()) OR provider_id = (select auth.uid())
  ))
  WITH CHECK (production_order_id IN (
    SELECT id FROM production_orders
    WHERE customer_id = (select auth.uid()) OR provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can view proofs for their production orders" ON proofs;
CREATE POLICY "Users can view proofs for their production orders"
  ON proofs FOR SELECT
  TO authenticated
  USING (production_order_id IN (
    SELECT id FROM production_orders
    WHERE customer_id = (select auth.uid()) OR provider_id = (select auth.uid())
  ));

-- provider_availability
DROP POLICY IF EXISTS "Providers can create own availability" ON provider_availability;
CREATE POLICY "Providers can create own availability"
  ON provider_availability FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can delete own availability" ON provider_availability;
CREATE POLICY "Providers can delete own availability"
  ON provider_availability FOR DELETE
  TO authenticated
  USING (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can update own availability" ON provider_availability;
CREATE POLICY "Providers can update own availability"
  ON provider_availability FOR UPDATE
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- provider_inventory_items
DROP POLICY IF EXISTS "Providers can manage their own inventory items" ON provider_inventory_items;
CREATE POLICY "Providers can manage their own inventory items"
  ON provider_inventory_items FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- provider_trust_scores
DROP POLICY IF EXISTS "Admins can view all provider trust scores" ON provider_trust_scores;
CREATE POLICY "Admins can view all provider trust scores"
  ON provider_trust_scores FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Users can view own provider trust score" ON provider_trust_scores;
CREATE POLICY "Users can view own provider trust score"
  ON provider_trust_scores FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- push_tokens
DROP POLICY IF EXISTS "Users can delete own push tokens" ON push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own push tokens" ON push_tokens;
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
