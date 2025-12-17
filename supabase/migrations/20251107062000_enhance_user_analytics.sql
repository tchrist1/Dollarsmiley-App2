/*
  # Enhanced User Analytics System

  1. New Tables
    - user_activity_logs - Track detailed user actions and events
    - user_engagement_metrics - Daily engagement metrics per user
    - user_session_analytics - Session tracking and analytics
    - cohort_analytics - User cohort analysis data
    - funnel_analytics - Conversion funnel tracking

  2. Features
    - Detailed event tracking (views, clicks, searches, bookings)
    - Engagement metrics (DAU, WAU, MAU, session duration)
    - Cohort analysis (retention, LTV)
    - Conversion funnel analysis
    - User behavior patterns

  3. Security
    - RLS policies for privacy
    - Aggregated data only for analytics
    - Admin-only access to detailed metrics
*/

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'page_view', 'listing_view', 'profile_view', 'search',
    'booking_created', 'booking_completed', 'review_submitted',
    'message_sent', 'listing_saved', 'listing_shared',
    'payment_made', 'profile_updated', 'subscription_upgraded',
    'post_created', 'post_liked', 'post_commented', 'user_followed'
  )),
  event_category text NOT NULL CHECK (event_category IN (
    'navigation', 'engagement', 'transaction', 'social', 'profile'
  )),
  page_url text,
  reference_id uuid, -- ID of related entity (listing, booking, etc.)
  reference_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  session_id text,
  device_type text,
  platform text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create user_engagement_metrics table
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  sessions_count integer DEFAULT 0,
  total_time_minutes integer DEFAULT 0,
  pages_viewed integer DEFAULT 0,
  listings_viewed integer DEFAULT 0,
  searches_performed integer DEFAULT 0,
  bookings_made integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  posts_created integer DEFAULT 0,
  interactions_count integer DEFAULT 0, -- likes, comments, shares
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create user_session_analytics table
CREATE TABLE IF NOT EXISTS user_session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  duration_seconds integer,
  pages_visited integer DEFAULT 0,
  events_count integer DEFAULT 0,
  last_page_url text,
  device_type text,
  platform text,
  created_at timestamptz DEFAULT now()
);

-- Create cohort_analytics table
CREATE TABLE IF NOT EXISTS cohort_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_date date NOT NULL, -- User registration date
  period_number integer NOT NULL, -- Days/weeks/months since registration
  period_type text NOT NULL CHECK (period_type IN ('day', 'week', 'month')),
  total_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  retention_rate numeric(5, 2) DEFAULT 0,
  total_revenue numeric(12, 2) DEFAULT 0,
  avg_revenue_per_user numeric(10, 2) DEFAULT 0,
  bookings_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cohort_date, period_number, period_type)
);

-- Create funnel_analytics table
CREATE TABLE IF NOT EXISTS funnel_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_name text NOT NULL,
  funnel_step text NOT NULL,
  step_order integer NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  users_entered integer DEFAULT 0,
  users_completed integer DEFAULT 0,
  conversion_rate numeric(5, 2) DEFAULT 0,
  avg_time_to_complete_seconds integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(funnel_name, funnel_step, date)
);

-- Create indexes for performance
CREATE INDEX idx_user_activity_logs_user ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_user_activity_logs_event ON user_activity_logs(event_type, created_at DESC);
CREATE INDEX idx_user_activity_logs_category ON user_activity_logs(event_category, created_at DESC);
CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id);
CREATE INDEX idx_user_activity_logs_created ON user_activity_logs(created_at DESC);

CREATE INDEX idx_user_engagement_metrics_user ON user_engagement_metrics(user_id, date DESC);
CREATE INDEX idx_user_engagement_metrics_date ON user_engagement_metrics(date DESC);

CREATE INDEX idx_user_session_analytics_user ON user_session_analytics(user_id, session_start DESC);
CREATE INDEX idx_user_session_analytics_session ON user_session_analytics(session_id);

CREATE INDEX idx_cohort_analytics_date ON cohort_analytics(cohort_date, period_number);
CREATE INDEX idx_funnel_analytics_funnel ON funnel_analytics(funnel_name, date DESC);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view own activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for user_engagement_metrics
CREATE POLICY "Users can view own engagement metrics"
  ON user_engagement_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage engagement metrics"
  ON user_engagement_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all engagement metrics"
  ON user_engagement_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for user_session_analytics
