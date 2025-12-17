/*
  # Create Materialized Views for Analytics

  1. Provider Analytics Dashboard
    - Total earnings
    - Booking stats
    - Review ratings
    - Performance metrics

  2. Marketplace Analytics
    - Popular categories
    - Revenue breakdown
    - Top providers
    - User engagement

  3. Shipping Analytics
    - Shipment volumes
    - Carrier performance
    - Delivery times

  4. Refresh Schedule
    - Automatic refresh every hour
    - Manual refresh on demand
*/

-- ============================================================================
-- PROVIDER ANALYTICS MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS provider_analytics AS
SELECT
  p.id AS provider_id,
  p.email,
  p.full_name,

  -- Booking Statistics
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) AS completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Cancelled' THEN b.id END) AS cancelled_bookings,
  ROUND(
    COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT b.id), 0) * 100,
    2
  ) AS completion_rate,

  -- Revenue Statistics
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS avg_booking_value,
  COALESCE(MAX(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS highest_booking,

  -- Review Statistics
  COUNT(DISTINCT r.id) AS total_reviews,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT CASE WHEN r.rating = 5 THEN r.id END) AS five_star_reviews,
  COUNT(DISTINCT CASE WHEN r.rating >= 4 THEN r.id END) AS four_plus_reviews,

  -- Listing Statistics
  COUNT(DISTINCT l.id) AS total_listings,
  COUNT(DISTINCT CASE WHEN l.is_active THEN l.id END) AS active_listings,
  COUNT(DISTINCT CASE WHEN l.is_featured THEN l.id END) AS featured_listings,

  -- Response Metrics
  COALESCE(AVG(EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/3600), 0) AS avg_response_hours,

  -- Recent Activity
  MAX(b.created_at) AS last_booking_date,
  MAX(l.created_at) AS last_listing_date,

  -- Timestamps
  NOW() AS refreshed_at

FROM profiles p
LEFT JOIN service_listings l ON l.provider_id = p.id
LEFT JOIN bookings b ON b.provider_id = p.id
LEFT JOIN reviews r ON r.provider_id = p.id
WHERE p.user_type = 'provider'
GROUP BY p.id, p.email, p.full_name;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_analytics_provider
  ON provider_analytics(provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_analytics_revenue
  ON provider_analytics(total_revenue DESC);

CREATE INDEX IF NOT EXISTS idx_provider_analytics_rating
  ON provider_analytics(avg_rating DESC);

-- ============================================================================
-- MARKETPLACE OVERVIEW MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS marketplace_analytics AS
SELECT
  -- Category Performance
  c.id AS category_id,
  c.name AS category_name,

  -- Listing Stats
  COUNT(DISTINCT l.id) AS total_listings,
  COUNT(DISTINCT CASE WHEN l.is_active THEN l.id END) AS active_listings,
  COALESCE(AVG(l.base_price), 0) AS avg_price,

  -- Booking Stats
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) AS completed_bookings,
  ROUND(
    COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT b.id), 0) * 100,
    2
  ) AS completion_rate,

  -- Revenue Stats
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS avg_booking_value,

  -- Review Stats
  COUNT(DISTINCT r.id) AS total_reviews,
  COALESCE(AVG(r.rating), 0) AS avg_rating,

  -- Provider Stats
  COUNT(DISTINCT l.provider_id) AS active_providers,

  -- Customer Stats
  COUNT(DISTINCT b.customer_id) AS unique_customers,

  -- Growth Metrics (last 30 days)
  COUNT(DISTINCT CASE
    WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN l.id
  END) AS new_listings_30d,
  COUNT(DISTINCT CASE
    WHEN b.created_at >= NOW() - INTERVAL '30 days' THEN b.id
  END) AS new_bookings_30d,

  -- Timestamps
  NOW() AS refreshed_at

FROM categories c
LEFT JOIN service_listings l ON l.category_id = c.id
LEFT JOIN bookings b ON b.listing_id = l.id
LEFT JOIN reviews r ON r.booking_id = b.id
GROUP BY c.id, c.name;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_analytics_category
  ON marketplace_analytics(category_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_revenue
  ON marketplace_analytics(total_revenue DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_analytics_bookings
  ON marketplace_analytics(total_bookings DESC);

-- ============================================================================
-- SHIPPING PERFORMANCE MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS shipping_analytics AS
SELECT
  -- Carrier Performance
  s.carrier_code,
  s.carrier_name,

  -- Volume Stats
  COUNT(*) AS total_shipments,
  COUNT(CASE WHEN s.status = 'Delivered' THEN 1 END) AS delivered_shipments,
  COUNT(CASE WHEN s.status IN ('Failed', 'Returned') THEN 1 END) AS failed_shipments,

  -- Delivery Performance
  ROUND(
    COUNT(CASE WHEN s.status = 'Delivered' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) AS delivery_rate,

  -- Timing Metrics
  COALESCE(
    AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at))/86400),
    0
  ) AS avg_delivery_days,
  COALESCE(
    MIN(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at))/86400),
    0
  ) AS fastest_delivery_days,
  COALESCE(
    MAX(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at))/86400),
    0
  ) AS slowest_delivery_days,

  -- Cost Metrics
  COALESCE(AVG(s.shipping_cost), 0) AS avg_shipping_cost,
  COALESCE(SUM(s.shipping_cost), 0) AS total_shipping_revenue,

  -- Service Level Breakdown
  COUNT(CASE WHEN s.service_code LIKE '%express%' OR s.service_code LIKE '%overnight%' THEN 1 END) AS express_shipments,
  COUNT(CASE WHEN s.service_code LIKE '%ground%' OR s.service_code LIKE '%standard%' THEN 1 END) AS ground_shipments,

  -- Recent Activity
  COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) AS shipments_7d,
  COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) AS shipments_30d,

  -- Timestamps
  NOW() AS refreshed_at

