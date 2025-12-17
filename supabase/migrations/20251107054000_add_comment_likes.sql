/*
  # Add Comment Likes Functionality

  1. New Tables
    - `comment_likes` - Tracks user likes on comments

  2. Changes
    - Ensure likes_count exists on post_comments

  3. Functions
    - Toggle comment like
    - Get user's liked comments

  4. Triggers
    - Auto-update likes_count on like/unlike
    - Prevent duplicate likes

  5. Security
    - RLS policies for comment_likes
*/

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Ensure likes_count exists on post_comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'post_comments' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE post_comments ADD COLUMN likes_count integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment 
  ON comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user 
  ON comment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment 
  ON comment_likes(user_id, comment_id);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comment_likes
CREATE POLICY "Users can view all comment likes"
  ON comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to toggle comment like
CREATE OR REPLACE FUNCTION toggle_comment_like(
  p_comment_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid;
  v_existing_like uuid;
  v_likes_count integer;
  v_is_liked boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if like exists
  SELECT id INTO v_existing_like
  FROM comment_likes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;

  IF v_existing_like IS NOT NULL THEN
    -- Unlike: Delete the like
    DELETE FROM comment_likes WHERE id = v_existing_like;
    v_is_liked := false;
  ELSE
    -- Like: Insert new like
    INSERT INTO comment_likes (comment_id, user_id)
    VALUES (p_comment_id, v_user_id);
    v_is_liked := true;
  END IF;

  -- Get updated likes count
  SELECT likes_count INTO v_likes_count
  FROM post_comments
  WHERE id = p_comment_id;

  -- Return result
  RETURN jsonb_build_object(
    'is_liked', v_is_liked,
    'likes_count', v_likes_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user liked a comment
CREATE OR REPLACE FUNCTION check_comment_liked(
  p_comment_id uuid,
  p_user_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's liked comments for a post
CREATE OR REPLACE FUNCTION get_user_liked_comments(
  p_post_id uuid,
  p_user_id uuid
)
RETURNS TABLE (comment_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT cl.comment_id
  FROM comment_likes cl
  JOIN post_comments pc ON cl.comment_id = pc.id
  WHERE pc.post_id = p_post_id AND cl.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment comment likes count
CREATE OR REPLACE FUNCTION increment_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE post_comments
  SET likes_count = likes_count + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment likes count
CREATE OR REPLACE FUNCTION decrement_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE post_comments
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = OLD.comment_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment likes count
DROP TRIGGER IF EXISTS increment_comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER increment_comment_likes_count_trigger
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_comment_likes_count();

-- Trigger to decrement likes count
DROP TRIGGER IF EXISTS decrement_comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER decrement_comment_likes_count_trigger
  AFTER DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_comment_likes_count();
