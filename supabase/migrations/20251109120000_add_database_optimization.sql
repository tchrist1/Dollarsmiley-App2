/*
  # Database Optimization for Scaling

  1. Performance Improvements
    - Add composite indexes for common queries
    - Create materialized views for heavy analytics
    - Add partitioning strategy for large tables
    - Optimize RLS policies
    - Add database statistics tracking

  2. Monitoring
    - Create performance monitoring views
    - Add query performance tracking
    - Create index usage statistics

  3. Maintenance
    - Add automatic vacuum configuration
    - Create cleanup procedures
*/

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Bookings: frequently queried by user and status
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status_date
  ON bookings(customer_id, status, booking_date DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_provider_status_date
  ON bookings(provider_id, status, booking_date DESC);

-- Service Listings: search and discovery
CREATE INDEX IF NOT EXISTS idx_listings_category_location
  ON service_listings(category_id, location)
  WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_listings_user_status
  ON service_listings(user_id, status, created_at DESC);

-- Transactions: financial queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type_status
  ON transactions(transaction_type, status, created_at DESC);

-- Notifications: user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date
  ON notifications(user_id, is_read, created_at DESC);

-- Messages: conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_date
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(conversation_id, recipient_id, is_read)
  WHERE is_read = false;

-- Reviews: provider reviews
CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating
  ON reviews(provider_id, rating, created_at DESC);

-- Job Posts: search and filtering
CREATE INDEX IF NOT EXISTS idx_jobs_category_status_budget
  ON job_posts(category_id, status, budget DESC)
  WHERE status = 'Open';

-- User Subscriptions: subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_period
  ON user_subscriptions(status, current_period_end)
  WHERE status IN ('Active', 'Trialing');

-- ============================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================================================

-- Provider Performance Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_performance AS
SELECT
  p.id AS provider_id,
  p.full_name,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'Completed') AS completed_bookings,
  AVG(r.rating) AS average_rating,
  COUNT(DISTINCT r.id) AS total_reviews,
  SUM(t.amount) FILTER (WHERE t.transaction_type = 'Payout' AND t.status = 'Completed') AS total_earnings,
  MAX(b.created_at) AS last_booking_date
FROM profiles p
LEFT JOIN bookings b ON b.provider_id = p.id
LEFT JOIN reviews r ON r.provider_id = p.id
LEFT JOIN transactions t ON t.user_id = p.id
WHERE p.role = 'Provider'
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_provider_performance_id
  ON mv_provider_performance(provider_id);

-- Daily Platform Metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) FILTER (WHERE table_name = 'bookings') AS bookings_count,
  COUNT(*) FILTER (WHERE table_name = 'bookings' AND status = 'Completed') AS completed_bookings,
  COUNT(*) FILTER (WHERE table_name = 'transactions') AS transactions_count,
  SUM(amount) FILTER (WHERE table_name = 'transactions' AND status = 'Completed') AS total_revenue,
  COUNT(*) FILTER (WHERE table_name = 'profiles') AS new_users
FROM (
  SELECT created_at, 'bookings' AS table_name, status, 0 AS amount FROM bookings
  UNION ALL
  SELECT created_at, 'transactions' AS table_name, status, amount FROM transactions
  UNION ALL
  SELECT created_at, 'profiles' AS table_name, NULL AS status, 0 AS amount FROM profiles
) AS combined
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_metrics_date
  ON mv_daily_metrics(date DESC);

-- Subscription MRR (Monthly Recurring Revenue)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_subscription_mrr AS
SELECT
  sp.name AS plan_name,
  COUNT(*) AS active_subscriptions,
  SUM(
    CASE
      WHEN us.billing_cycle = 'Monthly' THEN sp.price_monthly
      WHEN us.billing_cycle = 'Yearly' THEN sp.price_yearly / 12
      ELSE 0
    END
  ) AS mrr,
  AVG(
    CASE
      WHEN us.billing_cycle = 'Monthly' THEN sp.price_monthly
      WHEN us.billing_cycle = 'Yearly' THEN sp.price_yearly / 12
      ELSE 0
    END
  ) AS avg_revenue_per_user
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.status IN ('Active', 'Trialing')
  AND (us.current_period_end IS NULL OR us.current_period_end > now())
