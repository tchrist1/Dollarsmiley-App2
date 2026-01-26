/**
 * QUERY PERFORMANCE MONITORING
 *
 * Tracks and analyzes database query performance to identify slow queries
 * and optimize filter combinations.
 *
 * Features:
 * - Request timing with detailed breakdowns
 * - Filter combination analysis
 * - Performance degradation detection
 * - Query plan analysis recommendations
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface PerformanceMetrics {
  requestId: string;
  rpcName: string;
  duration: number;
  params: Record<string, any>;
  filterComplexity: number;
  timestamp: number;
}

interface QueryAnalysis {
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  totalCalls: number;
  slowQueries: PerformanceMetrics[];
  filterPatterns: Map<string, number>;
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

const performanceHistory: PerformanceMetrics[] = [];
const MAX_HISTORY_SIZE = 100;

/**
 * Calculate filter complexity score to identify heavy queries
 */
function calculateFilterComplexity(params: Record<string, any>): number {
  let complexity = 0;

  // Base complexity
  if (params.p_search) complexity += 2; // Text search is more expensive
  if (params.p_category_ids?.length > 0) complexity += 1;
  if (params.p_min_price || params.p_max_price) complexity += 1;
  if (params.p_min_rating) complexity += 1;
  if (params.p_min_budget || params.p_max_budget) complexity += 1;
  if (params.p_verified) complexity += 1;

  // Distance queries are expensive
  if (params.p_user_lat && params.p_user_lng && params.p_distance) {
    complexity += 3;
  }

  // Multiple categories increase complexity
  if (params.p_category_ids?.length > 3) {
    complexity += Math.floor(params.p_category_ids.length / 3);
  }

  return complexity;
}

/**
 * Generate filter signature for pattern analysis
 */
function getFilterSignature(params: Record<string, any>): string {
  const features: string[] = [];

  if (params.p_search) features.push('search');
  if (params.p_category_ids?.length > 0) features.push(`cat:${params.p_category_ids.length}`);
  if (params.p_min_price || params.p_max_price) features.push('price');
  if (params.p_min_rating) features.push('rating');
  if (params.p_min_budget || params.p_max_budget) features.push('budget');
  if (params.p_verified) features.push('verified');
  if (params.p_user_lat && params.p_user_lng && params.p_distance) features.push(`dist:${params.p_distance}`);
  if (params.p_sort_by && params.p_sort_by !== 'relevance') features.push(`sort:${params.p_sort_by}`);
  if (params.p_listing_types?.length > 0) features.push(`types:${params.p_listing_types.length}`);

  return features.length > 0 ? features.join('+') : 'default';
}

/**
 * Record a query execution for analysis
 */
export function recordQueryPerformance(
  rpcName: string,
  params: Record<string, any>,
  duration: number
): void {
  if (!__DEV__) return;

  const metric: PerformanceMetrics = {
    requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rpcName,
    duration,
    params,
    filterComplexity: calculateFilterComplexity(params),
    timestamp: Date.now(),
  };

  performanceHistory.push(metric);

  // Limit history size
  if (performanceHistory.length > MAX_HISTORY_SIZE) {
    performanceHistory.shift();
  }

  // Log slow queries (>1000ms)
  if (duration > 1000) {
    console.warn(`[QueryPerformance] SLOW QUERY DETECTED (${duration}ms)`, {
      rpcName,
      filterSignature: getFilterSignature(params),
      complexity: metric.filterComplexity,
      params: {
        search: !!params.p_search,
        categories: params.p_category_ids?.length || 0,
        distance: params.p_distance || null,
        sortBy: params.p_sort_by || 'relevance',
        verified: params.p_verified || false,
      },
    });
  }
}

/**
 * Analyze performance patterns
 */
export function analyzeQueryPerformance(rpcName?: string): QueryAnalysis {
  const metrics = rpcName
    ? performanceHistory.filter((m) => m.rpcName === rpcName)
    : performanceHistory;

  if (metrics.length === 0) {
    return {
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      totalCalls: 0,
      slowQueries: [],
      filterPatterns: new Map(),
    };
  }

  const durations = metrics.map((m) => m.duration);
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const maxDuration = Math.max(...durations);
  const minDuration = Math.min(...durations);

  // Find slow queries (>1 second or >2x average)
  const slowThreshold = Math.max(1000, avgDuration * 2);
  const slowQueries = metrics.filter((m) => m.duration > slowThreshold);

  // Analyze filter patterns
  const filterPatterns = new Map<string, number>();
  metrics.forEach((m) => {
    const signature = getFilterSignature(m.params);
    filterPatterns.set(signature, (filterPatterns.get(signature) || 0) + 1);
  });

  return {
    avgDuration,
    maxDuration,
    minDuration,
    totalCalls: metrics.length,
    slowQueries,
    filterPatterns,
  };
}

