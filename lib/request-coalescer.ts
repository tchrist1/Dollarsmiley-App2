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
 */
function generateCacheKey(rpcName: string, params: Record<string, any>): string {
  // Sort params by key for consistent cache key
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return `${rpcName}::${JSON.stringify(sortedParams)}`;
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
    if (__DEV__) {
      const elapsed = Date.now() - existing.startTime;
      console.warn(
        `[RequestCoalescer HIT] Returning existing promise for ${rpcName} (${elapsed}ms in-flight)`
      );
    }

    // Return existing promise (coalescing!)
    return existing.promise;
  }

  // No existing request - create new one
  if (__DEV__) {
    console.warn(`[RequestCoalescer MISS] Creating new request for ${rpcName}`);
  }

  // Store start time for logging
  const startTime = Date.now();

  // Create new promise and cache it
  const promise = supabase
    .rpc(rpcName, params)
    .then((result) => {
      if (__DEV__) {
        const elapsed = Date.now() - startTime;
        console.warn(
          `[RequestCoalescer COMPLETE] ${rpcName} finished (${elapsed}ms)`
        );
      }

      // Clear from cache on success
      inFlightCache.delete(cacheKey);

      return result;
    })
    .catch((error) => {
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
  if (__DEV__) {
    console.warn(
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
