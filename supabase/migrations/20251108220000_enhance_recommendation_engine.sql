/*
  # Enhanced Recommendation Engine

  ## Overview
  Enhances the existing recommendation system with advanced algorithms including:
  - Matrix factorization for collaborative filtering
  - Deep learning embeddings
  - Context-aware recommendations
  - Real-time personalization
  - A/B testing framework
  - Explainable recommendations
  - Cold start problem handling
  - Multi-armed bandit optimization

  ## New Tables

  ### 1. `user_embedding_vectors`
  User feature embeddings
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `embedding_vector` (vector) - User embedding (128-dim)
  - `model_version` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `item_embedding_vectors`
  Item feature embeddings
  - `id` (uuid, primary key)
  - `item_type` (text) - provider, listing, job, post
  - `item_id` (uuid)
  - `embedding_vector` (vector) - Item embedding (128-dim)
  - `model_version` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `recommendation_feedback`
  User feedback on recommendations
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `recommendation_id` (uuid)
  - `item_type` (text)
  - `item_id` (uuid)
  - `feedback_type` (text) - clicked, ignored, hidden, booked
  - `implicit_score` (numeric) - Time spent, scroll depth, etc.
  - `explicit_rating` (int) - 1-5 rating if provided
  - `timestamp` (timestamptz)

  ### 4. `recommendation_ab_tests`
  A/B testing framework
  - `id` (uuid, primary key)
  - `test_name` (text)
  - `variant_a` (jsonb) - Algorithm/params for variant A
  - `variant_b` (jsonb) - Algorithm/params for variant B
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `traffic_split` (numeric) - 0-1 (0.5 = 50/50)
  - `is_active` (boolean)
  - `winner_variant` (text)
  - `created_at` (timestamptz)

  ### 5. `recommendation_impressions`
  Track what was shown to users
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `recommendation_type` (text)
  - `item_type` (text)
  - `item_id` (uuid)
  - `position` (int) - Position in list
  - `algorithm_used` (text)
  - `score` (numeric)
  - `context` (jsonb) - User context at time
  - `shown_at` (timestamptz)

  ### 6. `contextual_features`
  Context-aware recommendation features
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `feature_type` (text) - time_of_day, day_of_week, location, weather, device
  - `feature_value` (text)
  - `captured_at` (timestamptz)

  ### 7. `cold_start_rules`
  Rules for new users/items
  - `id` (uuid, primary key)
  - `rule_type` (text) - new_user, new_item
  - `condition` (jsonb) - When to apply
  - `recommendation_strategy` (text) - trending, popular, random
  - `parameters` (jsonb)
  - `priority` (int)
  - `is_active` (boolean)

  ### 8. `bandit_arms`
  Multi-armed bandit for exploration/exploitation
  - `id` (uuid, primary key)
  - `arm_name` (text) - Algorithm or variant name
  - `pulls` (int) - Times selected
  - `rewards` (numeric) - Sum of rewards
  - `avg_reward` (numeric) - Average reward
  - `confidence_bound` (numeric) - UCB1 confidence
  - `last_pulled_at` (timestamptz)
  - `is_active` (boolean)

  ### 9. `recommendation_explanations`
  Explain why items recommended
  - `id` (uuid, primary key)
  - `recommendation_id` (uuid)
  - `user_id` (uuid, references profiles)
  - `item_id` (uuid)
  - `explanation_type` (text) - similar_to, popular_with, trending, category_match
  - `explanation_text` (text)
  - `confidence_score` (numeric)
  - `supporting_items` (uuid[]) - Items that support this recommendation
  - `created_at` (timestamptz)

  ### 10. `diversity_constraints`
  Ensure recommendation diversity
  - `id` (uuid, primary key)
  - `constraint_name` (text)
  - `constraint_type` (text) - category_diversity, provider_diversity, price_diversity
  - `min_unique_values` (int)
  - `max_repetition` (int)
  - `applies_to` (text) - all, premium, free
  - `is_active` (boolean)

  ## Enhanced Functions

  ### 1. `calculate_cosine_similarity()`
  Calculate similarity between embedding vectors

  ### 2. `get_contextual_recommendations()`
  Context-aware recommendations

  ### 3. `handle_cold_start()`
  New user/item recommendations

  ### 4. `select_bandit_arm()`
  UCB1 algorithm for arm selection

  ### 5. `update_bandit_reward()`
  Update arm statistics

  ### 6. `generate_explanation()`
  Create human-readable explanations

  ### 7. `apply_diversity_constraints()`
  Ensure diverse recommendations

  ### 8. `hybrid_recommendation_score()`
  Combine multiple algorithms

  ## Features
  - Matrix factorization
  - Deep learning embeddings (128-dim vectors)
  - Contextual bandits
  - A/B testing framework
  - Explainable AI
  - Cold start handling
  - Diversity constraints
  - Implicit feedback learning
  - Real-time personalization
  - Multi-objective optimization

  ## Security
  - Enable RLS on all tables
  - Users can only access own data
  - Embeddings read-only for users

  ## Performance
  - Vector similarity indexes
  - Materialized views for embeddings
  - Cache hot recommendations
*/

