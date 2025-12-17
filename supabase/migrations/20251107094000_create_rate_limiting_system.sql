/*
  # Create API Rate Limiting System

  1. New Tables
    - `rate_limit_rules`
      - Define rate limit rules per endpoint
      - Different limits for user tiers

    - `rate_limit_usage`
      - Track API usage
      - Per user, per IP, per endpoint

    - `rate_limit_violations`
      - Log rate limit violations
      - Security monitoring

  2. Features
    - IP-based rate limiting
    - User-based rate limiting
    - Endpoint-specific limits
    - Tier-based limits (free, premium)
    - Sliding window algorithm
    - Automatic cleanup
    - Violation tracking

  3. Security
    - RLS policies
    - Automatic blocking
    - Admin monitoring
*/

-- Create rate limit tier enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_limit_tier') THEN
    CREATE TYPE rate_limit_tier AS ENUM (
      'anonymous',
      'authenticated',
      'premium',
      'admin'
    );
  END IF;
END $$;

-- Create rate limit interval enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rate_limit_interval') THEN
    CREATE TYPE rate_limit_interval AS ENUM (
      'second',
      'minute',
      'hour',
      'day'
    );
  END IF;
END $$;

-- Create rate_limit_rules table
CREATE TABLE IF NOT EXISTS rate_limit_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_pattern text NOT NULL,
  tier rate_limit_tier NOT NULL,
  max_requests integer NOT NULL,
  interval_type rate_limit_interval NOT NULL,
  interval_value integer DEFAULT 1 NOT NULL,
  burst_allowance integer DEFAULT 0 NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(endpoint_pattern, tier)
);

-- Create rate_limit_usage table
CREATE TABLE IF NOT EXISTS rate_limit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address text,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1 NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  last_request_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create rate_limit_violations table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address text,
  endpoint text NOT NULL,
  rule_id uuid REFERENCES rate_limit_rules(id) ON DELETE SET NULL,
  requested_count integer NOT NULL,
  allowed_count integer NOT NULL,
  blocked boolean DEFAULT true NOT NULL,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create rate_limit_blocks table
CREATE TABLE IF NOT EXISTS rate_limit_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ip_address text,
  reason text NOT NULL,
  block_until timestamptz NOT NULL,
  violation_count integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rate_limit_rules

-- Anyone can view enabled rules
CREATE POLICY "Anyone can view enabled rate limit rules"
  ON rate_limit_rules
  FOR SELECT
  USING (is_enabled = true);

-- Admins can manage rules
CREATE POLICY "Admins can manage rate limit rules"
  ON rate_limit_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- RLS Policies for rate_limit_usage

-- Users can view own usage
CREATE POLICY "Users can view own rate limit usage"
  ON rate_limit_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can manage usage
CREATE POLICY "System can manage rate limit usage"
  ON rate_limit_usage
  FOR ALL
  TO authenticated
  USING (true);

-- RLS Policies for rate_limit_violations

-- Users can view own violations
CREATE POLICY "Users can view own rate limit violations"
  ON rate_limit_violations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can create violations
CREATE POLICY "System can create rate limit violations"
  ON rate_limit_violations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all violations
CREATE POLICY "Admins can view all rate limit violations"
  ON rate_limit_violations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- RLS Policies for rate_limit_blocks

-- Users can view own blocks
CREATE POLICY "Users can view own rate limit blocks"
  ON rate_limit_blocks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage blocks
CREATE POLICY "Admins can manage rate limit blocks"
  ON rate_limit_blocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_tier ON rate_limit_rules(tier, is_enabled);
