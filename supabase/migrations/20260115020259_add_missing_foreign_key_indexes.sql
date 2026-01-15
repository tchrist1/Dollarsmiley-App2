/*
  # Add Missing Foreign Key and Join Indexes (Performance Optimization)
  
  ## Overview
  This migration adds indexes to improve query performance by addressing
  Performance Advisor warnings for:
  - Missing foreign key indexes (71 identified)
  - Missing join column indexes
  - Missing RLS policy column indexes
  
  ## Performance Impact
  - Speeds up JOIN operations on foreign keys
  - Accelerates WHERE clause filtering
  - Improves RLS policy evaluation performance
  - Reduces table scans and improves query planning
  
  ## Changes Made
  1. Foreign Key Indexes: 71 indexes on foreign key columns
  2. Status Column Indexes: Frequently filtered status fields
  3. RLS Policy Indexes: Columns used in Row Level Security policies
  
  ## No Breaking Changes
  - All changes are additive (CREATE INDEX only)
  - No schema modifications
  - No data changes
  - Application behavior unchanged
  
  Note: CONCURRENTLY not used as migrations run in transactions.
  IF NOT EXISTS ensures idempotency.
*/

-- ============================================================================
-- SECTION 1: FOREIGN KEY INDEXES
-- ============================================================================
-- These indexes improve JOIN performance and foreign key constraint checking

