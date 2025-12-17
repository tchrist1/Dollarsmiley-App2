/*
  # Add Follower/Following Lists

  1. Functions
    - Get user's followers list
    - Get user's following list
    - Get mutual follows
    - Search followers/following

  2. Performance
    - Optimized queries with pagination
    - Profile data included
    - Follow status checks
*/

-- Function to get user's followers
CREATE OR REPLACE FUNCTION get_user_followers(
  p_user_id uuid,
  p_current_user_id uuid DEFAULT NULL,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  following_count integer,
  is_following boolean,
  is_followed_by boolean,
  followed_at timestamptz
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
    p.following_count,
    CASE 
      WHEN p_current_user_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_follows uf2
        WHERE uf2.follower_id = p_current_user_id 
          AND uf2.following_id = p.id
      )
    END as is_following,
    true as is_followed_by,
    uf.created_at as followed_at
  FROM user_follows uf
  JOIN profiles p ON uf.follower_id = p.id
  WHERE uf.following_id = p_user_id
    AND (
      search_query IS NULL 
      OR p.full_name ILIKE '%' || search_query || '%'
    )
  ORDER BY uf.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's following
CREATE OR REPLACE FUNCTION get_user_following(
  p_user_id uuid,
  p_current_user_id uuid DEFAULT NULL,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  following_count integer,
  is_following boolean,
  is_followed_by boolean,
  followed_at timestamptz
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
    p.following_count,
    true as is_following,
    CASE 
      WHEN p_current_user_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_follows uf2
        WHERE uf2.follower_id = p.id 
          AND uf2.following_id = p_current_user_id
      )
    END as is_followed_by,
    uf.created_at as followed_at
  FROM user_follows uf
  JOIN profiles p ON uf.following_id = p.id
  WHERE uf.follower_id = p_user_id
    AND (
      search_query IS NULL 
      OR p.full_name ILIKE '%' || search_query || '%'
    )
  ORDER BY uf.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual follows (friends)
CREATE OR REPLACE FUNCTION get_mutual_follows(
  p_user_id uuid,
  result_limit integer DEFAULT 20,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  user_type text,
  is_verified boolean,
  followers_count integer,
  following_count integer,
  mutual_since timestamptz
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
    p.following_count,
    GREATEST(uf1.created_at, uf2.created_at) as mutual_since
  FROM user_follows uf1
  JOIN user_follows uf2 
    ON uf1.following_id = uf2.follower_id 
    AND uf1.follower_id = uf2.following_id
  JOIN profiles p ON uf1.following_id = p.id
  WHERE uf1.follower_id = p_user_id
  ORDER BY mutual_since DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get followers count
CREATE OR REPLACE FUNCTION get_followers_count(
  p_user_id uuid
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM user_follows
  WHERE following_id = p_user_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(
  p_user_id uuid
)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM user_follows
  WHERE follower_id = p_user_id;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if users follow each other (mutual)
CREATE OR REPLACE FUNCTION are_mutual_follows(
  p_user_id_1 uuid,
  p_user_id_2 uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_follows uf1
    JOIN user_follows uf2 
      ON uf1.follower_id = uf2.following_id 
      AND uf1.following_id = uf2.follower_id
    WHERE uf1.follower_id = p_user_id_1 
      AND uf1.following_id = p_user_id_2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get followers you might know (mutual connections)
CREATE OR REPLACE FUNCTION get_followers_you_might_know(
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
  mutual_followers_count bigint
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
    COUNT(DISTINCT uf2.follower_id) as mutual_followers_count
  FROM profiles p
  JOIN user_follows uf1 ON p.id = uf1.follower_id
  JOIN user_follows uf2 
    ON uf1.following_id = uf2.following_id
    AND uf2.follower_id IN (
      SELECT following_id FROM user_follows WHERE follower_id = p_user_id
    )
  WHERE p.id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_follows 
      WHERE follower_id = p_user_id AND following_id = p.id
    )
  GROUP BY p.id
  HAVING COUNT(DISTINCT uf2.follower_id) > 0
  ORDER BY mutual_followers_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
