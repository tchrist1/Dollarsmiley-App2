/*
  # Boost & Sponsored Ads System

  1. New Tables
    - `listing_boosts` - Listing boost campaigns
    - `ad_campaigns` - Advertising campaigns
    - `ad_placements` - Ad placement slots
    - `ad_impressions` - Impression tracking
    - `ad_clicks` - Click tracking
    - `ad_budgets` - Budget management
    - `ad_performance` - Performance metrics
    - `ad_bids` - Bidding system

  2. Features
    - Boost listings
    - Sponsored ads
    - Budget management
    - Performance tracking
    - ROI analytics
    - Bidding system

  3. Security
    - Provider-only access
    - Budget limits
    - Click fraud prevention
*/

-- Listing Boosts (promote individual listings)
CREATE TABLE IF NOT EXISTS listing_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Listing reference
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Boost type
  boost_type text NOT NULL,
  -- Types: featured, top_search, discover_feed, category_top, homepage

  -- Budget
  daily_budget numeric(10, 2) NOT NULL,
  total_budget numeric(10, 2) NOT NULL,
  spent_amount numeric(10, 2) DEFAULT 0,

  -- Bidding (CPC - Cost Per Click)
  bid_amount numeric(10, 4) NOT NULL, -- Cost per click
  max_cpc numeric(10, 4),

  -- Status
  status text DEFAULT 'pending',
  -- Statuses: pending, active, paused, completed, budget_exhausted, rejected

  -- Schedule
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,

  -- Performance
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue_generated numeric(10, 2) DEFAULT 0,

  -- Calculated metrics
  ctr numeric(6, 4), -- Click-through rate
  conversion_rate numeric(6, 4),
  roi numeric(8, 2), -- Return on investment percentage

  -- Quality score (affects placement)
  quality_score numeric(4, 2) DEFAULT 50.0, -- 0-100

  -- Targeting
  target_categories text[],
  target_locations jsonb,
  target_demographics jsonb,

  -- Approval
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  rejection_reason text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Campaigns (broader advertising campaigns)
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign owner
  advertiser_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Campaign details
  campaign_name text NOT NULL,
  campaign_objective text NOT NULL,
  -- Objectives: awareness, traffic, conversions, engagement

  -- Budget
  budget_type text DEFAULT 'daily', -- daily, lifetime
  daily_budget numeric(10, 2),
  lifetime_budget numeric(10, 2),
  spent_amount numeric(10, 2) DEFAULT 0,

  -- Bidding strategy
  bidding_strategy text DEFAULT 'auto',
  -- Strategies: auto, manual_cpc, target_cpa, target_roas
  target_cpa numeric(10, 2), -- Target cost per acquisition
  target_roas numeric(6, 2), -- Target return on ad spend

  -- Status
  status text DEFAULT 'draft',
  -- Statuses: draft, pending_review, active, paused, completed, rejected

  -- Schedule
  start_date timestamptz,
  end_date timestamptz,
  schedule_type text DEFAULT 'continuous', -- continuous, scheduled

  -- Performance
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions bigint DEFAULT 0,
  revenue_generated numeric(10, 2) DEFAULT 0,

  -- Metrics
  ctr numeric(6, 4),
  conversion_rate numeric(6, 4),
  cpc numeric(10, 4), -- Average cost per click
  cpa numeric(10, 2), -- Average cost per acquisition
  roas numeric(8, 2), -- Return on ad spend

  -- Approval
  approved_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  rejection_reason text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Placements (where ads can appear)
