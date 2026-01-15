-- ============================================================================
-- BATCH 3 — Database Health Monitoring Script
-- ============================================================================
-- Purpose: Periodic health check for database maintenance and performance
-- Frequency: Run weekly or after significant traffic changes
-- Duration: <5 seconds to execute
-- Impact: Read-only, zero performance impact
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLE BLOAT CHECK
-- ============================================================================
-- Identifies tables with dead tuples that may need manual VACUUM
-- Expected Result: Empty or <5% dead tuples
-- Action Required If: Any table shows >10% dead tuples

SELECT
  '=== TABLE BLOAT CHECK ===' AS check_type,
  schemaname,
  relname AS tablename,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_percent,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
  last_vacuum,
  last_autovacuum,
  CASE
    WHEN ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10
    THEN '⚠️  NEEDS ATTENTION'
    WHEN ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 5
    THEN '⚡ MONITOR'
    ELSE '✓ HEALTHY'
  END AS health_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100  -- Only tables with significant data
  AND n_dead_tup > 0
ORDER BY dead_percent DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- SECTION 2: AUTOVACUUM EFFECTIVENESS
-- ============================================================================
-- Verifies autovacuum is running regularly on active tables
-- Expected Result: Recent autovacuum timestamps on all active tables
-- Action Required If: No autovacuum activity on high-traffic tables

SELECT
  '=== AUTOVACUUM ACTIVITY ===' AS check_type,
  schemaname,
  relname AS tablename,
  n_live_tup AS rows,
  autovacuum_count AS auto_vacuum_runs,
  vacuum_count AS manual_vacuum_runs,
  last_autovacuum,
  last_vacuum,
  CASE
    WHEN last_autovacuum IS NULL AND last_vacuum IS NULL THEN '⚠️  NEVER VACUUMED'
    WHEN last_autovacuum > last_vacuum OR last_vacuum IS NULL THEN '✓ AUTO-MAINTAINING'
    ELSE '⚡ MANUAL VACUUM USED'
  END AS maintenance_type
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 100
ORDER BY autovacuum_count DESC, n_live_tup DESC
LIMIT 20;

-- ============================================================================
-- SECTION 3: INDEX USAGE VERIFICATION
-- ============================================================================
-- Identifies unused indexes that consume disk space
-- Expected Result: Minimal unused indexes, most created recently
-- Action Required If: Large unused indexes (>1MB) older than 30 days

SELECT
  '=== UNUSED INDEX CHECK ===' AS check_type,
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS scans,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  pg_relation_size(indexrelid) AS size_bytes,
  CASE
    WHEN pg_relation_size(indexrelid) > 1048576 THEN '⚠️  LARGE UNUSED (Consider dropping)'
    WHEN pg_relation_size(indexrelid) > 65536 THEN '⚡ MONITOR'
    ELSE '✓ SMALL (OK for new indexes)'
  END AS recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%pkey'  -- Exclude primary keys
  AND indexrelname NOT LIKE '%_id_key'  -- Exclude unique constraints
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 15;

-- ============================================================================
-- SECTION 4: TOP PERFORMING INDEXES
-- ============================================================================
-- Shows most frequently used indexes (validation that indexes work)
-- Expected Result: High scan counts on foreign key and filter indexes
-- Action Required If: Expected indexes show 0 scans in production

SELECT
  '=== TOP PERFORMING INDEXES ===' AS check_type,
  schemaname,
  relname AS tablename,
  indexrelname AS indexname,
  idx_scan AS total_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  ROUND(100.0 * idx_tup_fetch / NULLIF(idx_tup_read, 0), 2) AS fetch_efficiency_percent,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  '✓ HIGH USAGE' AS status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- ============================================================================
-- SECTION 5: SEQUENTIAL SCAN ANALYSIS
-- ============================================================================
-- Identifies tables with high sequential scan ratios (potential index needs)
-- Expected Result: Small tables can have high seq scans (normal)
-- Action Required If: Large table (>10MB) with >80% sequential scans

SELECT
  '=== SEQUENTIAL SCAN ANALYSIS ===' AS check_type,
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS table_size,
  n_live_tup AS rows,
  seq_scan AS sequential_scans,
  idx_scan AS index_scans,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS seq_scan_percent,
  CASE
    WHEN pg_total_relation_size(schemaname||'.'||relname) > 10485760
         AND ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) > 80
    THEN '⚠️  NEEDS INDEX REVIEW'
    WHEN ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) > 50
    THEN '⚡ MONITOR'
    ELSE '✓ HEALTHY'
  END AS recommendation
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (seq_scan + idx_scan) > 0
  AND n_live_tup > 10
ORDER BY seq_scan DESC
LIMIT 15;

-- ============================================================================
-- SECTION 6: STATISTICS FRESHNESS
-- ============================================================================
-- Checks if table statistics are up to date for query planner
-- Expected Result: All active tables analyzed in last 7 days
-- Action Required If: Active table never analyzed or >30 days old

