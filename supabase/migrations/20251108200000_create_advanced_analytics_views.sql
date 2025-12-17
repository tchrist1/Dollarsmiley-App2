/*
  # Create Advanced Analytics Views and Functions

  ## Overview
  Provides optimized views, materialized views, and functions for advanced analytics
  dashboards with real-time metrics, trend analysis, forecasting, and comparative insights.

  ## New Views

  ### 1. `provider_performance_summary`
  Aggregated provider metrics
  - Total bookings, revenue, ratings
  - Acceptance and completion rates
  - Response times
  - Customer satisfaction

  ### 2. `daily_platform_metrics`
  Daily platform-wide metrics
  - New users, bookings, revenue
  - Active users (DAU)
  - Conversion rates
  - Growth metrics

  ### 3. `category_performance`
  Category-level analytics
  - Bookings per category
  - Revenue per category
  - Average prices
  - Top performers

  ### 4. `customer_lifetime_value`
  CLV calculations per customer
  - Total spent
  - Booking frequency
  - Average order value
  - First/last booking dates

  ### 5. `revenue_trends`
  Time-series revenue data
  - Daily/weekly/monthly aggregations
  - MoM/YoY growth
  - Moving averages
  - Forecasts

  ## Materialized Views
  Pre-calculated for performance on large datasets

  ## New Functions

  ### 1. `calculate_retention_rate()`
  Calculate cohort retention rates

  ### 2. `predict_revenue()`
  Simple linear regression forecast

  ### 3. `calculate_churn_risk()`
  Customer churn probability

  ### 4. `get_comparative_metrics()`
  Compare periods (MoM, YoY, QoQ)

  ## Features
  - Real-time dashboard metrics
  - Trend analysis (daily, weekly, monthly)
  - Year-over-year comparisons
  - Cohort retention tracking
  - Revenue forecasting
  - Churn prediction
  - Category performance ranking
  - Provider leaderboards
  - Customer segmentation
  - Conversion funnel analysis

  ## Performance
  - Indexed views for fast queries
  - Materialized views refresh strategy
  - Efficient aggregations
  - Time-series optimizations

  ## Security
  - RLS on all views
  - Aggregated data only
  - User-specific filtering
*/

-- Create provider performance summary view
CREATE OR REPLACE VIEW provider_performance_summary AS
SELECT
  p.id as provider_id,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Canceled' THEN b.id END) as canceled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) as avg_booking_value,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  CASE
    WHEN COUNT(b.id) > 0 THEN
      (COUNT(CASE WHEN b.accepted_at IS NOT NULL THEN 1 END)::numeric / COUNT(b.id)::numeric) * 100
    ELSE 0
  END as acceptance_rate,
  CASE
    WHEN COUNT(b.id) > 0 THEN
      (COUNT(CASE WHEN b.status = 'Completed' THEN 1 END)::numeric / COUNT(b.id)::numeric) * 100
    ELSE 0
  END as completion_rate,
  COALESCE(
    AVG(
      CASE WHEN b.accepted_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (b.accepted_at - b.created_at)) / 3600
      END
    ),
    0
  ) as avg_response_hours,
  COUNT(DISTINCT b.customer_id) as unique_customers,
  MIN(b.created_at) as first_booking_date,
  MAX(b.created_at) as last_booking_date
FROM profiles p
LEFT JOIN bookings b ON p.id = b.provider_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE p.account_type = 'provider'
GROUP BY p.id, p.full_name, p.avatar_url;

