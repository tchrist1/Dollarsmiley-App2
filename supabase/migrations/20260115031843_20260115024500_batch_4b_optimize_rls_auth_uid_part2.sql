/*
  # BATCH 4B Part 2: Optimize RLS auth.uid() Calls (Tables D-J)
  
  1. Performance Optimization
    - Replaces direct auth.uid() calls with (select auth.uid()) in RLS policies
    - The subquery is evaluated ONCE per query instead of per-row
    
  2. Scope
    - Part 2: Tables D-J (~54 policies)
    - Zero change to authorization logic
*/

-- damage_assessments
DROP POLICY IF EXISTS "Customers and providers can view assessments" ON damage_assessments;
CREATE POLICY "Customers and providers can view assessments"
  ON damage_assessments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = damage_assessments.booking_id
    AND (b.customer_id = (select auth.uid()) OR EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = b.listing_id
      AND sl.provider_id = (select auth.uid())
    ))
  ));

DROP POLICY IF EXISTS "Providers can create assessments for their services" ON damage_assessments;
CREATE POLICY "Providers can create assessments for their services"
  ON damage_assessments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    JOIN service_listings sl ON b.listing_id = sl.id
    WHERE b.id = damage_assessments.booking_id
    AND sl.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can update their assessments" ON damage_assessments;
CREATE POLICY "Providers can update their assessments"
  ON damage_assessments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    JOIN service_listings sl ON b.listing_id = sl.id
    WHERE b.id = damage_assessments.booking_id
    AND sl.provider_id = (select auth.uid())
  ));

-- damage_deposit_payments
DROP POLICY IF EXISTS "Admins can view all damage deposit payments" ON damage_deposit_payments;
CREATE POLICY "Admins can view all damage deposit payments"
  ON damage_deposit_payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

DROP POLICY IF EXISTS "Customers can view their damage deposit payments" ON damage_deposit_payments;
CREATE POLICY "Customers can view their damage deposit payments"
  ON damage_deposit_payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = damage_deposit_payments.booking_id
    AND bookings.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can manage their damage deposit payments" ON damage_deposit_payments;
CREATE POLICY "Providers can manage their damage deposit payments"
  ON damage_deposit_payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = damage_deposit_payments.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can update damage assessments" ON damage_deposit_payments;
CREATE POLICY "Providers can update damage assessments"
  ON damage_deposit_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = damage_deposit_payments.booking_id
    AND bookings.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = damage_deposit_payments.booking_id
    AND bookings.provider_id = (select auth.uid())
  ));

-- damage_deposit_settings
DROP POLICY IF EXISTS "Admins can view all damage deposit settings" ON damage_deposit_settings;
CREATE POLICY "Admins can view all damage deposit settings"
  ON damage_deposit_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'Admin'
  ));

DROP POLICY IF EXISTS "Providers can manage their damage deposit settings" ON damage_deposit_settings;
CREATE POLICY "Providers can manage their damage deposit settings"
  ON damage_deposit_settings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings
    WHERE service_listings.id = damage_deposit_settings.listing_id
    AND service_listings.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_listings
    WHERE service_listings.id = damage_deposit_settings.listing_id
    AND service_listings.provider_id = (select auth.uid())
  ));

-- disputes
DROP POLICY IF EXISTS "Users can file disputes" ON disputes;
CREATE POLICY "Users can file disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (filed_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own disputes" ON disputes;
CREATE POLICY "Users can update own disputes"
  ON disputes FOR UPDATE
  TO authenticated
  USING (filed_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own disputes" ON disputes;
CREATE POLICY "Users can view own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (filed_by = (select auth.uid()) OR filed_against = (select auth.uid()));

-- escrow_holds
DROP POLICY IF EXISTS "Users can view own escrow holds" ON escrow_holds;
CREATE POLICY "Users can view own escrow holds"
  ON escrow_holds FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()) OR provider_id = (select auth.uid()));

-- expense_categories
DROP POLICY IF EXISTS "Admins can manage expense categories" ON expense_categories;
CREATE POLICY "Admins can manage expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- expense_categorization_rules
DROP POLICY IF EXISTS "Users can create own categorization rules" ON expense_categorization_rules;
CREATE POLICY "Users can create own categorization rules"
  ON expense_categorization_rules FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own categorization rules" ON expense_categorization_rules;
CREATE POLICY "Users can delete own categorization rules"
  ON expense_categorization_rules FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own categorization rules" ON expense_categorization_rules;
CREATE POLICY "Users can update own categorization rules"
  ON expense_categorization_rules FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own categorization rules" ON expense_categorization_rules;
