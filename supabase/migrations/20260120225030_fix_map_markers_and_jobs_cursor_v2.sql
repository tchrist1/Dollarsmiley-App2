/*
  # Fix Map Markers and Jobs Cursor Function

  1. Changes
    - Fix get_services_cursor_paginated to return listing coordinates (not provider coordinates)
    - Fix get_jobs_cursor_paginated to remove reference to non-existent budget column
  
  2. Details
    - Use COALESCE to prefer listing coordinates, fallback to provider coordinates
    - This restores map markers for all 71 service listings
    - Remove broken budget column reference from jobs function
*/

-- ============================================================================
-- Fix services cursor to return listing coordinates
-- ============================================================================
DROP FUNCTION IF EXISTS get_services_cursor_paginated(timestamptz, uuid, integer, uuid, text, numeric, numeric, numeric, text[]);

CREATE FUNCTION get_services_cursor_paginated(
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_limit integer,
  p_category_id uuid,
  p_search text,
  p_min_price numeric,
  p_max_price numeric,
  p_min_rating numeric,
  p_listing_types text[]
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  image_url text,
  created_at timestamptz,
  status text,
  provider_id uuid,
  category_id uuid,
  rating numeric,
  total_bookings integer,
  listing_type text,
  provider_full_name text,
  provider_avatar text,
  provider_city text,
  provider_state text,
  provider_user_type text,
  provider_rating_average numeric,
  provider_rating_count integer,
  provider_id_verified boolean,
  latitude numeric,
  longitude numeric
) AS $$
BEGIN
RETURN QUERY
SELECT
  sl.id,
  sl.title,
  sl.description,
  sl.price,
  sl.featured_image_url as image_url,
  sl.created_at,
  sl.status,
  sl.provider_id,
  sl.category_id,
  sl.rating_average as rating,
  sl.booking_count as total_bookings,
  sl.listing_type,
  p.full_name as provider_full_name,
  p.avatar_url as provider_avatar,
  p.city as provider_city,
  p.state as provider_state,
  p.user_type as provider_user_type,
  p.rating_average as provider_rating_average,
  p.rating_count as provider_rating_count,
  p.id_verified as provider_id_verified,
  COALESCE(sl.latitude, p.latitude) as latitude,
  COALESCE(sl.longitude, p.longitude) as longitude
FROM service_listings sl
LEFT JOIN profiles p ON p.id = sl.provider_id
WHERE sl.status = 'Active'
  AND (
    p_cursor_created_at IS NULL
    OR sl.created_at < p_cursor_created_at
    OR (sl.created_at = p_cursor_created_at AND sl.id < p_cursor_id)
  )
  AND (p_category_id IS NULL OR sl.category_id = p_category_id)
  AND (
    p_search IS NULL
    OR sl.title ILIKE '%' || p_search || '%'
    OR sl.description ILIKE '%' || p_search || '%'
  )
  AND (p_min_price IS NULL OR sl.price >= p_min_price)
  AND (p_max_price IS NULL OR sl.price <= p_max_price)
  AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
  AND (
    p_listing_types IS NULL
    OR sl.listing_type = ANY(p_listing_types)
  )
ORDER BY sl.created_at DESC, sl.id DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Fix jobs cursor to remove non-existent budget column reference
-- ============================================================================
DROP FUNCTION IF EXISTS get_jobs_cursor_paginated(timestamptz, uuid, integer, uuid, text, numeric, numeric);

CREATE FUNCTION get_jobs_cursor_paginated(
  p_cursor_created_at timestamptz,
  p_cursor_id uuid,
  p_limit integer,
  p_category_id uuid,
  p_search text,
  p_min_budget numeric,
  p_max_budget numeric
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  budget numeric,
  photos jsonb,
  created_at timestamptz,
  status text,
  customer_id uuid,
  category_id uuid,
  customer_full_name text,
  customer_avatar text,
  customer_user_type text,
  customer_rating_average numeric,
  customer_rating_count integer,
  customer_id_verified boolean,
  city text,
  state text,
  latitude numeric,
  longitude numeric,
  deadline timestamptz,
  featured_image_url text,
  fixed_price numeric,
  budget_min numeric,
  budget_max numeric,
  pricing_type text
) AS $$
BEGIN
RETURN QUERY
SELECT
  j.id,
  j.title,
  j.description,
  COALESCE(j.fixed_price, j.budget_min, 0) as budget,
  j.photos,
  j.created_at,
  j.status,
  j.customer_id,
  j.category_id,
  p.full_name as customer_full_name,
  p.avatar_url as customer_avatar,
  p.user_type as customer_user_type,
  p.rating_average as customer_rating_average,
  p.rating_count as customer_rating_count,
  p.id_verified as customer_id_verified,
  j.city,
  j.state,
  j.latitude,
  j.longitude,
  j.deadline,
  j.featured_image_url,
  j.fixed_price,
  j.budget_min,
  j.budget_max,
  j.pricing_type
FROM jobs j
LEFT JOIN profiles p ON p.id = j.customer_id
WHERE j.status = 'open'
  AND (
    p_cursor_created_at IS NULL
    OR j.created_at < p_cursor_created_at
    OR (j.created_at = p_cursor_created_at AND j.id < p_cursor_id)
  )
  AND (p_category_id IS NULL OR j.category_id = p_category_id)
  AND (
    p_search IS NULL
    OR j.title ILIKE '%' || p_search || '%'
    OR j.description ILIKE '%' || p_search || '%'
  )
  AND (
    p_min_budget IS NULL
    OR COALESCE(j.fixed_price, j.budget_min, 0) >= p_min_budget
  )
  AND (
    p_max_budget IS NULL
    OR COALESCE(j.fixed_price, j.budget_max, 0) <= p_max_budget
  )
ORDER BY j.created_at DESC, j.id DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
