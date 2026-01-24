/**
 * PHASE 2A: REQUEST COALESCING
 *
 * Prevents duplicate concurrent requests for identical parameters.
 * When multiple components request the same data simultaneously,
 * only one network call is made and the result is shared.
 *
 * Benefits:
 * - Reduces redundant network calls
 * - Lowers server load
 * - Maintains consistent data across components
 * - No behavior changes - transparent optimization
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Coalesce requests with identical keys
 * If a request for the same key is already in flight, return that promise
 * Otherwise, execute the function and cache the promise until resolution
 */
export async function coalesceRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Generate a stable key for listings requests
 * Serializes filter parameters deterministically
 */
export function getListingsRequestKey(params: {
  searchQuery?: string;
  categories?: string[];
  location?: string;
  priceMin?: string;
  priceMax?: string;
  minRating?: number;
  distance?: number;
  sortBy?: string;
  verified?: boolean;
  listingType?: string;
  userLatitude?: number;
  userLongitude?: number;
  cursor?: { created_at: string; id: string } | null;
  type: 'services' | 'jobs';
}): string {
  const normalized = {
    type: params.type,
    search: params.searchQuery?.trim() || '',
    categories: [...(params.categories || [])].sort(),
    location: params.location?.trim() || '',
    priceMin: params.priceMin || '',
    priceMax: params.priceMax || '',
    minRating: params.minRating || 0,
    distance: params.distance || null,
    sortBy: params.sortBy || 'relevance',
    verified: params.verified || false,
    listingType: params.listingType || 'all',
    userLat: params.userLatitude ? Number(params.userLatitude.toFixed(6)) : null,
    userLng: params.userLongitude ? Number(params.userLongitude.toFixed(6)) : null,
    cursor: params.cursor ? `${params.cursor.created_at}:${params.cursor.id}` : null,
  };

  return JSON.stringify(normalized);
}

/**
 * Clear all pending requests
 * Useful for cleanup or testing
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get count of pending requests
 * Useful for monitoring
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
