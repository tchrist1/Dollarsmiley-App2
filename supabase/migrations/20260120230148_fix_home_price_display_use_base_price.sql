/*
  # Fix Home Listings Price Display - Use base_price

  1. Problem
    - Home listings show $0 because cursor function returns `price` column
    - Many services have NULL in `price` but valid values in `base_price`
    - Detail pages use `base_price` directly, so they show correct prices
  
  2. Solution
    - Update cursor function to use COALESCE(price, base_price) as price
    - This ensures Home listings use the same pricing logic as Detail pages
    - Preserves all existing data and pricing schemas
  
  3. Impact
    - Fixes $0 display on Home cards
    - No database schema changes
    - No data modifications
*/

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
  COALESCE(sl.price, sl.base_price) as price,  -- FIX: Use base_price as fallback
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
  -- Price filters use the same COALESCE logic
  AND (p_min_price IS NULL OR COALESCE(sl.price, sl.base_price) >= p_min_price)
  AND (p_max_price IS NULL OR COALESCE(sl.price, sl.base_price) <= p_max_price)
  AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
  AND (
    p_listing_types IS NULL
    OR sl.listing_type = ANY(p_listing_types)
  )
ORDER BY sl.created_at DESC, sl.id DESC
LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
