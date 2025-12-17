/*
  # Create Promotional Campaigns System

  1. New Tables
    - `promotional_campaigns`
      - Campaign details and configuration
      - Discount settings and rules
      - Target audience and restrictions
      - Usage tracking and limits

    - `discount_codes`
      - Individual promo codes
      - Usage tracking per code
      - Active/inactive status

    - `campaign_usage`
      - Track code applications
      - Link to bookings
      - Discount amounts applied

  2. Security
    - Enable RLS on all tables
    - Users can view active campaigns
    - Only campaign creators can manage
    - Track usage per user

  3. Functions
    - Validate discount codes
    - Apply discounts automatically
    - Track usage and limits
    - Calculate campaign ROI
    - Auto-activate/deactivate campaigns
*/

-- Create promotional_campaigns table
CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  campaign_type text NOT NULL CHECK (campaign_type IN (
    'general',
    'referral',
    'seasonal',
    'first_time',
    'loyalty'
  )),
  discount_type text NOT NULL CHECK (discount_type IN (
    'percentage',
    'fixed_amount',
    'free_service'
  )),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_value numeric,
  max_discount_amount numeric,
  usage_limit_per_user integer,
  total_usage_limit integer,
  current_usage integer DEFAULT 0 NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'draft' NOT NULL CHECK (status IN (
    'draft',
    'scheduled',
    'active',
    'paused',
    'ended'
  )),
  target_audience jsonb DEFAULT '{}',
  applicable_categories uuid[] DEFAULT '{}',
  applicable_services uuid[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CHECK (end_date > start_date),
  CHECK (
    discount_type != 'percentage' OR
    (discount_value > 0 AND discount_value <= 100)
  )
);

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES promotional_campaigns(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  usage_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(code)
);

-- Create campaign_usage table
CREATE TABLE IF NOT EXISTS campaign_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES promotional_campaigns(id) ON DELETE CASCADE NOT NULL,
  code_id uuid REFERENCES discount_codes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promotional_campaigns

-- Anyone can view active campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON promotional_campaigns
  FOR SELECT
  TO authenticated
  USING (status = 'active' AND start_date <= now() AND end_date >= now());

-- Campaign creators can view their campaigns
CREATE POLICY "Users can view own campaigns"
  ON promotional_campaigns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Campaign creators can create campaigns
CREATE POLICY "Users can create campaigns"
  ON promotional_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Campaign creators can update their campaigns
CREATE POLICY "Users can update own campaigns"
  ON promotional_campaigns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Campaign creators can delete their campaigns
CREATE POLICY "Users can delete own campaigns"
  ON promotional_campaigns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for discount_codes

-- Users can view codes for active campaigns
CREATE POLICY "Users can view active campaign codes"
  ON discount_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_campaigns
      WHERE promotional_campaigns.id = discount_codes.campaign_id
        AND (
          promotional_campaigns.status = 'active'
          OR promotional_campaigns.created_by = auth.uid()
        )
    )
  );

-- Campaign creators can create codes
CREATE POLICY "Campaign creators can create codes"
  ON discount_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotional_campaigns
      WHERE promotional_campaigns.id = campaign_id
        AND promotional_campaigns.created_by = auth.uid()
    )
  );

-- Campaign creators can update codes
CREATE POLICY "Campaign creators can update codes"
  ON discount_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_campaigns
      WHERE promotional_campaigns.id = discount_codes.campaign_id
        AND promotional_campaigns.created_by = auth.uid()
    )
  );

-- RLS Policies for campaign_usage

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON campaign_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Campaign creators can view usage
CREATE POLICY "Campaign creators can view usage"
  ON campaign_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotional_campaigns
      WHERE promotional_campaigns.id = campaign_usage.campaign_id
        AND promotional_campaigns.created_by = auth.uid()
    )
  );

