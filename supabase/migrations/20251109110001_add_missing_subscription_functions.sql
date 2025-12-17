/*
  # Add Missing Subscription RPC Functions

  1. New Functions
    - `get_plan_comparison` - Get detailed plan comparison
    - `check_subscription_feature` - Check feature access for user
    - `get_user_subscription_plan` - Get user's current plan details
    - `calculate_yearly_savings` - Calculate savings for yearly billing
    - `get_subscription_metrics` - Get admin subscription metrics

  2. Purpose
    - Support client library functions
    - Enable proper feature checking
    - Provide admin analytics
*/

-- ============================================================================
-- GET PLAN COMPARISON
-- ============================================================================

CREATE OR REPLACE FUNCTION get_plan_comparison()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'display_name', display_name,
      'description', description,
      'price_monthly', price_monthly,
      'price_yearly', price_yearly,
      'features', features,
      'limits', limits,
      'sort_order', sort_order
    ) ORDER BY sort_order
  )
  INTO result
  FROM subscription_plans
  WHERE is_active = true;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- CHECK SUBSCRIPTION FEATURE
-- ============================================================================

CREATE OR REPLACE FUNCTION check_subscription_feature(
  p_user_id uuid,
  p_feature_key text
)
RETURNS boolean AS $$
DECLARE
  has_feature boolean;
BEGIN
  -- Check if user has active subscription with the feature
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('Active', 'Trialing')
      AND (us.current_period_end IS NULL OR us.current_period_end > now())
      AND sp.features @> jsonb_build_array(
        jsonb_build_object('key', p_feature_key, 'enabled', true)
      )
  ) INTO has_feature;

  RETURN COALESCE(has_feature, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- GET USER SUBSCRIPTION PLAN
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_subscription_plan(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_id uuid,
  plan_name text,
  display_name text,
  status text,
  billing_cycle text,
  price_monthly numeric,
  price_yearly numeric,
  features jsonb,
  limits jsonb,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  trial_end timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id AS subscription_id,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.display_name,
    us.status,
    us.billing_cycle,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    sp.limits,
    us.current_period_start,
    us.current_period_end,
    us.cancel_at_period_end,
    us.trial_end
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- CALCULATE YEARLY SAVINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_yearly_savings(p_plan_name text)
RETURNS numeric AS $$
DECLARE
  monthly_price numeric;
  yearly_price numeric;
  yearly_equivalent numeric;
  savings numeric;
BEGIN
  -- Get plan prices
  SELECT price_monthly, price_yearly
  INTO monthly_price, yearly_price
  FROM subscription_plans
  WHERE name = p_plan_name
    AND is_active = true;

  -- Return 0 if plan not found
  IF monthly_price IS NULL OR yearly_price IS NULL THEN
    RETURN 0;
  END IF;

  -- Calculate yearly equivalent of monthly pricing
  yearly_equivalent := monthly_price * 12;

  -- Calculate savings
  savings := yearly_equivalent - yearly_price;

  RETURN COALESCE(savings, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GET SUBSCRIPTION METRICS (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_subscription_metrics()
RETURNS TABLE (
  total_subscribers bigint,
  active_subscribers bigint,
  trial_subscribers bigint,
  cancelled_subscribers bigint,
  mrr numeric,
  plan_distribution jsonb
) AS $$
DECLARE
  v_mrr numeric;
  v_plan_dist jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'Admin' OR is_admin = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Calculate MRR (Monthly Recurring Revenue)
  SELECT COALESCE(SUM(
    CASE
      WHEN us.billing_cycle = 'Monthly' THEN sp.price_monthly
      WHEN us.billing_cycle = 'Yearly' THEN sp.price_yearly / 12
      ELSE 0
    END
  ), 0)
  INTO v_mrr
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now());

  -- Get plan distribution
  SELECT jsonb_object_agg(
    sp.name,
    COUNT(*)
  )
  INTO v_plan_dist
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  GROUP BY sp.name;

  -- Return metrics
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM user_subscriptions)::bigint AS total_subscribers,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'Active')::bigint AS active_subscribers,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'Trialing')::bigint AS trial_subscribers,
    (SELECT COUNT(*) FROM user_subscriptions WHERE status = 'Cancelled')::bigint AS cancelled_subscribers,
    v_mrr AS mrr,
    COALESCE(v_plan_dist, '{}'::jsonb) AS plan_distribution;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_plan_comparison() TO authenticated;
GRANT EXECUTE ON FUNCTION check_subscription_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_subscription_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_yearly_savings(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_metrics() TO authenticated;

-- ============================================================================
-- ADD HELPER FUNCTION: Get User's Current Plan Name
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_plan_name(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_plan_name text;
BEGIN
  SELECT sp.name
  INTO v_plan_name
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  ORDER BY us.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_plan_name, 'Free');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_plan_name(uuid) TO authenticated;

-- ============================================================================
-- ADD HELPER FUNCTION: Check Usage Against Limit
-- ============================================================================

CREATE OR REPLACE FUNCTION check_usage_limit(
  user_uuid uuid,
  limit_key text,
  current_usage integer
)
RETURNS boolean AS $$
DECLARE
  user_limit integer;
BEGIN
  SELECT (sp.limits->>limit_key)::integer
  INTO user_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = user_uuid
    AND us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- If no limit set (NULL) or unlimited (-1), allow
  IF user_limit IS NULL OR user_limit = -1 THEN
    RETURN true;
  END IF;

  -- Check if within limit
  RETURN current_usage < user_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_usage_limit(uuid, text, integer) TO authenticated;