CREATE TABLE IF NOT EXISTS ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Placement details
  placement_key text UNIQUE NOT NULL,
  placement_name text NOT NULL,
  placement_type text NOT NULL,
  -- Types: banner, card, sidebar, inline, interstitial, native

  -- Location
  page_location text NOT NULL, -- homepage, search, listing_detail, profile, feed
  position text, -- top, middle, bottom, sidebar

  -- Size constraints
  width_px integer,
  height_px integer,
  aspect_ratio text,

  -- Pricing
  base_cpm numeric(10, 4), -- Cost per 1000 impressions
  base_cpc numeric(10, 4), -- Cost per click

  -- Status
  is_active boolean DEFAULT true,
  max_ads_per_session integer DEFAULT 3,

  -- Performance
  total_impressions bigint DEFAULT 0,
  total_clicks bigint DEFAULT 0,
  average_ctr numeric(6, 4),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Impressions (impression tracking)
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ad reference
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  boost_id uuid REFERENCES listing_boosts(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES ad_placements(id) ON DELETE SET NULL NOT NULL,

  -- User
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,

  -- Item
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Impression details
  was_viewable boolean DEFAULT true,
  viewability_percentage integer, -- 0-100
  time_visible_ms integer,

  -- Context
  page_url text,
  referrer_url text,

  -- Device/Location
  device_type text,
  browser text,
  os text,
  ip_address inet,
  location_data jsonb,

  -- Cost
  cost_usd numeric(10, 6),

  -- Interaction
  was_clicked boolean DEFAULT false,
  click_timestamp timestamptz,

  impressed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Ad Clicks (click tracking with fraud detection)
CREATE TABLE IF NOT EXISTS ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ad reference
  impression_id uuid REFERENCES ad_impressions(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  boost_id uuid REFERENCES listing_boosts(id) ON DELETE CASCADE,

  -- User
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,

  -- Item
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Click details
  click_position_x integer,
  click_position_y integer,
  time_to_click_ms integer, -- Time from impression to click

  -- Fraud detection
  is_suspicious boolean DEFAULT false,
  fraud_score numeric(4, 2), -- 0-100
  fraud_reasons text[],

  -- Device
  device_type text,
  browser text,
  os text,
  ip_address inet,

  -- Cost
  cost_usd numeric(10, 6),

  -- Conversion tracking
  converted boolean DEFAULT false,
  conversion_value numeric(10, 2),
  conversion_timestamp timestamptz,

  clicked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Ad Budgets (budget management and pacing)
CREATE TABLE IF NOT EXISTS ad_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Budget owner
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  boost_id uuid REFERENCES listing_boosts(id) ON DELETE CASCADE,

  -- Budget details
  budget_type text NOT NULL, -- daily, weekly, monthly, lifetime
  budget_amount numeric(10, 2) NOT NULL,
  spent_amount numeric(10, 2) DEFAULT 0,
  remaining_amount numeric(10, 2),

  -- Period
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,

  -- Pacing
  pacing_strategy text DEFAULT 'even', -- even, accelerated, asap
  target_daily_spend numeric(10, 2),
  actual_daily_spend numeric(10, 2),

  -- Status
  status text DEFAULT 'active',
  -- Statuses: active, exhausted, paused, expired

  -- Alerts
  alert_at_percentage integer DEFAULT 80, -- Alert at 80% spent
  alert_sent boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ad Performance (aggregated metrics)
CREATE TABLE IF NOT EXISTS ad_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  boost_id uuid REFERENCES listing_boosts(id) ON DELETE CASCADE,

  -- Time period
  date date NOT NULL,
  hour integer, -- For hourly breakdown

  -- Metrics
  impressions bigint DEFAULT 0,
  viewable_impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions bigint DEFAULT 0,

  -- Financial
  spend numeric(10, 2) DEFAULT 0,
  revenue numeric(10, 2) DEFAULT 0,

  -- Calculated
  ctr numeric(6, 4),
  conversion_rate numeric(6, 4),
  cpc numeric(10, 4),
  cpm numeric(10, 4),
  roas numeric(8, 2),

  -- Demographics
  top_locations jsonb,
  top_devices jsonb,
  top_browsers jsonb,

  created_at timestamptz DEFAULT now(),

  UNIQUE(campaign_id, date, hour),
  UNIQUE(boost_id, date, hour)
);

-- Ad Bids (auction-based bidding)
CREATE TABLE IF NOT EXISTS ad_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auction details
  auction_id text NOT NULL,
  placement_id uuid REFERENCES ad_placements(id) ON DELETE CASCADE NOT NULL,

  -- Bidder
  campaign_id uuid REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  boost_id uuid REFERENCES listing_boosts(id) ON DELETE CASCADE,

  -- Bid
  bid_amount numeric(10, 4) NOT NULL,
  quality_score numeric(4, 2), -- Affects final rank
  final_rank numeric(8, 4), -- bid_amount * quality_score

  -- Result
  won boolean DEFAULT false,
  actual_cpc numeric(10, 4), -- Second-price auction

  -- Context
  target_context jsonb,

  bid_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_listing_boosts_provider ON listing_boosts(provider_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_listing ON listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_status ON listing_boosts(status);
CREATE INDEX IF NOT EXISTS idx_listing_boosts_active ON listing_boosts(status, start_date, end_date) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser ON ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active ON ad_campaigns(status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_ad_placements_key ON ad_placements(placement_key);
CREATE INDEX IF NOT EXISTS idx_ad_placements_active ON ad_placements(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign ON ad_impressions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_boost ON ad_impressions(boost_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_placement ON ad_impressions(placement_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_session ON ad_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_impressed ON ad_impressions(impressed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ad_clicks_impression ON ad_clicks(impression_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_campaign ON ad_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_boost ON ad_clicks(boost_id);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_clicked ON ad_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_clicks_converted ON ad_clicks(converted) WHERE converted = true;

CREATE INDEX IF NOT EXISTS idx_ad_budgets_campaign ON ad_budgets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_budgets_boost ON ad_budgets(boost_id);
CREATE INDEX IF NOT EXISTS idx_ad_budgets_status ON ad_budgets(status);
CREATE INDEX IF NOT EXISTS idx_ad_budgets_period ON ad_budgets(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_ad_performance_campaign ON ad_performance(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_performance_boost ON ad_performance(boost_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_ad_bids_auction ON ad_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_ad_bids_placement ON ad_bids(placement_id);
CREATE INDEX IF NOT EXISTS idx_ad_bids_won ON ad_bids(won) WHERE won = true;

-- Enable RLS
ALTER TABLE listing_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Providers can view own boosts"
  ON listing_boosts FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can create boosts"
  ON listing_boosts FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own boosts"
  ON listing_boosts FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Advertisers can view own campaigns"
  ON ad_campaigns FOR SELECT
  TO authenticated
  USING (advertiser_id = auth.uid());

CREATE POLICY "Advertisers can manage own campaigns"
  ON ad_campaigns FOR ALL
  TO authenticated
  USING (advertiser_id = auth.uid())
  WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Anyone can view active placements"
  ON ad_placements FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Advertisers can view own performance"
  ON ad_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ad_campaigns
      WHERE ad_campaigns.id = ad_performance.campaign_id
      AND ad_campaigns.advertiser_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM listing_boosts
      JOIN service_listings ON service_listings.id = listing_boosts.listing_id
      WHERE listing_boosts.id = ad_performance.boost_id
      AND service_listings.provider_id = auth.uid()
    )
  );

-- Function: Create listing boost
CREATE OR REPLACE FUNCTION create_listing_boost(
  listing_id_param uuid,
  boost_type_param text,
  daily_budget_param numeric,
  total_budget_param numeric,
  bid_amount_param numeric,
  start_date_param timestamptz,
  end_date_param timestamptz
)
RETURNS uuid AS $$
DECLARE
  boost_id uuid;
  provider_id_found uuid;
BEGIN
  -- Get provider ID from listing
  SELECT provider_id INTO provider_id_found
  FROM service_listings
  WHERE id = listing_id_param;

  IF provider_id_found IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF provider_id_found != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to boost this listing';
  END IF;

  -- Create boost
  INSERT INTO listing_boosts (
    listing_id,
    provider_id,
    boost_type,
    daily_budget,
    total_budget,
    bid_amount,
    start_date,
    end_date,
    status,
    quality_score
  ) VALUES (
    listing_id_param,
    provider_id_found,
    boost_type_param,
    daily_budget_param,
    total_budget_param,
    bid_amount_param,
    start_date_param,
    end_date_param,
    'pending',
    50.0
  )
  RETURNING id INTO boost_id;

  -- Create initial budget
  INSERT INTO ad_budgets (
    boost_id,
    budget_type,
    budget_amount,
    remaining_amount,
    period_start,
    period_end,
    status
  ) VALUES (
    boost_id,
    'daily',
    daily_budget_param,
    daily_budget_param,
    start_date_param,
    start_date_param + interval '1 day',
    'active'
  );

  RETURN boost_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track ad impression
CREATE OR REPLACE FUNCTION track_ad_impression(
  campaign_id_param uuid DEFAULT NULL,
  boost_id_param uuid DEFAULT NULL,
  placement_id_param uuid DEFAULT NULL,
  item_type_param text DEFAULT NULL,
  item_id_param uuid DEFAULT NULL,
  session_id_param text DEFAULT NULL,
  cost_usd_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  impression_id uuid;
BEGIN
  INSERT INTO ad_impressions (
    campaign_id,
    boost_id,
    placement_id,
    item_type,
    item_id,
    session_id,
    cost_usd,
    impressed_at
  ) VALUES (
    campaign_id_param,
    boost_id_param,
    placement_id_param,
    item_type_param,
    item_id_param,
    session_id_param,
    cost_usd_param,
    now()
  )
  RETURNING id INTO impression_id;

  -- Update counters
  IF campaign_id_param IS NOT NULL THEN
    UPDATE ad_campaigns
    SET impressions = impressions + 1
    WHERE id = campaign_id_param;
  END IF;

  IF boost_id_param IS NOT NULL THEN
    UPDATE listing_boosts
    SET impressions = impressions + 1
    WHERE id = boost_id_param;
  END IF;

  RETURN impression_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track ad click
CREATE OR REPLACE FUNCTION track_ad_click(
  impression_id_param uuid,
  cost_usd_param numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  click_id uuid;
  impression_record record;
BEGIN
  -- Get impression details
  SELECT * INTO impression_record
  FROM ad_impressions
  WHERE id = impression_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Impression not found';
  END IF;

  -- Create click record
  INSERT INTO ad_clicks (
    impression_id,
    campaign_id,
    boost_id,
    user_id,
    session_id,
    item_type,
    item_id,
    cost_usd,
    clicked_at
  ) VALUES (
    impression_id_param,
    impression_record.campaign_id,
    impression_record.boost_id,
    impression_record.user_id,
    impression_record.session_id,
    impression_record.item_type,
    impression_record.item_id,
    cost_usd_param,
    now()
  )
  RETURNING id INTO click_id;

  -- Update impression
  UPDATE ad_impressions
  SET
    was_clicked = true,
    click_timestamp = now()
  WHERE id = impression_id_param;

  -- Update counters
  IF impression_record.campaign_id IS NOT NULL THEN
    UPDATE ad_campaigns
    SET
      clicks = clicks + 1,
      spent_amount = spent_amount + COALESCE(cost_usd_param, 0),
      ctr = (clicks + 1)::numeric / GREATEST(impressions, 1)
    WHERE id = impression_record.campaign_id;

    UPDATE ad_budgets
    SET
      spent_amount = spent_amount + COALESCE(cost_usd_param, 0),
      remaining_amount = budget_amount - spent_amount - COALESCE(cost_usd_param, 0)
    WHERE campaign_id = impression_record.campaign_id
    AND status = 'active';
  END IF;

  IF impression_record.boost_id IS NOT NULL THEN
    UPDATE listing_boosts
    SET
      clicks = clicks + 1,
      spent_amount = spent_amount + COALESCE(cost_usd_param, 0),
      ctr = (clicks + 1)::numeric / GREATEST(impressions, 1)
    WHERE id = impression_record.boost_id;

    UPDATE ad_budgets
    SET
      spent_amount = spent_amount + COALESCE(cost_usd_param, 0),
      remaining_amount = budget_amount - spent_amount - COALESCE(cost_usd_param, 0)
    WHERE boost_id = impression_record.boost_id
    AND status = 'active';
  END IF;

  RETURN click_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record conversion
CREATE OR REPLACE FUNCTION record_ad_conversion(
  click_id_param uuid,
  conversion_value_param numeric
)
RETURNS void AS $$
DECLARE
  click_record record;
BEGIN
  SELECT * INTO click_record
  FROM ad_clicks
  WHERE id = click_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Click not found';
  END IF;

  -- Update click record
  UPDATE ad_clicks
  SET
    converted = true,
    conversion_value = conversion_value_param,
    conversion_timestamp = now()
  WHERE id = click_id_param;

  -- Update campaign
  IF click_record.campaign_id IS NOT NULL THEN
    UPDATE ad_campaigns
    SET
      conversions = conversions + 1,
      revenue_generated = revenue_generated + conversion_value_param,
      conversion_rate = (conversions + 1)::numeric / GREATEST(clicks, 1),
      roas = (revenue_generated + conversion_value_param) / GREATEST(spent_amount, 0.01) * 100
    WHERE id = click_record.campaign_id;
  END IF;

  -- Update boost
  IF click_record.boost_id IS NOT NULL THEN
    UPDATE listing_boosts
    SET
      conversions = conversions + 1,
      revenue_generated = revenue_generated + conversion_value_param,
      conversion_rate = (conversions + 1)::numeric / GREATEST(clicks, 1),
      roi = ((revenue_generated + conversion_value_param) - spent_amount) / GREATEST(spent_amount, 0.01) * 100
    WHERE id = click_record.boost_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_listing_boost TO authenticated;
GRANT EXECUTE ON FUNCTION track_ad_impression TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_ad_click TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_ad_conversion TO authenticated;

-- Seed ad placements
INSERT INTO ad_placements (placement_key, placement_name, placement_type, page_location, position, base_cpm, base_cpc) VALUES
  ('homepage_hero', 'Homepage Hero Banner', 'banner', 'homepage', 'top', 5.00, 0.50),
  ('search_top', 'Search Results Top', 'card', 'search', 'top', 8.00, 0.75),
  ('feed_inline', 'Discover Feed Inline', 'native', 'feed', 'inline', 4.00, 0.40),
  ('sidebar_featured', 'Sidebar Featured', 'sidebar', 'listing_detail', 'sidebar', 3.00, 0.35),
  ('category_top', 'Category Page Top', 'banner', 'category', 'top', 6.00, 0.60)
ON CONFLICT (placement_key) DO NOTHING;