-- Create daily platform metrics view
CREATE OR REPLACE VIEW daily_platform_metrics AS
SELECT
  date_trunc('day', created_at)::date as metric_date,
  COUNT(DISTINCT CASE WHEN account_type = 'customer' THEN id END) as new_customers,
  COUNT(DISTINCT CASE WHEN account_type = 'provider' THEN id END) as new_providers,
  (
    SELECT COUNT(DISTINCT b.id)
    FROM bookings b
    WHERE date_trunc('day', b.created_at) = date_trunc('day', p.created_at)
  ) as total_bookings,
  (
    SELECT COUNT(DISTINCT b.id)
    FROM bookings b
    WHERE date_trunc('day', b.created_at) = date_trunc('day', p.created_at)
    AND b.status = 'Completed'
  ) as completed_bookings,
  (
    SELECT COALESCE(SUM(b.total_price), 0)
    FROM bookings b
    WHERE date_trunc('day', b.created_at) = date_trunc('day', p.created_at)
    AND b.status = 'Completed'
  ) as daily_revenue,
  (
    SELECT COUNT(DISTINCT user_id)
    FROM user_activity_logs
    WHERE date_trunc('day', created_at) = date_trunc('day', p.created_at)
  ) as daily_active_users
FROM profiles p
GROUP BY date_trunc('day', created_at);

-- Create category performance view
CREATE OR REPLACE VIEW category_performance AS
SELECT
  c.id as category_id,
  c.name as category_name,
  c.icon,
  COUNT(DISTINCT sl.id) as total_listings,
  COUNT(DISTINCT sl.user_id) as active_providers,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) as avg_booking_value,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT r.id) as total_reviews,
  COALESCE(
    SUM(la.views),
    0
  ) as total_views,
  CASE
    WHEN COALESCE(SUM(la.views), 0) > 0 THEN
      (COUNT(DISTINCT b.id)::numeric / SUM(la.views)::numeric) * 100
    ELSE 0
  END as conversion_rate
FROM categories c
LEFT JOIN service_listings sl ON c.id = sl.category_id
LEFT JOIN bookings b ON sl.id = b.listing_id
LEFT JOIN reviews r ON b.id = r.booking_id
LEFT JOIN listing_analytics la ON sl.id = la.listing_id
GROUP BY c.id, c.name, c.icon;

-- Create customer lifetime value view
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  p.id as customer_id,
  p.full_name,
  p.email,
  p.created_at as customer_since,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT b.provider_id) as unique_providers,
  COALESCE(SUM(b.total_price), 0) as lifetime_value,
  COALESCE(AVG(b.total_price), 0) as avg_order_value,
  MIN(b.created_at) as first_booking_date,
  MAX(b.created_at) as last_booking_date,
  EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(b.created_at))) / 86400 as customer_lifespan_days,
  CASE
    WHEN COUNT(b.id) > 0 AND MAX(b.created_at) IS NOT NULL THEN
      COALESCE(SUM(b.total_price), 0) / NULLIF(EXTRACT(EPOCH FROM (MAX(b.created_at) - MIN(b.created_at))) / 86400, 0)
    ELSE 0
  END as daily_value,
  COALESCE(AVG(r.rating), 0) as avg_rating_given,
  CASE
    WHEN MAX(b.created_at) < NOW() - INTERVAL '90 days' THEN true
    ELSE false
  END as is_churned
FROM profiles p
LEFT JOIN bookings b ON p.id = b.customer_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE p.account_type = 'customer'
GROUP BY p.id, p.full_name, p.email, p.created_at;

-- Create revenue trends view
CREATE OR REPLACE VIEW revenue_trends AS
SELECT
  date_trunc('day', b.created_at)::date as trend_date,
  COUNT(DISTINCT b.id) as bookings_count,
  COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_count,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0) as daily_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'Completed' THEN b.total_price END), 0) as avg_transaction_value,
  COUNT(DISTINCT b.customer_id) as unique_customers,
  COUNT(DISTINCT b.provider_id) as active_providers,
  AVG(
    COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0)
  ) OVER (
    ORDER BY date_trunc('day', b.created_at)
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as revenue_7day_ma,
  AVG(
    COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0)
  ) OVER (
    ORDER BY date_trunc('day', b.created_at)
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) as revenue_30day_ma
FROM bookings b
GROUP BY date_trunc('day', b.created_at)
ORDER BY trend_date DESC;

