/*
  # Add Indexes for Common Filters & Sorting (Performance Optimization - Batch 2)
  
  ## Overview
  This migration adds indexes to improve query performance for common filtering
  and sorting operations identified by Performance Advisor warnings.
  
  ## Focus Areas
  - Timestamp columns for sorting (created_at, updated_at, completed_at, etc.)
  - Status columns for filtering  
  - Boolean filters (is_active, is_default)
  - Composite indexes for common filter+sort patterns
  
  ## Performance Impact
  - Faster ORDER BY created_at DESC queries  
  - Faster WHERE status = 'value' queries
  - Faster pagination with LIMIT/OFFSET
  - Improved composite query performance
  
  ## No Breaking Changes
  - All changes are additive
  - No schema modifications
  - Application behavior unchanged
*/

-- ============================================================================
-- CORE MARKETPLACE - BOOKINGS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_created_at 
  ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at 
  ON bookings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_completed_at 
  ON bookings(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_at 
  ON bookings(cancelled_at DESC) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status_created 
  ON bookings(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_created 
  ON bookings(provider_id, status, created_at DESC);

-- ============================================================================
-- CORE MARKETPLACE - JOBS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_jobs_pricing_type 
  ON jobs(pricing_type);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at 
  ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_updated_at 
  ON jobs(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created 
  ON jobs(status, created_at DESC);

-- ============================================================================
-- CORE MARKETPLACE - SERVICE LISTINGS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_service_listings_is_active 
  ON service_listings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_listings_created_at 
  ON service_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_updated_at 
  ON service_listings(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_active 
  ON service_listings(provider_id, is_active, created_at DESC);

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_created_at 
  ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
  ON profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_expires 
  ON profiles(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
  ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created 
  ON reviews(reviewee_id, created_at DESC);

-- ============================================================================
-- MESSAGING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
  ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_booking_created 
  ON messages(booking_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_notifications_read_at 
  ON notifications(read_at) WHERE read_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at 
  ON notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
  ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
  ON conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_msgs_created 
  ON consultation_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_consultation_msgs_consultation_created 
  ON consultation_messages(consultation_id, created_at ASC);

-- ============================================================================
-- CUSTOM SERVICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_consultations_created_at 
  ON custom_service_consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_completed_at 
  ON custom_service_consultations(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consultations_timeout_at 
  ON custom_service_consultations(timeout_at) WHERE timeout_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consultations_provider_status_created 
  ON custom_service_consultations(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_orders_updated_at 
  ON production_orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_orders_provider_status_created 
  ON production_orders(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proofs_status 
  ON proofs(status);
CREATE INDEX IF NOT EXISTS idx_proofs_created_at 
  ON proofs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proofs_reviewed_at 
  ON proofs(reviewed_at DESC) WHERE reviewed_at IS NOT NULL;

-- ============================================================================
-- FINANCIAL
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_status_created 
  ON wallet_transactions(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_refunds_created_at 
  ON refunds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refunds_processed_at 
  ON refunds(processed_at DESC) WHERE processed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_holds_created_at 
  ON escrow_holds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_expires_at 
  ON escrow_holds(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disputes_resolved_at 
  ON disputes(resolved_at DESC) WHERE resolved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payout_schedules_payout_status 
  ON payout_schedules(payout_status);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_created_at 
  ON payout_schedules(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_scheduled_payout 
  ON payout_schedules(scheduled_payout_date);
CREATE INDEX IF NOT EXISTS idx_payout_schedules_processed_at 
  ON payout_schedules(processed_at DESC) WHERE processed_at IS NOT NULL;

-- ============================================================================
-- FRAUD DETECTION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fraud_alerts_reviewed_at 
  ON fraud_alerts(reviewed_at DESC) WHERE reviewed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_is_active 
  ON fraud_blacklists(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_expires_at 
  ON fraud_blacklists(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_created_at 
  ON fraud_blacklists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fraud_rules_is_active 
  ON fraud_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fraud_rules_created_at 
  ON fraud_rules(created_at DESC);

-- ============================================================================
-- SOCIAL
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_community_posts_updated_at 
  ON community_posts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_created 
  ON community_posts(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_comments_created_at 
  ON post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_updated_at 
  ON post_comments(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created 
  ON post_comments(post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_post_likes_created_at 
  ON post_likes(created_at DESC);

-- ============================================================================
-- JOB MANAGEMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_acceptances_created_at 
  ON job_acceptances(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_acceptances_accepted_at 
  ON job_acceptances(accepted_at DESC) WHERE accepted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_acceptances_job_status_created 
  ON job_acceptances(job_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_analytics_created_at 
  ON job_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_analytics_updated_at 
  ON job_analytics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_views_created_at 
  ON job_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_time_ext_status 
  ON job_time_extension_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_time_ext_created_at 
  ON job_time_extension_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_incidents_status 
  ON job_customer_incidents(status);
CREATE INDEX IF NOT EXISTS idx_job_incidents_created_at 
  ON job_customer_incidents(created_at DESC);

-- ============================================================================
-- PERSONALIZATION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_person_submissions_created_at 
  ON personalization_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_submissions_updated_at 
  ON personalization_submissions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_person_snapshots_created_at 
  ON personalization_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_snapshots_finalized_at 
  ON personalization_snapshots(finalized_at DESC) WHERE finalized_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_person_reusable_created_at 
  ON personalization_reusable_setups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_person_reusable_last_used 
  ON personalization_reusable_setups(last_used_at DESC) WHERE last_used_at IS NOT NULL;

-- ============================================================================
-- INVENTORY & FULFILLMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_inventory_locks_status 
  ON inventory_locks(status);
CREATE INDEX IF NOT EXISTS idx_inventory_locks_created_at 
  ON inventory_locks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_locks_released_at 
  ON inventory_locks(released_at DESC) WHERE released_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_event_type 
  ON fulfillment_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tracking_created_at 
  ON fulfillment_tracking(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shipments_created_at 
  ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_updated_at 
  ON shipments(updated_at DESC);

-- ============================================================================
-- ADDITIONAL
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_is_active 
  ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_created_at 
  ON categories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cart_items_created_at 
  ON cart_items(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_docs_created_at 
  ON verification_documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_methods_is_default 
  ON payment_methods(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_at 
  ON payment_methods(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reschedule_requests_status 
  ON reschedule_requests(status);
CREATE INDEX IF NOT EXISTS idx_reschedule_requests_created_at 
  ON reschedule_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_adj_status 
  ON price_adjustments(status);
CREATE INDEX IF NOT EXISTS idx_price_adj_created_at 
  ON price_adjustments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_trust_updated_at 
  ON customer_trust_scores(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_trust_updated_at 
  ON provider_trust_scores(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status 
  ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_created_at 
  ON user_subscriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end 
  ON user_subscriptions(current_period_end) WHERE current_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_tokens_is_active 
  ON push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active 
  ON push_tokens(user_id, is_active);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_bookings_created_at IS 
  'Speeds up ORDER BY created_at DESC queries on bookings';
COMMENT ON INDEX idx_bookings_customer_status_created IS 
  'Optimizes customer booking history filtered by status, sorted by date';
COMMENT ON INDEX idx_jobs_pricing_type IS 
  'Accelerates WHERE pricing_type filtering on jobs';
COMMENT ON INDEX idx_service_listings_provider_active IS 
  'Optimizes provider active listings query with sort';
COMMENT ON INDEX idx_notifications_user_read_created IS 
  'Improves unread notifications query performance';

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration added 75+ indexes for:
-- ✓ Timestamp columns (created_at, updated_at, *_at)
-- ✓ Status columns (filtering by status values)
-- ✓ Boolean filters (is_active, is_default)
-- ✓ Composite indexes for common query patterns
--
-- Performance Benefits:
-- - Faster sorting (ORDER BY created_at DESC)
-- - Faster filtering (WHERE status = 'pending')
-- - Faster pagination (LIMIT/OFFSET with ORDER BY)
-- - Faster date range queries
-- - Improved composite query performance
--
-- Zero Breaking Changes:
-- - All changes are additive
-- - No schema modifications
-- - Application behavior unchanged
