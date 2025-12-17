/*
  # Create Subscription Plans Table with Seed Data

  Creates subscription_plans table and populates with default plans
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
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

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order)
VALUES
  (
    'Free',
    'Free',
    'Perfect for getting started',
    0.00,
    0.00,
    '[
      {"key": "basic_search", "enabled": true, "label": "Basic search"},
      {"key": "create_listings", "enabled": true, "label": "Create listings"},
      {"key": "messages", "enabled": true, "label": "Basic messaging"}
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
    'Pro',
    'Best for active users',
    29.99,
    299.90,
    '[
      {"key": "basic_search", "enabled": true, "label": "Advanced search"},
      {"key": "unlimited_listings", "enabled": true, "label": "Unlimited listings"},
      {"key": "priority_support", "enabled": true, "label": "Priority support"},
      {"key": "analytics", "enabled": true, "label": "Basic analytics"}
    ]'::jsonb,
    '{
      "monthly_listings": 50,
      "monthly_jobs": 100,
      "photos_per_listing": 10,
      "featured_listings": 2
    }'::jsonb,
    2
  ),
  (
    'Premium',
    'Premium',
    'For serious professionals',
    79.99,
    799.90,
    '[
      {"key": "everything_pro", "enabled": true, "label": "Everything in Pro"},
      {"key": "featured_placement", "enabled": true, "label": "Featured placement"},
      {"key": "advanced_analytics", "enabled": true, "label": "Advanced analytics"},
      {"key": "video_consultations", "enabled": true, "label": "Video consultations"},
      {"key": "custom_branding", "enabled": true, "label": "Custom branding"}
    ]'::jsonb,
    '{
      "monthly_listings": -1,
      "monthly_jobs": -1,
      "photos_per_listing": 25,
      "featured_listings": 10
    }'::jsonb,
    3
  ),
  (
    'Elite',
    'Elite',
    'Ultimate platform experience',
    199.99,
    1999.90,
    '[
      {"key": "everything_premium", "enabled": true, "label": "Everything in Premium"},
      {"key": "dedicated_account_manager", "enabled": true, "label": "Dedicated account manager"},
      {"key": "api_access", "enabled": true, "label": "API access"},
      {"key": "white_label", "enabled": true, "label": "White label options"},
      {"key": "custom_integrations", "enabled": true, "label": "Custom integrations"}
    ]'::jsonb,
    '{
      "monthly_listings": -1,
      "monthly_jobs": -1,
      "photos_per_listing": -1,
      "featured_listings": -1
    }'::jsonb,
    4
  )
ON CONFLICT (name) DO NOTHING;