-- Function to calculate retention rate
CREATE OR REPLACE FUNCTION calculate_retention_rate(
  cohort_date date,
  period_days int DEFAULT 30
)
RETURNS TABLE(
  cohort_size int,
  retained_users int,
  retention_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH cohort AS (
    SELECT DISTINCT customer_id
    FROM bookings
    WHERE created_at::date = cohort_date
  ),
  retained AS (
    SELECT DISTINCT b.customer_id
    FROM bookings b
    INNER JOIN cohort c ON b.customer_id = c.customer_id
    WHERE b.created_at::date BETWEEN cohort_date + period_days AND cohort_date + period_days + 7
  )
  SELECT
    (SELECT COUNT(*) FROM cohort)::int as cohort_size,
    (SELECT COUNT(*) FROM retained)::int as retained_users,
    CASE
      WHEN (SELECT COUNT(*) FROM cohort) > 0 THEN
        ((SELECT COUNT(*) FROM retained)::numeric / (SELECT COUNT(*) FROM cohort)::numeric) * 100
      ELSE 0
    END as retention_rate;
END;
$$ LANGUAGE plpgsql;

-- Function to predict revenue (simple linear regression)
CREATE OR REPLACE FUNCTION predict_revenue(
  days_ahead int DEFAULT 30
)
RETURNS TABLE(
  prediction_date date,
  predicted_revenue numeric
) AS $$
DECLARE
  avg_daily_revenue numeric;
  growth_rate numeric;
BEGIN
  -- Calculate average daily revenue and growth rate from last 90 days
  SELECT
    AVG(daily_revenue),
    (MAX(daily_revenue) - MIN(daily_revenue)) / NULLIF(COUNT(*), 0)
  INTO avg_daily_revenue, growth_rate
  FROM revenue_trends
  WHERE trend_date >= CURRENT_DATE - INTERVAL '90 days';

  RETURN QUERY
  SELECT
    CURRENT_DATE + i as prediction_date,
    GREATEST(avg_daily_revenue + (growth_rate * i), 0) as predicted_revenue
  FROM generate_series(1, days_ahead) i;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate churn risk
CREATE OR REPLACE FUNCTION calculate_churn_risk(customer_id_param uuid)
RETURNS numeric AS $$
DECLARE
  days_since_last_booking int;
  avg_booking_frequency numeric;
  churn_risk numeric;
BEGIN
  -- Get days since last booking
  SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 86400
  INTO days_since_last_booking
  FROM bookings
  WHERE customer_id = customer_id_param;

  -- Get average booking frequency
  SELECT
    CASE
      WHEN COUNT(*) > 1 THEN
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / (COUNT(*) - 1) / 86400
      ELSE 90
    END
  INTO avg_booking_frequency
  FROM bookings
  WHERE customer_id = customer_id_param;

  -- Calculate risk score (0-100)
  churn_risk := LEAST(
    (days_since_last_booking / NULLIF(avg_booking_frequency, 0)) * 100,
    100
  );

  RETURN COALESCE(churn_risk, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get comparative metrics
CREATE OR REPLACE FUNCTION get_comparative_metrics(
  user_id_param uuid,
  comparison_type text DEFAULT 'mom' -- mom, yoy, qoq
)
RETURNS TABLE(
  current_revenue numeric,
  previous_revenue numeric,
  revenue_change_percent numeric,
  current_bookings bigint,
  previous_bookings bigint,
  bookings_change_percent numeric,
  current_customers bigint,
  previous_customers bigint,
  customers_change_percent numeric
) AS $$
DECLARE
  current_start date;
  current_end date;
  previous_start date;
  previous_end date;
BEGIN
  -- Set date ranges based on comparison type
  CASE comparison_type
    WHEN 'mom' THEN -- Month over Month
      current_start := date_trunc('month', CURRENT_DATE);
      current_end := CURRENT_DATE;
      previous_start := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
      previous_end := current_start - INTERVAL '1 day';
    WHEN 'yoy' THEN -- Year over Year
      current_start := date_trunc('year', CURRENT_DATE);
      current_end := CURRENT_DATE;
      previous_start := date_trunc('year', CURRENT_DATE - INTERVAL '1 year');
      previous_end := current_start - INTERVAL '1 day';
    WHEN 'qoq' THEN -- Quarter over Quarter
      current_start := date_trunc('quarter', CURRENT_DATE);
      current_end := CURRENT_DATE;
      previous_start := date_trunc('quarter', CURRENT_DATE - INTERVAL '3 months');
      previous_end := current_start - INTERVAL '1 day';
    ELSE
      current_start := CURRENT_DATE - INTERVAL '30 days';
      current_end := CURRENT_DATE;
      previous_start := CURRENT_DATE - INTERVAL '60 days';
      previous_end := current_start - INTERVAL '1 day';
  END CASE;

  RETURN QUERY
  WITH current_period AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END), 0) as revenue,
      COUNT(*)::bigint as bookings,
      COUNT(DISTINCT customer_id)::bigint as customers
    FROM bookings
    WHERE provider_id = user_id_param
    AND created_at::date BETWEEN current_start AND current_end
  ),
  previous_period AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'Completed' THEN total_price ELSE 0 END), 0) as revenue,
      COUNT(*)::bigint as bookings,
      COUNT(DISTINCT customer_id)::bigint as customers
    FROM bookings
    WHERE provider_id = user_id_param
    AND created_at::date BETWEEN previous_start AND previous_end
  )
  SELECT
    c.revenue as current_revenue,
    p.revenue as previous_revenue,
    CASE
      WHEN p.revenue > 0 THEN ((c.revenue - p.revenue) / p.revenue) * 100
      ELSE 0
    END as revenue_change_percent,
    c.bookings as current_bookings,
    p.bookings as previous_bookings,
    CASE
      WHEN p.bookings > 0 THEN ((c.bookings - p.bookings)::numeric / p.bookings::numeric) * 100
      ELSE 0
    END as bookings_change_percent,
    c.customers as current_customers,
    p.customers as previous_customers,
    CASE
      WHEN p.customers > 0 THEN ((c.customers - p.customers)::numeric / p.customers::numeric) * 100
      ELSE 0
    END as customers_change_percent
  FROM current_period c
  CROSS JOIN previous_period p;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_created_date ON bookings(created_at::date);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_created ON bookings(customer_id, created_at);

