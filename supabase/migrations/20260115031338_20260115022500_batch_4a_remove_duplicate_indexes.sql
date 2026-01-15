/*
  # BATCH 4A: Remove Duplicate Indexes
  
  Performance optimization - remove redundant indexes that waste storage and slow writes.
  
  ## Changes
  
  Duplicate indexes removed:
  1. fulfillment_tracking: Drop idx_fulfillment_tracking_event (keep idx_fulfillment_tracking_event_type)
  2. job_customer_incidents: Drop idx_incidents_status (keep idx_job_incidents_status)
  3. job_time_extension_requests: Drop idx_job_time_ext_status (keep idx_time_extensions_status)
  4. notification_preferences: Drop idx_notification_preferences_user (keep idx_notification_preferences_user_id)
  5. payout_schedules: Drop idx_payout_schedules_payout_status (keep idx_payout_schedules_status)
  6. price_adjustments: Drop idx_price_adj_status (keep idx_price_adjustments_status)
  
  ## Impact
  
  - Reduces storage usage
  - Speeds up INSERT/UPDATE/DELETE operations
  - No impact on query performance (kept indexes serve same purpose)
*/

-- Drop duplicate indexes
DROP INDEX IF EXISTS idx_fulfillment_tracking_event;
DROP INDEX IF EXISTS idx_incidents_status;
DROP INDEX IF EXISTS idx_job_time_ext_status;
DROP INDEX IF EXISTS idx_notification_preferences_user;
DROP INDEX IF EXISTS idx_payout_schedules_payout_status;
DROP INDEX IF EXISTS idx_price_adj_status;
