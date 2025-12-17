/*
  # Testing & Monitoring Infrastructure

  1. New Tables
    - `error_logs` - Application error tracking
    - `performance_metrics` - Performance monitoring
    - `user_events` - User behavior analytics
    - `system_alerts` - Alert management
    - `test_results` - Automated test results

  2. Security
    - Enable RLS with simple policies
*/

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_agent text,
  app_version text,
  device_info text,
  screen_name text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  additional_context jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text DEFAULT 'ms',
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  screen_name text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_created ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_user ON performance_metrics(user_id);

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert metrics"
  ON performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view metrics"
  ON performance_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_properties jsonb DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,
  screen_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_name ON user_events(event_name);
CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
  ON user_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert events"
  ON user_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  service text,
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON system_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON system_alerts(resolved);

ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts"
  ON system_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update alerts"
  ON system_alerts FOR UPDATE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_suite text NOT NULL,
  test_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'error')),
  duration_ms numeric,
  error_message text,
  stack_trace text,
  environment text DEFAULT 'development',
  commit_hash text,
  branch text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_results_suite ON test_results(test_suite);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON test_results(created_at DESC);

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test results"
  ON test_results FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION get_error_summary(days_param integer DEFAULT 7)
RETURNS TABLE(
  date date,
  total_errors bigint,
  critical_errors bigint,
  high_errors bigint,
  medium_errors bigint,
  low_errors bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as error_date,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
    COUNT(*) FILTER (WHERE severity = 'high') as high,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium,
    COUNT(*) FILTER (WHERE severity = 'low') as low
  FROM error_logs
  WHERE created_at >= CURRENT_DATE - (days_param || ' days')::interval
  GROUP BY DATE(created_at)
  ORDER BY error_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_performance_summary(metric_name_param text, hours_param integer DEFAULT 24)
RETURNS TABLE(
  avg_value numeric,
  min_value numeric,
  max_value numeric,
  p50_value numeric,
  p95_value numeric,
  p99_value numeric,
  sample_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(metric_value) as avg,
    MIN(metric_value) as min,
    MAX(metric_value) as max,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) as p99,
    COUNT(*) as count
  FROM performance_metrics
  WHERE metric_name = metric_name_param
    AND created_at >= now() - (hours_param || ' hours')::interval;
END;
$$;