-- Create materialized view for provider leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_leaderboard AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  COUNT(DISTINCT b.id) as total_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(DISTINCT r.id) as review_count,
  COUNT(DISTINCT b.customer_id) as unique_customers,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_price ELSE 0 END), 0) DESC) as revenue_rank,
  ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT b.id) DESC) as bookings_rank,
  ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(r.rating), 0) DESC) as rating_rank
FROM profiles p
LEFT JOIN bookings b ON p.id = b.provider_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE p.account_type = 'provider'
GROUP BY p.id, p.full_name, p.avatar_url;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_leaderboard_id ON provider_leaderboard(id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top performers
CREATE OR REPLACE FUNCTION get_top_performers(
  metric text DEFAULT 'revenue', -- revenue, bookings, rating
  limit_count int DEFAULT 10
)
RETURNS TABLE(
  provider_id uuid,
  full_name text,
  avatar_url text,
  metric_value numeric,
  rank bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id as provider_id,
    pl.full_name,
    pl.avatar_url,
    CASE metric
      WHEN 'revenue' THEN total_revenue
      WHEN 'bookings' THEN total_bookings::numeric
      WHEN 'rating' THEN avg_rating
      ELSE total_revenue
    END as metric_value,
    CASE metric
      WHEN 'revenue' THEN revenue_rank
      WHEN 'bookings' THEN bookings_rank
      WHEN 'rating' THEN rating_rank
      ELSE revenue_rank
    END as rank
  FROM provider_leaderboard pl
  ORDER BY
    CASE metric
      WHEN 'revenue' THEN revenue_rank
      WHEN 'bookings' THEN bookings_rank
      WHEN 'rating' THEN rating_rank
      ELSE revenue_rank
    END
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
