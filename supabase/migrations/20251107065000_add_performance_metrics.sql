/*
  # Performance Metrics Tracking System

  1. New Tables
    - api_performance_metrics - API endpoint performance tracking
    - database_query_metrics - Database query performance
    - system_health_metrics - Overall system health indicators
    - error_tracking - Error logging and tracking
    - performance_alerts - Performance issue alerts

  2. Features
    - API response time tracking
    - Database query performance monitoring
    - Error rate tracking
    - System resource monitoring
    - Performance alerts and thresholds
    - Slow query detection

  3. Security
    - Admin-only access to metrics
    - Automated cleanup of old metrics
    - Aggregated performance data
*/

-- Create api_performance_metrics table
CREATE TABLE IF NOT EXISTS api_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  response_time_ms integer NOT NULL,
  status_code integer NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  error_message text,
  request_size_bytes integer,
  response_size_bytes integer,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create database_query_metrics table
CREATE TABLE IF NOT EXISTS database_query_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name text NOT NULL,
  table_name text,
  operation text CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'RPC')),
  execution_time_ms numeric(10, 2) NOT NULL,
  rows_affected integer,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_slow_query boolean DEFAULT false,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create system_health_metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,
  avg_api_response_time numeric(10, 2) DEFAULT 0,
  max_api_response_time integer DEFAULT 0,
  total_api_requests integer DEFAULT 0,
  failed_api_requests integer DEFAULT 0,
  error_rate numeric(5, 2) DEFAULT 0,
  avg_db_query_time numeric(10, 2) DEFAULT 0,
  slow_queries_count integer DEFAULT 0,
  total_db_queries integer DEFAULT 0,
  active_users_count integer DEFAULT 0,
  peak_concurrent_users integer DEFAULT 0,
  system_uptime_percentage numeric(5, 2) DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create error_tracking table
CREATE TABLE IF NOT EXISTS error_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_stack text,
  endpoint text,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_agent text,
  ip_address text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  occurrence_count integer DEFAULT 1,
  first_occurred_at timestamptz DEFAULT now(),
  last_occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create performance_alerts table
CREATE TABLE IF NOT EXISTS performance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL CHECK (alert_type IN (
    'slow_api', 'high_error_rate', 'slow_query', 'high_memory',
    'system_down', 'database_connection'
  )),
  severity text NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
  message text NOT NULL,
  metric_value numeric(10, 2),
  threshold_value numeric(10, 2),
  endpoint text,
  is_acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_api_performance_endpoint ON api_performance_metrics(endpoint, timestamp DESC);
CREATE INDEX idx_api_performance_timestamp ON api_performance_metrics(timestamp DESC);
CREATE INDEX idx_api_performance_user ON api_performance_metrics(user_id, timestamp DESC);
CREATE INDEX idx_api_performance_status ON api_performance_metrics(status_code, timestamp DESC);

CREATE INDEX idx_db_query_metrics_name ON database_query_metrics(query_name, timestamp DESC);
CREATE INDEX idx_db_query_metrics_timestamp ON database_query_metrics(timestamp DESC);
CREATE INDEX idx_db_query_metrics_slow ON database_query_metrics(is_slow_query, timestamp DESC);

CREATE INDEX idx_system_health_date ON system_health_metrics(metric_date DESC);

CREATE INDEX idx_error_tracking_type ON error_tracking(error_type, last_occurred_at DESC);
CREATE INDEX idx_error_tracking_resolved ON error_tracking(is_resolved, severity);
CREATE INDEX idx_error_tracking_timestamp ON error_tracking(last_occurred_at DESC);

CREATE INDEX idx_performance_alerts_resolved ON performance_alerts(resolved, severity);
CREATE INDEX idx_performance_alerts_timestamp ON performance_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE api_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_query_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only
CREATE POLICY "Admins can view API performance metrics"
  ON api_performance_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert API metrics"
  ON api_performance_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view database query metrics"
  ON database_query_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert database metrics"
  ON database_query_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view system health metrics"
  ON system_health_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can view error tracking"
  ON error_tracking FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert errors"
  ON error_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view performance alerts"
  ON performance_alerts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to log API performance
