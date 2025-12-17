/*
  # Temu-Style Discover Feed System

  1. New Tables
    - `feed_items` - Feed content items
    - `feed_sections` - Feed section configuration
    - `feed_engagement` - User engagement tracking
    - `feed_personalization` - User preferences
    - `trending_items` - Trending content
    - `flash_deals` - Limited-time offers
    - `recently_viewed` - View history
    - `feed_impressions` - Impression tracking
    - `social_proof_metrics` - Purchase/view counts

  2. Features
    - Infinite scroll feed
    - Personalized recommendations
    - Category-based sections
    - Flash deals
    - Trending items
    - Recently viewed
    - Social proof
    - Engagement tracking

  3. Security
    - Enable RLS on all tables
    - Public read for feed items
    - User-specific personalization
*/

-- Feed Sections (configurable feed layout)
CREATE TABLE IF NOT EXISTS feed_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Section details
  section_key text UNIQUE NOT NULL,
  section_name text NOT NULL,
  section_type text NOT NULL,
  -- Types: featured, trending, flash_deals, categories, recommended, recently_viewed, new_arrivals

  -- Display
  display_order integer NOT NULL,
  icon text,
  subtitle text,

  -- Configuration
  items_per_section integer DEFAULT 10,
  refresh_interval_minutes integer DEFAULT 60,
  algorithm_type text DEFAULT 'manual',
  -- Types: manual, trending, personalized, category, time_based

  -- Visibility
  is_active boolean DEFAULT true,
  requires_login boolean DEFAULT false,

  -- A/B Testing
  ab_test_group text,
  ab_test_percentage integer,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Feed Items (content to display in feed)
CREATE TABLE IF NOT EXISTS feed_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item reference
  item_type text NOT NULL, -- service_listing, job, post, promotion
  item_id uuid NOT NULL,

  -- Section assignment
  feed_section_id uuid REFERENCES feed_sections(id) ON DELETE CASCADE,
  display_order integer,

  -- Visibility
  is_active boolean DEFAULT true,
  start_date timestamptz,
  end_date timestamptz,

  -- Personalization
  target_user_types text[], -- all, new_users, active_users, providers
  target_categories text[],
  target_locations jsonb,

  -- Boosted/Promoted
  is_promoted boolean DEFAULT false,
  promotion_budget_remaining numeric(10, 2),

  -- Engagement stats (denormalized for performance)
  view_count bigint DEFAULT 0,
  click_count bigint DEFAULT 0,
  save_count bigint DEFAULT 0,
  share_count bigint DEFAULT 0,
  conversion_count bigint DEFAULT 0,

  -- Ranking
  relevance_score numeric(4, 2) DEFAULT 50.0, -- 0-100
  quality_score numeric(4, 2) DEFAULT 50.0,
  engagement_score numeric(4, 2) DEFAULT 50.0,
  final_score numeric(6, 2), -- Calculated composite score

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(feed_section_id, item_id)
);