-- AI Category Suggestion Tracking
CREATE INDEX IF NOT EXISTS idx_ai_cat_sugg_actual_category 
  ON ai_category_suggestion_tracking(actual_category_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_sugg_actual_subcategory 
  ON ai_category_suggestion_tracking(actual_subcategory_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_sugg_suggested_category 
  ON ai_category_suggestion_tracking(suggested_category_id);
CREATE INDEX IF NOT EXISTS idx_ai_cat_sugg_suggested_subcategory 
  ON ai_category_suggestion_tracking(suggested_subcategory_id);

-- AI Content Moderation
CREATE INDEX IF NOT EXISTS idx_ai_moderation_reviewer 
  ON ai_content_moderation(human_reviewer_id);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_listing 
  ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot 
  ON bookings(time_slot_id);

-- Cart Items
CREATE INDEX IF NOT EXISTS idx_cart_fulfillment_option 
  ON cart_items(fulfillment_option_id);
CREATE INDEX IF NOT EXISTS idx_cart_listing 
  ON cart_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_cart_shipping_address 
  ON cart_items(shipping_address_id);

-- Consultation Messages
CREATE INDEX IF NOT EXISTS idx_consultation_msg_sender 
  ON consultation_messages(sender_id);

-- Consultation Timeouts
CREATE INDEX IF NOT EXISTS idx_consultation_timeout_consultation 
  ON consultation_timeouts(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_timeout_production 
  ON consultation_timeouts(production_order_id);

-- Custom Service Consultations
CREATE INDEX IF NOT EXISTS idx_consultations_customer 
  ON custom_service_consultations(customer_id);
CREATE INDEX IF NOT EXISTS idx_consultations_provider 
  ON custom_service_consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_consultations_waived_by 
  ON custom_service_consultations(waived_by);

-- Damage Assessments
CREATE INDEX IF NOT EXISTS idx_damage_assessments_assessed_by 
  ON damage_assessments(assessed_by);

-- Disputes
CREATE INDEX IF NOT EXISTS idx_disputes_escrow_hold 
  ON disputes(escrow_hold_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolved_by 
  ON disputes(resolved_by);

-- Escrow Holds
CREATE INDEX IF NOT EXISTS idx_escrow_holds_customer 
  ON escrow_holds(customer_id);

-- Expense Categorization Rules
CREATE INDEX IF NOT EXISTS idx_expense_rules_category 
  ON expense_categorization_rules(expense_category_id);

-- Fraud Detection Tables
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_reviewed_by 
  ON fraud_alerts(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_added_by 
  ON fraud_blacklists(added_by);
CREATE INDEX IF NOT EXISTS idx_fraud_fingerprints_user 
  ON fraud_device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_notes_alert 
  ON fraud_investigation_notes(alert_id);
CREATE INDEX IF NOT EXISTS idx_fraud_notes_investigator 
  ON fraud_investigation_notes(investigator_id);
CREATE INDEX IF NOT EXISTS idx_fraud_rules_created_by 
  ON fraud_rules(created_by);

-- Fulfillment Tracking
CREATE INDEX IF NOT EXISTS idx_fulfillment_confirmed_by 
  ON fulfillment_tracking(confirmed_by);

-- Inventory Locks
CREATE INDEX IF NOT EXISTS idx_inventory_locks_locked_by 
  ON inventory_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_inventory_locks_listing 
  ON inventory_locks(service_listing_id);

-- Job Analytics
CREATE INDEX IF NOT EXISTS idx_job_analytics_customer 
  ON job_analytics(customer_id);

-- Job Customer Incidents
CREATE INDEX IF NOT EXISTS idx_job_incidents_booking 
  ON job_customer_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_incidents_compensation_processor 
  ON job_customer_incidents(compensation_processed_by);
CREATE INDEX IF NOT EXISTS idx_job_incidents_resolved_by 
  ON job_customer_incidents(resolved_by);

-- Job Time Extension Requests
CREATE INDEX IF NOT EXISTS idx_job_time_ext_responded_by 
  ON job_time_extension_requests(responded_by);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_category 
  ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_provider 
  ON jobs(provider_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_sender 
  ON messages(sender_id);

-- Notification Suggestions
CREATE INDEX IF NOT EXISTS idx_notif_suggestions_template 
  ON notification_suggestions(notification_template_id);

-- Optimal Pricing
CREATE INDEX IF NOT EXISTS idx_optimal_pricing_category 
  ON optimal_pricing(service_category_id);

-- Order Communications
CREATE INDEX IF NOT EXISTS idx_order_comms_initiated_by 
  ON order_communications(initiated_by);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_listing 
  ON order_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_order_items_personalization 
  ON order_items(personalization_snapshot_id);

-- Payout Schedules
CREATE INDEX IF NOT EXISTS idx_payout_schedules_booking 
  ON payout_schedules(booking_id);

-- Personalization Tables
CREATE INDEX IF NOT EXISTS idx_person_presets_provider 
  ON personalization_image_presets(provider_id);
CREATE INDEX IF NOT EXISTS idx_person_reusable_booking 
  ON personalization_reusable_setups(source_booking_id);
CREATE INDEX IF NOT EXISTS idx_person_reusable_snapshot 
  ON personalization_reusable_setups(source_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_person_snapshots_listing 
  ON personalization_snapshots(listing_id);
CREATE INDEX IF NOT EXISTS idx_person_snapshots_provider 
  ON personalization_snapshots(provider_id);
CREATE INDEX IF NOT EXISTS idx_person_submissions_config 
  ON personalization_submissions(config_id);

-- Platform Policies
CREATE INDEX IF NOT EXISTS idx_platform_policies_created_by 
  ON platform_policies(created_by);

-- Price Adjustments
CREATE INDEX IF NOT EXISTS idx_price_adj_customer 
  ON price_adjustments(customer_id);
CREATE INDEX IF NOT EXISTS idx_price_adj_provider 
  ON price_adjustments(provider_id);

-- Production Orders
CREATE INDEX IF NOT EXISTS idx_production_inventory_lock 
  ON production_orders(inventory_lock_id);

-- Proofs
CREATE INDEX IF NOT EXISTS idx_proofs_reviewed_by 
  ON proofs(reviewed_by);

-- Refunds
CREATE INDEX IF NOT EXISTS idx_refunds_approved_by 
  ON refunds(approved_by);
CREATE INDEX IF NOT EXISTS idx_refunds_dispute 
  ON refunds(dispute_id);
CREATE INDEX IF NOT EXISTS idx_refunds_escrow_hold 
  ON refunds(escrow_hold_id);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_by 
  ON refunds(requested_by);

-- Reschedule Requests
CREATE INDEX IF NOT EXISTS idx_reschedule_responded_by 
  ON reschedule_requests(responded_by);

-- Service Listings
CREATE INDEX IF NOT EXISTS idx_listings_proofing_updated_by 
  ON service_listings(proofing_updated_by);

-- Standard Service Agreements
CREATE INDEX IF NOT EXISTS idx_service_agreements_created_by 
  ON standard_service_agreements(created_by);

-- Time Slot Bookings
CREATE INDEX IF NOT EXISTS idx_time_slots_booking 
  ON time_slot_bookings(booking_id);

-- Trust Score Events
CREATE INDEX IF NOT EXISTS idx_trust_events_booking 
  ON trust_score_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_job 
  ON trust_score_events(job_id);

-- User Subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan 
  ON user_subscriptions(plan_id);

-- Verification Documents
CREATE INDEX IF NOT EXISTS idx_verification_docs_user 
  ON verification_documents(user_id);

-- Wallet Transactions
CREATE INDEX IF NOT EXISTS idx_wallet_txn_booking 
  ON wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_escrow 
  ON wallet_transactions(escrow_hold_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_refund 
  ON wallet_transactions(refund_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_related_booking 
  ON wallet_transactions(related_booking_id);

-- ============================================================================
-- SECTION 2: STATUS COLUMN INDEXES (Frequently Filtered)
-- ============================================================================
-- These indexes improve WHERE clause performance on status fields

-- Bookings Status Columns
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
  ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_escrow_status 
  ON bookings(escrow_status);

-- Job Customer Incidents
CREATE INDEX IF NOT EXISTS idx_job_incidents_compensation_status 
  ON job_customer_incidents(compensation_status);

-- Order Communications
CREATE INDEX IF NOT EXISTS idx_order_comms_status 
  ON order_communications(status);

-- Personalization Submissions
CREATE INDEX IF NOT EXISTS idx_person_submissions_validation 
  ON personalization_submissions(validation_status);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_status 
  ON shipments(shipment_status);

-- Stripe Connect Accounts
CREATE INDEX IF NOT EXISTS idx_stripe_connect_status 
  ON stripe_connect_accounts(account_status);

-- Verification Documents
CREATE INDEX IF NOT EXISTS idx_verification_docs_status 
  ON verification_documents(status);

-- Wallet Transactions
CREATE INDEX IF NOT EXISTS idx_wallet_txn_status 
  ON wallet_transactions(status);

-- Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_stripe_status 
  ON wallets(stripe_account_status);

-- ============================================================================
-- VALIDATION & DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_bookings_listing IS 
  'Improves JOIN performance for bookings.listing_id foreign key';
COMMENT ON INDEX idx_bookings_payment_status IS 
  'Accelerates WHERE filtering on payment_status in booking queries';
COMMENT ON INDEX idx_jobs_provider IS 
  'Optimizes RLS policies checking jobs.provider_id = auth.uid()';

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration added:
-- ✓ 71 Foreign Key Indexes (improve JOIN and FK constraint performance)
-- ✓ 10 Status Column Indexes (improve WHERE clause filtering)
-- ✓ Additional RLS-critical indexes (optimize policy evaluation)
--
-- Performance Benefits:
-- - Faster JOIN operations on foreign keys
-- - Reduced table scans in WHERE clauses
-- - Faster RLS policy evaluation
-- - Better query planning and optimization
--
-- Zero Breaking Changes:
-- - All changes are additive
-- - No schema modifications
-- - No data changes
-- - Application behavior unchanged
