/*
  # Create Recommendation System

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `categories` (text[]) - Preferred categories
      - `location_radius_km` (numeric) - Search radius preference
      - `price_range_min` (numeric)
      - `price_range_max` (numeric)
      - `preferred_providers` (uuid[]) - Favorite providers
      - `blocked_providers` (uuid[]) - Hidden providers
      - `feature_weights` (jsonb) - ML weights for personalization
      - `updated_at` (timestamptz)

    - `item_similarity_scores`
      - `id` (uuid, primary key)
      - `item_type` (text) - provider, job, post
      - `item_id` (uuid)
      - `similar_item_id` (uuid)
      - `similarity_score` (numeric) - 0 to 1
      - `algorithm` (text) - content_based, collaborative
      - `features` (jsonb) - Features that contributed to similarity
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_item_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `item_type` (text)
      - `item_id` (uuid)
      - `interaction_type` (text) - view, like, bookmark, contact, book
      - `interaction_weight` (numeric) - Importance of interaction
      - `timestamp` (timestamptz)
      - `context` (jsonb) - Additional context

    - `recommendation_cache`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `recommendation_type` (text) - providers, jobs, posts, similar_users
      - `recommendations` (jsonb) - Array of recommendations with scores
      - `algorithm_used` (text)
      - `generated_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS on all tables
    - Users can manage their own preferences
    - Admins can view analytics
    - Public can view cached recommendations

  3. Indexes
    - Index on similarity scores
    - Index on user interactions
    - Index on cache expiration
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Category preferences
  categories text[] DEFAULT ARRAY[]::text[],

  -- Location preferences
  location_radius_km numeric DEFAULT 50,

  -- Price preferences
  price_range_min numeric DEFAULT 0,
  price_range_max numeric,

  -- Provider preferences
  preferred_providers uuid[] DEFAULT ARRAY[]::uuid[],
  blocked_providers uuid[] DEFAULT ARRAY[]::uuid[],

  -- ML feature weights (for personalization)
  feature_weights jsonb DEFAULT '{}'::jsonb,

  updated_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create item_similarity_scores table
CREATE TABLE IF NOT EXISTS item_similarity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item identification
  item_type text NOT NULL CHECK (item_type IN ('provider', 'job', 'post')),
  item_id uuid NOT NULL,
  similar_item_id uuid NOT NULL,

  -- Similarity metrics
  similarity_score numeric NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  algorithm text NOT NULL CHECK (algorithm IN ('content_based', 'collaborative', 'hybrid')),
  features jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Prevent duplicate pairs
  CONSTRAINT unique_similarity_pair UNIQUE (item_type, item_id, similar_item_id, algorithm)
);

-- Create user_item_interactions table
CREATE TABLE IF NOT EXISTS user_item_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Item identification
  item_type text NOT NULL CHECK (item_type IN ('provider', 'job', 'post', 'listing')),
  item_id uuid NOT NULL,

  -- Interaction details
  interaction_type text NOT NULL CHECK (interaction_type IN (
    'view', 'like', 'bookmark', 'share', 'contact',
    'book', 'review', 'follow', 'comment'
  )),
  interaction_weight numeric DEFAULT 1.0,
  timestamp timestamptz DEFAULT now(),
  context jsonb DEFAULT '{}'::jsonb
);

-- Create recommendation_cache table
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Recommendation details
  recommendation_type text NOT NULL CHECK (recommendation_type IN (
    'providers', 'jobs', 'posts', 'similar_users', 'trending'
  )),
  recommendations jsonb NOT NULL,
  algorithm_used text NOT NULL,

  -- Cache management
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,

  CONSTRAINT unique_user_recommendation_type UNIQUE (user_id, recommendation_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_similarity_item
  ON item_similarity_scores(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_similarity_similar
  ON item_similarity_scores(similar_item_id);

CREATE INDEX IF NOT EXISTS idx_similarity_score
  ON item_similarity_scores(similarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_user
  ON user_item_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_interactions_item
  ON user_item_interactions(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_interactions_timestamp
  ON user_item_interactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_type
  ON user_item_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_cache_user_type
  ON recommendation_cache(user_id, recommendation_type);

CREATE INDEX IF NOT EXISTS idx_cache_expires
  ON recommendation_cache(expires_at);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_similarity_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_item_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences

-- Users can view and manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences
CREATE POLICY "Admins can view all preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for item_similarity_scores

-- Anyone can view similarity scores
CREATE POLICY "Anyone can view similarity scores"
  ON item_similarity_scores
  FOR SELECT
  TO authenticated
  USING (true);

-- System can manage similarity scores
CREATE POLICY "System can manage similarity scores"
  ON item_similarity_scores
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for user_item_interactions

-- Users can view their own interactions
CREATE POLICY "Users can view own interactions"
  ON user_item_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create interactions
CREATE POLICY "Users can create interactions"
  ON user_item_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all interactions
CREATE POLICY "Admins can view all interactions"
  ON user_item_interactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- RLS Policies for recommendation_cache

-- Users can view their own cached recommendations
CREATE POLICY "Users can view own recommendations"
  ON recommendation_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can manage cache
CREATE POLICY "System can manage cache"
  ON recommendation_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to calculate content-based similarity for providers
CREATE OR REPLACE FUNCTION calculate_provider_similarity(
  p_provider_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  similar_provider_id uuid,
  similarity_score numeric,
  matching_categories text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH target_provider AS (
    SELECT
      p.id,
      p.category_id,
      p.services,
      p.average_rating,
      p.hourly_rate,
      p.location
    FROM profiles p
    WHERE p.id = p_provider_id
    AND p.role = 'Provider'
  ),
  candidate_providers AS (
    SELECT
      p.id,
      p.category_id,
      p.services,
      p.average_rating,
      p.hourly_rate,
      p.location,
      tp.category_id as target_category,
      tp.services as target_services,
      tp.average_rating as target_rating,
      tp.hourly_rate as target_rate
    FROM profiles p
    CROSS JOIN target_provider tp
    WHERE p.id != p_provider_id
    AND p.role = 'Provider'
    AND p.is_verified = true
  )
  SELECT
    cp.id as similar_provider_id,
    ROUND(
      -- Category match (40%)
      (CASE WHEN cp.category_id = cp.target_category THEN 0.4 ELSE 0 END) +
      -- Services overlap (30%)
      (CASE
        WHEN cp.services IS NOT NULL AND cp.target_services IS NOT NULL
        THEN (
          SELECT COUNT(*) * 0.3 / GREATEST(
            array_length(cp.services, 1),
            array_length(cp.target_services, 1),
            1
          )
          FROM unnest(cp.services) s1
          INNER JOIN unnest(cp.target_services) s2 ON s1 = s2
        )
        ELSE 0
      END) +
      -- Rating similarity (15%)
      (0.15 * (1 - ABS(COALESCE(cp.average_rating, 0) - COALESCE(cp.target_rating, 0)) / 5.0)) +
      -- Price similarity (15%)
      (CASE
        WHEN cp.hourly_rate IS NOT NULL AND cp.target_rate IS NOT NULL
        THEN 0.15 * (1 - LEAST(ABS(cp.hourly_rate - cp.target_rate) / GREATEST(cp.hourly_rate, cp.target_rate), 1))
        ELSE 0.05
      END)
    , 2) as similarity_score,
    CASE
      WHEN cp.category_id = cp.target_category
      THEN ARRAY['same_category']
      ELSE ARRAY[]::text[]
    END as matching_categories
  FROM candidate_providers cp
  WHERE cp.id != p_provider_id
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborative filtering recommendations
CREATE OR REPLACE FUNCTION get_collaborative_recommendations(
  p_user_id uuid,
  p_item_type text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  recommended_item_id uuid,
  recommendation_score numeric,
  similar_users_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH user_interactions AS (
    -- Get items current user has interacted with
    SELECT DISTINCT item_id, interaction_type, interaction_weight
    FROM user_item_interactions
    WHERE user_id = p_user_id
    AND item_type = p_item_type
  ),
  similar_users AS (
    -- Find users who interacted with same items
    SELECT
      ui.user_id,
      COUNT(*) as common_items,
      AVG(ui.interaction_weight) as avg_weight
    FROM user_item_interactions ui
    INNER JOIN user_interactions u ON ui.item_id = u.item_id
    WHERE ui.user_id != p_user_id
    AND ui.item_type = p_item_type
    GROUP BY ui.user_id
    HAVING COUNT(*) >= 2
    ORDER BY common_items DESC, avg_weight DESC
    LIMIT 50
  ),
  recommended_items AS (
    -- Get items similar users interacted with
    SELECT
      ui.item_id,
      COUNT(DISTINCT ui.user_id) as user_count,
      AVG(ui.interaction_weight * su.avg_weight) as score
    FROM user_item_interactions ui
    INNER JOIN similar_users su ON ui.user_id = su.user_id
    WHERE ui.item_type = p_item_type
    AND NOT EXISTS (
      -- Exclude items user already interacted with
      SELECT 1 FROM user_interactions
      WHERE item_id = ui.item_id
    )
    GROUP BY ui.item_id
  )
  SELECT
    item_id as recommended_item_id,
    ROUND(score, 2) as recommendation_score,
    user_count::integer as similar_users_count
  FROM recommended_items
  ORDER BY score DESC, user_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record interaction
CREATE OR REPLACE FUNCTION record_user_interaction(
  p_user_id uuid,
  p_item_type text,
  p_item_id uuid,
  p_interaction_type text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  v_weight numeric;
  v_interaction_id uuid;
BEGIN
  -- Determine interaction weight
  v_weight := CASE p_interaction_type
    WHEN 'view' THEN 1.0
    WHEN 'like' THEN 3.0
    WHEN 'bookmark' THEN 4.0
    WHEN 'share' THEN 5.0
    WHEN 'contact' THEN 6.0
    WHEN 'book' THEN 10.0
    WHEN 'review' THEN 8.0
    WHEN 'follow' THEN 7.0
    WHEN 'comment' THEN 4.0
    ELSE 1.0
  END;

  -- Insert interaction
  INSERT INTO user_item_interactions (
    user_id,
    item_type,
    item_id,
    interaction_type,
    interaction_weight,
    context
  ) VALUES (
    p_user_id,
    p_item_type,
    p_item_id,
    p_interaction_type,
    v_weight,
    p_context
  )
  RETURNING id INTO v_interaction_id;

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get personalized provider recommendations
CREATE OR REPLACE FUNCTION get_personalized_provider_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  provider_id uuid,
  provider_name text,
  category_name text,
  recommendation_score numeric,
  recommendation_reason text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_prefs AS (
    SELECT
      categories,
      location_radius_km,
      price_range_min,
      price_range_max,
      preferred_providers,
      blocked_providers
    FROM user_preferences
    WHERE user_id = p_user_id
  ),
  user_history AS (
    SELECT
      item_id as provider_id,
      MAX(interaction_weight) as max_weight,
      COUNT(*) as interaction_count
    FROM user_item_interactions
    WHERE user_id = p_user_id
    AND item_type = 'provider'
    GROUP BY item_id
  ),
  content_based AS (
    -- Get similar providers based on user's history
    SELECT DISTINCT
      s.similar_provider_id as provider_id,
      s.similarity_score * uh.max_weight as score,
      'similar_to_viewed' as reason
    FROM item_similarity_scores s
    INNER JOIN user_history uh ON s.item_id = uh.provider_id
    WHERE s.item_type = 'provider'
    AND s.algorithm IN ('content_based', 'hybrid')
  ),
  collaborative AS (
    -- Get collaborative filtering recommendations
    SELECT
      recommended_item_id as provider_id,
      recommendation_score as score,
      'users_also_liked' as reason
    FROM get_collaborative_recommendations(p_user_id, 'provider', 20)
  ),
  combined AS (
    SELECT provider_id, score, reason FROM content_based
    UNION ALL
    SELECT provider_id, score, reason FROM collaborative
  ),
  scored_providers AS (
    SELECT
      c.provider_id,
      SUM(c.score) as total_score,
      ARRAY_AGG(DISTINCT c.reason) as reasons
    FROM combined c
    GROUP BY c.provider_id
  )
  SELECT
    sp.provider_id,
    p.full_name as provider_name,
    cat.name as category_name,
    ROUND(sp.total_score, 2) as recommendation_score,
    sp.reasons[1] as recommendation_reason
  FROM scored_providers sp
  INNER JOIN profiles p ON p.id = sp.provider_id
  LEFT JOIN categories cat ON cat.id = p.category_id
  WHERE p.role = 'Provider'
  AND p.is_verified = true
  AND NOT EXISTS (
    SELECT 1 FROM user_prefs up
    WHERE sp.provider_id = ANY(COALESCE(up.blocked_providers, ARRAY[]::uuid[]))
  )
  ORDER BY sp.total_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update similarity scores
CREATE OR REPLACE FUNCTION update_similarity_scores(
  p_item_type text,
  p_item_id uuid
)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF p_item_type = 'provider' THEN
    -- Delete old scores
    DELETE FROM item_similarity_scores
    WHERE item_type = 'provider'
    AND item_id = p_item_id;

    -- Insert new scores
    INSERT INTO item_similarity_scores (
      item_type,
      item_id,
      similar_item_id,
      similarity_score,
      algorithm,
      features
    )
    SELECT
      'provider',
      p_item_id,
      similar_provider_id,
      similarity_score,
      'content_based',
      jsonb_build_object('matching_categories', matching_categories)
    FROM calculate_provider_similarity(p_item_id, 20);

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_recommendation_cache()
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM recommendation_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
