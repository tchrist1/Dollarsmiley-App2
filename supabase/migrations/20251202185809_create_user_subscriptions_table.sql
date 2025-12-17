/*
  # Create User Subscriptions System
  
  This migration creates the subscription_plans and user_subscriptions tables
  that are required for the subscription system to work properly.
  
  1. New Tables
    - subscription_plans - Available subscription tiers
    - user_subscriptions - User subscription records
  
  2. Security
    - Enable RLS on both tables
    - Add appropriate policies
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
  updated_at timestamptz DEFAULT now()
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

-- RLS Policies for subscription_plans (allow anyone to view active plans)
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- RLS Policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create subscriptions" ON user_subscriptions;
CREATE POLICY "System can create subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update subscriptions" ON user_subscriptions;
CREATE POLICY "System can update subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

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
);
