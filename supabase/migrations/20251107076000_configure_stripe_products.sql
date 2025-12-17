/*
  # Configure Stripe Subscription Products

  1. Seed Subscription Plans
    - Free tier for basic access
    - Pro tier for providers
    - Premium tier for advanced features
    - Elite tier for enterprise features

  2. Plan Features
    - Job posting limits
    - Provider visibility
    - Priority support
    - Advanced analytics
    - Custom branding
    - API access

  3. Stripe Integration
    - Product IDs for each plan
    - Price IDs for monthly/yearly billing
    - Trial periods
    - Discount configurations
*/

-- Insert Free Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  limits,
  is_active,
  sort_order
)
VALUES (
  'Free',
  'Free',
  'Perfect for getting started',
  0,
  0,
  NULL,
  NULL,
  jsonb_build_array(
    'Post up to 3 jobs per month',
    'Basic provider search',
    'Standard support',
    'Community access',
    'Email notifications'
  ),
  jsonb_build_object(
    'max_jobs_per_month', 3,
    'max_saved_searches', 5,
    'max_bookmarks', 10,
    'priority_support', false,
    'analytics_access', false,
    'api_access', false,
    'custom_branding', false,
    'featured_listings', 0,
    'video_calls', false,
    'advanced_filters', false
  ),
  true,
  1
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();

-- Insert Pro Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  limits,
  is_active,
  sort_order
)
VALUES (
  'Pro',
  'Pro',
  'For active service providers',
  29.99,
  299.90,
  'price_pro_monthly',
  'price_pro_yearly',
  jsonb_build_array(
    'Unlimited job posts',
    'Priority in search results',
    'Advanced analytics',
    'Priority support',
    'Verified badge',
    'Custom profile',
    '5 featured listings per month',
    'Advanced search filters',
    'Email & push notifications',
    'Save unlimited searches'
  ),
  jsonb_build_object(
    'max_jobs_per_month', -1,
    'max_saved_searches', -1,
    'max_bookmarks', -1,
    'priority_support', true,
    'analytics_access', true,
    'api_access', false,
    'custom_branding', false,
    'featured_listings', 5,
    'video_calls', true,
    'advanced_filters', true,
    'priority_ranking', true,
    'verified_badge', true
  ),
  true,
  2
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();

-- Insert Premium Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  limits,
  is_active,
  sort_order
)
VALUES (
  'Premium',
  'Premium',
  'For growing businesses',
  79.99,
  799.90,
  'price_premium_monthly',
  'price_premium_yearly',
  jsonb_build_array(
    'Everything in Pro',
    'Top position in search',
    'Custom branding',
    'API access',
    'White-label options',
    '15 featured listings per month',
    'Dedicated account manager',
    'Custom integrations',
    'Advanced reporting',
    'Bulk operations',
    'Team collaboration'
  ),
  jsonb_build_object(
    'max_jobs_per_month', -1,
    'max_saved_searches', -1,
    'max_bookmarks', -1,
    'priority_support', true,
    'analytics_access', true,
    'api_access', true,
    'custom_branding', true,
    'featured_listings', 15,
    'video_calls', true,
    'advanced_filters', true,
    'priority_ranking', true,
    'verified_badge', true,
    'top_position', true,
    'white_label', true,
    'dedicated_manager', true,
    'custom_integrations', true,
    'team_seats', 5
  ),
  true,
  3
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();

-- Insert Elite Plan
INSERT INTO subscription_plans (
  name,
  display_name,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  limits,
  is_active,
  sort_order
)
VALUES (
  'Elite',
  'Elite',
  'For enterprise organizations',
  199.99,
  1999.90,
  'price_elite_monthly',
  'price_elite_yearly',
  jsonb_build_array(
    'Everything in Premium',
    'Unlimited featured listings',
    'Custom SLA',
    'On-premise deployment option',
    'Advanced security features',
    'Custom development',
    'Priority phone support',
    '24/7 dedicated support',
    'Custom training',
    'Unlimited team seats',
    'Multi-location support',
    'Custom contracts'
  ),
  jsonb_build_object(
    'max_jobs_per_month', -1,
    'max_saved_searches', -1,
    'max_bookmarks', -1,
    'priority_support', true,
    'analytics_access', true,
    'api_access', true,
    'custom_branding', true,
    'featured_listings', -1,
    'video_calls', true,
    'advanced_filters', true,
    'priority_ranking', true,
    'verified_badge', true,
    'top_position', true,
    'white_label', true,
    'dedicated_manager', true,
    'custom_integrations', true,
    'team_seats', -1,
    'custom_sla', true,
    'on_premise', true,
    'phone_support', true,
    'support_24_7', true,
    'custom_training', true,
    'multi_location', true
  ),
  true,
  4
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  stripe_price_id_monthly = EXCLUDED.stripe_price_id_monthly,
  stripe_price_id_yearly = EXCLUDED.stripe_price_id_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = now();

-- Function to check if user has feature access
CREATE OR REPLACE FUNCTION check_subscription_feature(
  p_user_id uuid,
  p_feature_key text
)
RETURNS boolean AS $$
DECLARE
  v_has_access boolean;
BEGIN
  -- Check if user has active subscription with this feature
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
    AND us.status IN ('Active', 'Trialing')
    AND (
      sp.limits->p_feature_key = 'true'::jsonb OR
      sp.limits->p_feature_key = '-1'::jsonb
    )
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check usage limit
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id uuid,
  p_limit_key text,
  p_current_usage integer
)
RETURNS boolean AS $$
DECLARE
  v_limit integer;
BEGIN
  -- Get user's plan limit
  SELECT (sp.limits->>p_limit_key)::integer INTO v_limit
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
  AND us.status IN ('Active', 'Trialing')
  LIMIT 1;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  -- NULL or 0 means no access
  IF v_limit IS NULL OR v_limit = 0 THEN
    RETURN false;
  END IF;

  -- Check if under limit
  RETURN p_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION get_user_subscription_plan(p_user_id uuid)
RETURNS TABLE (
  plan_name text,
  plan_display_name text,
  status text,
  billing_cycle text,
  current_period_end timestamptz,
  features jsonb,
  limits jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    sp.display_name,
    us.status,
    us.billing_cycle,
    us.current_period_end,
    sp.features,
    sp.limits
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = p_user_id
  AND us.status IN ('Active', 'Trialing')
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get plan comparison data
CREATE OR REPLACE FUNCTION get_plan_comparison()
RETURNS TABLE (
  plan_name text,
  display_name text,
  description text,
  price_monthly numeric,
  price_yearly numeric,
  features jsonb,
  limits jsonb,
  sort_order integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    sp.display_name,
    sp.description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    sp.limits,
    sp.sort_order
  FROM subscription_plans sp
  WHERE sp.is_active = true
  ORDER BY sp.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate yearly savings
CREATE OR REPLACE FUNCTION calculate_yearly_savings(p_plan_name text)
RETURNS numeric AS $$
DECLARE
  v_monthly numeric;
  v_yearly numeric;
  v_savings numeric;
BEGIN
  SELECT price_monthly, price_yearly INTO v_monthly, v_yearly
  FROM subscription_plans
  WHERE name = p_plan_name;

  IF v_monthly IS NULL OR v_yearly IS NULL THEN
    RETURN 0;
  END IF;

  v_savings := (v_monthly * 12) - v_yearly;
  RETURN v_savings;
END;
$$ LANGUAGE plpgsql;

-- Function to get subscription metrics
CREATE OR REPLACE FUNCTION get_subscription_metrics()
RETURNS TABLE (
  total_subscribers bigint,
  active_subscribers bigint,
  trial_subscribers bigint,
  cancelled_subscribers bigint,
  mrr numeric,
  plan_distribution jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_subscribers,
    COUNT(*) FILTER (WHERE status = 'Active') as active_subscribers,
    COUNT(*) FILTER (WHERE status = 'Trialing') as trial_subscribers,
    COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled_subscribers,
    SUM(
      CASE
        WHEN status IN ('Active', 'Trialing') AND billing_cycle = 'Monthly' THEN sp.price_monthly
        WHEN status IN ('Active', 'Trialing') AND billing_cycle = 'Yearly' THEN sp.price_yearly / 12
        ELSE 0
      END
    ) as mrr,
    jsonb_object_agg(
      sp.name,
      COUNT(*) FILTER (WHERE status IN ('Active', 'Trialing'))
    ) as plan_distribution
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  GROUP BY true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add column to profiles for default plan assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan_id uuid REFERENCES subscription_plans(id);
  END IF;
END $$;

-- Assign Free plan to all users without a subscription
DO $$
DECLARE
  v_free_plan_id uuid;
BEGIN
  -- Get Free plan ID
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'Free';

  -- Create subscriptions for users without one
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_cycle,
    current_period_start,
    current_period_end
  )
  SELECT
    p.id,
    v_free_plan_id,
    'Active',
    'Monthly',
    now(),
    now() + INTERVAL '100 years'
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_subscriptions us
    WHERE us.user_id = p.id
    AND us.status IN ('Active', 'Trialing')
  )
  AND v_free_plan_id IS NOT NULL
  ON CONFLICT (user_id, status) DO NOTHING;
END $$;

-- Create trigger to assign Free plan to new users
CREATE OR REPLACE FUNCTION assign_free_plan_to_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id uuid;
BEGIN
  -- Get Free plan ID
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'Free';

  -- Create free subscription
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end
    )
    VALUES (
      NEW.id,
      v_free_plan_id,
      'Active',
      'Monthly',
      now(),
      now() + INTERVAL '100 years'
    )
    ON CONFLICT (user_id, status) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS assign_free_plan_trigger ON profiles;

-- Create trigger
CREATE TRIGGER assign_free_plan_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_free_plan_to_new_user();

-- Add comment with Stripe setup instructions
COMMENT ON TABLE subscription_plans IS 'Subscription plans configuration. Update stripe_price_id_monthly and stripe_price_id_yearly with actual Stripe Price IDs after creating products in Stripe Dashboard.';