/**
 * Print performance report to console (DEV only)
 */
export function printPerformanceReport(rpcName?: string): void {
  if (!__DEV__) return;

  const analysis = analyzeQueryPerformance(rpcName);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 QUERY PERFORMANCE REPORT');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`RPC Function: ${rpcName || 'ALL'}`);
  console.log(`Total Calls: ${analysis.totalCalls}`);
  console.log(`Average Duration: ${analysis.avgDuration.toFixed(0)}ms`);
  console.log(`Min Duration: ${analysis.minDuration.toFixed(0)}ms`);
  console.log(`Max Duration: ${analysis.maxDuration.toFixed(0)}ms`);
  console.log(`Slow Queries: ${analysis.slowQueries.length}`);

  if (analysis.slowQueries.length > 0) {
    console.log('\n⚠️  SLOW QUERY PATTERNS:');
    analysis.slowQueries.forEach((q, idx) => {
      console.log(`  ${idx + 1}. ${q.duration}ms - ${getFilterSignature(q.params)} (complexity: ${q.filterComplexity})`);
    });
  }

  if (analysis.filterPatterns.size > 0) {
    console.log('\n📈 FILTER PATTERN FREQUENCY:');
    const sortedPatterns = Array.from(analysis.filterPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedPatterns.forEach(([pattern, count]) => {
      console.log(`  ${count}x - ${pattern}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

/**
 * Get recommendations for slow queries
 */
export function getOptimizationRecommendations(): string[] {
  const analysis = analyzeQueryPerformance();
  const recommendations: string[] = [];

  if (analysis.slowQueries.length === 0) {
    return ['All queries performing well! No optimizations needed.'];
  }

  // Analyze slow query patterns

  // Distance-only queries (most expensive pattern)
  const distanceOnlyQueries = analysis.slowQueries.filter((q) =>
    q.params.p_user_lat && q.params.p_user_lng &&
    (!q.params.p_category_ids || q.params.p_category_ids.length === 0) &&
    !q.params.p_search &&
    !q.params.p_min_price &&
    !q.params.p_max_price &&
    !q.params.p_min_budget &&
    !q.params.p_max_budget
  );
  if (distanceOnlyQueries.length > 0) {
    recommendations.push(
      `🎯 CRITICAL - Distance-only queries: ${distanceOnlyQueries.length} slow queries with ONLY distance filter. ` +
      'This is the most expensive query pattern. SOLUTION: Always pair distance filter with at least one other filter ' +
      '(category, price range, or search term) to dramatically improve performance. Consider prompting users to refine their search ' +
      'or adding a default category when location is selected.'
    );
  }

  // Distance queries (with other filters)
  const distanceQueries = analysis.slowQueries.filter((q) =>
    q.params.p_user_lat && q.params.p_user_lng &&
    ((q.params.p_category_ids && q.params.p_category_ids.length > 0) ||
     q.params.p_search ||
     q.params.p_min_price ||
     q.params.p_max_price ||
     q.params.p_min_budget ||
     q.params.p_max_budget)
  );
  if (distanceQueries.length > 0) {
    recommendations.push(
      `🗺️ Distance queries: ${distanceQueries.length} slow queries with distance + other filters. ` +
      'Consider reducing search radius (try 10-15 miles instead of 25-50) or verify GiST indexes are being used with EXPLAIN ANALYZE.'
    );
  }

  // Text search is slow
  const searchQueries = analysis.slowQueries.filter((q) => q.params.p_search);
  if (searchQueries.length > 0) {
    recommendations.push(
      `🔍 Text search: ${searchQueries.length} slow queries detected. ` +
      'Verify GIN index on search_vector is being used. Consider limiting search to specific categories first or using shorter search terms.'
    );
  }

  // Multiple filters
  const complexQueries = analysis.slowQueries.filter((q) => q.filterComplexity > 5);
  if (complexQueries.length > 0) {
    recommendations.push(
      `⚙️ Complex filters: ${complexQueries.length} queries with high complexity (>5). ` +
      'Consider creating composite indexes for common filter combinations or reducing simultaneous filters.'
    );
  }

  // Sorting issues
  const sortQueries = analysis.slowQueries.filter((q) =>
    q.params.p_sort_by && q.params.p_sort_by !== 'relevance'
  );
  if (sortQueries.length > 0) {
    recommendations.push(
      `📊 Custom sorting: ${sortQueries.length} slow queries with non-default sorting. ` +
      'Verify indexes exist for sort columns (price, rating, distance). Consider using default sorting when multiple filters are active.'
    );
  }

  return recommendations;
}

/**
 * Clear performance history
 */
export function clearPerformanceHistory(): void {
  performanceHistory.length = 0;
  if (__DEV__) {
    console.log('[QueryPerformance] Performance history cleared');
  }
}
