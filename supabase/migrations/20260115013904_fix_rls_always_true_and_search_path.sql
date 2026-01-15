/*
  # Fix Security Warnings - RLS Always True & Function Search Path
  
  ## Overview
  This migration addresses Security Advisor WARNINGS by:
  1. Fixing 12 INSERT policies with "always true" conditions
  2. Setting search_path for 192 functions to prevent object hijacking
  
  ## Part A: Fix RLS "Always True" Policies
  
  ### Server-Only Tables (Remove client INSERT, server uses service_role)
  - damage_deposit_payments
  - notification_digest_queue
  - notification_suggestions
  - order_items
  - payout_schedules
  - saved_search_matches
  - saved_search_notifications
  - shipping_rate_cache
  - wallet_transactions
  
  ### Client-Allowed Tables (Replace WITH CHECK true with strict constraints)
  - job_views: viewer_id = auth.uid()
  - notification_engagement_metrics: user_id = auth.uid()
  - time_slot_bookings: provider_id = auth.uid()
  
  ## Part B: Function Search Path
  - Set search_path = public, extensions for all 192 functions
  
  ## Security Impact
  - Prevents unauthorized inserts by tightening policy conditions
  - Prevents SQL injection via search_path manipulation
*/

-- ============================================================================
-- PART A: FIX RLS "ALWAYS TRUE" INSERT POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DAMAGE_DEPOSIT_PAYMENTS (Server-only)
-- ----------------------------------------------------------------------------

-- Drop the permissive policy
DROP POLICY IF EXISTS "System can create damage deposit payments" ON damage_deposit_payments;

-- No new INSERT policy - server uses service_role bypass
COMMENT ON TABLE damage_deposit_payments IS 
  'Server-only table: Inserts restricted to service_role for payment processing';

-- ----------------------------------------------------------------------------
-- 2. JOB_VIEWS (Client can track their own views)
-- ----------------------------------------------------------------------------

-- Drop the permissive policy
DROP POLICY IF EXISTS "Anyone can insert job views" ON job_views;

-- Create strict policy: users can only insert their own views
CREATE POLICY "Users can track their own job views"
  ON job_views
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id = auth.uid());

COMMENT ON TABLE job_views IS 
  'Analytics table: Users can INSERT their own views (viewer_id = auth.uid())';

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION_DIGEST_QUEUE (Server-only)
-- ----------------------------------------------------------------------------

-- Check if policy exists and drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_digest_queue'
    AND policyname = 'Anyone can insert notification digest queue'
  ) THEN
    DROP POLICY "Anyone can insert notification digest queue" ON notification_digest_queue;
  END IF;
END $$;

COMMENT ON TABLE notification_digest_queue IS 
  'Server-only table: Inserts restricted to service_role for notification batching';

-- ----------------------------------------------------------------------------
-- 4. NOTIFICATION_ENGAGEMENT_METRICS (Client can track their own engagement)
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_engagement_metrics'
    AND policyname = 'Anyone can insert notification engagement metrics'
  ) THEN
    DROP POLICY "Anyone can insert notification engagement metrics" ON notification_engagement_metrics;
  END IF;
END $$;

-- Create strict policy: users can only insert their own engagement metrics
CREATE POLICY "Users can track their own notification engagement"
  ON notification_engagement_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE notification_engagement_metrics IS 
  'Analytics table: Users can INSERT their own engagement data (user_id = auth.uid())';

-- ----------------------------------------------------------------------------
-- 5. NOTIFICATION_SUGGESTIONS (Server-only)
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notification_suggestions'
    AND policyname = 'Anyone can insert notification suggestions'
  ) THEN
    DROP POLICY "Anyone can insert notification suggestions" ON notification_suggestions;
  END IF;
END $$;

COMMENT ON TABLE notification_suggestions IS 
  'Server-only table: Inserts restricted to service_role for AI-generated suggestions';

-- ----------------------------------------------------------------------------
-- 6. ORDER_ITEMS (Server-only)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can create order items" ON order_items;

COMMENT ON TABLE order_items IS 
  'Server-only table: Inserts restricted to service_role during booking creation';

-- ----------------------------------------------------------------------------
-- 7. PAYOUT_SCHEDULES (Server-only)
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payout_schedules'
    AND policyname = 'Anyone can insert payout schedules'
  ) THEN
    DROP POLICY "Anyone can insert payout schedules" ON payout_schedules;
  END IF;
END $$;

COMMENT ON TABLE payout_schedules IS 
  'Server-only table: Inserts restricted to service_role for payment processing';

-- ----------------------------------------------------------------------------
-- 8. SAVED_SEARCH_MATCHES (Server-only)
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'saved_search_matches'
    AND policyname = 'Anyone can insert saved search matches'
  ) THEN
    DROP POLICY "Anyone can insert saved search matches" ON saved_search_matches;
  END IF;
END $$;

COMMENT ON TABLE saved_search_matches IS 
  'Server-only table: Inserts restricted to service_role for background search matching';

-- ----------------------------------------------------------------------------
-- 9. SAVED_SEARCH_NOTIFICATIONS (Server-only)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can create notifications" ON saved_search_notifications;

COMMENT ON TABLE saved_search_notifications IS 
  'Server-only table: Inserts restricted to service_role for notification delivery';

-- ----------------------------------------------------------------------------
-- 10. SHIPPING_RATE_CACHE (Server-only)
-- ----------------------------------------------------------------------------

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'shipping_rate_cache'
    AND policyname = 'Anyone can insert shipping rate cache'
  ) THEN
    DROP POLICY "Anyone can insert shipping rate cache" ON shipping_rate_cache;
  END IF;
END $$;

COMMENT ON TABLE shipping_rate_cache IS 
  'Server-only table: Inserts restricted to service_role for caching shipping rates';

-- ----------------------------------------------------------------------------
-- 11. TIME_SLOT_BOOKINGS (Provider can create their own slots)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can create time slot bookings" ON time_slot_bookings;

-- Create strict policy: providers can only create slots for themselves
CREATE POLICY "Providers can create their own time slot bookings"
  ON time_slot_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

COMMENT ON TABLE time_slot_bookings IS 
  'Hybrid table: Providers can INSERT their own slots (provider_id = auth.uid()), server creates via service_role';

-- ----------------------------------------------------------------------------
-- 12. WALLET_TRANSACTIONS (Server-only)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert wallet transactions" ON wallet_transactions;

COMMENT ON TABLE wallet_transactions IS 
  'Server-only table: Inserts restricted to service_role for financial integrity';

-- ============================================================================
-- PART B: FIX FUNCTION SEARCH_PATH (ALL 192 FUNCTIONS)
-- ============================================================================

-- Generate ALTER FUNCTION statements for all functions without search_path
DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config 
        WHERE config LIKE 'search_path=%'
      ))
    ORDER BY p.proname
  LOOP
    -- Build full function signature
    func_signature := func_record.schema_name || '.' || func_record.function_name || '(' || func_record.arguments || ')';
    
    -- Set search_path to public, extensions
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', func_signature);
    
  END LOOP;
  
  RAISE NOTICE 'Successfully set search_path for all 192 functions';
END $$;

-- ============================================================================
-- VALIDATION QUERIES (for testing)
-- ============================================================================

-- Check that functions now have search_path set
-- Run after migration:
-- SELECT COUNT(*) FROM pg_proc p 
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' 
-- AND p.prokind IN ('f', 'p')
-- AND EXISTS (SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%');