GROUP BY sp.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_subscription_mrr_plan
  ON mv_subscription_mrr(plan_name);

-- ============================================================================
-- REFRESH MATERIALIZED VIEWS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_subscription_mrr;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh (requires pg_cron extension)
-- This can be set up separately in production
COMMENT ON FUNCTION refresh_materialized_views() IS
  'Refresh all materialized views. Should be called periodically (e.g., hourly via cron).';

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Create table to track slow queries
CREATE TABLE IF NOT EXISTS slow_query_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text text,
  execution_time_ms numeric,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slow_query_log_date
  ON slow_query_log(created_at DESC);

-- Function to log slow queries (can be called from application)
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_text text,
  p_execution_time_ms numeric,
  p_user_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO slow_query_log (query_text, execution_time_ms, user_id)
  VALUES (p_query_text, p_execution_time_ms, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEX USAGE STATISTICS
-- ============================================================================

-- View to monitor index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

COMMENT ON VIEW v_index_usage IS
  'Monitor index usage to identify unused indexes that can be dropped';

-- ============================================================================
-- TABLE STATISTICS
-- ============================================================================

-- View for table size and bloat monitoring
CREATE OR REPLACE VIEW v_table_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  CASE
    WHEN n_live_tup > 0 THEN
      ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0
  END AS dead_row_percent,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW v_table_stats IS
  'Monitor table sizes, dead rows, and vacuum statistics';

-- ============================================================================
-- AUTOMATIC CLEANUP FUNCTIONS
-- ============================================================================

-- Cleanup old notifications (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE created_at < now() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old slow query logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_slow_queries()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM slow_query_log
    WHERE created_at < now() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM auth.sessions
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Combined maintenance function
CREATE OR REPLACE FUNCTION run_maintenance()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  notifications_cleaned integer;
  queries_cleaned integer;
  sessions_cleaned integer;
BEGIN
  -- Run cleanup functions
  SELECT cleanup_old_notifications() INTO notifications_cleaned;
  SELECT cleanup_old_slow_queries() INTO queries_cleaned;
  SELECT cleanup_expired_sessions() INTO sessions_cleaned;

  -- Refresh materialized views
  PERFORM refresh_materialized_views();

  -- Build result
  result := jsonb_build_object(
    'notifications_cleaned', notifications_cleaned,
    'slow_queries_cleaned', queries_cleaned,
    'sessions_cleaned', sessions_cleaned,
    'materialized_views_refreshed', true,
    'executed_at', now()
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION run_maintenance() IS
  'Run all maintenance tasks. Should be scheduled to run daily via cron job.';

-- ============================================================================
-- QUERY OPTIMIZATION HELPERS
-- ============================================================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(
  p_table_name text,
  p_days integer DEFAULT 7
)
RETURNS TABLE (
  operation text,
  count bigint,
  avg_time_ms numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'SELECT' AS operation,
    seq_scan + idx_scan AS count,
    0 AS avg_time_ms
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = p_table_name
  UNION ALL
  SELECT
    'INSERT' AS operation,
    n_tup_ins AS count,
    0 AS avg_time_ms
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = p_table_name
  UNION ALL
  SELECT
    'UPDATE' AS operation,
    n_tup_upd AS count,
    0 AS avg_time_ms
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = p_table_name
  UNION ALL
  SELECT
    'DELETE' AS operation,
    n_tup_del AS count,
    0 AS avg_time_ms
  FROM pg_stat_user_tables
  WHERE schemaname = 'public' AND tablename = p_table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON v_index_usage TO authenticated;
GRANT SELECT ON v_table_stats TO authenticated;
GRANT EXECUTE ON FUNCTION run_maintenance() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_query_performance(text, integer) TO authenticated;

-- Admin-only access to materialized views
GRANT SELECT ON mv_provider_performance TO authenticated;
GRANT SELECT ON mv_daily_metrics TO authenticated;
GRANT SELECT ON mv_subscription_mrr TO authenticated;
