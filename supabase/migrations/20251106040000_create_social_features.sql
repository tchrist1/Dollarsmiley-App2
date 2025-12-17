/*
  # Social Features Schema

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `follower_id` (uuid, references profiles)
      - `following_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (follower_id, following_id)

    - `community_posts`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references profiles)
      - `content` (text)
      - `media_urls` (jsonb array)
      - `post_type` (text: 'update', 'showcase', 'question', 'tip')
      - `listing_id` (uuid, optional references service_listings)
      - `likes_count` (integer)
      - `comments_count` (integer)
      - `shares_count` (integer)
      - `is_pinned` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references community_posts)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id)

    - `post_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references community_posts)
      - `author_id` (uuid, references profiles)
      - `content` (text)
      - `parent_comment_id` (uuid, optional self-reference)
      - `likes_count` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `comment_likes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references post_comments)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (comment_id, user_id)

    - `feed_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `activity_type` (text: 'post', 'follow', 'like', 'comment', 'booking')
      - `post_id` (uuid, optional references community_posts)
      - `related_user_id` (uuid, optional references profiles)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can follow/unfollow others
    - Users can create, edit, delete own posts
    - Anyone can view public posts
    - Users can like and comment on posts

  3. Indexes
    - Indexes for efficient querying and feed generation
*/

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  UNIQUE(follower_id, following_id)
);

-- Create community_posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  media_urls jsonb DEFAULT '[]'::jsonb,
  post_type text DEFAULT 'update' CHECK (post_type IN ('update', 'showcase', 'question', 'tip', 'achievement')),
  listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create feed_activities table
CREATE TABLE IF NOT EXISTS feed_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('post', 'follow', 'like', 'comment', 'booking', 'review', 'badge')),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON community_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_feed_activities_user ON feed_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_activities_created_at ON feed_activities(created_at DESC);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for follows
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view posts"
  ON community_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON community_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON community_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- RLS Policies for post_likes
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for post_comments
CREATE POLICY "Anyone can view comments"
  ON post_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- RLS Policies for comment_likes
CREATE POLICY "Anyone can view comment likes"
  ON comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for feed_activities
CREATE POLICY "Users can view activities"
  ON feed_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create activities"
  ON feed_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for post likes count
DROP TRIGGER IF EXISTS post_likes_count_trigger ON post_likes;
CREATE TRIGGER post_likes_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

-- Function to update post comments count
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for post comments count
DROP TRIGGER IF EXISTS post_comments_count_trigger ON post_comments;
CREATE TRIGGER post_comments_count_trigger
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_count();

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_comments
    SET likes_count = likes_count - 1
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment likes count
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- Function to create feed activity on post
CREATE OR REPLACE FUNCTION create_post_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_activities (user_id, activity_type, post_id, metadata)
  VALUES (
    NEW.author_id,
    'post',
    NEW.id,
    jsonb_build_object('post_type', NEW.post_type)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for post activity
DROP TRIGGER IF EXISTS create_post_activity_trigger ON community_posts;
CREATE TRIGGER create_post_activity_trigger
  AFTER INSERT ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_post_activity();

-- Function to create feed activity on follow
CREATE OR REPLACE FUNCTION create_follow_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO feed_activities (user_id, activity_type, related_user_id)
  VALUES (NEW.follower_id, 'follow', NEW.following_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follow activity
DROP TRIGGER IF EXISTS create_follow_activity_trigger ON follows;
CREATE TRIGGER create_follow_activity_trigger
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_activity();

-- Function to get user's feed
CREATE OR REPLACE FUNCTION get_user_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE (
  activity_id uuid,
  activity_type text,
  created_at timestamptz,
  post_data jsonb,
  user_data jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.id as activity_id,
    fa.activity_type,
    fa.created_at,
    CASE
      WHEN fa.post_id IS NOT NULL THEN
        jsonb_build_object(
          'id', cp.id,
          'content', cp.content,
          'media_urls', cp.media_urls,
          'post_type', cp.post_type,
          'likes_count', cp.likes_count,
          'comments_count', cp.comments_count,
          'created_at', cp.created_at
        )
      ELSE NULL
    END as post_data,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'user_type', p.user_type,
      'is_verified', p.is_verified
    ) as user_data
  FROM feed_activities fa
  LEFT JOIN community_posts cp ON fa.post_id = cp.id
  LEFT JOIN profiles p ON fa.user_id = p.id
  WHERE fa.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = p_user_id
    UNION
    SELECT p_user_id
  )
  ORDER BY fa.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get follow suggestions
CREATE OR REPLACE FUNCTION get_follow_suggestions(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  rating_average numeric,
  total_bookings integer,
  mutual_followers_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as profile_id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified,
    p.rating_average,
    p.total_bookings,
    COUNT(DISTINCT f2.follower_id) as mutual_followers_count
  FROM profiles p
  LEFT JOIN follows f2 ON f2.following_id = p.id
    AND f2.follower_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
  WHERE p.id != p_user_id
    AND p.id NOT IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
    )
    AND p.user_type IN ('Provider', 'Both')
    AND p.is_verified = true
  GROUP BY p.id
  ORDER BY mutual_followers_count DESC, p.rating_average DESC, p.total_bookings DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add follower/following counts to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
    ALTER TABLE profiles ADD COLUMN followers_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
    ALTER TABLE profiles ADD COLUMN following_count integer DEFAULT 0;
  END IF;
END $$;

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follower counts
DROP TRIGGER IF EXISTS update_follower_counts_trigger ON follows;
CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Initialize follower counts for existing users
UPDATE profiles SET followers_count = (
  SELECT COUNT(*) FROM follows WHERE following_id = profiles.id
);

UPDATE profiles SET following_count = (
  SELECT COUNT(*) FROM follows WHERE follower_id = profiles.id
);
