/*
  # BATCH 4B Part 4: Optimize RLS auth.uid() Calls (Tables Q-Z - Final)
  
  1. Performance Optimization
    - Replaces direct auth.uid() calls with (select auth.uid()) in RLS policies
    - The subquery is evaluated ONCE per query instead of per-row
    
  2. Scope
    - Part 4: Tables Q-Z (~73 policies) - FINAL BATCH
    - Total optimized: 251 policies across 100+ tables
    - Zero change to authorization logic
*/

-- recommendation_cache
DROP POLICY IF EXISTS "Users can manage own recommendation cache" ON recommendation_cache;
CREATE POLICY "Users can manage own recommendation cache"
  ON recommendation_cache FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own recommendation cache" ON recommendation_cache;
CREATE POLICY "Users can view own recommendation cache"
  ON recommendation_cache FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- refunds
DROP POLICY IF EXISTS "Users can request refunds" ON refunds;
CREATE POLICY "Users can request refunds"
  ON refunds FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own refunds" ON refunds;
CREATE POLICY "Users can view own refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (requested_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = refunds.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

-- rental_pricing_tiers
DROP POLICY IF EXISTS "Providers can manage their rental pricing tiers" ON rental_pricing_tiers;
CREATE POLICY "Providers can manage their rental pricing tiers"
  ON rental_pricing_tiers FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = rental_pricing_tiers.service_listing_id
    AND sl.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = rental_pricing_tiers.service_listing_id
    AND sl.provider_id = (select auth.uid())
  ));

-- reschedule_requests
DROP POLICY IF EXISTS "Customers can cancel own requests" ON reschedule_requests;
CREATE POLICY "Customers can cancel own requests"
  ON reschedule_requests FOR UPDATE
  TO authenticated
  USING (requested_by = (select auth.uid()) AND status = 'Pending')
  WITH CHECK (requested_by = (select auth.uid()) AND status = 'Cancelled');

DROP POLICY IF EXISTS "Customers can create reschedule requests" ON reschedule_requests;
CREATE POLICY "Customers can create reschedule requests"
  ON reschedule_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reschedule_requests.booking_id
    AND bookings.customer_id = (select auth.uid())
    AND bookings.status = ANY(ARRAY['Requested', 'Accepted', 'InProgress'])
  ));

DROP POLICY IF EXISTS "Customers can view own reschedule requests" ON reschedule_requests;
CREATE POLICY "Customers can view own reschedule requests"
  ON reschedule_requests FOR SELECT
  TO authenticated
  USING (requested_by = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reschedule_requests.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Providers can respond to reschedule requests" ON reschedule_requests;
CREATE POLICY "Providers can respond to reschedule requests"
  ON reschedule_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reschedule_requests.booking_id
    AND bookings.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reschedule_requests.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

-- reviews
DROP POLICY IF EXISTS "Customers can view reviews about them" ON reviews;
CREATE POLICY "Customers can view reviews about them"
  ON reviews FOR SELECT
  TO authenticated
  USING (reviewee_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can review customers" ON reviews;
CREATE POLICY "Providers can review customers"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid())
    AND review_direction = 'provider_to_customer'
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND bookings.provider_id = (select auth.uid())
      AND bookings.status = 'Completed'
      AND bookings.provider_can_review = true
      AND bookings.provider_review_submitted = false
    ));

DROP POLICY IF EXISTS "Providers can view own reviews of customers" ON reviews;
CREATE POLICY "Providers can view own reviews of customers"
  ON reviews FOR SELECT
  TO authenticated
  USING (reviewer_id = (select auth.uid()) AND review_direction = 'provider_to_customer');

DROP POLICY IF EXISTS "Users can create reviews for own bookings" ON reviews;
CREATE POLICY "Users can create reviews for own bookings"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = reviews.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
    AND bookings.status = 'Completed'
  ));

-- saved_jobs
DROP POLICY IF EXISTS "Users can delete their saved jobs" ON saved_jobs;
CREATE POLICY "Users can delete their saved jobs"
  ON saved_jobs FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can save jobs" ON saved_jobs;
CREATE POLICY "Users can save jobs"
  ON saved_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their saved jobs" ON saved_jobs;
CREATE POLICY "Users can update their saved jobs"
  ON saved_jobs FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own saved jobs" ON saved_jobs;