CREATE POLICY "Users can view own categorization rules"
  ON expense_categorization_rules FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()) OR user_id IS NULL);

-- expense_category_mappings
DROP POLICY IF EXISTS "Admins can manage expense category mappings" ON expense_category_mappings;
CREATE POLICY "Admins can manage expense category mappings"
  ON expense_category_mappings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

-- expense_tags
DROP POLICY IF EXISTS "Users can create own tags" ON expense_tags;
CREATE POLICY "Users can create own tags"
  ON expense_tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own tags" ON expense_tags;
CREATE POLICY "Users can delete own tags"
  ON expense_tags FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own tags" ON expense_tags;
CREATE POLICY "Users can update own tags"
  ON expense_tags FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own tags" ON expense_tags;
CREATE POLICY "Users can view own tags"
  ON expense_tags FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- fulfillment_options
DROP POLICY IF EXISTS "Providers can delete own fulfillment options" ON fulfillment_options;
CREATE POLICY "Providers can delete own fulfillment options"
  ON fulfillment_options FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = fulfillment_options.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can insert own fulfillment options" ON fulfillment_options;
CREATE POLICY "Providers can insert own fulfillment options"
  ON fulfillment_options FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = fulfillment_options.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can update own fulfillment options" ON fulfillment_options;
CREATE POLICY "Providers can update own fulfillment options"
  ON fulfillment_options FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = fulfillment_options.listing_id
    AND sl.provider_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = fulfillment_options.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can view own fulfillment options" ON fulfillment_options;
CREATE POLICY "Providers can view own fulfillment options"
  ON fulfillment_options FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM service_listings sl
    WHERE sl.id = fulfillment_options.listing_id
    AND sl.provider_id = (select auth.uid())
  ));

-- fulfillment_tracking
DROP POLICY IF EXISTS "Booking participants can insert tracking" ON fulfillment_tracking;
CREATE POLICY "Booking participants can insert tracking"
  ON fulfillment_tracking FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = fulfillment_tracking.booking_id
    AND (b.customer_id = (select auth.uid()) OR b.provider_id = (select auth.uid()))
  ));

DROP POLICY IF EXISTS "Booking participants can view tracking" ON fulfillment_tracking;
CREATE POLICY "Booking participants can view tracking"
  ON fulfillment_tracking FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = fulfillment_tracking.booking_id
    AND (b.customer_id = (select auth.uid()) OR b.provider_id = (select auth.uid()))
  ));

-- inventory_alerts
DROP POLICY IF EXISTS "Providers can manage their own alerts" ON inventory_alerts;
CREATE POLICY "Providers can manage their own alerts"
  ON inventory_alerts FOR ALL
  TO authenticated
  USING (provider_id = (select auth.uid()))
  WITH CHECK (provider_id = (select auth.uid()));

-- inventory_locks
DROP POLICY IF EXISTS "Providers can view locks on their inventory" ON inventory_locks;
CREATE POLICY "Providers can view locks on their inventory"
  ON inventory_locks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM provider_inventory_items pii
    WHERE pii.id = inventory_locks.inventory_item_id
    AND pii.provider_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can create soft locks" ON inventory_locks;
CREATE POLICY "Users can create soft locks"
  ON inventory_locks FOR INSERT
  TO authenticated
  WITH CHECK (locked_by = (select auth.uid()) AND lock_type = 'soft');

DROP POLICY IF EXISTS "Users can view their own booking locks" ON inventory_locks;
CREATE POLICY "Users can view their own booking locks"
  ON inventory_locks FOR SELECT
  TO authenticated
  USING (locked_by = (select auth.uid()));

-- job_acceptances
DROP POLICY IF EXISTS "Customers can update job acceptances" ON job_acceptances;
CREATE POLICY "Customers can update job acceptances"
  ON job_acceptances FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_acceptances.job_id
    AND jobs.customer_id = (select auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_acceptances.job_id
    AND jobs.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Customers can view job acceptances" ON job_acceptances;
CREATE POLICY "Customers can view job acceptances"
  ON job_acceptances FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_acceptances.job_id
    AND jobs.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can accept jobs" ON job_acceptances;
CREATE POLICY "Providers can accept jobs"
  ON job_acceptances FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can view own acceptances" ON job_acceptances;
CREATE POLICY "Providers can view own acceptances"
  ON job_acceptances FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = provider_id);

-- job_analytics
DROP POLICY IF EXISTS "Customers can view their own job analytics" ON job_analytics;
CREATE POLICY "Customers can view their own job analytics"
  ON job_analytics FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can insert job analytics" ON job_analytics;
