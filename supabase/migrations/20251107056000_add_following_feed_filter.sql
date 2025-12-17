/*
  # Add Following-Only Feed Filter

  1. Functions
    - Get posts from followed users only
    - Get feed with filter options
    - Check if user follows another user

  2. Performance
    - Optimized queries with joins
    - Indexed lookups
    - Pagination support
*/

-- Function to get posts from followed users only
CREATE OR REPLACE FUNCTION get_following_feed(
  p_user_id uuid,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  content text,
  media_urls text[],
  location jsonb,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb,
  is_following boolean,
  is_liked boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.author_id,
    cp.content,
    cp.media_urls,
    cp.location,
    cp.likes_count,
    cp.comments_count,
    cp.shares_count,
    cp.created_at,
    cp.updated_at,
    jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'user_type', p.user_type,
      'is_verified', p.is_verified
    ) as author,
    true as is_following,
    EXISTS (
      SELECT 1 FROM post_likes pl
      WHERE pl.post_id = cp.id AND pl.user_id = p_user_id
    ) as is_liked
  FROM community_posts cp
  JOIN profiles p ON cp.author_id = p.id
  JOIN user_follows uf ON cp.author_id = uf.following_id
  WHERE uf.follower_id = p_user_id
  ORDER BY cp.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feed with multiple filter options
CREATE OR REPLACE FUNCTION get_filtered_feed(
  p_user_id uuid,
  p_filter_type text DEFAULT 'all',
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  content text,
  media_urls text[],
  location jsonb,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  author jsonb,
  is_following boolean,
  is_liked boolean
) AS $$
BEGIN
  -- Following-only feed
  IF p_filter_type = 'following' THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.author_id,
      cp.content,
      cp.media_urls,
      cp.location,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.created_at,
      cp.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      true as is_following,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = cp.id AND pl.user_id = p_user_id
      ) as is_liked
    FROM community_posts cp
    JOIN profiles p ON cp.author_id = p.id
    JOIN user_follows uf ON cp.author_id = uf.following_id
    WHERE uf.follower_id = p_user_id
    ORDER BY cp.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;

  -- Trending feed (most engagement)
  ELSIF p_filter_type = 'trending' THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.author_id,
      cp.content,
      cp.media_urls,
      cp.location,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.created_at,
      cp.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      EXISTS (
        SELECT 1 FROM user_follows uf
        WHERE uf.follower_id = p_user_id AND uf.following_id = cp.author_id
      ) as is_following,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = cp.id AND pl.user_id = p_user_id
      ) as is_liked
    FROM community_posts cp
    JOIN profiles p ON cp.author_id = p.id
    WHERE cp.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY (cp.likes_count + cp.comments_count * 2 + cp.shares_count * 3) DESC, cp.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;

  -- Recent feed (newest first)
  ELSIF p_filter_type = 'recent' THEN
    RETURN QUERY
    SELECT
      cp.id,
      cp.author_id,
      cp.content,
      cp.media_urls,
      cp.location,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.created_at,
      cp.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      EXISTS (
        SELECT 1 FROM user_follows uf
        WHERE uf.follower_id = p_user_id AND uf.following_id = cp.author_id
      ) as is_following,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = cp.id AND pl.user_id = p_user_id
      ) as is_liked
    FROM community_posts cp
    JOIN profiles p ON cp.author_id = p.id
    ORDER BY cp.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;

  -- All posts (default)
  ELSE
    RETURN QUERY
    SELECT
      cp.id,
      cp.author_id,
      cp.content,
      cp.media_urls,
      cp.location,
      cp.likes_count,
      cp.comments_count,
      cp.shares_count,
      cp.created_at,
      cp.updated_at,
      jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'user_type', p.user_type,
        'is_verified', p.is_verified
      ) as author,
      EXISTS (
        SELECT 1 FROM user_follows uf
        WHERE uf.follower_id = p_user_id AND uf.following_id = cp.author_id
      ) as is_following,
      EXISTS (
        SELECT 1 FROM post_likes pl
        WHERE pl.post_id = cp.id AND pl.user_id = p_user_id
      ) as is_liked
    FROM community_posts cp
    JOIN profiles p ON cp.author_id = p.id
    ORDER BY cp.created_at DESC
    LIMIT result_limit
    OFFSET result_offset;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get count of following feed posts
CREATE OR REPLACE FUNCTION get_following_feed_count(
  p_user_id uuid
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM community_posts cp
  JOIN user_follows uf ON cp.author_id = uf.following_id
  WHERE uf.follower_id = p_user_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is following anyone
CREATE OR REPLACE FUNCTION is_following_anyone(
  p_user_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_follows
    WHERE follower_id = p_user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suggested users to follow (users with most followers)
CREATE OR REPLACE FUNCTION get_suggested_users_to_follow(
  p_user_id uuid,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  posts_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.user_type,
    p.is_verified,
    p.followers_count,
    COUNT(cp.id) as posts_count
  FROM profiles p
  LEFT JOIN community_posts cp ON p.id = cp.author_id
  WHERE p.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_follows uf
      WHERE uf.follower_id = p_user_id AND uf.following_id = p.id
    )
  GROUP BY p.id
  ORDER BY p.followers_count DESC, posts_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