CREATE POLICY "Users can view their own saved jobs"
  ON saved_jobs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- saved_search_matches
DROP POLICY IF EXISTS "Users can view own search matches" ON saved_search_matches;
CREATE POLICY "Users can view own search matches"
  ON saved_search_matches FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM saved_searches
    WHERE saved_searches.id = saved_search_matches.saved_search_id
    AND saved_searches.user_id = (select auth.uid())
  ));

-- saved_search_notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON saved_search_notifications;
CREATE POLICY "Users can update own notifications"
  ON saved_search_notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own search notifications" ON saved_search_notifications;
CREATE POLICY "Users can view own search notifications"
  ON saved_search_notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- saved_searches
DROP POLICY IF EXISTS "Users can manage own saved searches" ON saved_searches;
CREATE POLICY "Users can manage own saved searches"
  ON saved_searches FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- scheduling_analytics
DROP POLICY IF EXISTS "Providers can view own analytics" ON scheduling_analytics;
CREATE POLICY "Providers can view own analytics"
  ON scheduling_analytics FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- scheduling_conflicts
DROP POLICY IF EXISTS "Providers can view own scheduling conflicts" ON scheduling_conflicts;
CREATE POLICY "Providers can view own scheduling conflicts"
  ON scheduling_conflicts FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- scheduling_patterns
DROP POLICY IF EXISTS "Providers can view own scheduling patterns" ON scheduling_patterns;
CREATE POLICY "Providers can view own scheduling patterns"
  ON scheduling_patterns FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));

-- scheduling_preferences
DROP POLICY IF EXISTS "Providers can manage own scheduling preferences" ON scheduling_preferences;
CREATE POLICY "Providers can manage own scheduling preferences"
  ON scheduling_preferences FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- service_agreement_templates
DROP POLICY IF EXISTS "Only admins can manage agreement templates" ON service_agreement_templates;
CREATE POLICY "Only admins can manage agreement templates"
  ON service_agreement_templates FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

-- service_listings
DROP POLICY IF EXISTS "Providers can manage own listings" ON service_listings;
CREATE POLICY "Providers can manage own listings"
  ON service_listings FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Providers can update proofing for their listings" ON service_listings;
CREATE POLICY "Providers can update proofing for their listings"
  ON service_listings FOR UPDATE
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- shipments
DROP POLICY IF EXISTS "Booking participants can view shipments" ON shipments;
CREATE POLICY "Booking participants can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = shipments.booking_id
    AND (bookings.customer_id = (select auth.uid()) OR bookings.provider_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Providers can create shipments" ON shipments;
CREATE POLICY "Providers can create shipments"
  ON shipments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = shipments.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can update their shipments" ON shipments;
CREATE POLICY "Providers can update their shipments"
  ON shipments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = shipments.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

-- shipping_addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON shipping_addresses;
CREATE POLICY "Users can manage own addresses"
  ON shipping_addresses FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own addresses" ON shipping_addresses;
CREATE POLICY "Users can view own addresses"
  ON shipping_addresses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- standard_service_agreements
DROP POLICY IF EXISTS "Admins can manage agreements" ON standard_service_agreements;
CREATE POLICY "Admins can manage agreements"
  ON standard_service_agreements FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

-- stripe_connect_accounts
DROP POLICY IF EXISTS "Users can create own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can create own Stripe Connect account"
  ON stripe_connect_accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can update own Stripe Connect account"
  ON stripe_connect_accounts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can view own Stripe Connect account"
  ON stripe_connect_accounts FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- time_slot_bookings
DROP POLICY IF EXISTS "Providers and customers can update their time slots" ON time_slot_bookings;
CREATE POLICY "Providers and customers can update their time slots"
  ON time_slot_bookings FOR UPDATE
  TO authenticated
  USING (provider_id = (select auth.uid()) OR EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = time_slot_bookings.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can create their own time slot bookings" ON time_slot_bookings;
CREATE POLICY "Providers can create their own time slot bookings"
  ON time_slot_bookings FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = (select auth.uid()));

-- time_slot_suggestions
DROP POLICY IF EXISTS "Users can view time slot suggestions for own jobs" ON time_slot_suggestions;
CREATE POLICY "Users can view time slot suggestions for own jobs"
  ON time_slot_suggestions FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()) OR job_id IN (
    SELECT id FROM jobs WHERE customer_id = (select auth.uid())
  ));

