/*
  # Geolocation Foundation System

  1. New Tables
    - `provider_locations` - GPS coordinates and service areas for providers
    - `service_areas` - Defined service boundaries (polygons)
    - `location_searches` - Track location-based searches for analytics
    - `distance_cache` - Cache frequently calculated distances

  2. Changes
    - Add location fields to profiles table
    - Add location fields to service_listings table
    - Add location fields to jobs table

  3. Security
    - Enable RLS on all new tables
    - Add policies for location data access

  4. Functions
    - Distance calculation function (Haversine formula)
    - Proximity search function
    - Service area check function

  5. Indexes
    - Spatial indexes for fast proximity queries
    - Composite indexes for common search patterns
*/

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_lat numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_lng numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text,
ADD COLUMN IF NOT EXISTS location_country text DEFAULT 'US',
ADD COLUMN IF NOT EXISTS location_postal_code text,
ADD COLUMN IF NOT EXISTS service_radius_miles integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS location_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

-- Add spatial point column for efficient queries
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location_point geography(POINT, 4326);

-- Create function to update location_point when lat/lng changes
CREATE OR REPLACE FUNCTION update_profile_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update location_point
DROP TRIGGER IF EXISTS update_profile_location_point_trigger ON profiles;
CREATE TRIGGER update_profile_location_point_trigger
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_location_point();

-- Add location fields to service_listings
ALTER TABLE service_listings
ADD COLUMN IF NOT EXISTS location_lat numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_lng numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text,
ADD COLUMN IF NOT EXISTS service_radius_miles integer,
ADD COLUMN IF NOT EXISTS location_point geography(POINT, 4326);