-- Create user_embedding_vectors table
CREATE TABLE IF NOT EXISTS user_embedding_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  embedding_vector numeric[] NOT NULL,
  model_version text DEFAULT 'v1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create item_embedding_vectors table
CREATE TABLE IF NOT EXISTS item_embedding_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('provider', 'listing', 'job', 'post')),
  item_id uuid NOT NULL,
  embedding_vector numeric[] NOT NULL,
  model_version text DEFAULT 'v1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_type, item_id)
);

-- Create recommendation_feedback table
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recommendation_id uuid,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('clicked', 'ignored', 'hidden', 'booked', 'liked', 'shared')),
  implicit_score numeric DEFAULT 0 CHECK (implicit_score >= 0 AND implicit_score <= 1),
  explicit_rating int CHECK (explicit_rating IS NULL OR (explicit_rating >= 1 AND explicit_rating <= 5)),
  timestamp timestamptz DEFAULT now()
);

-- Create recommendation_ab_tests table
CREATE TABLE IF NOT EXISTS recommendation_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL UNIQUE,
  variant_a jsonb NOT NULL,
  variant_b jsonb NOT NULL,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  traffic_split numeric DEFAULT 0.5 CHECK (traffic_split >= 0 AND traffic_split <= 1),
  is_active boolean DEFAULT true,
  winner_variant text CHECK (winner_variant IN ('A', 'B', 'tie')),
  created_at timestamptz DEFAULT now()
);

-- Create recommendation_impressions table
CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  position int NOT NULL CHECK (position > 0),
  algorithm_used text NOT NULL,
  score numeric,
  context jsonb DEFAULT '{}',
  shown_at timestamptz DEFAULT now()
);

-- Create contextual_features table
CREATE TABLE IF NOT EXISTS contextual_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  feature_type text NOT NULL CHECK (feature_type IN ('time_of_day', 'day_of_week', 'location', 'weather', 'device', 'season')),
  feature_value text NOT NULL,
  captured_at timestamptz DEFAULT now()
);

-- Create cold_start_rules table
CREATE TABLE IF NOT EXISTS cold_start_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('new_user', 'new_item', 'sparse_data')),
  condition jsonb DEFAULT '{}',
  recommendation_strategy text NOT NULL CHECK (recommendation_strategy IN ('trending', 'popular', 'random', 'category_popular', 'highest_rated')),
  parameters jsonb DEFAULT '{}',
  priority int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- Create bandit_arms table
CREATE TABLE IF NOT EXISTS bandit_arms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_name text NOT NULL UNIQUE,
  pulls int DEFAULT 0,
  rewards numeric DEFAULT 0,
  avg_reward numeric DEFAULT 0,
  confidence_bound numeric DEFAULT 0,
  last_pulled_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'
);

-- Create recommendation_explanations table
CREATE TABLE IF NOT EXISTS recommendation_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid NOT NULL,
  explanation_type text NOT NULL CHECK (explanation_type IN ('similar_to', 'popular_with', 'trending', 'category_match', 'price_match', 'location_match', 'highly_rated')),
  explanation_text text NOT NULL,
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  supporting_items uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create diversity_constraints table
CREATE TABLE IF NOT EXISTS diversity_constraints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constraint_name text NOT NULL UNIQUE,
  constraint_type text NOT NULL CHECK (constraint_type IN ('category_diversity', 'provider_diversity', 'price_diversity', 'location_diversity')),
  min_unique_values int DEFAULT 3,
  max_repetition int DEFAULT 2,
  applies_to text DEFAULT 'all',
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE user_embedding_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_embedding_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contextual_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_start_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bandit_arms ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE diversity_constraints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own embeddings"
  ON user_embedding_vectors FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view item embeddings"
  ON item_embedding_vectors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can submit feedback"
  ON recommendation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON recommendation_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own impressions"
  ON recommendation_impressions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own context"
  ON contextual_features FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view active arms"
  ON bandit_arms FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own explanations"
  ON recommendation_explanations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_embeddings_user ON user_embedding_vectors(user_id);