-- System can insert usage records
CREATE POLICY "System can insert usage"
  ON campaign_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_status
  ON promotional_campaigns(status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_created_by
  ON promotional_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_dates
  ON promotional_campaigns(start_date, end_date)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_discount_codes_campaign
  ON discount_codes(campaign_id);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code
  ON discount_codes(code) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_campaign_usage_campaign
  ON campaign_usage(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_usage_user
  ON campaign_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_usage_booking
  ON campaign_usage(booking_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_promotional_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_promotional_campaigns_updated_at_trigger
  ON promotional_campaigns;
CREATE TRIGGER update_promotional_campaigns_updated_at_trigger
  BEFORE UPDATE ON promotional_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_promotional_campaigns_updated_at();

-- Create function to increment campaign usage
CREATE OR REPLACE FUNCTION increment_campaign_usage(p_campaign_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE promotional_campaigns
  SET current_usage = current_usage + 1
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment code usage
CREATE OR REPLACE FUNCTION increment_code_usage(p_code_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE discount_codes
  SET usage_count = usage_count + 1
  WHERE id = p_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-activate scheduled campaigns
CREATE OR REPLACE FUNCTION activate_scheduled_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE promotional_campaigns
  SET status = 'active'
  WHERE status = 'scheduled'
    AND start_date <= now()
    AND end_date > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-end expired campaigns
CREATE OR REPLACE FUNCTION end_expired_campaigns()
RETURNS void AS $$
BEGIN
  UPDATE promotional_campaigns
  SET status = 'ended'
  WHERE status IN ('active', 'paused', 'scheduled')
    AND end_date <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can use campaign
CREATE OR REPLACE FUNCTION can_use_campaign(
  p_campaign_id uuid,
  p_user_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_campaign promotional_campaigns%ROWTYPE;
  v_user_usage_count integer;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign
  FROM promotional_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if campaign is active
  IF v_campaign.status != 'active' THEN
    RETURN false;
  END IF;

  -- Check dates
  IF now() < v_campaign.start_date OR now() > v_campaign.end_date THEN
    RETURN false;
  END IF;

  -- Check total usage limit
  IF v_campaign.total_usage_limit IS NOT NULL THEN
    IF v_campaign.current_usage >= v_campaign.total_usage_limit THEN
      RETURN false;
    END IF;
  END IF;

  -- Check per-user usage limit
  IF v_campaign.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM campaign_usage
    WHERE campaign_id = p_campaign_id
      AND user_id = p_user_id;

    IF v_user_usage_count >= v_campaign.usage_limit_per_user THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate discount
CREATE OR REPLACE FUNCTION calculate_discount(
  p_campaign_id uuid,
  p_order_amount numeric
)
RETURNS numeric AS $$
DECLARE
  v_campaign promotional_campaigns%ROWTYPE;
  v_discount numeric;
BEGIN
  SELECT * INTO v_campaign
  FROM promotional_campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Check minimum order value
  IF v_campaign.min_order_value IS NOT NULL THEN
    IF p_order_amount < v_campaign.min_order_value THEN
      RETURN 0;
    END IF;
  END IF;

  -- Calculate discount based on type
  IF v_campaign.discount_type = 'percentage' THEN
    v_discount := (p_order_amount * v_campaign.discount_value) / 100;
  ELSIF v_campaign.discount_type = 'fixed_amount' THEN
    v_discount := v_campaign.discount_value;
  ELSE
    -- free_service
    v_discount := p_order_amount;
  END IF;

  -- Apply max discount cap
  IF v_campaign.max_discount_amount IS NOT NULL THEN
    v_discount := LEAST(v_discount, v_campaign.max_discount_amount);
  END IF;

  -- Don't exceed order amount
  v_discount := LEAST(v_discount, p_order_amount);

  RETURN v_discount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for campaign analytics
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT
  pc.id AS campaign_id,
  pc.name,
  pc.campaign_type,
  pc.status,
  pc.discount_type,
  pc.discount_value,
  pc.start_date,
  pc.end_date,
  pc.current_usage,
  pc.total_usage_limit,
  -- Usage statistics
  COUNT(DISTINCT cu.user_id) AS unique_users,
  COUNT(cu.id) AS total_uses,
  COALESCE(SUM(cu.discount_amount), 0) AS total_discount_given,
  COALESCE(SUM(b.total_price), 0) AS revenue_generated,
  COALESCE(AVG(b.total_price), 0) AS average_order_value,
  -- ROI calculation
  CASE
    WHEN SUM(cu.discount_amount) > 0 THEN
      ((SUM(b.total_price) - SUM(cu.discount_amount)) / SUM(cu.discount_amount)) * 100
    ELSE 0
  END AS roi_percentage,
  -- Code count
  (SELECT COUNT(*) FROM discount_codes WHERE campaign_id = pc.id) AS code_count,
  (SELECT COUNT(*) FROM discount_codes WHERE campaign_id = pc.id AND is_active = true) AS active_code_count
FROM promotional_campaigns pc
LEFT JOIN campaign_usage cu ON cu.campaign_id = pc.id
LEFT JOIN bookings b ON b.id = cu.booking_id
GROUP BY pc.id;

-- Grant access to view
GRANT SELECT ON campaign_analytics TO authenticated;

-- Create function to get top performing codes
CREATE OR REPLACE FUNCTION get_top_performing_codes(
  p_campaign_id uuid,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  code text,
  uses integer,
  revenue numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.code,
    COUNT(cu.id)::integer AS uses,
    COALESCE(SUM(b.total_price), 0) AS revenue
  FROM discount_codes dc
  LEFT JOIN campaign_usage cu ON cu.code_id = dc.id
  LEFT JOIN bookings b ON b.id = cu.booking_id
  WHERE dc.campaign_id = p_campaign_id
  GROUP BY dc.code
  ORDER BY revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get daily campaign usage
CREATE OR REPLACE FUNCTION get_daily_campaign_usage(
  p_campaign_id uuid,
  p_days integer DEFAULT 30
)
RETURNS TABLE (
  date date,
  uses bigint,
  revenue numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(cu.created_at) AS date,
    COUNT(cu.id) AS uses,
    COALESCE(SUM(b.total_price), 0) AS revenue
  FROM campaign_usage cu
  LEFT JOIN bookings b ON b.id = cu.booking_id
  WHERE cu.campaign_id = p_campaign_id
    AND cu.created_at >= now() - (p_days || ' days')::interval
  GROUP BY DATE(cu.created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to check usage limits before insertion
CREATE OR REPLACE FUNCTION check_campaign_usage_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign promotional_campaigns%ROWTYPE;
  v_user_usage_count integer;
BEGIN
  SELECT * INTO v_campaign
  FROM promotional_campaigns
  WHERE id = NEW.campaign_id;

  -- Check total usage limit
  IF v_campaign.total_usage_limit IS NOT NULL THEN
    IF v_campaign.current_usage >= v_campaign.total_usage_limit THEN
      RAISE EXCEPTION 'Campaign has reached its total usage limit';
    END IF;
  END IF;

  -- Check per-user usage limit
  IF v_campaign.usage_limit_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_usage_count
    FROM campaign_usage
    WHERE campaign_id = NEW.campaign_id
      AND user_id = NEW.user_id;

    IF v_user_usage_count >= v_campaign.usage_limit_per_user THEN
      RAISE EXCEPTION 'User has reached the usage limit for this campaign';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_campaign_usage_limits_trigger ON campaign_usage;
CREATE TRIGGER check_campaign_usage_limits_trigger
  BEFORE INSERT ON campaign_usage
  FOR EACH ROW
  EXECUTE FUNCTION check_campaign_usage_limits();