-- Create trigger for service_listings location_point
CREATE OR REPLACE FUNCTION update_listing_location_point()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.location_point := ST_SetSRID(ST_MakePoint(NEW.location_lng, NEW.location_lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_listing_location_point_trigger ON service_listings;
CREATE TRIGGER update_listing_location_point_trigger
  BEFORE INSERT OR UPDATE OF location_lat, location_lng ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_location_point();

-- Add location fields to jobs
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS location_lat numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_lng numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_state text;

-- Provider Locations table (detailed location data)
CREATE TABLE IF NOT EXISTS provider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location_type text NOT NULL DEFAULT 'primary', -- primary, secondary, service_area
  location_name text, -- e.g., "Main Shop", "Mobile Unit"
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text DEFAULT 'US',
  postal_code text,
  location_point geography(POINT, 4326),
  service_radius_miles integer DEFAULT 25,
  is_active boolean DEFAULT true,
  is_primary boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Service Areas table (polygon boundaries)
CREATE TABLE IF NOT EXISTS service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  area_name text NOT NULL,
  area_type text DEFAULT 'radius', -- radius, polygon, multi_point
  center_lat numeric(10, 7),
  center_lng numeric(10, 7),
  radius_miles integer,
  boundary_polygon geography(POLYGON, 4326),
  cities_covered text[],
  zip_codes_covered text[],
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location Searches table (analytics)
CREATE TABLE IF NOT EXISTS location_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  search_lat numeric(10, 7) NOT NULL,
  search_lng numeric(10, 7) NOT NULL,
  search_address text,
  search_city text,
  search_state text,
  radius_miles integer,
  category_id uuid,
  results_count integer,
  filters_applied jsonb,
  created_at timestamptz DEFAULT now()
);

-- Distance Cache table (performance optimization)
CREATE TABLE IF NOT EXISTS distance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_lat numeric(10, 7) NOT NULL,
  from_lng numeric(10, 7) NOT NULL,
  to_lat numeric(10, 7) NOT NULL,
  to_lng numeric(10, 7) NOT NULL,
  distance_miles numeric(10, 2),
  distance_km numeric(10, 2),
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_location_point ON profiles USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_profiles_location_enabled ON profiles(location_enabled) WHERE location_enabled = true;
CREATE INDEX IF NOT EXISTS idx_profiles_location_city_state ON profiles(location_city, location_state);

CREATE INDEX IF NOT EXISTS idx_service_listings_location_point ON service_listings USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_service_listings_location_city ON service_listings(location_city, location_state);

CREATE INDEX IF NOT EXISTS idx_provider_locations_point ON provider_locations USING GIST (location_point);
CREATE INDEX IF NOT EXISTS idx_provider_locations_provider ON provider_locations(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_locations_active ON provider_locations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_areas_provider ON service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_boundary ON service_areas USING GIST (boundary_polygon);

CREATE INDEX IF NOT EXISTS idx_location_searches_created ON location_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_searches_user ON location_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_distance_cache_lookup ON distance_cache(from_lat, from_lng, to_lat, to_lng);
CREATE INDEX IF NOT EXISTS idx_distance_cache_expires ON distance_cache(expires_at);

-- Enable RLS
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE distance_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_locations
CREATE POLICY "Anyone can view active provider locations"
  ON provider_locations FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Providers can manage own locations"
  ON provider_locations FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for service_areas
CREATE POLICY "Anyone can view active service areas"
  ON service_areas FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Providers can manage own service areas"
  ON service_areas FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- RLS Policies for location_searches
CREATE POLICY "Users can view own location searches"
  ON location_searches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can create location searches"
  ON location_searches FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- RLS Policies for distance_cache
CREATE POLICY "Anyone can read distance cache"
  ON distance_cache FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "System can manage distance cache"
  ON distance_cache FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function: Calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
RETURNS numeric AS $$
DECLARE
  earth_radius_miles constant numeric := 3959;
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  -- Handle NULL values
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);

  a := sin(dlat / 2) * sin(dlat / 2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng / 2) * sin(dlng / 2);

  c := 2 * atan2(sqrt(a), sqrt(1 - a));

  RETURN earth_radius_miles * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Search providers by proximity
CREATE OR REPLACE FUNCTION search_providers_nearby(
  search_lat numeric,
  search_lng numeric,
  radius_miles integer DEFAULT 25,
  category_filter uuid DEFAULT NULL,
  limit_results integer DEFAULT 50
)
RETURNS TABLE (
  provider_id uuid,
  full_name text,
  avatar_url text,
  location_city text,
  location_state text,
  distance_miles numeric,
  service_radius_miles integer,
  rating numeric,
  total_reviews integer,
  is_verified boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as provider_id,
    p.full_name,
    p.avatar_url,
    p.location_city,
    p.location_state,
    calculate_distance_miles(search_lat, search_lng, p.location_lat, p.location_lng) as distance_miles,
    p.service_radius_miles,
    p.rating,
    p.total_reviews,
    p.is_verified
  FROM profiles p
  WHERE
    p.user_type = 'provider'
    AND p.is_active = true
    AND p.location_enabled = true
    AND p.location_lat IS NOT NULL
    AND p.location_lng IS NOT NULL
    AND calculate_distance_miles(search_lat, search_lng, p.location_lat, p.location_lng) <= radius_miles
    AND (category_filter IS NULL OR EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.provider_id = p.id
      AND sl.category_id = category_filter
      AND sl.is_active = true
    ))
  ORDER BY distance_miles ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Function: Search listings by proximity
CREATE OR REPLACE FUNCTION search_listings_nearby(
  search_lat numeric,
  search_lng numeric,
  radius_miles integer DEFAULT 25,
  category_filter uuid DEFAULT NULL,
  min_rating numeric DEFAULT NULL,
  max_price numeric DEFAULT NULL,
  limit_results integer DEFAULT 50
)
RETURNS TABLE (
  listing_id uuid,
  title text,
  description text,
  price numeric,
  provider_id uuid,
  provider_name text,
  location_city text,
  distance_miles numeric,
  rating numeric,
  total_reviews integer,
  image_urls text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id as listing_id,
    sl.title,
    sl.description,
    sl.price,
    sl.provider_id,
    p.full_name as provider_name,
    COALESCE(sl.location_city, p.location_city) as location_city,
    calculate_distance_miles(
      search_lat,
      search_lng,
      COALESCE(sl.location_lat, p.location_lat),
      COALESCE(sl.location_lng, p.location_lng)
    ) as distance_miles,
    sl.rating,
    sl.total_reviews,
    sl.image_urls
  FROM service_listings sl
  JOIN profiles p ON p.id = sl.provider_id
  WHERE
    sl.is_active = true
    AND p.is_active = true
    AND (
      (sl.location_lat IS NOT NULL AND sl.location_lng IS NOT NULL) OR
      (p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL)
    )
    AND calculate_distance_miles(
      search_lat,
      search_lng,
      COALESCE(sl.location_lat, p.location_lat),
      COALESCE(sl.location_lng, p.location_lng)
    ) <= radius_miles
    AND (category_filter IS NULL OR sl.category_id = category_filter)
    AND (min_rating IS NULL OR sl.rating >= min_rating)
    AND (max_price IS NULL OR sl.price <= max_price)
  ORDER BY distance_miles ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if point is within service area
CREATE OR REPLACE FUNCTION is_in_service_area(
  check_lat numeric,
  check_lng numeric,
  provider_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  in_area boolean := false;
  area_record record;
BEGIN
  -- Check radius-based service areas
  FOR area_record IN
    SELECT * FROM service_areas
    WHERE provider_id = provider_id_param
    AND is_active = true
    AND area_type = 'radius'
  LOOP
    IF calculate_distance_miles(
      check_lat, check_lng,
      area_record.center_lat, area_record.center_lng
    ) <= area_record.radius_miles THEN
      RETURN true;
    END IF;
  END LOOP;

  -- Check polygon-based service areas
  FOR area_record IN
    SELECT * FROM service_areas
    WHERE provider_id = provider_id_param
    AND is_active = true
    AND area_type = 'polygon'
    AND boundary_polygon IS NOT NULL
  LOOP
    IF ST_Contains(
      area_record.boundary_polygon::geometry,
      ST_SetSRID(ST_MakePoint(check_lng, check_lat), 4326)::geometry
    ) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN in_area;
END;
$$ LANGUAGE plpgsql;

-- Function: Get providers serving a location
CREATE OR REPLACE FUNCTION get_providers_serving_location(
  check_lat numeric,
  check_lng numeric,
  category_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  provider_id uuid,
  full_name text,
  distance_miles numeric,
  service_radius_miles integer,
  rating numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as provider_id,
    p.full_name,
    calculate_distance_miles(check_lat, check_lng, p.location_lat, p.location_lng) as distance_miles,
    p.service_radius_miles,
    p.rating
  FROM profiles p
  WHERE
    p.user_type = 'provider'
    AND p.is_active = true
    AND p.location_enabled = true
    AND p.location_lat IS NOT NULL
    AND p.location_lng IS NOT NULL
    AND (
      calculate_distance_miles(check_lat, check_lng, p.location_lat, p.location_lng) <= p.service_radius_miles
      OR
      is_in_service_area(check_lat, check_lng, p.id)
    )
    AND (category_filter IS NULL OR EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.provider_id = p.id
      AND sl.category_id = category_filter
      AND sl.is_active = true
    ))
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean expired distance cache
CREATE OR REPLACE FUNCTION clean_expired_distance_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM distance_cache
  WHERE expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create view for nearby providers (commonly used query)
CREATE OR REPLACE VIEW nearby_providers_view AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.location_lat,
  p.location_lng,
  p.location_city,
  p.location_state,
  p.location_address,
  p.service_radius_miles,
  p.rating,
  p.total_reviews,
  p.is_verified,
  p.user_type,
  COUNT(DISTINCT sl.id) as total_listings,
  ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as service_categories
FROM profiles p
LEFT JOIN service_listings sl ON sl.provider_id = p.id AND sl.is_active = true
LEFT JOIN categories c ON c.id = sl.category_id
WHERE
  p.user_type = 'provider'
  AND p.is_active = true
  AND p.location_enabled = true
  AND p.location_lat IS NOT NULL
  AND p.location_lng IS NOT NULL
GROUP BY p.id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_distance_miles TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_providers_nearby TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_listings_nearby TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_in_service_area TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_providers_serving_location TO authenticated, anon;
GRANT SELECT ON nearby_providers_view TO authenticated, anon;

-- Add helpful comments
COMMENT ON TABLE provider_locations IS 'Detailed location data for providers including multiple locations and service areas';
COMMENT ON TABLE service_areas IS 'Defined service boundaries for providers using radius or polygon shapes';
COMMENT ON TABLE location_searches IS 'Analytics tracking for location-based searches';
COMMENT ON TABLE distance_cache IS 'Cache for frequently calculated distances to improve performance';
COMMENT ON FUNCTION calculate_distance_miles IS 'Calculate distance between two GPS coordinates using Haversine formula';
COMMENT ON FUNCTION search_providers_nearby IS 'Find providers within specified radius of a location';
COMMENT ON FUNCTION search_listings_nearby IS 'Find service listings within specified radius with optional filters';
COMMENT ON FUNCTION is_in_service_area IS 'Check if a location is within a provider''s service area';
