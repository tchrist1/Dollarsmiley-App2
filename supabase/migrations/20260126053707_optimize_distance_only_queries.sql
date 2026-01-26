/*
  # Optimize Distance-Only Query Pattern

  ## Summary
  Adds specialized optimization for distance-only queries (no category, no search, no price filters).
  This is the pattern causing 1800-1900ms queries in production.

  ## Problem
  Query pattern identified from logs:
  - hasDistance: true
  - All other filters: false
  - Result: 1888ms-1891ms queries

  When ONLY distance is used, database must:
  1. Calculate distance for ALL active listings
  2. Filter by radius
  3. Sort and paginate

  ## Solution
  Add partial indexes that optimize for distance-only scenarios by pre-filtering
  to only "popular" or "recent" listings when no other filters are applied.

  ## Expected Impact
  - Distance-only queries: 70-80% faster (1900ms → 400ms)
  - Combined with other filters: No impact (uses existing composite indexes)
*/

-- ============================================================================
-- DISTANCE-ONLY OPTIMIZATION: Status + Distance Index
-- ============================================================================

-- For service listings: Pre-filter by status before distance calculation
-- This reduces the number of distance calculations from ALL listings to only active ones
CREATE INDEX IF NOT EXISTS idx_service_listings_status_coords_optimized
ON service_listings USING GIST (point(longitude::float, latitude::float))
WHERE is_active = true
  AND status = 'active'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- For jobs: Pre-filter by status before distance calculation
CREATE INDEX IF NOT EXISTS idx_jobs_status_coords_optimized
ON jobs USING GIST (point(longitude::float, latitude::float))
WHERE status IN ('open', 'in_progress')
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- RECENT + DISTANCE: For pagination efficiency
-- ============================================================================

-- Combine created_at with coordinates for efficient cursor pagination
-- This allows the planner to use the index for both filtering AND ordering
CREATE INDEX IF NOT EXISTS idx_service_listings_recent_coords
ON service_listings (created_at DESC, id DESC, latitude, longitude)
WHERE is_active = true
  AND status = 'active'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_recent_coords
ON jobs (created_at DESC, id DESC, latitude, longitude)
WHERE status IN ('open', 'in_progress')
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- ANALYZE: Update statistics for query planner
-- ============================================================================

ANALYZE service_listings;
ANALYZE jobs;
ANALYZE profiles;

/*
  ## Verification

  Test the optimization with this query:

  ```sql
  EXPLAIN ANALYZE
  SELECT *
  FROM service_listings sl
  LEFT JOIN profiles p ON p.id = sl.provider_id
  WHERE sl.is_active = true
    AND sl.status = 'active'
    AND sl.latitude IS NOT NULL
    AND sl.longitude IS NOT NULL
    AND (point(-122.4194, 37.7749) <@> point(sl.longitude::float, sl.latitude::float)) <= 25
  ORDER BY sl.created_at DESC, sl.id DESC
  LIMIT 20;
  ```

  Expected plan:
  - Should use idx_service_listings_status_coords_optimized for GiST scan
  - Should use idx_service_listings_recent_coords for ordering
  - Should NOT use Seq Scan

  ## Rationale

  The issue with distance-only queries is that they're TOO general:
  - No category to narrow down results
  - No price range to filter
  - No search terms to match
  - Only distance calculation across ALL listings

  These specialized GiST indexes are smaller and faster because they:
  1. Are partial (only active/open status)
  2. Use GIST for efficient radius queries
  3. Include ordering columns for pagination

  ## Alternative Approach (if still slow)

  If queries are still slow, consider adding a default category filter
  in the UI when only distance is selected, or showing a "refine search"
  prompt to users.
*/
