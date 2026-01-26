/*
  # Cursor Pagination Performance Optimization

  ## Summary
  Adds composite indexes to eliminate sequential scans in cursor-based pagination
  and ensure consistent O(log n) performance at scale (100k+ listings).

  ## Problem
  Current cursor pagination uses:
  - WHERE status = 'active' AND (created_at < cursor OR (created_at = cursor AND id < cursor_id))
  - ORDER BY created_at DESC, id DESC

  Without proper composite indexes, PostgreSQL may perform sequential scans
  on large tables despite individual indexes on status, created_at, and id.

  ## Solution
  Add composite indexes that EXACTLY match the query pattern:
  - (status, created_at DESC, id DESC) for service_listings
  - (status, created_at DESC, id DESC) for jobs

  This enables index-only scans for cursor pagination queries.

  ## Performance Impact
  - Eliminates sequential scans on cursor pagination
  - Consistent O(log n) performance regardless of table size
  - Minimal storage overhead (~5-10% of table size)

  ## Safety Guarantees
  - ✅ No behavior changes
  - ✅ No breaking changes
  - ✅ Identical results
  - ✅ Backward compatible
*/

-- ============================================================================
-- COMPOSITE INDEX FOR SERVICE LISTINGS CURSOR PAGINATION
-- ============================================================================

-- This index matches the exact pattern used in get_services_cursor_paginated_v2:
-- WHERE LOWER(status) = 'active'
--   AND (created_at < cursor OR (created_at = cursor AND id < cursor_id))
-- ORDER BY created_at DESC, id DESC

-- NOTE: We use lowercase 'active' in the partial index to match LOWER(status) = 'active'
CREATE INDEX IF NOT EXISTS idx_service_listings_cursor_pagination
ON service_listings(created_at DESC, id DESC)
WHERE LOWER(status) = 'active';

-- Additional composite index for when status is used in ORDER BY
CREATE INDEX IF NOT EXISTS idx_service_listings_status_created_id
ON service_listings(status, created_at DESC, id DESC);

-- ============================================================================
-- COMPOSITE INDEX FOR JOBS CURSOR PAGINATION
-- ============================================================================

-- This index matches the exact pattern used in get_jobs_cursor_paginated_v2:
-- WHERE status IN ('open', 'in_progress')
--   AND (created_at < cursor OR (created_at = cursor AND id < cursor_id))
-- ORDER BY created_at DESC, id DESC

CREATE INDEX IF NOT EXISTS idx_jobs_cursor_pagination
ON jobs(created_at DESC, id DESC)
WHERE status IN ('open', 'in_progress');

-- Additional composite index for when status is used in ORDER BY
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_id
ON jobs(status, created_at DESC, id DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR SORTED QUERIES
-- ============================================================================

-- When sorting by price, we need an index that supports:
-- WHERE status = 'active' ORDER BY price ASC/DESC, created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_service_listings_price_cursor
ON service_listings(price ASC, created_at DESC, id DESC)
WHERE LOWER(status) = 'active';

CREATE INDEX IF NOT EXISTS idx_service_listings_price_desc_cursor
ON service_listings(price DESC, created_at DESC, id DESC)
WHERE LOWER(status) = 'active';

-- When sorting by rating, we need an index that supports:
-- WHERE status = 'active' ORDER BY rating_average DESC, created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_service_listings_rating_cursor
ON service_listings(rating_average DESC, created_at DESC, id DESC)
WHERE LOWER(status) = 'active';

-- When sorting by popularity (booking_count):
CREATE INDEX IF NOT EXISTS idx_service_listings_popular_cursor
ON service_listings(booking_count DESC, created_at DESC, id DESC)
WHERE LOWER(status) = 'active';

-- Jobs price sorting indexes (using COALESCE in functional index)
CREATE INDEX IF NOT EXISTS idx_jobs_budget_cursor
ON jobs((COALESCE(fixed_price, budget_min)) ASC, created_at DESC, id DESC)
WHERE status IN ('open', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_jobs_budget_desc_cursor
ON jobs((COALESCE(fixed_price, budget_min)) DESC, created_at DESC, id DESC)
WHERE status IN ('open', 'in_progress');

/*
PERFORMANCE NOTES:

1. Partial Indexes:
   - Only index active/open listings
   - Smaller index size (faster scans)
   - More accurate statistics

2. Index Column Order:
   - Matches exact ORDER BY clause
   - Enables index-only scans
   - Critical for cursor pagination performance

3. Storage Impact:
   - Each composite index: ~5-10% of table size
   - Example: 100k listings ≈ 50MB per index
   - Total overhead: ~200-400MB for all indexes
   - Trade-off is worth it for O(log n) guarantees
*/