-- Feed Engagement (user interaction tracking)
CREATE TABLE IF NOT EXISTS feed_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text,

  -- Item engaged with
  feed_item_id uuid REFERENCES feed_items(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Engagement type
  engagement_type text NOT NULL,
  -- Types: view, click, save, share, purchase, skip, hide

  -- Context
  feed_section_id uuid REFERENCES feed_sections(id) ON DELETE SET NULL,
  position_in_feed integer,
  scroll_depth_percentage integer,

  -- Timing
  engagement_duration_ms integer,

  -- Device
  platform text, -- web, ios, android
  device_type text,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  engaged_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Feed Personalization (user preferences)
CREATE TABLE IF NOT EXISTS feed_personalization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Preferred categories
  preferred_categories text[],
  disliked_categories text[],

  -- Location preferences
  preferred_locations jsonb,
  search_radius_miles integer DEFAULT 25,

  -- Price preferences
  price_range_min numeric(10, 2),
  price_range_max numeric(10, 2),

  -- Content preferences
  show_promoted boolean DEFAULT true,
  show_flash_deals boolean DEFAULT true,
  show_trending boolean DEFAULT true,
  show_recently_viewed boolean DEFAULT true,

  -- Feed behavior
  items_per_page integer DEFAULT 20,
  auto_refresh boolean DEFAULT true,

  -- Algorithm weights
  category_weight numeric(3, 2) DEFAULT 0.30,
  location_weight numeric(3, 2) DEFAULT 0.20,
  price_weight numeric(3, 2) DEFAULT 0.15,
  engagement_weight numeric(3, 2) DEFAULT 0.35,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Trending Items (algorithmic trending calculation)
CREATE TABLE IF NOT EXISTS trending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Trending metrics
  trending_score numeric(6, 2) NOT NULL,
  trending_rank integer,

  -- Contributing factors
  view_velocity numeric(8, 2), -- Views per hour
  engagement_rate numeric(4, 2), -- Percentage
  share_rate numeric(4, 2),
  conversion_rate numeric(4, 2),

  -- Time windows
  views_1h bigint DEFAULT 0,
  views_24h bigint DEFAULT 0,
  views_7d bigint DEFAULT 0,

  -- Category trending
  category text,
  category_rank integer,

  -- Geographic trending
  trending_location jsonb,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz,

  UNIQUE(item_type, item_id)
);

-- Flash Deals (time-limited special offers)
CREATE TABLE IF NOT EXISTS flash_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deal details
  deal_name text NOT NULL,
  deal_type text DEFAULT 'percentage', -- percentage, fixed_amount, bundle

  -- Item reference
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Discount
  discount_percentage numeric(4, 2),
  discount_amount numeric(10, 2),
  original_price numeric(10, 2) NOT NULL,
  deal_price numeric(10, 2) NOT NULL,

  -- Timing
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,

  -- Quantity limits
  total_quantity integer,
  quantity_remaining integer,
  max_per_user integer DEFAULT 1,

  -- Visibility
  is_active boolean DEFAULT true,
  featured boolean DEFAULT false,

  -- Performance
  view_count bigint DEFAULT 0,
  claim_count bigint DEFAULT 0,
  conversion_count bigint DEFAULT 0,

  -- Urgency indicators
  show_countdown boolean DEFAULT true,
  show_quantity_remaining boolean DEFAULT true,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recently Viewed (user view history)
CREATE TABLE IF NOT EXISTS recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Item viewed
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- View details
  view_duration_seconds integer,
  view_count integer DEFAULT 1,

  -- Last view
  first_viewed_at timestamptz,
  last_viewed_at timestamptz DEFAULT now(),

  -- Context
  source text, -- feed, search, direct, recommendation

  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, item_type, item_id)
);

-- Feed Impressions (detailed impression tracking)
CREATE TABLE IF NOT EXISTS feed_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,

  -- Item
  feed_item_id uuid REFERENCES feed_items(id) ON DELETE CASCADE NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Context
  feed_section_id uuid REFERENCES feed_sections(id) ON DELETE SET NULL,
  position_in_feed integer,

  -- Visibility
  was_visible boolean DEFAULT true,
  visibility_percentage integer, -- Percentage of item visible
  time_visible_ms integer,

  -- Interaction
  was_clicked boolean DEFAULT false,
  click_delay_ms integer,

  -- Metadata
  metadata jsonb DEFAULT '{}',

  impressed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Social Proof Metrics (purchase/view counts)
CREATE TABLE IF NOT EXISTS social_proof_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  item_type text NOT NULL,
  item_id uuid NOT NULL,

  -- Counts
  total_views bigint DEFAULT 0,
  total_purchases bigint DEFAULT 0,
  total_saves bigint DEFAULT 0,

  -- Time-based
  views_24h bigint DEFAULT 0,
  purchases_24h bigint DEFAULT 0,
  saves_24h bigint DEFAULT 0,

  -- Messages
  social_proof_message text, -- "X people bought this", "Trending in your area"
  urgency_message text, -- "Only 3 left", "Selling fast"

  -- Flags
  is_popular boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_low_stock boolean DEFAULT false,

  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(item_type, item_id)
);