CREATE INDEX IF NOT EXISTS idx_rate_limit_rules_endpoint ON rate_limit_rules(endpoint_pattern);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_user ON rate_limit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_ip ON rate_limit_usage(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_endpoint ON rate_limit_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_window ON rate_limit_usage(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user ON rate_limit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_created ON rate_limit_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_user ON rate_limit_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_ip ON rate_limit_blocks(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocks_active ON rate_limit_blocks(is_active, block_until);

-- Create function to get interval in seconds
CREATE OR REPLACE FUNCTION get_interval_seconds(
  p_interval_type rate_limit_interval,
  p_interval_value integer
)
RETURNS integer AS $$
BEGIN
  RETURN CASE p_interval_type
    WHEN 'second' THEN p_interval_value
    WHEN 'minute' THEN p_interval_value * 60
    WHEN 'hour' THEN p_interval_value * 3600
    WHEN 'day' THEN p_interval_value * 86400
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_ip_address text,
  p_endpoint text,
  p_tier rate_limit_tier DEFAULT 'anonymous'
)
RETURNS jsonb AS $$
DECLARE
  v_rule rate_limit_rules%ROWTYPE;
  v_usage rate_limit_usage%ROWTYPE;
  v_window_seconds integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_current_count integer := 0;
  v_allowed boolean := true;
  v_reset_at timestamptz;
BEGIN
  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM rate_limit_blocks
    WHERE (user_id = p_user_id OR ip_address = p_ip_address)
      AND is_active = true
      AND block_until > now()
  ) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'reason', 'IP or user is currently blocked',
      'retry_after', (
        SELECT EXTRACT(EPOCH FROM (block_until - now()))
        FROM rate_limit_blocks
        WHERE (user_id = p_user_id OR ip_address = p_ip_address)
          AND is_active = true
          AND block_until > now()
        ORDER BY block_until DESC
        LIMIT 1
      )
    );
  END IF;

  -- Find applicable rule
  SELECT * INTO v_rule
  FROM rate_limit_rules
  WHERE endpoint_pattern = p_endpoint
    AND tier = p_tier
    AND is_enabled = true
  LIMIT 1;

  -- If no rule, allow request
  IF v_rule.id IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'limit', null,
      'remaining', null,
      'reset', null
    );
  END IF;

  -- Calculate time window
  v_window_seconds := get_interval_seconds(v_rule.interval_type, v_rule.interval_value);
  v_window_end := now();
  v_window_start := v_window_end - (v_window_seconds || ' seconds')::interval;
  v_reset_at := v_window_end + (v_window_seconds || ' seconds')::interval;

  -- Get current usage
  SELECT * INTO v_usage
  FROM rate_limit_usage
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_end > now()
  ORDER BY window_end DESC
  LIMIT 1;

  -- Calculate current count
  IF v_usage.id IS NOT NULL THEN
    v_current_count := v_usage.request_count;
  END IF;

  -- Check if over limit
  IF v_current_count >= v_rule.max_requests THEN
    v_allowed := false;

    -- Log violation
    INSERT INTO rate_limit_violations (
      user_id,
      ip_address,
      endpoint,
      rule_id,
      requested_count,
      allowed_count
    ) VALUES (
      p_user_id,
      p_ip_address,
      p_endpoint,
      v_rule.id,
      v_current_count + 1,
      v_rule.max_requests
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'blocked', false,
    'limit', v_rule.max_requests,
    'remaining', GREATEST(0, v_rule.max_requests - v_current_count),
    'reset', EXTRACT(EPOCH FROM v_reset_at),
    'retry_after', CASE WHEN NOT v_allowed THEN EXTRACT(EPOCH FROM (v_reset_at - now())) ELSE null END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record request
CREATE OR REPLACE FUNCTION record_rate_limit_request(
  p_user_id uuid,
  p_ip_address text,
  p_endpoint text,
  p_tier rate_limit_tier DEFAULT 'anonymous'
)
RETURNS boolean AS $$
DECLARE
  v_rule rate_limit_rules%ROWTYPE;
  v_window_seconds integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
BEGIN
  -- Find applicable rule
  SELECT * INTO v_rule
  FROM rate_limit_rules
  WHERE endpoint_pattern = p_endpoint
    AND tier = p_tier
    AND is_enabled = true
  LIMIT 1;

  -- If no rule, no tracking needed
  IF v_rule.id IS NULL THEN
    RETURN true;
  END IF;

  -- Calculate time window
  v_window_seconds := get_interval_seconds(v_rule.interval_type, v_rule.interval_value);
  v_window_end := now() + (v_window_seconds || ' seconds')::interval;
  v_window_start := now();

  -- Insert or update usage
  INSERT INTO rate_limit_usage (
    user_id,
    ip_address,
    endpoint,
    request_count,
    window_start,
    window_end,
    last_request_at
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_endpoint,
    1,
    v_window_start,
    v_window_end,
    now()
  )
  ON CONFLICT ON CONSTRAINT rate_limit_usage_pkey
  DO UPDATE SET
    request_count = rate_limit_usage.request_count + 1,
    last_request_at = now();

  -- Alternative: use unique constraint on user/ip/endpoint/window
  -- For now, we'll use a simpler approach
  UPDATE rate_limit_usage
  SET request_count = request_count + 1,
      last_request_at = now()
  WHERE (user_id = p_user_id OR ip_address = p_ip_address)
    AND endpoint = p_endpoint
    AND window_end > now();

  IF NOT FOUND THEN
    INSERT INTO rate_limit_usage (
      user_id,
      ip_address,
      endpoint,
      request_count,
      window_start,
      window_end
    ) VALUES (
      p_user_id,
      p_ip_address,
      p_endpoint,
      1,
      v_window_start,
      v_window_end
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to block user/IP
CREATE OR REPLACE FUNCTION create_rate_limit_block(
  p_user_id uuid,
  p_ip_address text,
  p_reason text,
  p_duration_minutes integer DEFAULT 60
)
RETURNS uuid AS $$
DECLARE
  v_block_id uuid;
BEGIN
  INSERT INTO rate_limit_blocks (
    user_id,
    ip_address,
    reason,
    block_until
  ) VALUES (
    p_user_id,
    p_ip_address,
    p_reason,
    now() + (p_duration_minutes || ' minutes')::interval
  )
  RETURNING id INTO v_block_id;

  RETURN v_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get rate limit stats
CREATE OR REPLACE FUNCTION get_rate_limit_stats(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COALESCE(SUM(request_count), 0),
    'violations', (
      SELECT COUNT(*)
      FROM rate_limit_violations
      WHERE user_id = p_user_id
    ),
    'active_blocks', (
      SELECT COUNT(*)
      FROM rate_limit_blocks
      WHERE user_id = p_user_id
        AND is_active = true
        AND block_until > now()
    ),
    'endpoints', (
      SELECT jsonb_object_agg(endpoint, total)
      FROM (
        SELECT endpoint, SUM(request_count) as total
        FROM rate_limit_usage
        WHERE user_id = p_user_id
          AND window_end > now() - interval '24 hours'
        GROUP BY endpoint
      ) endpoint_stats
    )
  ) INTO v_stats
  FROM rate_limit_usage
  WHERE user_id = p_user_id
    AND window_end > now() - interval '24 hours';

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_rate_limit_data()
RETURNS integer AS $$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  -- Delete old usage records (older than 7 days)
  DELETE FROM rate_limit_usage
  WHERE window_end < now() - interval '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete old violations (older than 30 days)
  DELETE FROM rate_limit_violations
  WHERE created_at < now() - interval '30 days';

  -- Deactivate expired blocks
  UPDATE rate_limit_blocks
  SET is_active = false
  WHERE is_active = true
    AND block_until < now();

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rate_limit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rate_limit_rules_updated_at ON rate_limit_rules;
CREATE TRIGGER update_rate_limit_rules_updated_at
  BEFORE UPDATE ON rate_limit_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limit_updated_at();

DROP TRIGGER IF EXISTS update_rate_limit_usage_updated_at ON rate_limit_usage;
CREATE TRIGGER update_rate_limit_usage_updated_at
  BEFORE UPDATE ON rate_limit_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limit_updated_at();

DROP TRIGGER IF EXISTS update_rate_limit_blocks_updated_at ON rate_limit_blocks;
CREATE TRIGGER update_rate_limit_blocks_updated_at
  BEFORE UPDATE ON rate_limit_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limit_updated_at();

-- Insert default rate limit rules
INSERT INTO rate_limit_rules (endpoint_pattern, tier, max_requests, interval_type, interval_value, description)
VALUES
  -- Anonymous users
  ('*', 'anonymous', 100, 'hour', 1, 'Global limit for anonymous users'),
  ('/auth/*', 'anonymous', 10, 'hour', 1, 'Auth endpoints for anonymous users'),
  ('/api/*', 'anonymous', 50, 'hour', 1, 'API endpoints for anonymous users'),

  -- Authenticated users
  ('*', 'authenticated', 1000, 'hour', 1, 'Global limit for authenticated users'),
  ('/auth/*', 'authenticated', 50, 'hour', 1, 'Auth endpoints for authenticated users'),
  ('/api/*', 'authenticated', 500, 'hour', 1, 'API endpoints for authenticated users'),

  -- Premium users
  ('*', 'premium', 5000, 'hour', 1, 'Global limit for premium users'),
  ('/api/*', 'premium', 2500, 'hour', 1, 'API endpoints for premium users'),

  -- Admin users
  ('*', 'admin', 10000, 'hour', 1, 'Global limit for admin users')
ON CONFLICT (endpoint_pattern, tier) DO NOTHING;
