/*
  # Phase 3: Advanced Analytics System

  1. New Tables
    - `analytics_events` - Track all user events
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `event_type` (text)
      - `event_category` (text)
      - `event_data` (jsonb)
      - `session_id` (text)
      - `device_info` (jsonb)
      - `ip_address` (inet)
      - `created_at` (timestamptz)
    
    - `analytics_metrics` - Aggregated metrics
      - `id` (uuid, primary key)
      - `metric_name` (text)
      - `metric_value` (numeric)
      - `dimensions` (jsonb)
      - `period_start` (timestamptz)
      - `period_end` (timestamptz)
      - `created_at` (timestamptz)
    
    - `user_cohorts` - User segmentation
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `cohort_name` (text)
      - `cohort_data` (jsonb)
      - `assigned_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Analytics data accessible to admins only
    - Users can view their own events
*/

-- Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_category text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  session_id text,
  device_info jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_category ON analytics_events(event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON analytics_events(session_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can log events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Analytics Metrics Table
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX idx_analytics_metrics_period ON analytics_metrics(period_start, period_end);
CREATE INDEX idx_analytics_metrics_created ON analytics_metrics(created_at DESC);

ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view metrics"
  ON analytics_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can create metrics"
  ON analytics_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- User Cohorts Table
CREATE TABLE IF NOT EXISTS user_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cohort_name text NOT NULL,
  cohort_data jsonb DEFAULT '{}'::jsonb,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, cohort_name)
);

CREATE INDEX idx_user_cohorts_user ON user_cohorts(user_id);
CREATE INDEX idx_user_cohorts_name ON user_cohorts(cohort_name);
CREATE INDEX idx_user_cohorts_expires ON user_cohorts(expires_at);

ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cohorts"
  ON user_cohorts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage cohorts"
  ON user_cohorts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to log analytics event
CREATE OR REPLACE FUNCTION log_analytics_event(
  user_id_param uuid,
  event_type_param text,
  event_category_param text,
  event_data_param jsonb DEFAULT '{}'::jsonb,
  session_id_param text DEFAULT NULL,
  device_info_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_category,
    event_data,
    session_id,
    device_info
  ) VALUES (
    user_id_param,
    event_type_param,
    event_category_param,
    event_data_param,
    session_id_param,
    device_info_param
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Function to get user event count
CREATE OR REPLACE FUNCTION get_user_event_count(
  user_id_param uuid,
  event_type_param text DEFAULT NULL,
  days_back integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  event_count integer;
BEGIN
  SELECT COUNT(*) INTO event_count
  FROM analytics_events
  WHERE user_id = user_id_param
    AND created_at > now() - (days_back || ' days')::interval
    AND (event_type_param IS NULL OR event_type = event_type_param);
  
  RETURN event_count;
END;
$$;

-- Function to calculate metric
CREATE OR REPLACE FUNCTION calculate_metric(
  metric_name_param text,
  period_start_param timestamptz,
  period_end_param timestamptz,
  dimensions_param jsonb DEFAULT '{}'::jsonb
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  metric_value numeric;
BEGIN
  CASE metric_name_param
    WHEN 'active_users' THEN
      SELECT COUNT(DISTINCT user_id) INTO metric_value
      FROM analytics_events
      WHERE created_at BETWEEN period_start_param AND period_end_param;
    
    WHEN 'total_events' THEN
      SELECT COUNT(*) INTO metric_value
      FROM analytics_events
      WHERE created_at BETWEEN period_start_param AND period_end_param;
    
    WHEN 'avg_session_duration' THEN
      SELECT AVG(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))) INTO metric_value
      FROM analytics_events
      WHERE created_at BETWEEN period_start_param AND period_end_param
      GROUP BY session_id;
    
    ELSE
      metric_value := 0;
  END CASE;
  
  INSERT INTO analytics_metrics (
    metric_name,
    metric_value,
    dimensions,
    period_start,
    period_end
  ) VALUES (
    metric_name_param,
    COALESCE(metric_value, 0),
    dimensions_param,
    period_start_param,
    period_end_param
  );
  
  RETURN COALESCE(metric_value, 0);
END;
$$;

-- Function to assign user to cohort
CREATE OR REPLACE FUNCTION assign_user_to_cohort(
  user_id_param uuid,
  cohort_name_param text,
  cohort_data_param jsonb DEFAULT '{}'::jsonb,
  expires_in_days integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cohort_id uuid;
  expires_at_val timestamptz;
BEGIN
  IF expires_in_days IS NOT NULL THEN
    expires_at_val := now() + (expires_in_days || ' days')::interval;
  END IF;
  
  INSERT INTO user_cohorts (
    user_id,
    cohort_name,
    cohort_data,
    expires_at
  ) VALUES (
    user_id_param,
    cohort_name_param,
    cohort_data_param,
    expires_at_val
  )
  ON CONFLICT (user_id, cohort_name) 
  DO UPDATE SET
    cohort_data = cohort_data_param,
    expires_at = expires_at_val,
    assigned_at = now()
  RETURNING id INTO cohort_id;
  
  RETURN cohort_id;
END;
$$;

-- Function to get cohort users
CREATE OR REPLACE FUNCTION get_cohort_users(
  cohort_name_param text,
  include_expired boolean DEFAULT false
)
RETURNS TABLE(
  user_id uuid,
  cohort_data jsonb,
  assigned_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.cohort_data,
    uc.assigned_at
  FROM user_cohorts uc
  WHERE uc.cohort_name = cohort_name_param
    AND (include_expired OR uc.expires_at IS NULL OR uc.expires_at > now());
END;
$$;

-- Function to get event funnel
CREATE OR REPLACE FUNCTION get_event_funnel(
  event_types text[],
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE(
  step_number integer,
  event_type text,
  user_count bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_users bigint;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM analytics_events
  WHERE event_type = event_types[1]
    AND created_at BETWEEN start_date AND end_date;
  
  RETURN QUERY
  WITH funnel_data AS (
    SELECT 
      unnest(event_types) as event_type,
      generate_series(1, array_length(event_types, 1)) as step_number
  )
  SELECT 
    fd.step_number::integer,
    fd.event_type,
    COUNT(DISTINCT ae.user_id) as user_count,
    CASE 
      WHEN total_users > 0 THEN 
        ROUND((COUNT(DISTINCT ae.user_id)::numeric / total_users) * 100, 2)
      ELSE 0
    END as conversion_rate
  FROM funnel_data fd
  LEFT JOIN analytics_events ae ON ae.event_type = fd.event_type
    AND ae.created_at BETWEEN start_date AND end_date
  GROUP BY fd.step_number, fd.event_type
  ORDER BY fd.step_number;
END;
$$;