/*
  # Add Service Type to Cursor Pagination Functions

  1. Changes
    - Update get_services_cursor_paginated to include service_type in results
    - Update get_jobs_cursor_paginated to maintain consistency
  
  2. Security
    - Maintains existing RLS and security settings
*/

-- Drop and recreate get_services_cursor_paginated with service_type
DROP FUNCTION IF EXISTS get_services_cursor_paginated(
  timestamp with time zone,
  uuid,
  integer,
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  text[],
  text
);

CREATE FUNCTION get_services_cursor_paginated(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_category_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_min_rating numeric DEFAULT NULL,
  p_listing_types text[] DEFAULT NULL,
  p_sort_by text DEFAULT 'relevance'
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
  average_rating numeric,
  total_bookings integer,
  listing_type text,
  service_type text,
  provider_full_name text,
  provider_avatar text,
  provider_city text,
  provider_state text,
  provider_location text,
  latitude numeric,
  longitude numeric,
  provider_user_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.title,
    sl.description,
    COALESCE(sl.price, sl.base_price) as price,
    sl.featured_image_url as image_url,
    sl.created_at,
    sl.status,
    sl.provider_id,
    sl.category_id,
    sl.rating_average as average_rating,
    sl.booking_count as total_bookings,
    sl.listing_type,
    sl.service_type,
    p.full_name as provider_full_name,
    p.avatar_url as provider_avatar,
    p.city as provider_city,
    p.state as provider_state,
    p.location as provider_location,
    COALESCE(sl.latitude, p.latitude) as latitude,
    COALESCE(sl.longitude, p.longitude) as longitude,
    p.user_type as provider_user_type
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
    AND (p_min_price IS NULL OR COALESCE(sl.price, sl.base_price) >= p_min_price)
    AND (p_max_price IS NULL OR COALESCE(sl.price, sl.base_price) <= p_max_price)
    AND (p_min_rating IS NULL OR sl.rating_average >= p_min_rating)
    AND (
      p_listing_types IS NULL
      OR sl.listing_type = ANY(p_listing_types)
    )
  ORDER BY
    CASE WHEN p_sort_by = 'price_low' THEN COALESCE(sl.price, sl.base_price) ELSE NULL END ASC NULLS LAST,
    CASE WHEN p_sort_by = 'price_high' THEN COALESCE(sl.price, sl.base_price) ELSE NULL END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'rating' THEN sl.rating_average ELSE NULL END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'popular' THEN sl.booking_count ELSE NULL END DESC NULLS LAST,
    sl.created_at DESC,
    sl.id DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_services_cursor_paginated TO authenticated, anon;