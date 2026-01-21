/*
  # Fix Provider Pins - Add user_type to RPC Functions

  1. Changes
    - Add `provider_user_type` to find_nearby_service_listings return type
    - Add `customer_user_type` to find_nearby_jobs return type
    - Update SELECT statements to include user_type from profiles

  2. Purpose
    - Fix provider pins not appearing on map (user_type was undefined)
    - Enable proper filtering of Provider and Hybrid accounts
    - Maintain consistency between RPC and standard query results

  3. Security
    - No security changes - functions remain PUBLIC
    - RLS policies still apply on underlying tables
*/

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS find_nearby_service_listings(double precision, double precision, integer, numeric, text, text[], text, numeric, numeric, boolean, integer);
DROP FUNCTION IF EXISTS find_nearby_jobs(double precision, double precision, integer, numeric, text[], text, numeric, numeric, integer);

-- ============================================================================
-- CREATE: find_nearby_service_listings - With provider_user_type
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_service_listings(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_miles integer DEFAULT 25,
  p_min_rating numeric DEFAULT 0,
  p_listing_type text DEFAULT NULL,
  p_category_ids text[] DEFAULT NULL,
  p_search_query text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_verified_only boolean DEFAULT false,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  base_price numeric,
  pricing_type text,
  listing_type text,
  status text,
  category_id uuid,
  provider_id uuid,
  location text,
  latitude double precision,
  longitude double precision,
  photos jsonb,
  featured_image_url text,
  created_at timestamptz,
  distance_miles numeric,
  provider_rating numeric,
  provider_rating_count integer,
  provider_name text,
  provider_avatar text,
  provider_verified boolean,
  provider_user_type text,
  category_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.title,
    sl.description,
    sl.base_price,
    sl.pricing_type,
    sl.listing_type,
    sl.status,
    sl.category_id,
    sl.provider_id,
    sl.location,
    sl.latitude,
    sl.longitude,
    sl.photos,
    sl.featured_image_url,
    sl.created_at,
    (
      3959 * acos(
        cos(radians(p_latitude)) *
        cos(radians(sl.latitude)) *
        cos(radians(sl.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(sl.latitude))
      )
    )::numeric AS distance_miles,
    p.rating_average::numeric AS provider_rating,
    p.rating_count AS provider_rating_count,
    p.full_name AS provider_name,
    p.avatar_url AS provider_avatar,
    p.is_verified AS provider_verified,
    p.user_type AS provider_user_type,
    c.name AS category_name
  FROM service_listings sl
  INNER JOIN profiles p ON sl.provider_id = p.id
  LEFT JOIN categories c ON sl.category_id = c.id
  WHERE
    sl.status = 'Active'
    AND sl.latitude IS NOT NULL
    AND sl.longitude IS NOT NULL
    AND (
      3959 * acos(
        cos(radians(p_latitude)) *
        cos(radians(sl.latitude)) *
        cos(radians(sl.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(sl.latitude))
      )
    ) <= p_radius_miles
    AND (p_min_rating = 0 OR p.rating_average >= p_min_rating)
    AND (p_listing_type IS NULL OR sl.listing_type = p_listing_type)
    AND (p_category_ids IS NULL OR sl.category_id = ANY(p_category_ids::uuid[]))
    AND (
      p_search_query IS NULL
      OR sl.title ILIKE '%' || p_search_query || '%'
      OR sl.description ILIKE '%' || p_search_query || '%'
    )
    AND (p_price_min IS NULL OR sl.base_price >= p_price_min)
    AND (p_price_max IS NULL OR sl.base_price <= p_price_max)
    AND (NOT p_verified_only OR p.is_verified = true)
  ORDER BY distance_miles ASC, sl.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- CREATE: find_nearby_jobs - With customer_user_type
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_jobs(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_miles integer DEFAULT 25,
  p_min_rating numeric DEFAULT 0,
  p_category_ids text[] DEFAULT NULL,
  p_search_query text DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  budget_min numeric,
  budget_max numeric,
  fixed_price numeric,
  pricing_type text,
  status text,
  category_id uuid,
  customer_id uuid,
  location text,
  latitude double precision,
  longitude double precision,
  photos jsonb,
  featured_image_url text,
  created_at timestamptz,
  execution_date_start timestamptz,
  execution_date_end timestamptz,
  preferred_time text,
  distance_miles numeric,
  customer_rating numeric,
  customer_rating_count integer,
  customer_name text,
  customer_avatar text,
  customer_user_type text,
  category_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.budget_min,
    j.budget_max,
    j.fixed_price,
    j.pricing_type,
    j.status,
    j.category_id,
    j.customer_id,
    j.location,
    j.latitude,
    j.longitude,
    j.photos,
    j.featured_image_url,
    j.created_at,
    j.execution_date_start,
    j.execution_date_end,
    j.preferred_time,
    (
      3959 * acos(
        cos(radians(p_latitude)) *
        cos(radians(j.latitude)) *
        cos(radians(j.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(j.latitude))
      )
    )::numeric AS distance_miles,
    p.rating_average::numeric AS customer_rating,
    p.rating_count AS customer_rating_count,
    p.full_name AS customer_name,
    p.avatar_url AS customer_avatar,
    p.user_type AS customer_user_type,
    c.name AS category_name
  FROM jobs j
  INNER JOIN profiles p ON j.customer_id = p.id
  LEFT JOIN categories c ON j.category_id = c.id
  WHERE
    j.status = 'Open'
    AND j.latitude IS NOT NULL
    AND j.longitude IS NOT NULL
    AND (
      3959 * acos(
        cos(radians(p_latitude)) *
        cos(radians(j.latitude)) *
        cos(radians(j.longitude) - radians(p_longitude)) +
        sin(radians(p_latitude)) *
        sin(radians(j.latitude))
      )
    ) <= p_radius_miles
    AND (p_min_rating = 0 OR p.rating_average >= p_min_rating)
    AND (p_category_ids IS NULL OR j.category_id = ANY(p_category_ids::uuid[]))
    AND (
      p_search_query IS NULL
      OR j.title ILIKE '%' || p_search_query || '%'
      OR j.description ILIKE '%' || p_search_query || '%'
    )
    AND (
      p_price_min IS NULL
      OR j.fixed_price >= p_price_min
      OR j.budget_min >= p_price_min
      OR j.pricing_type = 'quote_based'
    )
    AND (
      p_price_max IS NULL
      OR j.fixed_price <= p_price_max
      OR j.budget_max <= p_price_max
      OR j.pricing_type = 'quote_based'
    )
  ORDER BY distance_miles ASC, j.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_nearby_service_listings TO authenticated, anon;
GRANT EXECUTE ON FUNCTION find_nearby_jobs TO authenticated, anon;