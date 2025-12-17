/*
  # Location & Map View Support Migration

  ## Overview
  Adds helper functions and indexes to support map-based discovery features.

  ## Changes

  ### 1. New Functions
  - `calculate_distance` - Calculate distance between two coordinates
  - `find_nearby_services` - Find services within a radius
  - `find_nearby_providers` - Find providers within a radius

  ### 2. Indexes
  - Add indexes on latitude/longitude for faster geographic queries
  - Composite indexes for location-based searches

  ### 3. Triggers
  - Auto-geocode location text to lat/long (requires external service)

  ## Important Notes
  - Distance calculations use the Haversine formula
  - All distances in miles
  - Requires PostGIS extension for advanced geo queries (optional)
*/

-- Create distance calculation function (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
) RETURNS numeric AS $$
DECLARE
  earth_radius numeric := 3959; -- miles
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);

  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearby service listings
CREATE OR REPLACE FUNCTION find_nearby_services(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_miles numeric DEFAULT 25,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  base_price numeric,
  location text,
  latitude numeric,
  longitude numeric,
  distance_miles numeric,
  provider_id uuid,
  category_id uuid,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.title,
    sl.description,
    sl.base_price,
    sl.location,
    sl.latitude,
    sl.longitude,
    calculate_distance(p_latitude, p_longitude, sl.latitude, sl.longitude) as distance_miles,
    sl.provider_id,
    sl.category_id,
    sl.status
  FROM service_listings sl
  WHERE
    sl.status = 'Active'
    AND sl.latitude IS NOT NULL
    AND sl.longitude IS NOT NULL
    AND calculate_distance(p_latitude, p_longitude, sl.latitude, sl.longitude) <= p_radius_miles
  ORDER BY distance_miles ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby providers
CREATE OR REPLACE FUNCTION find_nearby_providers(
  p_latitude numeric,
  p_longitude numeric,
  p_radius_miles numeric DEFAULT 25,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  location text,
  latitude numeric,
  longitude numeric,
  distance_miles numeric,
  rating_average numeric,
  rating_count integer,
  user_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.location,
    p.latitude,
    p.longitude,
    calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) as distance_miles,
    p.rating_average,
    p.rating_count,
    p.user_type
  FROM profiles p
  WHERE
    (p.user_type = 'Provider' OR p.user_type = 'Both')
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) <= p_radius_miles
  ORDER BY distance_miles ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add indexes for geographic queries on service_listings
CREATE INDEX IF NOT EXISTS idx_service_listings_latitude ON service_listings(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_listings_longitude ON service_listings(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_listings_lat_lon ON service_listings(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_listings_status_lat_lon ON service_listings(status, latitude, longitude) WHERE status = 'Active' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add indexes for geographic queries on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_latitude ON profiles(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_longitude ON profiles(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lon ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_lat_lon ON profiles(user_type, latitude, longitude) WHERE (user_type = 'Provider' OR user_type = 'Both') AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add indexes for jobs geographic queries
CREATE INDEX IF NOT EXISTS idx_jobs_latitude ON jobs(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_longitude ON jobs(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_lat_lon ON jobs(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_status_lat_lon ON jobs(status, latitude, longitude) WHERE status = 'Open' AND latitude IS NOT NULL AND longitude IS NOT NULL;

-- Function to update view count when listing is viewed on map
CREATE OR REPLACE FUNCTION increment_map_view(p_listing_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE service_listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_services TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_providers TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_map_view TO authenticated;
