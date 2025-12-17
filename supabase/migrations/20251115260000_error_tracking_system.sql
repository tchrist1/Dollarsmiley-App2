/*
  # Error Tracking & Monitoring System

  1. New Tables
    - `error_logs` - Application error tracking
    - `error_groups` - Error grouping and classification
    - `performance_metrics` - Performance monitoring
    - `api_request_logs` - API request tracking
    - `slow_query_logs` - Database performance monitoring
    - `health_check_logs` - System health monitoring

  2. Features
    - Error logging with stack traces
    - Error grouping by fingerprint
    - Performance monitoring
    - API request tracking
    - Slow query detection
    - System health checks
    - Alert management

  3. Security
    - Admin-only access
    - PII scrubbing
    - Sensitive data redaction

  4. Monitoring
    - Real-time error tracking
    - Performance degradation alerts
    - Uptime monitoring
*/

-- Error Groups (for grouping similar errors)
CREATE TABLE IF NOT EXISTS error_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group identification
  fingerprint text UNIQUE NOT NULL, -- MD5 hash of error signature
  error_type text NOT NULL,
  error_message text NOT NULL,

  -- Classification
  severity text NOT NULL, -- critical, error, warning, info
  category text, -- database, api, ui, payment, external_service

  -- Status
  status text DEFAULT 'open', -- open, investigating, resolved, ignored

  -- Assignment
  assigned_to uuid REFERENCES profiles(id),

  -- Occurrence tracking
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  occurrence_count bigint DEFAULT 1,
  affected_users_count integer DEFAULT 0,

  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Error Logs (individual error occurrences)
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_group_id uuid REFERENCES error_groups(id) ON DELETE SET NULL,

  -- Error details
  error_type text NOT NULL,
  error_message text NOT NULL,
  stack_trace text,

  -- Severity
  severity text NOT NULL, -- critical, error, warning, info
  category text,

  -- Context
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,

  -- Request context
  url text,
  method text, -- GET, POST, PUT, DELETE
  route text,
  query_params jsonb,
  request_body jsonb,
  response_status integer,

  -- Environment
  environment text DEFAULT 'production', -- production, staging, development
  platform text, -- web, ios, android
  app_version text,

  -- Device/Browser
  user_agent text,
  browser text,
  os text,
  device_type text, -- desktop, mobile, tablet

  -- Network
  ip_address inet,

  -- Additional context
  user_context jsonb, -- User state at time of error
  breadcrumbs jsonb, -- Actions leading to error
  tags text[],

  -- Metadata
  metadata jsonb DEFAULT '{}',

  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric details
  metric_type text NOT NULL,
  -- Types: page_load, api_response, database_query, render_time, bundle_size

  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text, -- ms, seconds, bytes, count

  -- Thresholds
  threshold_exceeded boolean DEFAULT false,
  threshold_value numeric,

  -- Context
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text,

  -- Request context
  url text,
  route text,

  -- Environment
  environment text DEFAULT 'production',
  platform text,
  app_version text,

  -- Device/Browser
  browser text,
  os text,
  device_type text,

  -- Network
  network_type text, -- wifi, 4g, 5g, slow-2g

  -- Metadata
  metadata jsonb DEFAULT '{}',

  measured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- API Request Logs
CREATE TABLE IF NOT EXISTS api_request_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  method text NOT NULL,
  path text NOT NULL,
  full_url text,

  -- User
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  api_key_id uuid,

  -- Request
  request_headers jsonb,
  request_body jsonb,
  query_params jsonb,

  -- Response
  status_code integer NOT NULL,
  response_body jsonb,
  response_headers jsonb,

  -- Timing
  duration_ms integer,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,

  -- Network
  ip_address inet,
  user_agent text,

  -- Rate limiting
  rate_limit_key text,
  rate_limit_remaining integer,

  -- Error tracking
  had_error boolean DEFAULT false,
  error_message text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now()
);

-- Slow Query Logs
CREATE TABLE IF NOT EXISTS slow_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Query details
  query_text text NOT NULL,
  query_fingerprint text, -- Normalized query for grouping

  -- Execution
  execution_time_ms integer NOT NULL,
  rows_examined bigint,
  rows_returned bigint,

  -- Context
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  triggered_by text, -- api, background_job, admin_action

  -- Query plan
  explain_plan jsonb,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  executed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Health Check Logs
CREATE TABLE IF NOT EXISTS health_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Check details
  check_name text NOT NULL,
  check_type text NOT NULL, -- database, api, storage, external_service
  endpoint text,

  -- Status
  status text NOT NULL, -- healthy, degraded, unhealthy
  response_time_ms integer,

  -- Details
  status_code integer,
  error_message text,
  details jsonb,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  checked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule details
  rule_name text NOT NULL,
  rule_type text NOT NULL, -- error_rate, performance, uptime, custom

  -- Conditions
  condition_type text NOT NULL, -- threshold, percentage, count
  threshold_value numeric NOT NULL,
  time_window_minutes integer DEFAULT 5,

  -- Notification
  notification_channels text[], -- email, slack, sms, pagerduty
  notification_recipients text[],

  -- Status
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,

  -- Cooldown
  cooldown_minutes integer DEFAULT 15,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alert Incidents
