/*
  # Create User Behavior Tracking System

  1. New Tables
    - `user_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable for anonymous)
      - `session_id` (uuid) - Group events by session
      - `event_type` (text) - Type of event
      - `event_category` (text) - Category grouping
      - `event_name` (text) - Specific event name
      - `event_data` (jsonb) - Additional event data
      - `screen_name` (text) - Current screen
      - `previous_screen` (text) - Previous screen
      - `duration_ms` (integer) - Time spent
      - `timestamp` (timestamptz)
      - `ip_address` (text)
      - `user_agent` (text)
      - `device_info` (jsonb)
      - `created_at` (timestamptz)

    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `duration_seconds` (integer, nullable)
      - `event_count` (integer)
      - `screen_count` (integer)
      - `device_type` (text)
      - `os` (text)
      - `app_version` (text)
      - `is_active` (boolean)
      - `metadata` (jsonb)

    - `user_engagement_metrics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `sessions_count` (integer)
      - `total_time_seconds` (integer)
      - `events_count` (integer)
      - `screens_viewed` (integer)
      - `features_used` (text[])
      - `peak_activity_hour` (integer)
      - `engagement_score` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `feature_usage_stats`
      - `id` (uuid, primary key)
      - `feature_name` (text)
      - `category` (text)
      - `date` (date)
      - `total_uses` (integer)
      - `unique_users` (integer)
      - `avg_duration_seconds` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view their own events
    - Admins can view all analytics
    - Public insert for anonymous tracking

  3. Indexes
    - Index on user_id and timestamp
    - Index on event_type and category
    - Index on session_id
    - Index on date for metrics
*/

