/**
 * PHASE 2A: REQUEST COALESCING
 *
 * Deduplicates identical in-flight RPC calls to reduce network overhead.
 *
 * DISPLAY-SAFE GUARANTEE:
 * - Zero changes to response structure
 * - Zero changes to data shape
 * - Zero changes to ordering
 * - Transparent layer over Supabase RPC
 *
 * HOW IT WORKS:
 * - Generates cache key from RPC name + parameters
 * - Returns existing Promise if request is in-flight
 * - Clears cache when request completes
 * - DEV-only logging for debugging
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

interface InFlightRequest {
  promise: Promise<any>;
  startTime: number;
}

// ============================================================================
// IN-FLIGHT CACHE
// ============================================================================

const inFlightCache = new Map<string, InFlightRequest>();

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate stable cache key from RPC name and parameters.
 * Uses JSON.stringify with sorted keys for consistency.
 *
 * OPTIMIZATION: Normalize null/undefined values to reduce cache misses
 * from semantically identical but syntactically different parameters.
 */
function generateCacheKey(rpcName: string, params: Record<string, any>): string {
  // Normalize params: convert undefined to null, remove null values
  const normalizedParams: Record<string, any> = {};

  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];

      // Skip null and undefined to reduce cache key variations
      if (value !== null && value !== undefined) {
        // Normalize arrays (empty arrays should be treated as null)
        if (Array.isArray(value) && value.length === 0) {
          // Skip empty arrays
        } else {
          normalizedParams[key] = value;
        }
      }
    });

  return `${rpcName}::${JSON.stringify(normalizedParams)}`;
}

// ============================================================================
// MAIN COALESCING FUNCTION
// ============================================================================

/**
 * Coalesces identical in-flight RPC calls.
 *
 * @param supabase - Supabase client instance
 * @param rpcName - Name of the RPC function
 * @param params - RPC parameters
 * @returns Promise with RPC response (same structure as supabase.rpc)
 */
export async function coalescedRpc<T = any>(
  supabase: SupabaseClient,
  rpcName: string,
  params: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  const cacheKey = generateCacheKey(rpcName, params);

  // Check if request is already in-flight
  const existing = inFlightCache.get(cacheKey);

  if (existing) {
    // DEV-only instrumentation: Track cache hits
    if (__DEV__) {
      const elapsed = Date.now() - existing.startTime;
      console.log(
        `[RequestCoalescer HIT] Returning existing promise for ${rpcName} (${elapsed}ms in-flight)`
      );
    }

    // Return existing promise (coalescing!)
    return existing.promise;
  }

  // No existing request - create new one
  // DEV-only instrumentation: Track cache misses
  if (__DEV__) {
    console.log(`[RequestCoalescer MISS] Creating new request for ${rpcName}`);
  }

  // Store start time for logging
  const startTime = Date.now();

  // Create new promise and cache it
  const promise = supabase
    .rpc(rpcName, params)
    .then((result) => {
      const elapsed = Date.now() - startTime;

      // DEV-only instrumentation: Track request completion
      if (__DEV__) {
        console.log(
          `[RequestCoalescer COMPLETE] ${rpcName} finished (${elapsed}ms)`
        );

        // PERFORMANCE LOGGING: Log slow queries with filter details
        if (elapsed > 500) {
          console.warn(
            `[RequestCoalescer SLOW_QUERY] ${rpcName} took ${elapsed}ms`,
            {
              duration: elapsed,
              filters: {
                hasSearch: !!params.p_search,
                hasCategoryFilter: !!(params.p_category_ids && params.p_category_ids.length > 0),
                hasDistance: !!(params.p_user_lat && params.p_user_lng && params.p_distance),
                hasPriceFilter: !!(params.p_min_price || params.p_max_price || params.p_min_budget || params.p_max_budget),
                hasRatingFilter: !!params.p_min_rating,
                hasVerifiedFilter: params.p_verified === true,
                sortBy: params.p_sort_by || 'default',
                limit: params.p_limit || 'unknown',
              },
              paramCount: Object.keys(params).filter(k => params[k] !== null && params[k] !== undefined).length,
            }
          );
        }
      }

      // Clear from cache on success
      inFlightCache.delete(cacheKey);

      return result;
    })
    .catch((error) => {
      // DEV-only instrumentation: Track request errors
      if (__DEV__) {
        console.warn(`[RequestCoalescer ERROR] ${rpcName} failed:`, error);
      }

      // Clear from cache on error
      inFlightCache.delete(cacheKey);

      // Return error in same format as Supabase
      return { data: null, error };
    });

  // Store in cache
  inFlightCache.set(cacheKey, {
    promise,
    startTime,
  });

  return promise;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clear all in-flight requests (useful for testing or manual cache invalidation).
 */
export function clearCoalescerCache(): void {
  // DEV-only instrumentation: Track cache clears
  if (__DEV__) {
    console.log(
      `[RequestCoalescer] Clearing ${inFlightCache.size} in-flight requests`
    );
  }
  inFlightCache.clear();
}

/**
 * Get current cache statistics (DEV only).
 */
export function getCoalescerStats(): { inFlightCount: number; cacheKeys: string[] } {
  return {
    inFlightCount: inFlightCache.size,
    cacheKeys: Array.from(inFlightCache.keys()),
  };
}