CREATE OR REPLACE FUNCTION log_api_performance(
  p_endpoint text,
  p_method text,
  p_response_time_ms integer,
  p_status_code integer,
  p_user_id uuid DEFAULT NULL,
  p_error_message text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
BEGIN
  INSERT INTO api_performance_metrics (
    endpoint, method, response_time_ms, status_code,
    user_id, error_message
  ) VALUES (
    p_endpoint, p_method, p_response_time_ms, p_status_code,
    p_user_id, p_error_message
  ) RETURNING id INTO v_metric_id;

  -- Check for slow API alert
  IF p_response_time_ms > 3000 THEN
    INSERT INTO performance_alerts (
      alert_type, severity, message, metric_value,
      threshold_value, endpoint
    ) VALUES (
      'slow_api',
      CASE
        WHEN p_response_time_ms > 10000 THEN 'critical'
        WHEN p_response_time_ms > 5000 THEN 'error'
        ELSE 'warning'
      END,
      'Slow API response detected: ' || p_endpoint,
      p_response_time_ms,
      3000,
      p_endpoint
    );
  END IF;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log database query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_name text,
  p_table_name text,
  p_operation text,
  p_execution_time_ms numeric,
  p_rows_affected integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_metric_id uuid;
  v_is_slow boolean;
BEGIN
  v_is_slow := p_execution_time_ms > 1000;

  INSERT INTO database_query_metrics (
    query_name, table_name, operation, execution_time_ms,
    rows_affected, is_slow_query
  ) VALUES (
    p_query_name, p_table_name, p_operation, p_execution_time_ms,
    p_rows_affected, v_is_slow
  ) RETURNING id INTO v_metric_id;

  -- Alert for very slow queries
  IF p_execution_time_ms > 5000 THEN
    INSERT INTO performance_alerts (
      alert_type, severity, message, metric_value, threshold_value
    ) VALUES (
      'slow_query',
      CASE
        WHEN p_execution_time_ms > 10000 THEN 'critical'
        ELSE 'error'
      END,
      'Slow database query detected: ' || p_query_name,
      p_execution_time_ms,
      5000
    );
  END IF;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log errors
CREATE OR REPLACE FUNCTION log_error(
  p_error_type text,
  p_error_message text,
  p_error_stack text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_severity text DEFAULT 'medium'
)
RETURNS uuid AS $$
DECLARE
  v_error_id uuid;
  v_existing_error uuid;
BEGIN
  -- Check if similar error exists (within last hour)
  SELECT id INTO v_existing_error
  FROM error_tracking
  WHERE error_type = p_error_type
    AND error_message = p_error_message
    AND is_resolved = false
    AND last_occurred_at > NOW() - INTERVAL '1 hour'
  LIMIT 1;

  IF v_existing_error IS NOT NULL THEN
    -- Update existing error
    UPDATE error_tracking
    SET occurrence_count = occurrence_count + 1,
        last_occurred_at = NOW()
    WHERE id = v_existing_error
    RETURNING id INTO v_error_id;
  ELSE
    -- Insert new error
    INSERT INTO error_tracking (
      error_type, error_message, error_stack, endpoint,
      user_id, severity
    ) VALUES (
      p_error_type, p_error_message, p_error_stack, p_endpoint,
      p_user_id, p_severity
    ) RETURNING id INTO v_error_id;
  END IF;

  RETURN v_error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate daily system health
CREATE OR REPLACE FUNCTION calculate_daily_system_health(p_date date)
RETURNS void AS $$
DECLARE
  v_avg_api_time numeric;
  v_max_api_time integer;
  v_total_requests integer;
  v_failed_requests integer;
  v_error_rate numeric;
  v_avg_db_time numeric;
  v_slow_queries integer;
  v_total_queries integer;
BEGIN
  -- Calculate API metrics
  SELECT
    COALESCE(AVG(response_time_ms), 0),
    COALESCE(MAX(response_time_ms), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status_code >= 400)
  INTO v_avg_api_time, v_max_api_time, v_total_requests, v_failed_requests
  FROM api_performance_metrics
  WHERE timestamp::date = p_date;

  -- Calculate error rate
  IF v_total_requests > 0 THEN
    v_error_rate := (v_failed_requests::numeric / v_total_requests * 100)::numeric(5,2);
  ELSE
    v_error_rate := 0;
  END IF;

  -- Calculate DB metrics
  SELECT
    COALESCE(AVG(execution_time_ms), 0),
    COUNT(*) FILTER (WHERE is_slow_query = true),
    COUNT(*)
  INTO v_avg_db_time, v_slow_queries, v_total_queries
  FROM database_query_metrics
  WHERE timestamp::date = p_date;

  -- Insert or update system health
  INSERT INTO system_health_metrics (
    metric_date, avg_api_response_time, max_api_response_time,
    total_api_requests, failed_api_requests, error_rate,
    avg_db_query_time, slow_queries_count, total_db_queries
  ) VALUES (
    p_date, v_avg_api_time, v_max_api_time,
    v_total_requests, v_failed_requests, v_error_rate,
    v_avg_db_time, v_slow_queries, v_total_queries
  )
  ON CONFLICT (metric_date) DO UPDATE SET
    avg_api_response_time = EXCLUDED.avg_api_response_time,
    max_api_response_time = EXCLUDED.max_api_response_time,
    total_api_requests = EXCLUDED.total_api_requests,
    failed_api_requests = EXCLUDED.failed_api_requests,
    error_rate = EXCLUDED.error_rate,
    avg_db_query_time = EXCLUDED.avg_db_query_time,
    slow_queries_count = EXCLUDED.slow_queries_count,
    total_db_queries = EXCLUDED.total_db_queries,
    updated_at = NOW();

  -- Check for high error rate alert
  IF v_error_rate > 5 THEN
    INSERT INTO performance_alerts (
      alert_type, severity, message, metric_value, threshold_value
    ) VALUES (
      'high_error_rate',
      CASE
        WHEN v_error_rate > 20 THEN 'critical'
        WHEN v_error_rate > 10 THEN 'error'
        ELSE 'warning'
      END,
      'High error rate detected: ' || v_error_rate || '%',
      v_error_rate,
      5
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API performance summary
CREATE OR REPLACE FUNCTION get_api_performance_summary(p_days integer DEFAULT 7)
RETURNS TABLE (
  endpoint text,
  avg_response_time numeric,
  max_response_time integer,
  total_requests bigint,
  error_count bigint,
  error_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    apm.endpoint,
    AVG(apm.response_time_ms)::numeric(10,2) as avg_response_time,
    MAX(apm.response_time_ms) as max_response_time,
    COUNT(*)::bigint as total_requests,
    COUNT(*) FILTER (WHERE apm.status_code >= 400)::bigint as error_count,
    CASE
      WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE apm.status_code >= 400)::numeric / COUNT(*) * 100)::numeric(5,2)
      ELSE 0
    END as error_rate
  FROM api_performance_metrics apm
  WHERE apm.timestamp >= NOW() - (p_days || ' days')::interval
  GROUP BY apm.endpoint
  ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(p_days integer DEFAULT 7)
RETURNS TABLE (
  query_name text,
  table_name text,
  avg_execution_time numeric,
  max_execution_time numeric,
  occurrence_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dqm.query_name,
    dqm.table_name,
    AVG(dqm.execution_time_ms)::numeric(10,2) as avg_execution_time,
    MAX(dqm.execution_time_ms)::numeric(10,2) as max_execution_time,
    COUNT(*)::bigint as occurrence_count
  FROM database_query_metrics dqm
  WHERE dqm.is_slow_query = true
    AND dqm.timestamp >= NOW() - (p_days || ' days')::interval
  GROUP BY dqm.query_name, dqm.table_name
  ORDER BY avg_execution_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(p_days integer DEFAULT 7)
RETURNS TABLE (
  error_type text,
  error_message text,
  severity text,
  occurrence_count integer,
  last_occurred timestamptz,
  is_resolved boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    et.error_type,
    et.error_message,
    et.severity,
    et.occurrence_count,
    et.last_occurred_at,
    et.is_resolved
  FROM error_tracking et
  WHERE et.last_occurred_at >= NOW() - (p_days || ' days')::interval
  ORDER BY et.occurrence_count DESC, et.last_occurred_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old metrics
CREATE OR REPLACE FUNCTION cleanup_old_metrics(p_days_to_keep integer DEFAULT 90)
RETURNS integer AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete old API metrics
  DELETE FROM api_performance_metrics
  WHERE timestamp < NOW() - (p_days_to_keep || ' days')::interval;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete old DB metrics
  DELETE FROM database_query_metrics
  WHERE timestamp < NOW() - (p_days_to_keep || ' days')::interval;

  -- Delete resolved errors older than 30 days
  DELETE FROM error_tracking
  WHERE is_resolved = true
    AND resolved_at < NOW() - '30 days'::interval;

  -- Delete resolved alerts older than 30 days
  DELETE FROM performance_alerts
  WHERE resolved = true
    AND resolved_at < NOW() - '30 days'::interval;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE api_performance_metrics IS 'Track API endpoint performance and response times';
COMMENT ON TABLE database_query_metrics IS 'Monitor database query execution times';
COMMENT ON TABLE system_health_metrics IS 'Daily aggregated system health metrics';
COMMENT ON TABLE error_tracking IS 'Track and aggregate application errors';
COMMENT ON TABLE performance_alerts IS 'Performance issue alerts and notifications';

COMMENT ON FUNCTION log_api_performance IS 'Log API request performance metrics';
COMMENT ON FUNCTION log_query_performance IS 'Log database query performance';
COMMENT ON FUNCTION log_error IS 'Log application errors with deduplication';
COMMENT ON FUNCTION calculate_daily_system_health IS 'Calculate daily system health metrics';
COMMENT ON FUNCTION get_api_performance_summary IS 'Get API endpoint performance summary';
COMMENT ON FUNCTION get_slow_queries IS 'Get slow database queries';
COMMENT ON FUNCTION get_error_summary IS 'Get error tracking summary';
COMMENT ON FUNCTION cleanup_old_metrics IS 'Clean up old performance metrics';