FROM shipments s
GROUP BY s.carrier_code, s.carrier_name;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_analytics_carrier
  ON shipping_analytics(carrier_code);

CREATE INDEX IF NOT EXISTS idx_shipping_analytics_volume
  ON shipping_analytics(total_shipments DESC);

CREATE INDEX IF NOT EXISTS idx_shipping_analytics_performance
  ON shipping_analytics(delivery_rate DESC);

-- ============================================================================
-- REVENUE BREAKDOWN MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_analytics AS
SELECT
  DATE_TRUNC('month', b.completed_at) AS month,

  -- Revenue Breakdown
  COUNT(*) AS total_bookings,
  SUM(b.base_price) AS base_revenue,
  SUM(b.vas_total) AS vas_revenue,
  SUM(b.shipping_cost) AS shipping_revenue,
  SUM(b.total_price) AS total_revenue,

  -- Platform Fees
  SUM(b.total_price * 0.10) AS platform_fees,
  SUM(b.total_price * 0.90) AS provider_earnings,

  -- Payment Method Breakdown
  COUNT(CASE WHEN pm.payment_type = 'card' THEN 1 END) AS card_payments,
  COUNT(CASE WHEN pm.payment_type = 'bank_account' THEN 1 END) AS bank_payments,
  COUNT(CASE WHEN pm.payment_type IN ('cashapp', 'venmo') THEN 1 END) AS p2p_payments,

  -- Average Metrics
  AVG(b.total_price) AS avg_booking_value,
  AVG(b.vas_total) AS avg_vas_value,

  -- Growth Metrics
  COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', b.completed_at)) AS booking_growth,
  SUM(b.total_price) - LAG(SUM(b.total_price)) OVER (ORDER BY DATE_TRUNC('month', b.completed_at)) AS revenue_growth,

  -- Timestamps
  NOW() AS refreshed_at

FROM bookings b
LEFT JOIN transactions t ON t.booking_id = b.id AND t.status = 'Completed'
LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
WHERE b.status = 'Completed'
  AND b.completed_at IS NOT NULL
GROUP BY DATE_TRUNC('month', b.completed_at)
ORDER BY month DESC;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_analytics_month
  ON revenue_analytics(month DESC);

-- ============================================================================
-- TOP PERFORMERS MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS top_performers AS
SELECT
  'provider' AS entity_type,
  p.id AS entity_id,
  p.full_name AS entity_name,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS total_revenue,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_reviews,
  NOW() AS refreshed_at
FROM profiles p
LEFT JOIN bookings b ON b.provider_id = p.id
LEFT JOIN reviews r ON r.provider_id = p.id
WHERE p.user_type = 'provider'
GROUP BY p.id, p.full_name
HAVING COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) >= 5

UNION ALL

SELECT
  'listing' AS entity_type,
  l.id AS entity_id,
  l.title AS entity_name,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) AS total_revenue,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_reviews,
  NOW() AS refreshed_at
FROM service_listings l
LEFT JOIN bookings b ON b.listing_id = l.id
LEFT JOIN reviews r ON r.booking_id = b.id
WHERE l.is_active = true
GROUP BY l.id, l.title
HAVING COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) >= 3

ORDER BY total_revenue DESC
LIMIT 100;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_top_performers_revenue
  ON top_performers(total_revenue DESC);

CREATE INDEX IF NOT EXISTS idx_top_performers_rating
  ON top_performers(avg_rating DESC);

-- ============================================================================
-- USER ENGAGEMENT MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_analytics AS
SELECT
  DATE_TRUNC('day', created_at) AS date,

  -- User Activity
  COUNT(DISTINCT user_id) AS active_users,
  COUNT(DISTINCT CASE WHEN user_type = 'provider' THEN user_id END) AS active_providers,
  COUNT(DISTINCT CASE WHEN user_type = 'customer' THEN user_id END) AS active_customers,

  -- Engagement Metrics
  COUNT(*) AS total_actions,
  COUNT(DISTINCT session_id) AS total_sessions,
  COALESCE(AVG(session_duration), 0) AS avg_session_duration,

  -- Timestamps
  NOW() AS refreshed_at

FROM user_behavior_tracking
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create index
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_engagement_date
  ON user_engagement_analytics(date DESC);

-- ============================================================================
-- REFRESH FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketplace_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY shipping_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_performers;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_analytics;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific view
CREATE OR REPLACE FUNCTION refresh_analytics(view_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULED REFRESH (Run via cron or Edge Function)
-- ============================================================================

-- Note: Set up a cron job or Edge Function to call refresh_all_analytics()
-- Example: Every hour
-- SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_all_analytics()');

-- Grant permissions
GRANT SELECT ON provider_analytics TO authenticated;
GRANT SELECT ON marketplace_analytics TO authenticated;
GRANT SELECT ON shipping_analytics TO authenticated;
GRANT SELECT ON revenue_analytics TO authenticated;
GRANT SELECT ON top_performers TO authenticated;
GRANT SELECT ON user_engagement_analytics TO authenticated;
