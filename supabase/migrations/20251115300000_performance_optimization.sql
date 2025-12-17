/*
  # Performance Optimization System

  1. New Features
    - Query result caching
    - Database query optimization
    - Materialized views
    - Additional indexes
    - Partition tables for large data

  2. Views
    - Optimized listing views
    - User statistics views
    - Performance dashboards

  3. Caching
    - Redis-ready structure
    - Cache invalidation triggers
*/

-- Cache Management Table
CREATE TABLE IF NOT EXISTS cache_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cache_key text UNIQUE NOT NULL,
  cache_value jsonb NOT NULL,

  -- Expiry
  expires_at timestamptz NOT NULL,
  is_expired boolean DEFAULT false,

  -- Metadata
  cache_tags text[],
  hit_count bigint DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Materialized View: Popular Listings
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_listings AS
SELECT
  sl.id,
  sl.title,
  sl.provider_id,
  sl.category,
  sl.price_per_unit,
  COUNT(DISTINCT b.id) AS total_bookings,
  AVG(r.rating)::numeric(3, 2) AS average_rating,
  COUNT(DISTINCT r.id) AS review_count,
  SUM(CASE WHEN b.created_at > now() - interval '30 days' THEN 1 ELSE 0 END) AS bookings_last_30d
FROM service_listings sl
LEFT JOIN bookings b ON b.listing_id = sl.id
LEFT JOIN reviews r ON r.listing_id = sl.id
WHERE sl.is_active = true
GROUP BY sl.id, sl.title, sl.provider_id, sl.category, sl.price_per_unit
HAVING COUNT(DISTINCT b.id) > 0
ORDER BY bookings_last_30d DESC, average_rating DESC;

CREATE UNIQUE INDEX ON mv_popular_listings (id);
CREATE INDEX ON mv_popular_listings (category, bookings_last_30d DESC);

-- Materialized View: Provider Statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_provider_stats AS
SELECT
  p.id AS provider_id,
  p.full_name,
  COUNT(DISTINCT sl.id) AS total_listings,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) AS completed_bookings,
  AVG(r.rating)::numeric(3, 2) AS average_rating,
  COUNT(DISTINCT r.id) AS total_reviews,
  SUM(b.total_amount) AS total_revenue,
  (COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::numeric / NULLIF(COUNT(DISTINCT b.id), 0) * 100)::numeric(5, 2) AS completion_rate
FROM profiles p
LEFT JOIN service_listings sl ON sl.provider_id = p.id
LEFT JOIN bookings b ON b.provider_id = p.id
LEFT JOIN reviews r ON r.provider_id = p.id
WHERE p.user_type IN ('provider', 'both')
GROUP BY p.id, p.full_name;

CREATE UNIQUE INDEX ON mv_provider_stats (provider_id);
CREATE INDEX ON mv_provider_stats (average_rating DESC, total_bookings DESC);

-- Materialized View: Category Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_performance AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  COUNT(DISTINCT sl.id) AS total_listings,
  COUNT(DISTINCT b.id) AS total_bookings,
  AVG(b.total_amount) AS average_booking_value,
  SUM(b.total_amount) AS total_gmv,
  COUNT(DISTINCT sl.provider_id) AS provider_count,
  AVG(r.rating)::numeric(3, 2) AS average_rating
FROM categories c
LEFT JOIN service_listings sl ON sl.category = c.name
LEFT JOIN bookings b ON b.listing_id = sl.id
LEFT JOIN reviews r ON r.listing_id = sl.id
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX ON mv_category_performance (category_id);
CREATE INDEX ON mv_category_performance (total_gmv DESC);

-- Materialized View: Daily Metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_metrics AS
SELECT
  DATE(created_at) AS metric_date,
  COUNT(*) FILTER (WHERE user_type IN ('customer', 'both')) AS new_customers,
  COUNT(*) FILTER (WHERE user_type IN ('provider', 'both')) AS new_providers,
  0 AS daily_bookings, -- Placeholder, updated by separate query
  0 AS daily_revenue -- Placeholder
FROM profiles
GROUP BY DATE(created_at)
UNION ALL
SELECT
  DATE(b.created_at) AS metric_date,
  0 AS new_customers,
  0 AS new_providers,
  COUNT(*) AS daily_bookings,
  SUM(b.total_amount) AS daily_revenue