SELECT
  '=== STATISTICS FRESHNESS ===' AS check_type,
  schemaname,
  relname AS tablename,
  n_live_tup AS rows,
  n_mod_since_analyze AS modifications_since_analyze,
  last_analyze AS last_manual_analyze,
  last_autoanalyze AS last_auto_analyze,
  CASE
    WHEN last_analyze IS NULL AND last_autoanalyze IS NULL THEN '⚠️  NEVER ANALYZED'
    WHEN GREATEST(last_analyze, last_autoanalyze) < NOW() - INTERVAL '30 days' THEN '⚡ STALE (>30 days)'
    WHEN last_autoanalyze > last_analyze OR last_analyze IS NULL THEN '✓ AUTO-ANALYZED'
    ELSE '✓ MANUALLY ANALYZED'
  END AS analyze_status,
  CASE
    WHEN last_analyze IS NULL AND last_autoanalyze IS NULL THEN 'Run ANALYZE ' || relname || ';'
    ELSE NULL
  END AS suggested_action
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 50
ORDER BY
  CASE
    WHEN last_analyze IS NULL AND last_autoanalyze IS NULL THEN 1
    ELSE 2
  END,
  GREATEST(last_analyze, last_autoanalyze) NULLS FIRST
LIMIT 20;

-- ============================================================================
-- SECTION 7: DATABASE SIZE OVERVIEW
-- ============================================================================
-- Shows largest tables and total database size
-- Expected Result: Growth trends within expected parameters
-- Action Required If: Unexpected rapid growth

SELECT
  '=== DATABASE SIZE OVERVIEW ===' AS check_type,
  schemaname,
  relname AS tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||relname)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) -
                 pg_relation_size(schemaname||'.'||relname)) AS indexes_size,
  n_live_tup AS rows,
  CASE
    WHEN n_live_tup > 0
    THEN pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname) / n_live_tup)
    ELSE 'N/A'
  END AS bytes_per_row
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
LIMIT 15;

-- ============================================================================
-- SECTION 8: OVERALL HEALTH SUMMARY
-- ============================================================================
-- Quick dashboard of key metrics
-- Expected Result: All green status indicators
-- Action Required If: Any warnings or errors shown

SELECT
  '=== OVERALL HEALTH SUMMARY ===' AS check_type,
  (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_tables,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes,
  (SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||relname)))
   FROM pg_stat_user_tables WHERE schemaname = 'public') AS total_database_size,
  (SELECT COUNT(*) FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   AND ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10) AS tables_with_bloat,
  (SELECT COUNT(*) FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   AND idx_scan = 0
   AND indexrelname NOT LIKE '%pkey'
   AND pg_relation_size(indexrelid) > 1048576) AS large_unused_indexes,
  (SELECT setting FROM pg_settings WHERE name = 'autovacuum') AS autovacuum_enabled,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_stat_user_tables
          WHERE schemaname = 'public'
          AND ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10) = 0
         AND (SELECT setting FROM pg_settings WHERE name = 'autovacuum') = 'on'
    THEN '✓ HEALTHY'
    ELSE '⚠️  NEEDS ATTENTION'
  END AS overall_health;

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
--
-- WEEKLY MONITORING:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Review each section for warnings (⚠️) or monitoring alerts (⚡)
-- 3. Take action as indicated in recommendations column
--
-- INTERPRETING RESULTS:
-- ✓ HEALTHY          - No action needed
-- ⚡ MONITOR          - Watch this item, may need action soon
-- ⚠️  NEEDS ATTENTION - Take corrective action
--
-- COMMON ACTIONS:
--
-- If Table Has >10% Bloat:
--   ANALYZE tablename;
--   VACUUM tablename;
--
-- If Large Unused Index (>1MB, 0 scans):
--   -- Review if index is needed for app queries
--   -- If confirmed unused after 30+ days:
--   DROP INDEX CONCURRENTLY indexname;
--
-- If Table Never Analyzed:
--   ANALYZE tablename;
--
-- If Sequential Scans High on Large Table:
--   -- Review query patterns
--   -- Consider adding index on frequently filtered columns
--
-- ============================================================================
-- AUTOMATED MONITORING (OPTIONAL)
-- ============================================================================
--
-- To set up automated monitoring, create a scheduled job that:
-- 1. Runs this script weekly
-- 2. Captures results to a monitoring table
-- 3. Sends alerts if any ⚠️ items detected
--
-- Example alert conditions:
-- - Any table with >15% dead tuples
-- - Any large unused index (>1MB) older than 30 days
-- - Any table never analyzed with >1000 rows
-- - Autovacuum disabled
--
-- ============================================================================
-- END OF MONITORING SCRIPT
-- ============================================================================