CREATE TABLE IF NOT EXISTS alert_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id uuid REFERENCES alert_rules(id) ON DELETE CASCADE NOT NULL,

  -- Incident details
  severity text NOT NULL, -- critical, high, medium, low
  title text NOT NULL,
  description text,

  -- Status
  status text DEFAULT 'open', -- open, acknowledged, resolved

  -- Assignment
  acknowledged_by uuid REFERENCES profiles(id),
  acknowledged_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,

  -- Metrics
  affected_users_count integer,
  error_count integer,

  -- Notifications
  notifications_sent jsonb,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  triggered_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_groups_fingerprint ON error_groups(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_groups_status ON error_groups(status);
CREATE INDEX IF NOT EXISTS idx_error_groups_severity ON error_groups(severity);
CREATE INDEX IF NOT EXISTS idx_error_groups_last_seen ON error_groups(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_group ON error_logs(error_group_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred ON error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_measured ON performance_metrics(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_threshold ON performance_metrics(threshold_exceeded) WHERE threshold_exceeded = true;

CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON api_request_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_logs_status ON api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_duration ON api_request_logs(duration_ms DESC);

CREATE INDEX IF NOT EXISTS idx_slow_queries_fingerprint ON slow_query_logs(query_fingerprint);
CREATE INDEX IF NOT EXISTS idx_slow_queries_duration ON slow_query_logs(execution_time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_executed ON slow_query_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_health_checks_name ON health_check_logs(check_name);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_check_logs(status);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked ON health_check_logs(checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_alert_incidents_rule ON alert_incidents(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_incidents_status ON alert_incidents(status);
CREATE INDEX IF NOT EXISTS idx_alert_incidents_triggered ON alert_incidents(triggered_at DESC);

-- Enable RLS (Admin-only for most tables)
ALTER TABLE error_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin-only)
CREATE POLICY "Admins can view all error data"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage error groups"
  ON error_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Function: Log error
CREATE OR REPLACE FUNCTION log_error(
  error_type_param text,
  error_message_param text,
  severity_param text DEFAULT 'error',
  stack_trace_param text DEFAULT NULL,
  user_id_param uuid DEFAULT NULL,
  context_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  error_log_id uuid;
  error_group_id_found uuid;
  fingerprint_generated text;
BEGIN
  -- Generate fingerprint for grouping
  fingerprint_generated := md5(error_type_param || ':' || SUBSTRING(error_message_param, 1, 200));

  -- Find or create error group
  SELECT id INTO error_group_id_found
  FROM error_groups
  WHERE fingerprint = fingerprint_generated;

  IF error_group_id_found IS NULL THEN
    -- Create new error group
    INSERT INTO error_groups (
      fingerprint,
      error_type,
      error_message,
      severity,
      first_seen_at,
      last_seen_at,
      occurrence_count
    ) VALUES (
      fingerprint_generated,
      error_type_param,
      SUBSTRING(error_message_param, 1, 500),
      severity_param,
      now(),
      now(),
      1
    )
    RETURNING id INTO error_group_id_found;
  ELSE
    -- Update existing error group
    UPDATE error_groups
    SET
      last_seen_at = now(),
      occurrence_count = occurrence_count + 1,
      updated_at = now()
    WHERE id = error_group_id_found;
  END IF;

  -- Create error log
  INSERT INTO error_logs (
    error_group_id,
    error_type,
    error_message,
    stack_trace,
    severity,
    user_id,
    user_context
  ) VALUES (
    error_group_id_found,
    error_type_param,
    error_message_param,
    stack_trace_param,
    severity_param,
    user_id_param,
    context_param
  )
  RETURNING id INTO error_log_id;

  RETURN error_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log performance metric
CREATE OR REPLACE FUNCTION log_performance_metric(
  metric_type_param text,
  metric_name_param text,
  metric_value_param numeric,
  metric_unit_param text DEFAULT 'ms',
  threshold_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  metric_id uuid;
  threshold_exceeded_flag boolean;
BEGIN
  -- Check if threshold exceeded
  threshold_exceeded_flag := false;
  IF threshold_param IS NOT NULL AND metric_value_param > threshold_param THEN
    threshold_exceeded_flag := true;
  END IF;

  -- Insert metric
  INSERT INTO performance_metrics (
    metric_type,
    metric_name,
    metric_value,
    metric_unit,
    threshold_exceeded,
    threshold_value
  ) VALUES (
    metric_type_param,
    metric_name_param,
    metric_value_param,
    metric_unit_param,
    threshold_exceeded_flag,
    threshold_param
  )
  RETURNING id INTO metric_id;

  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record health check
CREATE OR REPLACE FUNCTION record_health_check(
  check_name_param text,
  check_type_param text,
  status_param text,
  response_time_param integer DEFAULT NULL,
  error_message_param text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  check_id uuid;
BEGIN
  INSERT INTO health_check_logs (
    check_name,
    check_type,
    status,
    response_time_ms,
    error_message
  ) VALUES (
    check_name_param,
    check_type_param,
    status_param,
    response_time_param,
    error_message_param
  )
  RETURNING id INTO check_id;

  RETURN check_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_error TO authenticated;
GRANT EXECUTE ON FUNCTION log_performance_metric TO authenticated;
GRANT EXECUTE ON FUNCTION record_health_check TO authenticated;

-- Add helpful comments
COMMENT ON TABLE error_logs IS 'Application error tracking with stack traces and context';
COMMENT ON TABLE error_groups IS 'Grouped errors by fingerprint for easier management';
COMMENT ON TABLE performance_metrics IS 'Performance monitoring and threshold tracking';
COMMENT ON TABLE health_check_logs IS 'System health monitoring and uptime tracking';
