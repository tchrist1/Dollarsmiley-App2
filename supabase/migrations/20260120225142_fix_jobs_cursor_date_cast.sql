/*
  # Fix Jobs Cursor Function - Cast Date to Timestamptz

  1. Changes
    - Cast execution_date_start (date) to timestamptz for deadline field
  
  2. Details
    - Fixes type mismatch in return structure
    - Enables jobs cursor function to work correctly
*/

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
  j.execution_date_start::timestamptz as deadline,
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
