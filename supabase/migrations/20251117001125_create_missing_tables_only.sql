/*
  # Create Missing Tables Only

  Creates user_item_interactions, community_posts, and recommendation_cache tables
*/

-- user_item_interactions
CREATE TABLE IF NOT EXISTS user_item_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid NOT NULL,
  item_type text NOT NULL,
  interaction_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_item_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interactions" 
  ON user_item_interactions FOR ALL 
  TO authenticated 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- community_posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type text DEFAULT 'showcase',
  media_urls text[] DEFAULT '{}',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View active posts" 
  ON community_posts FOR SELECT 
  TO authenticated 
  USING (status = 'active');

CREATE POLICY "Manage own posts" 
  ON community_posts FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Update own posts" 
  ON community_posts FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Delete own posts" 
  ON community_posts FOR DELETE 
  TO authenticated 
  USING (auth.uid() = profile_id);

-- recommendation_cache
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recommendation_type text NOT NULL,
  item_ids uuid[] NOT NULL DEFAULT '{}',
  item_type text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cache" 
  ON recommendation_cache FOR ALL 
  TO authenticated 
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_item_interactions_profile ON user_item_interactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_profile ON community_posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_profile ON recommendation_cache(profile_id);