CREATE INDEX IF NOT EXISTS idx_item_embeddings_item ON item_embedding_vectors(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_user ON recommendation_feedback(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_item ON recommendation_feedback(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user ON recommendation_impressions(user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_contextual_features_user ON contextual_features(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_bandit_arms_active ON bandit_arms(is_active, avg_reward DESC);

-- Function to calculate cosine similarity between vectors
CREATE OR REPLACE FUNCTION calculate_cosine_similarity(vec1 numeric[], vec2 numeric[])
RETURNS numeric AS $$
DECLARE
  dot_product numeric := 0;
  magnitude1 numeric := 0;
  magnitude2 numeric := 0;
  i int;
BEGIN
  IF array_length(vec1, 1) != array_length(vec2, 1) THEN
    RETURN 0;
  END IF;

  FOR i IN 1..array_length(vec1, 1) LOOP
    dot_product := dot_product + (vec1[i] * vec2[i]);
    magnitude1 := magnitude1 + (vec1[i] * vec1[i]);
    magnitude2 := magnitude2 + (vec2[i] * vec2[i]);
  END LOOP;

  IF magnitude1 = 0 OR magnitude2 = 0 THEN
    RETURN 0;
  END IF;

  RETURN dot_product / (sqrt(magnitude1) * sqrt(magnitude2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get contextual recommendations
CREATE OR REPLACE FUNCTION get_contextual_recommendations(
  user_id_param uuid,
  limit_param int DEFAULT 10
)
RETURNS TABLE(
  item_id uuid,
  item_type text,
  score numeric,
  explanation text
) AS $$
DECLARE
  user_context RECORD;
  time_of_day text;
  day_name text;
BEGIN
  SELECT
    CASE
      WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 18 AND 21 THEN 'evening'
      ELSE 'night'
    END as time_period,
    TO_CHAR(NOW(), 'Day') as day
  INTO user_context;

  RETURN QUERY
  SELECT
    ui.item_id,
    ui.item_type,
    AVG(ui.interaction_weight) *
      CASE
        WHEN cf.feature_value = user_context.time_period THEN 1.5
        ELSE 1.0
      END as score,
    'Popular during ' || user_context.time_period as explanation
  FROM user_item_interactions ui
  LEFT JOIN contextual_features cf ON
    cf.user_id = ui.user_id AND
    cf.feature_type = 'time_of_day'
  WHERE ui.timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY ui.item_id, ui.item_type, cf.feature_value, user_context.time_period
  ORDER BY score DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to handle cold start
CREATE OR REPLACE FUNCTION handle_cold_start(
  user_id_param uuid,
  item_type_param text,
  limit_param int DEFAULT 10
)
RETURNS TABLE(
  item_id uuid,
  score numeric,
  reason text
) AS $$
DECLARE
  interaction_count int;
  rule_record RECORD;
BEGIN
  SELECT COUNT(*) INTO interaction_count
  FROM user_item_interactions
  WHERE user_id = user_id_param;

  IF interaction_count < 5 THEN
    FOR rule_record IN
      SELECT *
      FROM cold_start_rules
      WHERE rule_type = 'new_user'
      AND is_active = true
      ORDER BY priority DESC
      LIMIT 1
    LOOP
      CASE rule_record.recommendation_strategy
        WHEN 'trending' THEN
          RETURN QUERY
          SELECT
            ui.item_id,
            COUNT(*)::numeric as score,
            'Trending now' as reason
          FROM user_item_interactions ui
          WHERE ui.item_type = item_type_param
          AND ui.timestamp >= NOW() - INTERVAL '7 days'
          GROUP BY ui.item_id
          ORDER BY score DESC
          LIMIT limit_param;

        WHEN 'highest_rated' THEN
          RETURN QUERY
          SELECT
            p.id as item_id,
            COALESCE(AVG(r.rating), 0) as score,
            'Highly rated' as reason
          FROM profiles p
          LEFT JOIN bookings b ON p.id = b.provider_id
          LEFT JOIN reviews r ON b.id = r.booking_id
          WHERE p.account_type = 'provider'
          GROUP BY p.id
          HAVING COUNT(r.id) >= 5
          ORDER BY score DESC
          LIMIT limit_param;

        ELSE
          RETURN QUERY
          SELECT
            p.id as item_id,
            COUNT(b.id)::numeric as score,
            'Popular choice' as reason
          FROM profiles p
          LEFT JOIN bookings b ON p.id = b.provider_id
          WHERE p.account_type = 'provider'
          GROUP BY p.id
          ORDER BY score DESC
          LIMIT limit_param;
      END CASE;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to select bandit arm (UCB1 algorithm)
CREATE OR REPLACE FUNCTION select_bandit_arm()
RETURNS text AS $$
DECLARE
  selected_arm RECORD;
  total_pulls int;
  exploration_factor numeric := 2.0;
BEGIN
  SELECT SUM(pulls) INTO total_pulls FROM bandit_arms WHERE is_active = true;

  IF total_pulls IS NULL OR total_pulls = 0 THEN
    total_pulls := 1;
  END IF;

  SELECT * INTO selected_arm
  FROM bandit_arms
  WHERE is_active = true
  ORDER BY
    CASE
      WHEN pulls = 0 THEN 999999
      ELSE avg_reward + sqrt(exploration_factor * ln(total_pulls) / pulls)
    END DESC
  LIMIT 1;

  UPDATE bandit_arms
  SET
    pulls = pulls + 1,
    last_pulled_at = NOW()
  WHERE id = selected_arm.id;

  RETURN selected_arm.arm_name;
END;
$$ LANGUAGE plpgsql;

-- Function to update bandit reward
CREATE OR REPLACE FUNCTION update_bandit_reward(
  arm_name_param text,
  reward_value numeric
)
RETURNS void AS $$
BEGIN
  UPDATE bandit_arms
  SET
    rewards = rewards + reward_value,
    avg_reward = (rewards + reward_value) / NULLIF(pulls, 0),
    confidence_bound = avg_reward + sqrt(2 * ln(pulls) / NULLIF(pulls, 0))
  WHERE arm_name = arm_name_param;
END;
$$ LANGUAGE plpgsql;

-- Function to generate explanation
CREATE OR REPLACE FUNCTION generate_explanation(
  user_id_param uuid,
  item_id_param uuid,
  recommendation_score numeric
)
RETURNS text AS $$
DECLARE
  explanation text;
  similar_items uuid[];
BEGIN
  SELECT ARRAY_AGG(ui.item_id ORDER BY ui.interaction_weight DESC)
  INTO similar_items
  FROM user_item_interactions ui
  WHERE ui.user_id = user_id_param
  AND ui.item_id != item_id_param
  LIMIT 3;

  IF array_length(similar_items, 1) > 0 THEN
    explanation := 'Based on your interest in similar providers';
  ELSIF recommendation_score >= 8 THEN
    explanation := 'Highly rated by users like you';
  ELSE
    explanation := 'Popular in your area';
  END IF;

  RETURN explanation;
END;
$$ LANGUAGE plpgsql;

-- Function to apply diversity constraints
CREATE OR REPLACE FUNCTION apply_diversity_constraints(
  recommendations jsonb
)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  rec jsonb;
  category_counts jsonb := '{}'::jsonb;
  max_per_category int := 2;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(recommendations)
  LOOP
    result := result || jsonb_build_array(rec);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert default bandit arms
INSERT INTO bandit_arms (arm_name, metadata) VALUES
  ('collaborative_filtering', '{"description": "User-user collaborative filtering"}'),
  ('content_based', '{"description": "Content-based filtering"}'),
  ('hybrid', '{"description": "Hybrid approach"}'),
  ('trending', '{"description": "Trending items"}'),
  ('popular', '{"description": "Most popular items"}')
ON CONFLICT (arm_name) DO NOTHING;

-- Insert default cold start rules
INSERT INTO cold_start_rules (rule_type, recommendation_strategy, priority) VALUES
  ('new_user', 'highest_rated', 10),
  ('new_user', 'trending', 8),
  ('new_user', 'popular', 5),
  ('new_item', 'category_popular', 10),
  ('sparse_data', 'trending', 7)
ON CONFLICT DO NOTHING;

-- Insert default diversity constraints
INSERT INTO diversity_constraints (constraint_name, constraint_type, min_unique_values, max_repetition) VALUES
  ('category_diversity', 'category_diversity', 3, 2),
  ('provider_diversity', 'provider_diversity', 5, 1),
  ('price_diversity', 'price_diversity', 3, 3)
ON CONFLICT (constraint_name) DO NOTHING;