-- Feed AB Tests
CREATE TABLE IF NOT EXISTS feed_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  test_name text NOT NULL,
  test_key text UNIQUE NOT NULL,

  -- Test configuration
  control_variant jsonb NOT NULL,
  test_variant jsonb NOT NULL,

  -- Traffic split
  traffic_percentage integer DEFAULT 50, -- Percentage in test variant

  -- Status
  status text DEFAULT 'draft', -- draft, running, paused, completed

  -- Metrics
  control_impressions bigint DEFAULT 0,
  control_clicks bigint DEFAULT 0,
  control_conversions bigint DEFAULT 0,
  test_impressions bigint DEFAULT 0,
  test_clicks bigint DEFAULT 0,
  test_conversions bigint DEFAULT 0,

  -- Dates
  started_at timestamptz,
  ended_at timestamptz,

  -- Results
  winner text, -- control, test, inconclusive
  confidence_level numeric(4, 2),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feed_sections_active ON feed_sections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_feed_sections_order ON feed_sections(display_order);

CREATE INDEX IF NOT EXISTS idx_feed_items_section ON feed_items(feed_section_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_type ON feed_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_active ON feed_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_feed_items_score ON feed_items(final_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_feed_items_promoted ON feed_items(is_promoted) WHERE is_promoted = true;

CREATE INDEX IF NOT EXISTS idx_feed_engagement_user ON feed_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_item ON feed_engagement(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_type ON feed_engagement(engagement_type);
CREATE INDEX IF NOT EXISTS idx_feed_engagement_engaged ON feed_engagement(engaged_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_personalization_user ON feed_personalization(user_id);

CREATE INDEX IF NOT EXISTS idx_trending_score ON trending_items(trending_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_type ON trending_items(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_trending_category ON trending_items(category, category_rank);
CREATE INDEX IF NOT EXISTS idx_trending_expires ON trending_items(expires_at);

CREATE INDEX IF NOT EXISTS idx_flash_deals_active ON flash_deals(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_flash_deals_featured ON flash_deals(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_flash_deals_ends ON flash_deals(ends_at);
CREATE INDEX IF NOT EXISTS idx_flash_deals_item ON flash_deals(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed(user_id, last_viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_item ON recently_viewed(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_feed_impressions_session ON feed_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_item ON feed_impressions(feed_item_id);
CREATE INDEX IF NOT EXISTS idx_feed_impressions_impressed ON feed_impressions(impressed_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_proof_item ON social_proof_metrics(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_social_proof_popular ON social_proof_metrics(is_popular) WHERE is_popular = true;

CREATE INDEX IF NOT EXISTS idx_feed_ab_tests_key ON feed_ab_tests(test_key);
CREATE INDEX IF NOT EXISTS idx_feed_ab_tests_status ON feed_ab_tests(status);

-- Enable RLS
ALTER TABLE feed_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flash_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_proof_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active feed sections"
  ON feed_sections FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Anyone can view active feed items"
  ON feed_items FOR SELECT
  TO authenticated, anon
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Users can view own engagement"
  ON feed_engagement FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create engagement records"
  ON feed_engagement FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can view own personalization"
  ON feed_personalization FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own personalization"
  ON feed_personalization FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view trending items"
  ON trending_items FOR SELECT
  TO authenticated, anon
  USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Anyone can view active flash deals"
  ON flash_deals FOR SELECT
  TO authenticated, anon
  USING (is_active = true AND starts_at <= now() AND ends_at >= now());

CREATE POLICY "Users can view own recently viewed"
  ON recently_viewed FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own recently viewed"
  ON recently_viewed FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view social proof"
  ON social_proof_metrics FOR SELECT
  TO authenticated, anon
  USING (true);

-- Function: Track engagement
CREATE OR REPLACE FUNCTION track_feed_engagement(
  feed_item_id_param uuid,
  engagement_type_param text,
  user_id_param uuid DEFAULT NULL,
  session_id_param text DEFAULT NULL,
  duration_ms_param integer DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  engagement_id uuid;
  item_type_found text;
  item_id_found uuid;
BEGIN
  -- Get item details
  SELECT item_type, item_id INTO item_type_found, item_id_found
  FROM feed_items
  WHERE id = feed_item_id_param;

  -- Insert engagement
  INSERT INTO feed_engagement (
    user_id,
    session_id,
    feed_item_id,
    item_type,
    item_id,
    engagement_type,
    engagement_duration_ms
  ) VALUES (
    user_id_param,
    session_id_param,
    feed_item_id_param,
    item_type_found,
    item_id_found,
    engagement_type_param,
    duration_ms_param
  )
  RETURNING id INTO engagement_id;

  -- Update feed item stats
  CASE engagement_type_param
    WHEN 'view' THEN
      UPDATE feed_items SET view_count = view_count + 1 WHERE id = feed_item_id_param;
    WHEN 'click' THEN
      UPDATE feed_items SET click_count = click_count + 1 WHERE id = feed_item_id_param;
    WHEN 'save' THEN
      UPDATE feed_items SET save_count = save_count + 1 WHERE id = feed_item_id_param;
    WHEN 'share' THEN
      UPDATE feed_items SET share_count = share_count + 1 WHERE id = feed_item_id_param;
    WHEN 'purchase' THEN
      UPDATE feed_items SET conversion_count = conversion_count + 1 WHERE id = feed_item_id_param;
  END CASE;

  RETURN engagement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Record recently viewed
CREATE OR REPLACE FUNCTION record_recently_viewed(
  item_type_param text,
  item_id_param uuid,
  user_id_param uuid,
  view_duration_param integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO recently_viewed (
    user_id,
    item_type,
    item_id,
    view_duration_seconds,
    first_viewed_at,
    last_viewed_at,
    view_count
  ) VALUES (
    user_id_param,
    item_type_param,
    item_id_param,
    view_duration_param,
    now(),
    now(),
    1
  )
  ON CONFLICT (user_id, item_type, item_id)
  DO UPDATE SET
    last_viewed_at = now(),
    view_count = recently_viewed.view_count + 1,
    view_duration_seconds = COALESCE(EXCLUDED.view_duration_seconds, recently_viewed.view_duration_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(
  views_1h_param bigint,
  views_24h_param bigint,
  engagement_rate_param numeric,
  recency_hours_param numeric
)
RETURNS numeric AS $$
DECLARE
  score numeric;
  velocity_score numeric;
  engagement_score numeric;
  recency_score numeric;
BEGIN
  -- Velocity score (logarithmic scale)
  velocity_score := CASE
    WHEN views_1h_param > 0 THEN LOG(views_1h_param + 1) * 20
    ELSE 0
  END;

  -- Engagement score
  engagement_score := engagement_rate_param * 0.5;

  -- Recency score (decay over time)
  recency_score := 100 * EXP(-recency_hours_param / 24.0);

  -- Combined score
  score := (velocity_score * 0.4) + (engagement_score * 0.3) + (recency_score * 0.3);

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION track_feed_engagement TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_recently_viewed TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trending_score TO authenticated;

-- Seed default feed sections
INSERT INTO feed_sections (section_key, section_name, section_type, display_order, items_per_section) VALUES
  ('featured', 'Featured Services', 'featured', 1, 8),
  ('flash_deals', 'Flash Deals', 'flash_deals', 2, 6),
  ('trending', 'Trending Now', 'trending', 3, 10),
  ('recommended', 'Recommended For You', 'recommended', 4, 12),
  ('recently_viewed', 'Recently Viewed', 'recently_viewed', 5, 8),
  ('new_arrivals', 'New Arrivals', 'time_based', 6, 10),
  ('popular_categories', 'Popular Categories', 'categories', 7, 8)
ON CONFLICT (section_key) DO NOTHING;
