/*
  # Create Usage Tracking System

  1. New Tables
    - `usage_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `metric` (text, type of usage being tracked)
      - `count` (integer, current count)
      - `period_start` (timestamptz, start of tracking period)
      - `period_end` (timestamptz, end of tracking period)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `usage_tracking` table
    - Add policies for users to read their own usage
    - Add policies for system to update usage

  3. Indexes
    - Index on user_id for fast lookups
    - Index on metric for filtering
    - Composite index on user_id + metric + period for queries
*/

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  metric text NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own usage"
  ON usage_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage"
  ON usage_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update usage"
  ON usage_tracking
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id
  ON usage_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric
  ON usage_tracking(metric);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_period
  ON usage_tracking(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_metric_period
  ON usage_tracking(user_id, metric, period_start, period_end);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at_trigger ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at_trigger
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_tracking_updated_at();

-- Create function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id uuid,
  p_metric text,
  p_amount integer DEFAULT 1
)
RETURNS jsonb AS $$
DECLARE
  v_current_count integer;
  v_limit integer;
  v_unlimited boolean;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_plan jsonb;
BEGIN
  -- Get current period
  v_period_start := date_trunc('month', now());
  v_period_end := date_trunc('month', now() + interval '1 month') - interval '1 second';

  -- Get current usage
  SELECT COALESCE(count, 0) INTO v_current_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND metric = p_metric
    AND period_start = v_period_start
    AND period_end = v_period_end;

  -- Get user's plan limits
  SELECT
    CASE
      WHEN p_metric = 'job_posts' THEN
        COALESCE((sp.limits->>'max_jobs_per_month')::integer, -1)
      WHEN p_metric = 'listings' THEN
        COALESCE((sp.limits->>'monthly_listings')::integer, -1)
      WHEN p_metric = 'featured_listings' THEN
        COALESCE((sp.limits->>'featured_listings')::integer, 0)
      WHEN p_metric = 'bookings' THEN
        COALESCE((sp.limits->>'max_bookings_per_month')::integer, -1)
      WHEN p_metric = 'messages' THEN
        COALESCE((sp.limits->>'max_messages_per_day')::integer, -1)
      WHEN p_metric = 'api_calls' THEN
        COALESCE((sp.limits->>'api_calls_per_month')::integer, 0)
      WHEN p_metric = 'storage_mb' THEN
        COALESCE((sp.limits->>'storage_limit_mb')::integer, 100)
      WHEN p_metric = 'team_seats' THEN
        COALESCE((sp.limits->>'team_seats')::integer, 1)
      ELSE -1
    END INTO v_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('Active', 'Trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- If no subscription found, use free plan defaults
  IF v_limit IS NULL THEN
    v_limit := CASE
      WHEN p_metric = 'job_posts' THEN 3
      WHEN p_metric = 'listings' THEN 5
      WHEN p_metric = 'featured_listings' THEN 0
      WHEN p_metric = 'bookings' THEN 10
      WHEN p_metric = 'messages' THEN 50
      WHEN p_metric = 'api_calls' THEN 0
      WHEN p_metric = 'storage_mb' THEN 100
      WHEN p_metric = 'team_seats' THEN 1
      ELSE -1
    END;
  END IF;

  v_unlimited := v_limit = -1;

  RETURN jsonb_build_object(
    'metric', p_metric,
    'current_count', v_current_count,
    'limit', v_limit,
    'unlimited', v_unlimited,
    'remaining', CASE WHEN v_unlimited THEN -1 ELSE GREATEST(0, v_limit - v_current_count) END,
    'exceeded', NOT v_unlimited AND (v_current_count + p_amount) > v_limit,
    'percentage', CASE WHEN v_unlimited THEN 0 ELSE (v_current_count::float / v_limit::float) * 100 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track usage
CREATE OR REPLACE FUNCTION track_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer DEFAULT 1
)
RETURNS jsonb AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_new_count integer;
  v_usage_id uuid;
BEGIN
  -- Get current period
  v_period_start := date_trunc('month', now());
  v_period_end := date_trunc('month', now() + interval '1 month') - interval '1 second';

  -- Insert or update usage record
  INSERT INTO usage_tracking (user_id, metric, count, period_start, period_end)
  VALUES (p_user_id, p_metric, p_amount, v_period_start, v_period_end)
  ON CONFLICT (user_id, metric, period_start, period_end)
  DO UPDATE SET
    count = usage_tracking.count + p_amount,
    updated_at = now()
  RETURNING id, count INTO v_usage_id, v_new_count;

  -- Check if limit exceeded
  RETURN check_usage_limit(p_user_id, p_metric, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint to prevent duplicate records
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_tracking_unique_period
  ON usage_tracking(user_id, metric, period_start, period_end);

-- Create view for usage summary
CREATE OR REPLACE VIEW usage_summary AS
SELECT
  ut.user_id,
  ut.metric,
  ut.count,
  ut.period_start,
  ut.period_end,
  sp.name as plan_name,
  CASE
    WHEN ut.metric = 'job_posts' THEN
      COALESCE((sp.limits->>'max_jobs_per_month')::integer, 3)
    WHEN ut.metric = 'listings' THEN
      COALESCE((sp.limits->>'monthly_listings')::integer, 5)
    WHEN ut.metric = 'featured_listings' THEN
      COALESCE((sp.limits->>'featured_listings')::integer, 0)
    WHEN ut.metric = 'bookings' THEN
      COALESCE((sp.limits->>'max_bookings_per_month')::integer, 10)
    WHEN ut.metric = 'messages' THEN
      COALESCE((sp.limits->>'max_messages_per_day')::integer, 50)
    WHEN ut.metric = 'api_calls' THEN
      COALESCE((sp.limits->>'api_calls_per_month')::integer, 0)
    WHEN ut.metric = 'storage_mb' THEN
      COALESCE((sp.limits->>'storage_limit_mb')::integer, 100)
    WHEN ut.metric = 'team_seats' THEN
      COALESCE((sp.limits->>'team_seats')::integer, 1)
    ELSE -1
  END as limit,
  CASE
    WHEN ut.metric = 'job_posts' THEN
      COALESCE((sp.limits->>'max_jobs_per_month')::integer, 3) = -1
    WHEN ut.metric = 'listings' THEN
      COALESCE((sp.limits->>'monthly_listings')::integer, 5) = -1
    ELSE false
  END as unlimited
FROM usage_tracking ut
LEFT JOIN user_subscriptions us ON us.user_id = ut.user_id
  AND us.status IN ('Active', 'Trialing')
LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
ORDER BY ut.period_start DESC, ut.metric;

-- Grant access to view
GRANT SELECT ON usage_summary TO authenticated;
