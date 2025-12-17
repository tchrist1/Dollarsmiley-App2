/*
  # Fix find_nearby_services Function

  ## Overview
  Ensures the find_nearby_services function exists with correct signature and permissions.

  ## Changes
  1. Recreate calculate_distance function
  2. Recreate find_nearby_services function with proper return type
  3. Grant proper permissions to authenticated and anon users

  ## Notes
  - This migration is idempotent and can be run multiple times
  - Function supports optional parameters with defaults
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
$$ LANGUAGE plpgsql STABLE;

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
    (p.user_type = 'Provider' OR p.user_type = 'Hybrid')
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND calculate_distance(p_latitude, p_longitude, p.latitude, p.longitude) <= p_radius_miles
  ORDER BY distance_miles ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_services TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_providers TO authenticated, anon;
