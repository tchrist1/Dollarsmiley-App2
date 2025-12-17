/*
  # Subscription Plans and Management

  1. New Tables
    - `subscription_plans` - Available subscription tiers with features
      - `id` (uuid, primary key)
      - `name` (text) - Plan name (Free, Pro, Premium, Elite)
      - `display_name` (text) - Display name for UI
      - `description` (text) - Plan description
      - `price_monthly` (numeric) - Monthly price in dollars
      - `price_yearly` (numeric) - Yearly price in dollars (discounted)
      - `stripe_price_id_monthly` (text) - Stripe price ID for monthly
      - `stripe_price_id_yearly` (text) - Stripe price ID for yearly
      - `features` (jsonb) - List of features
      - `limits` (jsonb) - Usage limits
      - `is_active` (boolean) - Plan availability
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_subscriptions` - User subscription records
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `plan_id` (uuid, references subscription_plans)
      - `status` (text) - Active, Cancelled, Expired, PastDue
      - `billing_cycle` (text) - Monthly, Yearly
      - `stripe_subscription_id` (text) - Stripe subscription ID
      - `stripe_customer_id` (text) - Stripe customer ID
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `cancelled_at` (timestamptz)
      - `trial_start` (timestamptz)
      - `trial_end` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for viewing and managing subscriptions

  3. Functions
    - Function to check subscription features
    - Function to update subscription status
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL CHECK (name IN ('Free', 'Pro', 'Premium', 'Elite')),
  display_name text NOT NULL,
  description text,
  price_monthly numeric(10, 2) DEFAULT 0,
  price_yearly numeric(10, 2) DEFAULT 0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  features jsonb DEFAULT '[]'::jsonb,
  limits jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Cancelled', 'Expired', 'PastDue', 'Trialing')),
  billing_cycle text CHECK (billing_cycle IN ('Monthly', 'Yearly')),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  cancelled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscription_plans_name ON subscription_plans(name);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_active_subscription(user_uuid uuid)
RETURNS TABLE (
  plan_name text,
  features jsonb,
  limits jsonb,
  expires_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.name,
    sp.features,
    sp.limits,
    us.current_period_end
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = user_uuid
    AND us.status IN ('Active', 'Trialing')
    AND (us.current_period_end IS NULL OR us.current_period_end > now())
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has feature access
CREATE OR REPLACE FUNCTION has_subscription_feature(
  user_uuid uuid,
  feature_key text
)
RETURNS boolean AS $$
DECLARE
  has_feature boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = user_uuid
      AND us.status IN ('Active', 'Trialing')
      AND (us.current_period_end IS NULL OR us.current_period_end > now())
      AND sp.features @> jsonb_build_array(jsonb_build_object('key', feature_key, 'enabled', true))
  ) INTO has_feature;

  RETURN has_feature;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check usage limit
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

  IF user_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN current_usage < user_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
(
  'Free',
  'Free Plan',
  'Perfect for getting started',
  0.00,
  0.00,
  '[
    {"key": "basic_profile", "enabled": true, "label": "Basic profile"},
    {"key": "browse_services", "enabled": true, "label": "Browse services"},
    {"key": "post_jobs", "enabled": true, "label": "Post jobs"},
    {"key": "book_services", "enabled": true, "label": "Book services"}
  ]'::jsonb,
  '{
    "monthly_listings": 3,
    "monthly_jobs": 5,
    "photos_per_listing": 3,
    "featured_listings": 0
  }'::jsonb,
  1
),
(
  'Pro',
  'Pro Plan',
  'For active service providers',
  19.99,
  199.00,
  '[
    {"key": "basic_profile", "enabled": true, "label": "Basic profile"},
    {"key": "browse_services", "enabled": true, "label": "Browse services"},
    {"key": "post_jobs", "enabled": true, "label": "Post jobs"},
    {"key": "book_services", "enabled": true, "label": "Book services"},
    {"key": "priority_support", "enabled": true, "label": "Priority support"},
    {"key": "analytics", "enabled": true, "label": "Basic analytics"},
    {"key": "featured_badge", "enabled": true, "label": "Pro badge"}
  ]'::jsonb,
  '{
    "monthly_listings": 10,
    "monthly_jobs": 20,
    "photos_per_listing": 10,
    "featured_listings": 1
  }'::jsonb,
  2
),
(
  'Premium',
  'Premium Plan',
  'For growing businesses',
  49.99,
  499.00,
  '[
    {"key": "basic_profile", "enabled": true, "label": "Basic profile"},
    {"key": "browse_services", "enabled": true, "label": "Browse services"},
    {"key": "post_jobs", "enabled": true, "label": "Post jobs"},
    {"key": "book_services", "enabled": true, "label": "Book services"},
    {"key": "priority_support", "enabled": true, "label": "Priority support"},
    {"key": "analytics", "enabled": true, "label": "Advanced analytics"},
    {"key": "featured_badge", "enabled": true, "label": "Premium badge"},
    {"key": "custom_branding", "enabled": true, "label": "Custom branding"},
    {"key": "api_access", "enabled": true, "label": "API access"},
    {"key": "bulk_operations", "enabled": true, "label": "Bulk operations"}
  ]'::jsonb,
  '{
    "monthly_listings": 50,
    "monthly_jobs": 100,
    "photos_per_listing": 20,
    "featured_listings": 5
  }'::jsonb,
  3
),
(
  'Elite',
  'Elite Plan',
  'For established businesses',
  99.99,
  999.00,
  '[
    {"key": "basic_profile", "enabled": true, "label": "Basic profile"},
    {"key": "browse_services", "enabled": true, "label": "Browse services"},
    {"key": "post_jobs", "enabled": true, "label": "Unlimited jobs"},
    {"key": "book_services", "enabled": true, "label": "Book services"},
    {"key": "priority_support", "enabled": true, "label": "24/7 priority support"},
    {"key": "analytics", "enabled": true, "label": "Advanced analytics"},
    {"key": "featured_badge", "enabled": true, "label": "Elite badge"},
    {"key": "custom_branding", "enabled": true, "label": "Custom branding"},
    {"key": "api_access", "enabled": true, "label": "Full API access"},
    {"key": "bulk_operations", "enabled": true, "label": "Bulk operations"},
    {"key": "white_label", "enabled": true, "label": "White label options"},
    {"key": "dedicated_account_manager", "enabled": true, "label": "Dedicated account manager"}
  ]'::jsonb,
  '{
    "monthly_listings": -1,
    "monthly_jobs": -1,
    "photos_per_listing": 50,
    "featured_listings": -1
  }'::jsonb,
  4
)
ON CONFLICT (name) DO NOTHING;

-- Create default free subscriptions for existing users
INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
SELECT
  p.id,
  (SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1),
  'Active',
  now(),
  NULL
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us
  WHERE us.user_id = p.id
  AND us.status = 'Active'
)
ON CONFLICT (user_id, status) DO NOTHING;

-- Update profiles subscription_plan based on active subscription
UPDATE profiles p
SET subscription_plan = sp.name
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE p.id = us.user_id
  AND us.status = 'Active'
  AND (us.current_period_end IS NULL OR us.current_period_end > now());