CREATE POLICY "System can insert job analytics"
  ON job_analytics FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "System can update job analytics" ON job_analytics;
CREATE POLICY "System can update job analytics"
  ON job_analytics FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()));

-- job_customer_incidents
DROP POLICY IF EXISTS "Admins can manage all incidents" ON job_customer_incidents;
CREATE POLICY "Admins can manage all incidents"
  ON job_customer_incidents FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can view all incidents" ON job_customer_incidents;
CREATE POLICY "Admins can view all incidents"
  ON job_customer_incidents FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Customers can respond to incidents" ON job_customer_incidents;
CREATE POLICY "Customers can respond to incidents"
  ON job_customer_incidents FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = customer_id AND status = 'reported')
  WITH CHECK ((select auth.uid()) = customer_id AND status = ANY(ARRAY['acknowledged', 'disputed']));

DROP POLICY IF EXISTS "Customers can view incidents for their jobs" ON job_customer_incidents;
CREATE POLICY "Customers can view incidents for their jobs"
  ON job_customer_incidents FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Providers can create customer incidents" ON job_customer_incidents;
CREATE POLICY "Providers can create customer incidents"
  ON job_customer_incidents FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = provider_id AND EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_customer_incidents.job_id
    AND (jobs.provider_id = (select auth.uid()) OR jobs.status = ANY(ARRAY['In Progress', 'Started']))
  ));

DROP POLICY IF EXISTS "Providers can update their own incidents" ON job_customer_incidents;
CREATE POLICY "Providers can update their own incidents"
  ON job_customer_incidents FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = provider_id AND status = ANY(ARRAY['reported', 'acknowledged']));

DROP POLICY IF EXISTS "Providers can view their own incidents" ON job_customer_incidents;
CREATE POLICY "Providers can view their own incidents"
  ON job_customer_incidents FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = provider_id);

-- job_time_extension_requests
DROP POLICY IF EXISTS "Admins can view all time extension requests" ON job_time_extension_requests;
CREATE POLICY "Admins can view all time extension requests"
  ON job_time_extension_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (select auth.uid())
    AND profiles.user_type = 'admin'
  ));

DROP POLICY IF EXISTS "Customers can respond to time extension requests" ON job_time_extension_requests;
CREATE POLICY "Customers can respond to time extension requests"
  ON job_time_extension_requests FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_time_extension_requests.job_id
    AND jobs.customer_id = (select auth.uid())
  ) AND status = 'pending')
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_time_extension_requests.job_id
    AND jobs.customer_id = (select auth.uid())
  ) AND status = ANY(ARRAY['approved', 'declined']));

DROP POLICY IF EXISTS "Customers can view time extension requests for their jobs" ON job_time_extension_requests;
CREATE POLICY "Customers can view time extension requests for their jobs"
  ON job_time_extension_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_time_extension_requests.job_id
    AND jobs.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Providers can cancel their own pending requests" ON job_time_extension_requests;
CREATE POLICY "Providers can cancel their own pending requests"
  ON job_time_extension_requests FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = provider_id AND status = 'pending')
  WITH CHECK ((select auth.uid()) = provider_id AND status = 'cancelled');

DROP POLICY IF EXISTS "Providers can create time extension requests" ON job_time_extension_requests;
CREATE POLICY "Providers can create time extension requests"
  ON job_time_extension_requests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = provider_id AND EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_time_extension_requests.job_id
    AND jobs.status = ANY(ARRAY['In Progress', 'Started'])
  ));

DROP POLICY IF EXISTS "Providers can view their own time extension requests" ON job_time_extension_requests;
CREATE POLICY "Providers can view their own time extension requests"
  ON job_time_extension_requests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = provider_id);

-- job_views
DROP POLICY IF EXISTS "Job owners can view their job views" ON job_views;
CREATE POLICY "Job owners can view their job views"
  ON job_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_views.job_id
    AND jobs.customer_id = (select auth.uid())
  ));

DROP POLICY IF EXISTS "Users can track their own job views" ON job_views;
CREATE POLICY "Users can track their own job views"
  ON job_views FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = (select auth.uid()));

-- jobs
DROP POLICY IF EXISTS "Only customers and hybrids can create jobs" ON jobs;
CREATE POLICY "Only customers and hybrids can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()) AND (
    SELECT profiles.user_type FROM profiles WHERE profiles.id = (select auth.uid())
  ) = ANY(ARRAY['Customer', 'Hybrid']));

DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;
CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own jobs" ON jobs;
CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));