-- trip_location_updates
DROP POLICY IF EXISTS "Mover can insert location updates" ON trip_location_updates;
CREATE POLICY "Mover can insert location updates"
  ON trip_location_updates FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_location_updates.trip_id
    AND t.mover_id = (select auth.uid())
    AND t.trip_status = ANY(ARRAY['on_the_way', 'arriving_soon'])
  ));

DROP POLICY IF EXISTS "Trip participants can view location updates" ON trip_location_updates;
CREATE POLICY "Trip participants can view location updates"
  ON trip_location_updates FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_location_updates.trip_id
    AND (t.mover_id = (select auth.uid()) OR t.viewer_id = (select auth.uid()))
    AND t.live_location_visible = true
  ));

-- trips
DROP POLICY IF EXISTS "Authenticated users can create trips for their bookings" ON trips;
CREATE POLICY "Authenticated users can create trips for their bookings"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = trips.booking_id
    AND (b.customer_id = (select auth.uid()) OR b.provider_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Mover can update own trip" ON trips;
CREATE POLICY "Mover can update own trip"
  ON trips FOR UPDATE
  TO authenticated
  USING (mover_id = (select auth.uid()))
  WITH CHECK (mover_id = (select auth.uid()));

DROP POLICY IF EXISTS "Trip participants can view trips" ON trips;
CREATE POLICY "Trip participants can view trips"
  ON trips FOR SELECT
  TO authenticated
  USING (mover_id = (select auth.uid()) OR viewer_id = (select auth.uid()));

-- trust_score_events
DROP POLICY IF EXISTS "Admins can view all trust events" ON trust_score_events;
CREATE POLICY "Admins can view all trust events"
  ON trust_score_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Users can view own trust events" ON trust_score_events;
CREATE POLICY "Users can view own trust events"
  ON trust_score_events FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- trust_score_snapshots
DROP POLICY IF EXISTS "Admins can view all trust snapshots" ON trust_score_snapshots;
CREATE POLICY "Admins can view all trust snapshots"
  ON trust_score_snapshots FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Users can view own trust snapshots" ON trust_score_snapshots;
CREATE POLICY "Users can view own trust snapshots"
  ON trust_score_snapshots FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_events
DROP POLICY IF EXISTS "Users can insert own events" ON user_events;
CREATE POLICY "Users can insert own events"
  ON user_events FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view own events" ON user_events;
CREATE POLICY "Users can view own events"
  ON user_events FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id OR user_id IS NULL);

-- user_favorites
DROP POLICY IF EXISTS "Users can manage own favorites" ON user_favorites;
CREATE POLICY "Users can manage own favorites"
  ON user_favorites FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_item_interactions
DROP POLICY IF EXISTS "Users can insert own interactions" ON user_item_interactions;
CREATE POLICY "Users can insert own interactions"
  ON user_item_interactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own interactions" ON user_item_interactions;
CREATE POLICY "Users can view own interactions"
  ON user_item_interactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_preferences
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_sessions
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- user_subscriptions
DROP POLICY IF EXISTS "System can create subscriptions" ON user_subscriptions;
CREATE POLICY "System can create subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "System can update subscriptions" ON user_subscriptions;
CREATE POLICY "System can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- value_added_services
DROP POLICY IF EXISTS "Providers can manage their VAS" ON value_added_services;
CREATE POLICY "Providers can manage their VAS"
  ON value_added_services FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings
    WHERE service_listings.id = value_added_services.listing_id
    AND service_listings.provider_id = (select auth.uid())
  ));

-- verification_documents
DROP POLICY IF EXISTS "Users can submit documents" ON verification_documents;
CREATE POLICY "Users can submit documents"
  ON verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own documents" ON verification_documents;
CREATE POLICY "Users can view own documents"
  ON verification_documents FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- wallet_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- wallets
DROP POLICY IF EXISTS "Users can insert own wallet" ON wallets;
CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- workload_predictions
DROP POLICY IF EXISTS "Providers can view own workload predictions" ON workload_predictions;
CREATE POLICY "Providers can view own workload predictions"
  ON workload_predictions FOR SELECT
  TO authenticated
  USING (provider_id = (select auth.uid()));