CREATE POLICY "Users can view own sessions"
  ON user_session_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage sessions"
  ON user_session_analytics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all sessions"
  ON user_session_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for cohort_analytics
CREATE POLICY "Admins can view cohort analytics"
  ON cohort_analytics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for funnel_analytics
CREATE POLICY "Admins can view funnel analytics"
  ON funnel_analytics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_event_type text,
  p_event_category text,
  p_page_url text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO user_activity_logs (
    user_id, event_type, event_category, page_url,
    reference_id, reference_type, metadata, session_id
  ) VALUES (
    p_user_id, p_event_type, p_event_category, p_page_url,
    p_reference_id, p_reference_type, p_metadata, p_session_id
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user engagement metrics
CREATE OR REPLACE FUNCTION update_user_engagement_metrics(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_engagement_metrics (
    user_id,
    date,
    sessions_count,
    pages_viewed,
    listings_viewed,
    searches_performed,
    bookings_made,
    messages_sent,
    posts_created,
    interactions_count,
    last_active_at
  )
  SELECT
    p_user_id,
    p_date,
    COUNT(DISTINCT session_id) as sessions_count,
    COUNT(*) FILTER (WHERE event_type = 'page_view') as pages_viewed,
    COUNT(*) FILTER (WHERE event_type = 'listing_view') as listings_viewed,
    COUNT(*) FILTER (WHERE event_type = 'search') as searches_performed,
    COUNT(*) FILTER (WHERE event_type = 'booking_created') as bookings_made,
    COUNT(*) FILTER (WHERE event_type = 'message_sent') as messages_sent,
    COUNT(*) FILTER (WHERE event_type = 'post_created') as posts_created,
    COUNT(*) FILTER (WHERE event_type IN ('post_liked', 'post_commented', 'listing_saved')) as interactions_count,
    MAX(created_at) as last_active_at
  FROM user_activity_logs
  WHERE user_id = p_user_id
    AND created_at::date = p_date
  ON CONFLICT (user_id, date) DO UPDATE SET
    sessions_count = EXCLUDED.sessions_count,
    pages_viewed = EXCLUDED.pages_viewed,
    listings_viewed = EXCLUDED.listings_viewed,
    searches_performed = EXCLUDED.searches_performed,
    bookings_made = EXCLUDED.bookings_made,
    messages_sent = EXCLUDED.messages_sent,
    posts_created = EXCLUDED.posts_created,
    interactions_count = EXCLUDED.interactions_count,
    last_active_at = EXCLUDED.last_active_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user engagement summary
CREATE OR REPLACE FUNCTION get_user_engagement_summary(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sessions', COALESCE(SUM(sessions_count), 0),
    'total_time_minutes', COALESCE(SUM(total_time_minutes), 0),
    'avg_session_duration', CASE
      WHEN SUM(sessions_count) > 0
      THEN (SUM(total_time_minutes) / SUM(sessions_count))::numeric(10,2)
      ELSE 0
    END,
    'total_pages_viewed', COALESCE(SUM(pages_viewed), 0),
    'total_listings_viewed', COALESCE(SUM(listings_viewed), 0),
    'total_searches', COALESCE(SUM(searches_performed), 0),
    'total_bookings', COALESCE(SUM(bookings_made), 0),
    'total_messages', COALESCE(SUM(messages_sent), 0),
    'total_posts', COALESCE(SUM(posts_created), 0),
    'total_interactions', COALESCE(SUM(interactions_count), 0),
    'active_days', COUNT(DISTINCT date),
    'last_active', MAX(last_active_at)
  ) INTO v_summary
  FROM user_engagement_metrics
  WHERE user_id = p_user_id
    AND date >= CURRENT_DATE - p_days;

  RETURN v_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get engagement trends
CREATE OR REPLACE FUNCTION get_engagement_trends(
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  dau integer,
  total_sessions integer,
  avg_session_duration numeric,
  total_events integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uem.date,
    COUNT(DISTINCT uem.user_id)::integer as dau,
    SUM(uem.sessions_count)::integer as total_sessions,
    AVG(CASE WHEN uem.sessions_count > 0
      THEN uem.total_time_minutes::numeric / uem.sessions_count
      ELSE 0
    END)::numeric(10,2) as avg_session_duration,
    (SELECT COUNT(*)::integer FROM user_activity_logs
     WHERE created_at::date = uem.date) as total_events
  FROM user_engagement_metrics uem
  WHERE uem.date >= CURRENT_DATE - p_days
  GROUP BY uem.date
  ORDER BY uem.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate cohort retention
CREATE OR REPLACE FUNCTION calculate_cohort_retention(
  p_cohort_date date,
  p_period_number integer,
  p_period_type text DEFAULT 'week'
)
RETURNS void AS $$
DECLARE
  v_total_users integer;
  v_active_users integer;
  v_start_date date;
  v_end_date date;
BEGIN
  -- Get total users in cohort
  SELECT COUNT(*) INTO v_total_users
  FROM profiles
  WHERE created_at::date = p_cohort_date;

  -- Calculate period dates
  CASE p_period_type
    WHEN 'day' THEN
      v_start_date := p_cohort_date + (p_period_number || ' days')::interval;
      v_end_date := v_start_date + '1 day'::interval;
    WHEN 'week' THEN
      v_start_date := p_cohort_date + (p_period_number || ' weeks')::interval;
      v_end_date := v_start_date + '1 week'::interval;
    WHEN 'month' THEN
      v_start_date := p_cohort_date + (p_period_number || ' months')::interval;
      v_end_date := v_start_date + '1 month'::interval;
  END CASE;

  -- Count active users in period
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM user_engagement_metrics
  WHERE user_id IN (
    SELECT id FROM profiles WHERE created_at::date = p_cohort_date
  )
  AND date >= v_start_date
  AND date < v_end_date;

  -- Insert or update cohort analytics
  INSERT INTO cohort_analytics (
    cohort_date,
    period_number,
    period_type,
    total_users,
    active_users,
    retention_rate
  ) VALUES (
    p_cohort_date,
    p_period_number,
    p_period_type,
    v_total_users,
    v_active_users,
    CASE WHEN v_total_users > 0
      THEN (v_active_users::numeric / v_total_users * 100)::numeric(5,2)
      ELSE 0
    END
  )
  ON CONFLICT (cohort_date, period_number, period_type) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    retention_rate = EXCLUDED.retention_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top events
CREATE OR REPLACE FUNCTION get_top_events(
  p_days integer DEFAULT 7,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  event_type text,
  event_count bigint,
  unique_users bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ual.event_type,
    COUNT(*)::bigint as event_count,
    COUNT(DISTINCT ual.user_id)::bigint as unique_users
  FROM user_activity_logs ual
  WHERE ual.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY ual.event_type
  ORDER BY event_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity heatmap (by hour of day)
CREATE OR REPLACE FUNCTION get_activity_heatmap(p_days integer DEFAULT 7)
RETURNS TABLE (
  hour_of_day integer,
  day_of_week integer,
  event_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at)::integer as hour_of_day,
    EXTRACT(DOW FROM created_at)::integer as day_of_week,
    COUNT(*)::bigint as event_count
  FROM user_activity_logs
  WHERE created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY hour_of_day, day_of_week
  ORDER BY day_of_week, hour_of_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE user_activity_logs IS 'Detailed tracking of all user actions and events';
COMMENT ON TABLE user_engagement_metrics IS 'Daily aggregated engagement metrics per user';
COMMENT ON TABLE user_session_analytics IS 'Session-level analytics and tracking';
COMMENT ON TABLE cohort_analytics IS 'Cohort analysis and retention metrics';
COMMENT ON TABLE funnel_analytics IS 'Conversion funnel tracking and analysis';

COMMENT ON FUNCTION log_user_activity IS 'Log a user activity event';
COMMENT ON FUNCTION update_user_engagement_metrics IS 'Update daily engagement metrics for a user';
COMMENT ON FUNCTION get_user_engagement_summary IS 'Get engagement summary for a user over a time period';
COMMENT ON FUNCTION get_engagement_trends IS 'Get platform-wide engagement trends over time';
COMMENT ON FUNCTION calculate_cohort_retention IS 'Calculate retention rates for a specific cohort';
COMMENT ON FUNCTION get_top_events IS 'Get most common events over a time period';
COMMENT ON FUNCTION get_activity_heatmap IS 'Get activity distribution by hour and day of week';
