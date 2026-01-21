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

  // Cursor tracking
  const [serviceCursor, setServiceCursor] = useState<Cursor | null>(null);
  const [jobCursor, setJobCursor] = useState<Cursor | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

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

        return true;
      }
    } catch (err) {
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

              const { data, error } = await supabase.rpc('get_services_cursor_paginated', {
                p_cursor_created_at: currentCursor?.created_at || null,
                p_cursor_id: currentCursor?.id || null,
                p_limit: pageSize,
                p_category_id: filters.categories.length === 1 ? filters.categories[0] : null,
                p_search: searchQuery.trim() || null,
                p_min_price: filters.priceMin ? parseFloat(filters.priceMin) : null,
                p_max_price: filters.priceMax ? parseFloat(filters.priceMax) : null,
                p_min_rating: filters.minRating || null,
                p_listing_types: listingTypes
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

              const { data, error } = await supabase.rpc('get_jobs_cursor_paginated', {
                p_cursor_created_at: currentCursor?.created_at || null,
                p_cursor_id: currentCursor?.id || null,
                p_limit: pageSize,
                p_category_id: filters.categories.length === 1 ? filters.categories[0] : null,
                p_search: searchQuery.trim() || null,
                p_min_budget: filters.priceMin ? parseFloat(filters.priceMin) : null,
                p_max_budget: filters.priceMax ? parseFloat(filters.priceMax) : null
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

        // Sort by created_at descending
        allResults.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        if (!isMountedRef.current) return;

        if (reset) {
          setListings(allResults);
          setHasMore(allResults.length >= pageSize);

          // Save snapshot for next time
          if (isInitialLoad && allResults.length > 0) {
            saveSnapshot(userId, allResults,
              allResults.length > 0 ? {
                created_at: allResults[allResults.length - 1].created_at,
                id: allResults[allResults.length - 1].id
              } : null
            );
          }
        } else {
          setListings(prev => [...prev, ...allResults]);
          setHasMore(allResults.length >= pageSize);
        }

        setError(null);
        setInitialLoadComplete(true);
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

    const effectiveDebounce = initialLoadComplete ? debounceMs : 50;

    searchTimeout.current = setTimeout(() => {
      fetchListingsCursor(true);
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
  };
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

function normalizeServiceCursor(service: any): MarketplaceListing {
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
    provider: service.provider_full_name ? {
      id: service.provider_id,
      full_name: service.provider_full_name,
      avatar_url: service.provider_avatar,
      city: service.provider_city,
      state: service.provider_state,
      user_type: service.provider_user_type,
      rating_average: service.provider_rating_average,
      rating_count: service.provider_rating_count,
      id_verified: service.provider_id_verified,
      latitude: service.latitude,
      longitude: service.longitude
    } : undefined,
    latitude: service.latitude,
    longitude: service.longitude,
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
    customer: job.customer_full_name ? {
      id: job.customer_id,
      full_name: job.customer_full_name,
      avatar_url: job.customer_avatar,
      user_type: job.customer_user_type,
      rating_average: job.customer_rating_average,
      rating_count: job.customer_rating_count,
      id_verified: job.customer_id_verified,
      latitude: job.latitude,
      longitude: job.longitude
    } : undefined,
    city: job.city,
    state: job.state,
    latitude: job.latitude,
    longitude: job.longitude,
    deadline: job.deadline
  } as any;
}
