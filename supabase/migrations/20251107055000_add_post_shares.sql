/*
  # Add Post Share Functionality

  1. New Tables
    - `post_shares` - Tracks when users share posts

  2. Changes
    - Add shares_count to community_posts

  3. Functions
    - Record post share
    - Get share analytics

  4. Triggers
    - Auto-increment shares_count

  5. Security
    - RLS policies for post_shares
*/

-- Create post_shares table
CREATE TABLE IF NOT EXISTS post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_method text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add shares_count to community_posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'shares_count'
  ) THEN
    ALTER TABLE community_posts ADD COLUMN shares_count integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_shares_post 
  ON post_shares(post_id);

CREATE INDEX IF NOT EXISTS idx_post_shares_user 
  ON post_shares(user_id);

CREATE INDEX IF NOT EXISTS idx_post_shares_created 
  ON post_shares(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_shares_method 
  ON post_shares(share_method);

-- Enable RLS
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all shares"
  ON post_shares FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create shares"
  ON post_shares FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to record post share
CREATE OR REPLACE FUNCTION record_post_share(
  p_post_id uuid,
  p_share_method text
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_share_id uuid;
  v_shares_count integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert share record
  INSERT INTO post_shares (post_id, user_id, share_method)
  VALUES (p_post_id, v_user_id, p_share_method)
  RETURNING id INTO v_share_id;

  -- Get updated shares count
  SELECT shares_count INTO v_shares_count
  FROM community_posts
  WHERE id = p_post_id;

  -- Return result
  RETURN jsonb_build_object(
    'share_id', v_share_id,
    'shares_count', v_shares_count,
    'success', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get share analytics for a post
CREATE OR REPLACE FUNCTION get_post_share_analytics(
  p_post_id uuid
)
RETURNS TABLE (
  total_shares bigint,
  share_method text,
  method_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) OVER() as total_shares,
    ps.share_method,
    COUNT(*) as method_count
  FROM post_shares ps
  WHERE ps.post_id = p_post_id
  GROUP BY ps.share_method
  ORDER BY method_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's share history
CREATE OR REPLACE FUNCTION get_user_share_history(
  p_user_id uuid,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  share_id uuid,
  post_id uuid,
  share_method text,
  shared_at timestamptz,
  post_author jsonb,
  post_content text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id as share_id,
    ps.post_id,
    ps.share_method,
    ps.created_at as shared_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url
    ) as post_author,
    cp.content as post_content
  FROM post_shares ps
  JOIN community_posts cp ON ps.post_id = cp.id
  JOIN profiles p ON cp.author_id = p.id
  WHERE ps.user_id = p_user_id
  ORDER BY ps.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment shares count
CREATE OR REPLACE FUNCTION increment_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts
  SET shares_count = shares_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment shares count
DROP TRIGGER IF EXISTS increment_shares_count_trigger ON post_shares;
CREATE TRIGGER increment_shares_count_trigger
  AFTER INSERT ON post_shares
  FOR EACH ROW
  EXECUTE FUNCTION increment_shares_count();

-- Function to get trending shared posts
CREATE OR REPLACE FUNCTION get_trending_shared_posts(
  days_back integer DEFAULT 7,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  post_id uuid,
  shares_count bigint,
  recent_shares bigint,
  post_content text,
  author jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id as post_id,
    cp.shares_count::bigint,
    COUNT(ps.id) as recent_shares,
    cp.content as post_content,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'is_verified', p.is_verified
    ) as author,
    cp.created_at
  FROM community_posts cp
  JOIN profiles p ON cp.author_id = p.id
  LEFT JOIN post_shares ps ON cp.id = ps.post_id 
    AND ps.created_at >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY cp.id, p.id
  HAVING COUNT(ps.id) > 0
  ORDER BY recent_shares DESC, cp.shares_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
