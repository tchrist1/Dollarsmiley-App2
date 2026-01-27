/**
 * TIER 3: CURSOR-BASED LISTINGS HOOK
 *
 * Enterprise-grade performance with:
 * - Cursor-based pagination (no OFFSET degradation)
 * - Snapshot-first loading (instant perceived load)
 * - Two-phase fetch (minimal data → full data)
 * - Background hydration
 * - Scales to 10,000+ listings efficiently
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MarketplaceListing } from '@/types/database';
import { FilterOptions } from '@/components/FilterModal';
import {
  getInstantHomeFeed,
  saveSnapshot,
  snapshotToMarketplaceListing,
  fetchHomeFeedSnapshot
} from '@/lib/home-feed-snapshot';
import { coalescedRpc } from '@/lib/request-coalescer';

// ============================================================================
// TYPES
// ============================================================================

interface UseListingsCursorOptions {
  searchQuery: string;
  filters: FilterOptions;
  userId: string | null;
  pageSize?: number;
  debounceMs?: number;
  enableSnapshot?: boolean; // Enable snapshot-first loading
}

interface UseListingsCursorReturn {
  listings: MarketplaceListing[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchMore: () => void;
  refresh: () => void;
  isTransitioning: boolean;
  hasHydratedLiveData: boolean;
  visualCommitReady: boolean;
}

interface Cursor {
  created_at: string;
  id: string;
}

// ============================================================================
// HOOK
// ============================================================================

export function useListingsCursor({
  searchQuery,
  filters,
  userId,
  pageSize = 20,
  debounceMs = 300,
  enableSnapshot = true,
}: UseListingsCursorOptions): UseListingsCursorReturn {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasHydratedLiveData, setHasHydratedLiveData] = useState(false);
  const [visualCommitReady, setVisualCommitReady] = useState(true);

  // Cursor tracking
  const [serviceCursor, setServiceCursor] = useState<Cursor | null>(null);
  const [jobCursor, setJobCursor] = useState<Cursor | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // REFINEMENT 1: SNAPSHOT ONE-SHOT GUARANTEE
  // Once snapshot is consumed, it can never be re-applied this mount cycle
  const snapshotConsumedRef = useRef(false);

  // REFINEMENT 2: LIVE FETCH AUTHORITY LOCK
  // Once live fetch starts, snapshot logic is disabled permanently
  const liveFetchStartedRef = useRef(false);

  // Tier-4: Track if snapshot was loaded to optimize initial refresh debounce
  const snapshotLoadedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // ============================================================================
  // PHASE 1: INSTANT SNAPSHOT LOAD
  // ============================================================================

  const loadFromSnapshot = useCallback(async (): Promise<boolean> => {
    if (!enableSnapshot) return false;

    // REFINEMENT 1: One-shot guarantee - never re-apply snapshot
    if (snapshotConsumedRef.current) {
      return false;
    }

    // REFINEMENT 2: Authority lock - once live fetch starts, disable snapshot
    if (liveFetchStartedRef.current) {
      return false;
    }

    const isCleanInitialLoad =
      !searchQuery.trim() &&
      filters.categories.length === 0 &&
      !filters.location.trim() &&
      !filters.priceMin &&
      !filters.priceMax;

    if (!isCleanInitialLoad) return false;

    try {
      const instantFeed = await getInstantHomeFeed(userId);

      if (instantFeed && instantFeed.listings.length > 0) {
        setLoading(false);
        setListings(instantFeed.listings);
        setHasMore(instantFeed.listings.length >= pageSize);
        setInitialLoadComplete(true);

        // REFINEMENT 1: Mark snapshot as consumed - can never load again
        snapshotConsumedRef.current = true;

        // Tier-4: Mark snapshot loaded for optimized refresh
        snapshotLoadedRef.current = true;

        // REFINEMENT 3: Allow snapshot to display immediately
        // visualCommitReady = true lets snapshot data display
        // It will remain true until live data overwrites it
        setVisualCommitReady(true);

        // OPTIMIZATION: Log successful snapshot load for observability
        if (__DEV__) {
          console.log('[useListingsCursor] Snapshot loaded:', instantFeed.listings.length, 'listings');
        }

        return true;
      }
    } catch (err) {
      // OPTIMIZATION: Log snapshot failures for observability (non-blocking)
      if (__DEV__) {
        console.warn('[useListingsCursor] Snapshot load failed, falling back to live fetch:', err);
      }
      // Snapshot load failed, continue with normal fetch
    }

    return false;
  }, [userId, searchQuery, filters, pageSize, enableSnapshot]);

  // ============================================================================
  // PHASE 2: CURSOR-BASED FETCH
  // ============================================================================

  const fetchListingsCursor = useCallback(
    async (reset: boolean = false) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const isInitialLoad = reset && !searchQuery.trim() &&
                           filters.categories.length === 0 &&
                           !filters.location.trim() &&
                           !filters.priceMin &&
                           !filters.priceMax;

      // Phase 1: Try snapshot first on initial load
      if (reset && isInitialLoad && enableSnapshot) {
        const snapshotLoaded = await loadFromSnapshot();

        if (snapshotLoaded) {
          // Continue with background refresh
          // Don't set loading to true since we have snapshot data
        } else {
          setLoading(true);
        }
      } else if (reset) {
        setLoading(true);
        setListings([]);
      } else {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
      }

      // Reset cursors on new search
      if (reset) {
        setServiceCursor(null);
        setJobCursor(null);
      }

      // REFINEMENT 2: LIVE FETCH AUTHORITY LOCK
      // Mark that live fetch has started - snapshot logic now disabled
      liveFetchStartedRef.current = true;

      try {
        const shouldFetchServices = !filters.listingType ||
                                   filters.listingType === 'all' ||
                                   filters.listingType === 'Service' ||
                                   filters.listingType === 'CustomService';
        const shouldFetchJobs = !filters.listingType ||
                               filters.listingType === 'all' ||
                               filters.listingType === 'Job';

        const fetchPromises: Promise<{
          type: 'service' | 'job';
          data: any[] | null;
          error: any;
          nextCursor: Cursor | null;
        }>[] = [];

        // ====================================================================
        // CURSOR-BASED SERVICE FETCH
        // ====================================================================

        if (shouldFetchServices) {
          fetchPromises.push(
            (async () => {
              const currentCursor = reset ? null : serviceCursor;
              const listingTypes = filters.listingType === 'Service' ? ['Service']
                : filters.listingType === 'CustomService' ? ['CustomService']
                : ['Service', 'CustomService'];

              // PHASE 2A: Coalesced RPC call to reduce duplicate requests
              const { data, error } = await coalescedRpc(supabase, 'get_services_cursor_paginated', {
                p_cursor_created_at: currentCursor?.created_at || null,
                p_cursor_id: currentCursor?.id || null,
                p_limit: pageSize,
                p_category_ids: filters.categories.length > 0 ? filters.categories : null,
                p_search: searchQuery.trim() || null,
                p_min_price: filters.priceMin ? parseFloat(filters.priceMin) : null,
                p_max_price: filters.priceMax ? parseFloat(filters.priceMax) : null,
                p_min_rating: filters.minRating || null,
                p_listing_types: listingTypes,
                p_sort_by: filters.sortBy || 'relevance',
                p_verified: filters.verified || null,
                p_user_lat: filters.userLatitude !== undefined && filters.userLatitude !== null ? filters.userLatitude : null,
                p_user_lng: filters.userLongitude !== undefined && filters.userLongitude !== null ? filters.userLongitude : null,
                p_distance: filters.distance !== undefined && filters.distance !== null ? filters.distance : null
              });

              let nextCursor: Cursor | null = null;
              if (data && data.length > 0) {
                const last = data[data.length - 1];
                nextCursor = {
                  created_at: last.created_at,
                  id: last.id
                };
              }

              return { type: 'service' as const, data, error, nextCursor };
            })()
          );
        }

        // ====================================================================
        // CURSOR-BASED JOB FETCH
        // ====================================================================

        if (shouldFetchJobs) {
          fetchPromises.push(
            (async () => {
              const currentCursor = reset ? null : jobCursor;

              // PHASE 2A: Coalesced RPC call to reduce duplicate requests
              const { data, error } = await coalescedRpc(supabase, 'get_jobs_cursor_paginated', {
                p_cursor_created_at: currentCursor?.created_at || null,
                p_cursor_id: currentCursor?.id || null,
                p_limit: pageSize,
                p_category_ids: filters.categories.length > 0 ? filters.categories : null,
                p_search: searchQuery.trim() || null,
                p_min_budget: filters.priceMin ? parseFloat(filters.priceMin) : null,
                p_max_budget: filters.priceMax ? parseFloat(filters.priceMax) : null,
                p_sort_by: filters.sortBy || 'relevance',
                p_verified: filters.verified || null,
                p_user_lat: filters.userLatitude !== undefined && filters.userLatitude !== null ? filters.userLatitude : null,
                p_user_lng: filters.userLongitude !== undefined && filters.userLongitude !== null ? filters.userLongitude : null,
                p_distance: filters.distance !== undefined && filters.distance !== null ? filters.distance : null
              });

              let nextCursor: Cursor | null = null;
              if (data && data.length > 0) {
                const last = data[data.length - 1];
                nextCursor = {
                  created_at: last.created_at,
                  id: last.id
                };
              }

              return { type: 'job' as const, data, error, nextCursor };
            })()
          );
        }

        const results = await Promise.all(fetchPromises);

        if (signal.aborted) return;

        // Process results
        const allResults: MarketplaceListing[] = [];

        for (const result of results) {
          if (result.error) {
            // OPTIMIZATION: Log RPC failures for observability (non-blocking)
            if (__DEV__) {
              console.warn('[useListingsCursor] RPC fetch failed:', result.type, result.error);
            }
            continue;
          }

          if (result.data) {
            if (result.type === 'service') {
              // Convert services to MarketplaceListing
              const services = result.data.map((s: any) => normalizeServiceCursor(s));
              allResults.push(...services);

              // Update cursor
              if (result.nextCursor) {
                setServiceCursor(result.nextCursor);
              }
            } else {
              // Convert jobs to MarketplaceListing
              const jobs = result.data.map((j: any) => normalizeJobCursor(j));
              allResults.push(...jobs);

              // Update cursor
              if (result.nextCursor) {
                setJobCursor(result.nextCursor);
              }
            }
          }
        }

        // OPTIMIZATION: REMOVED CLIENT-SIDE SORTING
        // Database now handles all sorting via composite indexes in RPC functions.
        // Results arrive pre-sorted from get_services_cursor_paginated_v2 and
        // get_jobs_cursor_paginated_v2 based on p_sort_by parameter.
        // This eliminates redundant O(n log n) sorting on client side.
        // The ORDER BY clauses in the RPC functions use the new composite indexes
        // created in optimize_cursor_pagination_indexes migration for optimal performance.

        if (!isMountedRef.current) return;

        // REFINEMENT 4: ATOMIC LIVE DATA COMMIT
        // All state updates happen together in one batch
        if (reset) {
          setListings(allResults);
          setHasMore(allResults.length >= pageSize);
          setError(null);
          setInitialLoadComplete(true);
          setHasHydratedLiveData(true);

          // REFINEMENT 3: DATA-DRIVEN VISUAL COMMIT
          // Flip visualCommitReady only after live data is finalized
          setVisualCommitReady(true);

          if (__DEV__) {
            console.log('[useListingsCursor] Visual commit ready - live data finalized:', allResults.length, 'listings');
          }

          // REFINEMENT 5: SNAPSHOT SAVE GUARD
          // Save ONLY final live listings, never snapshot-derived data
          if (isInitialLoad && allResults.length > 0 && liveFetchStartedRef.current) {
            saveSnapshot(userId, allResults,
              allResults.length > 0 ? {
                created_at: allResults[allResults.length - 1].created_at,
                id: allResults[allResults.length - 1].id
              } : null
            );
          }
        } else {
          // Pagination: append data
          setListings(prev => [...prev, ...allResults]);
          setHasMore(allResults.length >= pageSize);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;

        if (!isMountedRef.current) return;
        if (signal.aborted) return;

        setError(err.message || 'Failed to fetch listings');
      } finally {
        if (isMountedRef.current && !signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [searchQuery, filters, userId, pageSize, hasMore, loadingMore,
     initialLoadComplete, enableSnapshot, serviceCursor, jobCursor, loadFromSnapshot]
  );

  // Debounced effect
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // Tier-4: Optimized debounce logic
    // - Snapshot loaded on initial mount → 0ms delay for background refresh
    // - Initial load without snapshot → 50ms delay
    // - User-driven changes after initial load → 300ms debounce
    let effectiveDebounce = debounceMs; // Default: 300ms

    if (!initialLoadComplete) {
      // Initial mount
      effectiveDebounce = snapshotLoadedRef.current ? 0 : 50;
    }

    setIsTransitioning(true);

    // REFINEMENT 3: Visual commit controlled by data, not timer
    // Only set visualCommitReady = false if snapshot hasn't been consumed yet
    // This prevents flickering when snapshot is already displayed
    if (!snapshotConsumedRef.current) {
      setVisualCommitReady(false);
    }

    searchTimeout.current = setTimeout(() => {
      fetchListingsCursor(true);

      // Reset snapshot flag after first live fetch
      if (snapshotLoadedRef.current) {
        snapshotLoadedRef.current = false;
      }

      // REFINEMENT 3: Removed timer-based visualCommitReady flip
      // visualCommitReady now flips only when live data is ready (in fetchListingsCursor)
      setIsTransitioning(false);
    }, effectiveDebounce);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, filters, userId]);

  const fetchMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchListingsCursor(false);
    }
  }, [loading, loadingMore, hasMore, fetchListingsCursor]);

  const refresh = useCallback(() => {
    fetchListingsCursor(true);
  }, [fetchListingsCursor]);

  return {
    listings,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchMore,
    refresh,
    isTransitioning,
    hasHydratedLiveData,
    visualCommitReady,
  };
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

function normalizeServiceCursor(service: any): MarketplaceListing {
  // Extract coordinates from service level
  const latitude = service.latitude !== undefined && service.latitude !== null
    ? (typeof service.latitude === 'string' ? parseFloat(service.latitude) : service.latitude)
    : null;
  const longitude = service.longitude !== undefined && service.longitude !== null
    ? (typeof service.longitude === 'string' ? parseFloat(service.longitude) : service.longitude)
    : null;

  return {
    id: service.id,
    marketplace_type: 'Service',
    title: service.title,
    description: service.description || '',
    price: service.price,
    base_price: service.price, // Map to base_price for UI compatibility
    image_url: service.image_url,
    featured_image_url: service.image_url,
    created_at: service.created_at,
    status: service.status,
    provider_id: service.provider_id,
    category_id: service.category_id,
    average_rating: service.rating || 0,
    rating_average: service.rating || 0,
    total_bookings: service.total_bookings || 0,
    listing_type: service.listing_type,
    service_type: service.service_type || 'In-Person',
    provider: service.provider_id ? {
      id: service.provider_id,
      full_name: service.provider_full_name || null,
      avatar_url: service.provider_avatar || null,
      city: service.provider_city || null,
      state: service.provider_state || null,
      location: service.provider_location || null,
      // PROVIDER PINS FIX: Copy coordinates into provider object
      latitude: latitude,
      longitude: longitude,
      // PROVIDER PINS FIX: Map user_type correctly
      user_type: service.provider_user_type || null,
    } : undefined,
    latitude: latitude,
    longitude: longitude,
    distance_miles: service.distance_miles !== undefined && service.distance_miles !== null ? service.distance_miles : null,
  } as any;
}

function normalizeJobCursor(job: any): MarketplaceListing {
  // Parse photos if it's a JSONB string, otherwise use as-is
  let photos = [];
  if (job.photos) {
    if (Array.isArray(job.photos)) {
      photos = job.photos;
    } else if (typeof job.photos === 'object') {
      // JSONB object - extract array or use empty
      photos = Array.isArray(job.photos) ? job.photos : [];
    }
  }

  // Fallback to featured_image_url if available
  if (photos.length === 0 && job.featured_image_url) {
    photos = [job.featured_image_url];
  }

  // Extract coordinates from job level
  const latitude = job.latitude !== undefined && job.latitude !== null
    ? (typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude)
    : null;
  const longitude = job.longitude !== undefined && job.longitude !== null
    ? (typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude)
    : null;

  return {
    id: job.id,
    marketplace_type: 'Job',
    title: job.title,
    description: job.description || '',
    budget: job.budget,
    photos,
    created_at: job.created_at,
    status: job.status,
    customer_id: job.customer_id,
    category_id: job.category_id,
    customer: job.customer_id ? {
      id: job.customer_id,
      full_name: job.customer_full_name || null,
      avatar_url: job.customer_avatar || null,
      location: job.customer_location || null,
      // PROVIDER PINS FIX: Copy coordinates into customer object
      latitude: latitude,
      longitude: longitude,
      // PROVIDER PINS FIX: Map user_type correctly
      user_type: job.customer_user_type || null,
    } : undefined,
    city: job.city,
    state: job.state,
    latitude: latitude,
    longitude: longitude,
    distance_miles: job.distance_miles !== undefined && job.distance_miles !== null ? job.distance_miles : null,
    fixed_price: job.fixed_price,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
    featured_image_url: job.featured_image_url,
  } as any;
}