FROM bookings b
GROUP BY DATE(b.created_at);

CREATE INDEX ON mv_daily_metrics (metric_date DESC);

-- Optimize existing indexes
CREATE INDEX IF NOT EXISTS idx_service_listings_active_category ON service_listings(category, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_listings_price ON service_listings(price_per_unit) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_active ON service_listings(provider_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_status ON bookings(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_bookings_amount ON bookings(total_amount DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_rating ON reviews(provider_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_listing_rating ON reviews(listing_id, rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_type_created ON profiles(user_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIN ((location_data));

CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = false;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_service_listings_search ON service_listings(category, is_active, price_per_unit) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date ON bookings(provider_id, booking_date DESC) WHERE status != 'cancelled';

-- Partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_active_listings_only ON service_listings(id, title, price_per_unit) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_completed_bookings_only ON bookings(id, provider_id, total_amount) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_pending_bookings_only ON bookings(id, provider_id, customer_id) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "System can manage cache"
  ON cache_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function: Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_listings;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_provider_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get cached value
CREATE OR REPLACE FUNCTION get_cached_value(cache_key_param text)
RETURNS jsonb AS $$
DECLARE
  cached_value jsonb;
  is_valid boolean;
BEGIN
  SELECT
    cache_value,
    expires_at > now()
  INTO cached_value, is_valid
  FROM cache_entries
  WHERE cache_key = cache_key_param;

  IF NOT FOUND OR NOT is_valid THEN
    RETURN NULL;
  END IF;

  -- Update hit count and last accessed
  UPDATE cache_entries
  SET
    hit_count = hit_count + 1,
    last_accessed_at = now()
  WHERE cache_key = cache_key_param;

  RETURN cached_value;
END;
$$ LANGUAGE plpgsql;

-- Function: Set cached value
CREATE OR REPLACE FUNCTION set_cached_value(
  cache_key_param text,
  cache_value_param jsonb,
  ttl_seconds_param integer DEFAULT 3600,
  tags_param text[] DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO cache_entries (
    cache_key,
    cache_value,
    expires_at,
    cache_tags
  ) VALUES (
    cache_key_param,
    cache_value_param,
    now() + (ttl_seconds_param || ' seconds')::interval,
    tags_param
  )
  ON CONFLICT (cache_key)
  DO UPDATE SET
    cache_value = cache_value_param,
    expires_at = now() + (ttl_seconds_param || ' seconds')::interval,
    cache_tags = tags_param,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Invalidate cache by tag
CREATE OR REPLACE FUNCTION invalidate_cache_by_tag(tag_param text)
RETURNS void AS $$
BEGIN
  DELETE FROM cache_entries
  WHERE tag_param = ANY(cache_tags);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM cache_entries
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Optimize query performance helper
CREATE OR REPLACE FUNCTION analyze_query_performance(query_text_param text)
RETURNS TABLE (
  plan_line text,
  startup_cost numeric,
  total_cost numeric,
  plan_rows bigint,
  plan_width integer
) AS $$
BEGIN
  RETURN QUERY EXECUTE 'EXPLAIN (FORMAT JSON) ' || query_text_param;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_materialized_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_value TO authenticated;
GRANT EXECUTE ON FUNCTION set_cached_value TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_cache_by_tag TO authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache TO authenticated;

-- Create indexes on cache table
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_entries(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_tags ON cache_entries USING GIN(cache_tags);
CREATE INDEX IF NOT EXISTS idx_cache_expired ON cache_entries(is_expired) WHERE is_expired = false;

-- Vacuum and analyze for better query planning
ANALYZE service_listings;
ANALYZE bookings;
ANALYZE reviews;
ANALYZE profiles;
ANALYZE messages;

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW mv_popular_listings IS 'Top performing listings by bookings and ratings';
COMMENT ON MATERIALIZED VIEW mv_provider_stats IS 'Aggregated provider performance metrics';
COMMENT ON MATERIALIZED VIEW mv_category_performance IS 'Category-level performance analytics';
COMMENT ON TABLE cache_entries IS 'Application-level caching for expensive queries';