-- Create user_events table
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id uuid NOT NULL,

  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'screen_view',
    'button_click',
    'form_submit',
    'search',
    'filter',
    'navigation',
    'api_call',
    'error',
    'feature_use',
    'purchase',
    'social',
    'booking',
    'message',
    'notification'
  )),
  event_category text NOT NULL,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,

  -- Screen tracking
  screen_name text NOT NULL,
  previous_screen text,
  duration_ms integer,

  -- Context
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  device_info jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Session timing
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,

  -- Session metrics
  event_count integer DEFAULT 0,
  screen_count integer DEFAULT 0,

  -- Device info
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  os text,
  app_version text,

  -- Status
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create user_engagement_metrics table
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,

  -- Daily metrics
  sessions_count integer DEFAULT 0,
  total_time_seconds integer DEFAULT 0,
  events_count integer DEFAULT 0,
  screens_viewed integer DEFAULT 0,

  -- Feature usage
  features_used text[] DEFAULT ARRAY[]::text[],
  peak_activity_hour integer,

  -- Engagement score (0-100)
  engagement_score numeric(5, 2) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One record per user per day
  CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Create feature_usage_stats table
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  category text NOT NULL,
  date date NOT NULL,

  -- Usage metrics
  total_uses integer DEFAULT 0,
  unique_users integer DEFAULT 0,
  avg_duration_seconds numeric(10, 2) DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One record per feature per day
  CONSTRAINT unique_feature_date UNIQUE (feature_name, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp
  ON user_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_session
  ON user_events(session_id);

CREATE INDEX IF NOT EXISTS idx_events_type_category
  ON user_events(event_type, event_category);

CREATE INDEX IF NOT EXISTS idx_events_timestamp
  ON user_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_events_screen
  ON user_events(screen_name);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON user_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_started
  ON user_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON user_sessions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_engagement_user_date
  ON user_engagement_metrics(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_engagement_date
  ON user_engagement_metrics(date DESC);

CREATE INDEX IF NOT EXISTS idx_feature_stats_date
  ON feature_usage_stats(date DESC);

CREATE INDEX IF NOT EXISTS idx_feature_stats_feature
  ON feature_usage_stats(feature_name);

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_events

-- Allow anonymous and authenticated users to insert events
CREATE POLICY "Anyone can insert events"
  ON user_events
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for user_sessions

-- Allow anyone to insert sessions
CREATE POLICY "Anyone can insert sessions"
  ON user_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update sessions
CREATE POLICY "Anyone can update sessions"
  ON user_sessions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for user_engagement_metrics

-- Users can view their own metrics
CREATE POLICY "Users can view own engagement metrics"
  ON user_engagement_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all metrics
CREATE POLICY "Admins can view all engagement metrics"
  ON user_engagement_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- System can manage metrics
CREATE POLICY "System can manage engagement metrics"
  ON user_engagement_metrics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for feature_usage_stats

-- Admins can view feature stats
CREATE POLICY "Admins can view feature stats"
  ON feature_usage_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- System can manage feature stats
CREATE POLICY "System can manage feature stats"
  ON feature_usage_stats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to end session
CREATE OR REPLACE FUNCTION end_user_session(p_session_id uuid)
RETURNS void AS $$
DECLARE
  v_started_at timestamptz;
  v_event_count integer;
  v_screen_count integer;
BEGIN
  -- Get session details
  SELECT started_at INTO v_started_at
  FROM user_sessions
  WHERE id = p_session_id;

  -- Count events
  SELECT COUNT(*) INTO v_event_count
  FROM user_events
  WHERE session_id = p_session_id;

  -- Count unique screens
  SELECT COUNT(DISTINCT screen_name) INTO v_screen_count
  FROM user_events
  WHERE session_id = p_session_id;

  -- Update session
  UPDATE user_sessions
  SET
    ended_at = now(),
    duration_seconds = EXTRACT(EPOCH FROM (now() - v_started_at))::integer,
    event_count = v_event_count,
    screen_count = v_screen_count,
    is_active = false
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_sessions_count integer,
  p_total_time_seconds integer,
  p_events_count integer,
  p_screens_viewed integer,
  p_features_count integer
)
RETURNS numeric AS $$
DECLARE
  v_score numeric := 0;
BEGIN
  -- Session frequency (0-25 points)
  v_score := v_score + LEAST(p_sessions_count * 5, 25);

  -- Time spent (0-25 points, 30 min = 25 points)
  v_score := v_score + LEAST((p_total_time_seconds / 1800.0) * 25, 25);

  -- Activity level (0-25 points, 50 events = 25 points)
  v_score := v_score + LEAST((p_events_count / 50.0) * 25, 25);

  -- Exploration (0-15 points, 10 screens = 15 points)
  v_score := v_score + LEAST((p_screens_viewed / 10.0) * 15, 15);

  -- Feature diversity (0-10 points, 5 features = 10 points)
  v_score := v_score + LEAST((p_features_count / 5.0) * 10, 10);

  RETURN ROUND(v_score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update daily engagement metrics
CREATE OR REPLACE FUNCTION update_engagement_metrics(
  p_user_id uuid,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_sessions_count integer;
  v_total_time integer;
  v_events_count integer;
  v_screens_viewed integer;
  v_features_used text[];
  v_peak_hour integer;
  v_score numeric;
BEGIN
  -- Get session count
  SELECT COUNT(*) INTO v_sessions_count
  FROM user_sessions
  WHERE user_id = p_user_id
  AND DATE(started_at) = p_date;

  -- Get total time
  SELECT COALESCE(SUM(duration_seconds), 0) INTO v_total_time
  FROM user_sessions
  WHERE user_id = p_user_id
  AND DATE(started_at) = p_date
  AND duration_seconds IS NOT NULL;

  -- Get events count
  SELECT COUNT(*) INTO v_events_count
  FROM user_events
  WHERE user_id = p_user_id
  AND DATE(timestamp) = p_date;

  -- Get unique screens viewed
  SELECT COUNT(DISTINCT screen_name) INTO v_screens_viewed
  FROM user_events
  WHERE user_id = p_user_id
  AND DATE(timestamp) = p_date;

  -- Get unique features used
  SELECT ARRAY_AGG(DISTINCT event_name) INTO v_features_used
  FROM user_events
  WHERE user_id = p_user_id
  AND DATE(timestamp) = p_date
  AND event_type = 'feature_use';

  -- Get peak activity hour
  SELECT EXTRACT(HOUR FROM timestamp)::integer INTO v_peak_hour
  FROM user_events
  WHERE user_id = p_user_id
  AND DATE(timestamp) = p_date
  GROUP BY EXTRACT(HOUR FROM timestamp)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Calculate engagement score
  v_score := calculate_engagement_score(
    v_sessions_count,
    v_total_time,
    v_events_count,
    v_screens_viewed,
    COALESCE(array_length(v_features_used, 1), 0)
  );

  -- Insert or update metrics
  INSERT INTO user_engagement_metrics (
    user_id,
    date,
    sessions_count,
    total_time_seconds,
    events_count,
    screens_viewed,
    features_used,
    peak_activity_hour,
    engagement_score
  ) VALUES (
    p_user_id,
    p_date,
    v_sessions_count,
    v_total_time,
    v_events_count,
    v_screens_viewed,
    COALESCE(v_features_used, ARRAY[]::text[]),
    v_peak_hour,
    v_score
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    sessions_count = EXCLUDED.sessions_count,
    total_time_seconds = EXCLUDED.total_time_seconds,
    events_count = EXCLUDED.events_count,
    screens_viewed = EXCLUDED.screens_viewed,
    features_used = EXCLUDED.features_used,
    peak_activity_hour = EXCLUDED.peak_activity_hour,
    engagement_score = EXCLUDED.engagement_score,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feature usage stats
CREATE OR REPLACE FUNCTION update_feature_stats(
  p_feature_name text,
  p_category text,
  p_date date
)
RETURNS void AS $$
DECLARE
  v_total_uses integer;
  v_unique_users integer;
  v_avg_duration numeric;
BEGIN
  -- Get total uses
  SELECT COUNT(*) INTO v_total_uses
  FROM user_events
  WHERE event_name = p_feature_name
  AND DATE(timestamp) = p_date;

  -- Get unique users
  SELECT COUNT(DISTINCT user_id) INTO v_unique_users
  FROM user_events
  WHERE event_name = p_feature_name
  AND DATE(timestamp) = p_date
  AND user_id IS NOT NULL;

  -- Get average duration
  SELECT AVG(duration_ms / 1000.0) INTO v_avg_duration
  FROM user_events
  WHERE event_name = p_feature_name
  AND DATE(timestamp) = p_date
  AND duration_ms IS NOT NULL;

  -- Insert or update stats
  INSERT INTO feature_usage_stats (
    feature_name,
    category,
    date,
    total_uses,
    unique_users,
    avg_duration_seconds
  ) VALUES (
    p_feature_name,
    p_category,
    p_date,
    v_total_uses,
    v_unique_users,
    COALESCE(v_avg_duration, 0)
  )
  ON CONFLICT (feature_name, date)
  DO UPDATE SET
    total_uses = EXCLUDED.total_uses,
    unique_users = EXCLUDED.unique_users,
    avg_duration_seconds = EXCLUDED.avg_duration_seconds,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user behavior insights
CREATE OR REPLACE FUNCTION get_user_behavior_insights(
  p_user_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  avg_sessions_per_day numeric,
  avg_time_per_session_minutes numeric,
  most_visited_screen text,
  most_used_feature text,
  avg_engagement_score numeric,
  total_events integer,
  unique_screens integer,
  unique_features integer
) AS $$
BEGIN
  RETURN QUERY
  WITH date_range AS (
    SELECT CURRENT_DATE - p_days AS start_date
  ),
  session_stats AS (
    SELECT
      COUNT(*) / p_days::numeric as avg_sessions,
      AVG(duration_seconds / 60.0) as avg_duration
    FROM user_sessions, date_range
    WHERE user_id = p_user_id
    AND DATE(started_at) >= start_date
  ),
  screen_stats AS (
    SELECT screen_name
    FROM user_events, date_range
    WHERE user_id = p_user_id
    AND DATE(timestamp) >= start_date
    GROUP BY screen_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  feature_stats AS (
    SELECT event_name
    FROM user_events, date_range
    WHERE user_id = p_user_id
    AND DATE(timestamp) >= start_date
    AND event_type = 'feature_use'
    GROUP BY event_name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ),
  engagement_stats AS (
    SELECT AVG(engagement_score) as avg_score
    FROM user_engagement_metrics, date_range
    WHERE user_id = p_user_id
    AND date >= start_date
  ),
  event_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(DISTINCT screen_name) as screens,
      COUNT(DISTINCT CASE WHEN event_type = 'feature_use' THEN event_name END) as features
    FROM user_events, date_range
    WHERE user_id = p_user_id
    AND DATE(timestamp) >= start_date
  )
  SELECT
    ss.avg_sessions,
    ss.avg_duration,
    scr.screen_name,
    f.event_name,
    es.avg_score,
    ev.total::integer,
    ev.screens::integer,
    ev.features::integer
  FROM session_stats ss
  CROSS JOIN screen_stats scr
  CROSS JOIN feature_stats f
  CROSS JOIN engagement_stats es
  CROSS JOIN event_stats ev;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
