/*
  # Add Nested Comment Replies

  1. Changes to Tables
    - Add `parent_comment_id` to `post_comments` for threading
    - Add `reply_count` for tracking nested replies
    - Add `depth` for limiting nesting levels

  2. Indexes
    - Index on parent_comment_id for fast reply lookup
    - Composite index on post_id + parent_comment_id

  3. Functions
    - Get comment thread (all nested replies)
    - Get direct replies for a comment
    - Update reply counts automatically

  4. Triggers
    - Auto-increment reply_count on new reply
    - Auto-decrement reply_count on reply delete
*/

-- Add columns for nested replies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'post_comments' AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE post_comments
    ADD COLUMN parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
    ADD COLUMN reply_count integer DEFAULT 0,
    ADD COLUMN depth integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes for nested comments
CREATE INDEX IF NOT EXISTS idx_comments_parent 
  ON post_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_post_parent 
  ON post_comments(post_id, parent_comment_id);

-- Function to get comment thread (all nested replies)
CREATE OR REPLACE FUNCTION get_comment_thread(
  comment_id uuid,
  max_depth integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  author_id uuid,
  parent_comment_id uuid,
  content text,
  depth integer,
  reply_count integer,
  likes_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Base case: the root comment
    SELECT
      c.id,
      c.post_id,
      c.author_id,
      c.parent_comment_id,
      c.content,
      c.depth,
      c.reply_count,
      c.likes_count,
      c.created_at,
      c.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      0 as level
    FROM post_comments c
    JOIN profiles p ON c.author_id = p.id
    WHERE c.id = comment_id

    UNION ALL

    -- Recursive case: get replies
    SELECT
      c.id,
      c.post_id,
      c.author_id,
      c.parent_comment_id,
      c.content,
      c.depth,
      c.reply_count,
      c.likes_count,
      c.created_at,
      c.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      ct.level + 1
    FROM post_comments c
    JOIN profiles p ON c.author_id = p.id
    JOIN comment_tree ct ON c.parent_comment_id = ct.id
    WHERE ct.level < max_depth
  )
  SELECT 
    ct.id,
    ct.post_id,
    ct.author_id,
    ct.parent_comment_id,
    ct.content,
    ct.depth,
    ct.reply_count,
    ct.likes_count,
    ct.created_at,
    ct.updated_at,
    ct.author
  FROM comment_tree ct
  ORDER BY ct.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get direct replies for a comment
CREATE OR REPLACE FUNCTION get_comment_replies(
  comment_id uuid,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  author_id uuid,
  parent_comment_id uuid,
  content text,
  depth integer,
  reply_count integer,
  likes_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.post_id,
    c.author_id,
    c.parent_comment_id,
    c.content,
    c.depth,
    c.reply_count,
    c.likes_count,
    c.created_at,
    c.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'user_type', p.user_type,
      'is_verified', p.is_verified
    ) as author
  FROM post_comments c
  JOIN profiles p ON c.author_id = p.id
  WHERE c.parent_comment_id = comment_id
  ORDER BY c.created_at ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reply count
CREATE OR REPLACE FUNCTION increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    UPDATE post_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement reply count
CREATE OR REPLACE FUNCTION decrement_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.parent_comment_id IS NOT NULL THEN
    UPDATE post_comments
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment reply count
DROP TRIGGER IF EXISTS increment_reply_count_trigger ON post_comments;
CREATE TRIGGER increment_reply_count_trigger
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION increment_reply_count();

-- Trigger to auto-decrement reply count
DROP TRIGGER IF EXISTS decrement_reply_count_trigger ON post_comments;
CREATE TRIGGER decrement_reply_count_trigger
  AFTER DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION decrement_reply_count();

-- Function to validate comment depth
CREATE OR REPLACE FUNCTION validate_comment_depth()
RETURNS TRIGGER AS $$
DECLARE
  parent_depth integer;
  max_depth integer := 5;
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT depth INTO parent_depth
    FROM post_comments
    WHERE id = NEW.parent_comment_id;

    IF parent_depth >= max_depth THEN
      RAISE EXCEPTION 'Maximum comment nesting depth (%) exceeded', max_depth;
    END IF;

    NEW.depth := parent_depth + 1;
  ELSE
    NEW.depth := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate and set comment depth
DROP TRIGGER IF EXISTS validate_comment_depth_trigger ON post_comments;
CREATE TRIGGER validate_comment_depth_trigger
  BEFORE INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_comment_depth();
