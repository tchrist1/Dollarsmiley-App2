/*
  # Create Missing Recommendation and User Tables

  1. New Tables
    - `user_preferences` - User preference settings for recommendations
    - `user_sessions` - User session tracking
    - `recommendation_cache` - Cached recommendation results
    - `wallet_transactions` - User wallet transaction history
    - `user_item_interactions` - Track user interactions with items

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for authenticated users
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  categories text[] DEFAULT ARRAY[]::text[],
  location_radius_km numeric DEFAULT 50,
  price_range_min numeric DEFAULT 0,
  price_range_max numeric,
  preferred_providers text[] DEFAULT ARRAY[]::text[],
  blocked_providers text[] DEFAULT ARRAY[]::text[],
  feature_weights jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  device_info jsonb,
  location jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create recommendation_cache table
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  recommendations jsonb NOT NULL,
  algorithm text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recommendation_type)
);

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund', 'withdrawal', 'deposit')),
  amount numeric NOT NULL CHECK (amount >= 0),
  balance_after numeric NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  status text DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user_item_interactions table
CREATE TABLE IF NOT EXISTS user_item_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('provider', 'job', 'post', 'listing')),
  item_id uuid NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'like', 'bookmark', 'share', 'contact', 'book', 'review', 'follow', 'comment')),
  interaction_weight numeric DEFAULT 1.0,
  session_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create similarity_scores table (for recommendation algorithm)
CREATE TABLE IF NOT EXISTS similarity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('provider', 'job', 'post', 'listing')),
  item_id uuid NOT NULL,
  similar_item_id uuid NOT NULL,
  similarity_score numeric NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  algorithm text DEFAULT 'content_based',
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_type, item_id, similar_item_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_item_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_scores ENABLE ROW LEVEL SECURITY;

-- Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for recommendation_cache
CREATE POLICY "Users can view own recommendation cache"
  ON recommendation_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recommendation cache"
  ON recommendation_cache FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for wallet_transactions
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for user_item_interactions
CREATE POLICY "Users can view own interactions"
  ON user_item_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON user_item_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for similarity_scores
CREATE POLICY "Anyone can view similarity scores"
  ON similarity_scores FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_id ON recommendation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires_at ON recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_item_interactions_user_id ON user_item_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_item_interactions_item ON user_item_interactions(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_similarity_scores_item ON similarity_scores(item_type, item_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_similarity_scores_updated_at ON similarity_scores;
CREATE TRIGGER update_similarity_scores_updated_at
  BEFORE UPDATE ON similarity_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();