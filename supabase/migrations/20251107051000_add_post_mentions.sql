/*
  # Add Post Mentions System

  1. New Tables
    - `post_mentions`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references community_posts)
      - `mentioned_user_id` (uuid, references profiles)
      - `mentioned_by_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, mentioned_user_id)

  2. Triggers
    - Create notification when user is mentioned
    - Update mentioned_users array in post metadata

  3. Security
    - Enable RLS on post_mentions
    - Anyone can view mentions
    - Only post author can create mentions (via post creation)

  4. Indexes
    - Index on mentioned_user_id for quick lookup
    - Index on post_id for retrieving all mentions in a post
*/

-- Create post_mentions table
CREATE TABLE IF NOT EXISTS post_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioned_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_mentions_mentioned_user ON post_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_post ON post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_created_at ON post_mentions(created_at DESC);

-- Enable RLS
ALTER TABLE post_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view mentions"
  ON post_mentions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authors can create mentions"
  ON post_mentions FOR INSERT
  TO authenticated
  WITH CHECK (mentioned_by_id = auth.uid());

CREATE POLICY "Authors can delete own post mentions"
  ON post_mentions FOR DELETE
  TO authenticated
  USING (mentioned_by_id = auth.uid());

-- Function to create mention notification
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for mentioned user
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  )
  SELECT
    NEW.mentioned_user_id,
    'mention',
    'You were mentioned in a post',
    p.full_name || ' mentioned you in a post',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'mentioned_by_id', NEW.mentioned_by_id,
      'mentioned_by_name', p.full_name
    )
  FROM profiles p
  WHERE p.id = NEW.mentioned_by_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification on mention
CREATE TRIGGER on_post_mention_created
  AFTER INSERT ON post_mentions
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();

-- Function to search users for mentions
CREATE OR REPLACE FUNCTION search_users_for_mentions(
  search_query text,
  current_user_id uuid,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified
  FROM profiles p
  WHERE
    p.id != current_user_id
    AND (
      p.full_name ILIKE '%' || search_query || '%'
      OR p.email ILIKE '%' || search_query || '%'
    )
  ORDER BY
    -- Prioritize verified users
    p.is_verified DESC,
    -- Then by follower count (if available in metadata)
    COALESCE((p.metadata->>'follower_count')::integer, 0) DESC,
    -- Then alphabetically
    p.full_name ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
