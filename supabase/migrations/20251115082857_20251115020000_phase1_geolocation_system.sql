/*
  # Phase 1: Geolocation System

  1. New Tables
    - `user_locations` - Store user location data with PostGIS
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `location` (geography point) - PostGIS geographic point
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `country` (text)
      - `postal_code` (text)
      - `is_primary` (boolean)
      - `is_service_location` (boolean) - For providers
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `provider_service_areas` - Define provider service coverage
      - `id` (uuid, primary key)
      - `provider_id` (uuid, references profiles)
      - `center_location` (geography point)
      - `radius_km` (numeric) - Service radius in kilometers
      - `is_active` (boolean)
      - `created_at` (timestamptz)

  2. Functions
    - `find_nearby_providers` - Search providers by location and radius
    - `calculate_distance` - Calculate distance between two points
    - `is_within_service_area` - Check if location is within provider's service area

  3. Security
    - Enable RLS on all tables
    - Users can manage their own locations
    - Public can search providers by location
*/

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- User Locations Table
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location geography(POINT, 4326),
  address text,
  city text,
  state text,
  country text DEFAULT 'US',
  postal_code text,
  is_primary boolean DEFAULT false,
  is_service_location boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_locations_profile_id ON user_locations(profile_id);
CREATE INDEX idx_user_locations_geography ON user_locations USING GIST(location);
CREATE INDEX idx_user_locations_city ON user_locations(city);
CREATE INDEX idx_user_locations_postal ON user_locations(postal_code);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations"
  ON user_locations FOR SELECT
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own locations"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own locations"
  ON user_locations FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own locations"
  ON user_locations FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
  );

-- Provider Service Areas Table
CREATE TABLE IF NOT EXISTS provider_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  center_location geography(POINT, 4326) NOT NULL,
  radius_km numeric NOT NULL CHECK (radius_km > 0 AND radius_km <= 500),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_provider_service_areas_provider ON provider_service_areas(provider_id);
CREATE INDEX idx_provider_service_areas_geography ON provider_service_areas USING GIST(center_location);

ALTER TABLE provider_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active service areas"
  ON provider_service_areas FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Providers can manage own service areas"
  ON provider_service_areas FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  distance_meters numeric;
BEGIN
  SELECT ST_Distance(
    ST_MakePoint(lon1, lat1)::geography,
    ST_MakePoint(lon2, lat2)::geography
  ) INTO distance_meters;
  
  RETURN distance_meters / 1000;
END;
$$;

-- Function to find nearby providers
CREATE OR REPLACE FUNCTION find_nearby_providers(
  search_lat numeric,
  search_lon numeric,
  radius_km numeric DEFAULT 50,
  category_filter uuid DEFAULT NULL,
  limit_results integer DEFAULT 20
)
RETURNS TABLE(
  provider_id uuid,
  provider_name text,
  distance_km numeric,
  avg_rating numeric,
  total_reviews bigint,
  service_area_radius numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    (ST_Distance(
      ST_MakePoint(search_lon, search_lat)::geography,
      psa.center_location
    ) / 1000)::numeric(10,2) as distance,
    COALESCE(p.average_rating, 0)::numeric(3,2) as rating,
    COALESCE(p.total_reviews::bigint, 0) as reviews,
    psa.radius_km
  FROM profiles p
  INNER JOIN provider_service_areas psa ON psa.provider_id = p.id
  WHERE 
    psa.is_active = true
    AND p.user_type = 'provider'
    AND ST_DWithin(
      psa.center_location,
      ST_MakePoint(search_lon, search_lat)::geography,
      radius_km * 1000
    )
    AND (category_filter IS NULL OR p.id IN (
      SELECT DISTINCT l.provider_id 
      FROM listings l 
      WHERE l.category_id = category_filter
    ))
  GROUP BY p.id, p.full_name, psa.center_location, psa.radius_km, p.average_rating, p.total_reviews
  ORDER BY distance ASC
  LIMIT limit_results;
END;
$$;

-- Function to check if location is within service area
CREATE OR REPLACE FUNCTION is_within_service_area(
  provider_id_param uuid,
  check_lat numeric,
  check_lon numeric
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  is_within boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM provider_service_areas psa
    WHERE 
      psa.provider_id = provider_id_param
      AND psa.is_active = true
      AND ST_DWithin(
        psa.center_location,
        ST_MakePoint(check_lon, check_lat)::geography,
        psa.radius_km * 1000
      )
  ) INTO is_within;
  
  RETURN is_within;
END;
$$;

-- Function to get user's primary location
CREATE OR REPLACE FUNCTION get_user_primary_location(profile_id_param uuid)
RETURNS TABLE(
  latitude numeric,
  longitude numeric,
  address text,
  city text,
  state text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location::geometry)::numeric as lat,
    ST_X(location::geometry)::numeric as lon,
    ul.address,
    ul.city,
    ul.state
  FROM user_locations ul
  WHERE ul.profile_id = profile_id_param AND ul.is_primary = true
  LIMIT 1;
END;
$$;