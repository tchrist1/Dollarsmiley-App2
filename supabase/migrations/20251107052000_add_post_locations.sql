/*
  # Add Location Tagging to Posts

  1. Changes to Tables
    - Add location columns to `community_posts`
      - `location_name` (text) - Display name (e.g., "Central Park, NY")
      - `location_latitude` (double precision) - Latitude coordinate
      - `location_longitude` (double precision) - Longitude coordinate
      - `location_data` (jsonb) - Additional location metadata

  2. Indexes
    - Spatial index for location queries
    - Index on location_name for searching

  3. Functions
    - Get nearby posts by location
    - Search posts by location name
*/

-- Add location columns to community_posts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'community_posts' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE community_posts
    ADD COLUMN location_name text,
    ADD COLUMN location_latitude double precision,
    ADD COLUMN location_longitude double precision,
    ADD COLUMN location_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for location queries
CREATE INDEX IF NOT EXISTS idx_posts_location_name ON community_posts(location_name);
CREATE INDEX IF NOT EXISTS idx_posts_location_coords 
  ON community_posts(location_latitude, location_longitude)
  WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

-- Function to get nearby posts
CREATE OR REPLACE FUNCTION get_nearby_posts(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision DEFAULT 50,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  content text,
  media_urls jsonb,
  post_type text,
  location_name text,
  location_latitude double precision,
  location_longitude double precision,
  distance_km double precision,
  likes_count integer,
  comments_count integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.author_id,
    cp.content,
    cp.media_urls,
    cp.post_type,
    cp.location_name,
    cp.location_latitude,
    cp.location_longitude,
    -- Calculate distance using Haversine formula
    (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(cp.location_latitude)) * 
        cos(radians(cp.location_longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(cp.location_latitude))
      )
    ) AS distance_km,
    cp.likes_count,
    cp.comments_count,
    cp.created_at
  FROM community_posts cp
  WHERE
    cp.location_latitude IS NOT NULL
    AND cp.location_longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(cp.location_latitude)) * 
        cos(radians(cp.location_longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(cp.location_latitude))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search posts by location name
CREATE OR REPLACE FUNCTION search_posts_by_location(
  search_query text,
  result_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  author_id uuid,
  content text,
  media_urls jsonb,
  post_type text,
  location_name text,
  location_latitude double precision,
  location_longitude double precision,
  likes_count integer,
  comments_count integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.id,
    cp.author_id,
    cp.content,
    cp.media_urls,
    cp.post_type,
    cp.location_name,
    cp.location_latitude,
    cp.location_longitude,
    cp.likes_count,
    cp.comments_count,
    cp.created_at
  FROM community_posts cp
  WHERE
    cp.location_name IS NOT NULL
    AND cp.location_name ILIKE '%' || search_query || '%'
  ORDER BY cp.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
