/*
  # Create Feature Toggle System

  1. New Tables
    - `feature_flags`
      - System-wide feature toggles
      - Enable/disable API-powered functions
      - Admin-controlled settings

    - `feature_flag_history`
      - Audit log of all changes
      - Who changed what and when

  2. Security
    - Enable RLS on all tables
    - Only admins can modify
    - All users can read active flags

  3. Features to Control
    - AI/ML services
    - Third-party integrations
    - Expensive operations
    - Beta features
*/

-- ============================================================================
-- FEATURE FLAGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature identification
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  feature_description text,
  category text NOT NULL, -- 'ai', 'payment', 'shipping', 'communication', 'analytics', 'integration'

  -- Toggle state
  is_enabled boolean DEFAULT false,

  -- Configuration
  config jsonb DEFAULT '{}', -- Feature-specific configuration

  -- Usage tracking
  usage_count bigint DEFAULT 0,
  last_used_at timestamptz,

  -- Cost tracking
  estimated_cost_per_use numeric(10, 4) DEFAULT 0,
  total_cost numeric(12, 2) DEFAULT 0,

  -- Limits
  daily_limit integer, -- Max uses per day (null = unlimited)
  daily_usage integer DEFAULT 0,
  rate_limit_per_hour integer, -- Max per hour

  -- Dependencies
  depends_on text[], -- Array of feature_keys this depends on
  conflicts_with text[], -- Array of features that can't be enabled together

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),

  -- Beta/Production status
  is_beta boolean DEFAULT true,
  min_subscription_tier text, -- 'free', 'professional', 'business', 'enterprise'

  CONSTRAINT valid_category CHECK (
    category IN ('ai', 'payment', 'shipping', 'communication', 'analytics', 'integration', 'social', 'other')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(feature_key);

-- ============================================================================
-- FEATURE FLAG HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  feature_flag_id uuid REFERENCES feature_flags(id) ON DELETE CASCADE,
  feature_key text NOT NULL,

  -- Change details
  action text NOT NULL, -- 'enabled', 'disabled', 'updated', 'created'
  previous_state jsonb,
  new_state jsonb,

  -- Reason for change
  reason text,
  notes text,

  -- Who made the change
  changed_by uuid REFERENCES auth.users(id),
  changed_by_email text,

  -- When
  changed_at timestamptz DEFAULT now(),

  CONSTRAINT valid_action CHECK (
    action IN ('enabled', 'disabled', 'updated', 'created', 'deleted')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_history_flag ON feature_flag_history(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_feature_history_date ON feature_flag_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_history_user ON feature_flag_history(changed_by);

-- ============================================================================
-- INSERT DEFAULT FEATURE FLAGS
-- ============================================================================

INSERT INTO feature_flags (feature_key, feature_name, feature_description, category, is_enabled, config, estimated_cost_per_use, min_subscription_tier, is_beta) VALUES

-- AI/ML Features
(
  'ai_recommendations',
  'AI-Powered Recommendations',
  'Machine learning recommendations for personalized service suggestions',
  'ai',
  true,
  '{"model": "collaborative-filtering", "confidence_threshold": 0.7}',
  0.0001,
  'free',
  false
),
(
  'ai_smart_scheduling',
  'Smart Scheduling AI',
  'AI-powered scheduling optimization and conflict detection',
  'ai',
  true,
  '{"optimization_level": "standard"}',
  0.0002,
  'professional',
  false
),
(
  'voice_search',
  'Voice Search',
  'Voice-powered search using speech recognition',
  'ai',
  true,
  '{"provider": "expo-speech", "languages": ["en-US"]}',
  0.0,
  'free',
  false
),
(
  'image_search',
  'Image Search',
  'Visual search to find similar services/products by photo',
  'ai',
  false,
  '{"provider": "vision-api", "similarity_threshold": 0.8}',
  0.005,
  'professional',
  true
),
(
  'smart_notifications',
  'Smart Notifications',
  'AI-driven notification optimization based on user behavior',
  'ai',
  true,
  '{"learning_period_days": 30}',
  0.0001,
  'free',
  false
),

-- Shipping Features
(
  'real_shipping_rates',
  'Real-Time Shipping Rates',
  'Live carrier rates from USPS, FedEx, UPS via ShipEngine',
  'shipping',
  true,
  '{"carriers": ["usps", "fedex", "ups"], "cache_duration_minutes": 30}',
  0.01,
  'free',
  false
),
(
  'shipping_label_generation',
  'Shipping Label Generation',
  'Create official carrier shipping labels',
  'shipping',
  true,
  '{"label_format": "pdf", "test_mode": false}',
  0.50,
  'free',
  false
),
(
  'shipment_tracking',
  'Real-Time Shipment Tracking',
  'Automatic tracking updates via carrier webhooks',
  'shipping',
  true,
  '{"update_frequency": "real-time"}',
  0.01,
  'free',
  false
),
(
  'address_validation',
  'Address Validation',
  'Validate shipping addresses before label creation',
  'shipping',
  true,
  '{"auto_correct": true}',
  0.02,
  'free',
  false
),

-- Payment Features
(
  'stripe_payments',
  'Stripe Payment Processing',
  'Credit card and ACH payment processing',
  'payment',
  true,
  '{"capture_method": "automatic"}',
  0.029,
  'free',
  false
),
(
  'stripe_connect',
  'Stripe Connect Payouts',
  'Provider payout processing via Stripe Connect',
  'payment',
  true,
  '{"payout_schedule": "weekly"}',
  0.0,
  'free',
  false
),
(
  'subscription_billing',
  'Subscription Billing',
  'Recurring subscription management',
  'payment',
  true,
  '{"trial_period_days": 14}',
  0.0,
  'free',
  false
),
(
  'payment_plans',
  'Flexible Payment Plans',
  'Installment payment options for large purchases',
  'payment',
  true,
  '{"min_amount": 100, "max_installments": 12}',
  0.0,
  'professional',
  false
),

-- Communication Features
(
  'email_notifications',
  'Email Notifications',
  'Transactional emails via SendGrid',
  'communication',
  true,
  '{"provider": "sendgrid", "batch_size": 100}',
  0.0001,
  'free',
  false
),
(
  'sms_notifications',
  'SMS Notifications',
  'Text message notifications via Twilio',
  'communication',
  false,
  '{"provider": "twilio", "region": "US"}',
  0.0079,
  'professional',
  true
),
(
  'whatsapp_notifications',
  'WhatsApp Notifications',
  'WhatsApp Business API notifications',
  'communication',
  false,
  '{"provider": "twilio-whatsapp"}',
  0.005,
  'business',
  true
),
(
  'push_notifications',
  'Push Notifications',
  'Mobile push notifications',
  'communication',
  true,
  '{"provider": "expo-notifications"}',
  0.0,
  'free',
  false
),

-- Analytics Features
(
  'advanced_analytics',
  'Advanced Analytics',
  'Detailed analytics dashboards with insights',
  'analytics',
  true,
  '{"retention_days": 90}',
  0.0,
  'professional',
  false
),
(
  'behavior_tracking',
  'User Behavior Tracking',
  'Track user interactions for recommendations',
  'analytics',
  true,
  '{"anonymize": false, "retention_days": 365}',
  0.0,
  'free',
  false
),
(
  'ab_testing',
  'A/B Testing',
  'Experiment framework for feature testing',
  'analytics',
  true,
  '{"max_variants": 4}',
  0.0,
  'business',
  false
),

-- Integration Features
(
  'quickbooks_sync',
  'QuickBooks Integration',
  'Sync transactions with QuickBooks',
  'integration',
  false,
  '{"sync_frequency": "daily"}',
  0.0,
  'business',
  true
),
(
  'xero_sync',
  'Xero Integration',
  'Sync transactions with Xero accounting',
  'integration',
  false,
  '{"sync_frequency": "daily"}',
  0.0,
  'business',
  true
),
(
  'calendar_sync',
  'Calendar Integration',
  'Sync bookings with Google/Apple Calendar',
  'integration',
  true,
  '{"providers": ["google", "apple"]}',
  0.0,
  'free',
  false
),

-- Social Features
(
  'social_feed',
  'Social Feed',
  'Community posts and following system',
  'social',
  true,
  '{"algorithm": "chronological"}',
  0.0,
  'free',
  false
),
(
  'gamification',
  'Gamification System',
  'Badges, levels, and achievements',
  'social',
  true,
  '{"xp_multiplier": 1.0}',
  0.0,
  'free',
  false
),

-- Other Features
(
  'fraud_detection',
  'Fraud Detection',
  'AI-powered fraud monitoring',
  'other',
  true,
  '{"threshold": 50, "auto_block": false}',
  0.001,
  'free',
  false
),
(
  'background_checks',
  'Background Checks',
  'Provider background verification via Checkr',
  'other',
  true,
  '{"provider": "checkr"}',
  25.00,
  'free',
  false
),
(
  'phone_verification',
  'Phone Verification',
  'SMS-based phone number verification',
  'other',
  true,
  '{"provider": "twilio", "code_length": 6}',
  0.0079,
  'free',
  false
)

ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(p_feature_key text)
RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT is_enabled INTO v_enabled
  FROM feature_flags
  WHERE feature_key = p_feature_key;

  RETURN COALESCE(v_enabled, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get feature config
CREATE OR REPLACE FUNCTION get_feature_config(p_feature_key text)
RETURNS jsonb AS $$
DECLARE
  v_config jsonb;
BEGIN
  SELECT config INTO v_config
  FROM feature_flags
  WHERE feature_key = p_feature_key
    AND is_enabled = true;

  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(p_feature_key text, p_cost numeric DEFAULT 0)
RETURNS void AS $$
BEGIN
  UPDATE feature_flags
  SET
    usage_count = usage_count + 1,
    daily_usage = daily_usage + 1,
    total_cost = total_cost + p_cost,
    last_used_at = now()
  WHERE feature_key = p_feature_key;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily usage (call from cron)
CREATE OR REPLACE FUNCTION reset_daily_feature_usage()
RETURNS void AS $$
BEGIN
  UPDATE feature_flags
  SET daily_usage = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle feature with audit log
CREATE OR REPLACE FUNCTION toggle_feature(
  p_feature_key text,
  p_enabled boolean,
  p_reason text DEFAULT NULL,
  p_changed_by uuid DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_previous_state jsonb;
  v_new_state jsonb;
  v_flag record;
BEGIN
  -- Get current state
  SELECT * INTO v_flag
  FROM feature_flags
  WHERE feature_key = p_feature_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature flag % not found', p_feature_key;
  END IF;

  -- Store previous state
  v_previous_state = to_jsonb(v_flag);

  -- Update flag
  UPDATE feature_flags
  SET
    is_enabled = p_enabled,
    updated_at = now(),
    updated_by = p_changed_by
  WHERE feature_key = p_feature_key;

  -- Get new state
  SELECT to_jsonb(feature_flags.*) INTO v_new_state
  FROM feature_flags
  WHERE feature_key = p_feature_key;

  -- Log change
  INSERT INTO feature_flag_history (
    feature_flag_id,
    feature_key,
    action,
    previous_state,
    new_state,
    reason,
    changed_by
  ) VALUES (
    v_flag.id,
    p_feature_key,
    CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END,
    v_previous_state,
    v_new_state,
    p_reason,
    p_changed_by
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_feature_rate_limit(p_feature_key text)
RETURNS boolean AS $$
DECLARE
  v_flag record;
  v_hourly_usage integer;
BEGIN
  -- Get feature config
  SELECT * INTO v_flag
  FROM feature_flags
  WHERE feature_key = p_feature_key;

  IF NOT FOUND OR NOT v_flag.is_enabled THEN
    RETURN false;
  END IF;

  -- Check daily limit
  IF v_flag.daily_limit IS NOT NULL AND v_flag.daily_usage >= v_flag.daily_limit THEN
    RETURN false;
  END IF;

  -- Check hourly rate limit
  IF v_flag.rate_limit_per_hour IS NOT NULL THEN
    SELECT COUNT(*) INTO v_hourly_usage
    FROM feature_flag_history
    WHERE feature_key = p_feature_key
      AND action = 'used'
      AND changed_at > now() - interval '1 hour';

    IF v_hourly_usage >= v_flag.rate_limit_per_hour THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_history ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (to check if enabled)
CREATE POLICY "Public read access to feature flags"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify feature flags
CREATE POLICY "Admins can update feature flags"
  ON feature_flags
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Everyone can read history
CREATE POLICY "Public read access to feature history"
  ON feature_flag_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert history
CREATE POLICY "Admins can insert feature history"
  ON feature_flag_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON feature_flags TO authenticated;
GRANT UPDATE ON feature_flags TO authenticated;
GRANT SELECT ON feature_flag_history TO authenticated;
GRANT INSERT ON feature_flag_history TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION is_feature_enabled(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_config(text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_feature_usage(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_feature(text, boolean, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_feature_rate_limit(text) TO authenticated;
