/**
 * PHASE 2: LISTINGS DATA HOOK
 *
 * Manages marketplace listings with search, filtering, pagination, and caching.
 * Extracted from home screen to improve maintainability and reusability.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MarketplaceListing } from '@/types/database';
import { FilterOptions } from '@/components/FilterModal';
import {
  getCachedHomeListings,
  setCachedHomeListings,
} from '@/lib/listing-cache';
import { logPerfEvent } from '@/lib/performance-test-utils';

// ============================================================================
// TYPES
// ============================================================================

interface UseListingsOptions {
  searchQuery: string;
  filters: FilterOptions;
  userId: string | null;
  pageSize?: number;
  debounceMs?: number;
}

interface UseListingsReturn {
  listings: MarketplaceListing[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  fetchMore: () => void;
  refresh: () => void;
}

// ============================================================================
// NORMALIZATION
// ============================================================================

function normalizeServiceListing(service: any): MarketplaceListing {
  let photos = [];
  if (service.photos) {
    if (Array.isArray(service.photos)) {
      photos = service.photos;
    } else if (typeof service.photos === 'string') {
      try {
        photos = Array.isArray(JSON.parse(service.photos)) ? JSON.parse(service.photos) : [];
      } catch (e) {
        photos = [];
      }
    }
  }

  const featuredImage = service.featured_image_url || (photos.length > 0 ? photos[0] : 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg');
  const latitude = service.latitude ? (typeof service.latitude === 'string' ? parseFloat(service.latitude) : service.latitude) : null;
  const longitude = service.longitude ? (typeof service.longitude === 'string' ? parseFloat(service.longitude) : service.longitude) : null;

  return {
    id: service.id,
    marketplace_type: service.listing_type || 'Service',
    title: service.title || 'Untitled',
    description: service.description || '',
    category_id: service.category_id,
    location: service.location || '',
    latitude,
    longitude,
    photos,
    featured_image_url: featuredImage,
    created_at: service.created_at,
    base_price: service.base_price,
    pricing_type: service.pricing_type,
    provider_id: service.provider_id,
    status: service.status,
    listing_type: service.listing_type,
    provider: service.profiles,
    category: service.categories,
    distance_miles: service.distance_miles,
    view_count: service.view_count,
  };
}

function normalizeJob(job: any): MarketplaceListing {
  let photos = [];
  if (job.photos) {
    if (Array.isArray(job.photos)) {
      photos = job.photos;
    } else if (typeof job.photos === 'string') {
      try {
        photos = Array.isArray(JSON.parse(job.photos)) ? JSON.parse(job.photos) : [];
      } catch (e) {
        photos = [];
      }
    }
  }

  const featuredImage = job.featured_image_url || (photos.length > 0 ? photos[0] : 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg');
  const latitude = job.latitude ? (typeof job.latitude === 'string' ? parseFloat(job.latitude) : job.latitude) : null;
  const longitude = job.longitude ? (typeof job.longitude === 'string' ? parseFloat(job.longitude) : job.longitude) : null;

  return {
    id: job.id,
    marketplace_type: 'Job',
    title: job.title || 'Untitled Job',
    description: job.description || '',
    category_id: job.category_id,
    location: job.location || '',
    latitude,
    longitude,
    photos,
    featured_image_url: featuredImage,
    created_at: job.created_at,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
    fixed_price: job.fixed_price,
    pricing_type: job.pricing_type,
    customer_id: job.customer_id,
    status: job.status,
    execution_date_start: job.execution_date_start,
    execution_date_end: job.execution_date_end,
    preferred_time: job.preferred_time,
    customer: job.profiles,
    category: job.categories,
    distance_miles: job.distance_miles,
    view_count: 0,
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useListings({
  searchQuery,
  filters,
  userId,
  pageSize = 20,
  debounceMs = 300,
}: UseListingsOptions): UseListingsReturn {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // ============================================================================
  // FETCH FUNCTION
  // ============================================================================

  const fetchListings = useCallback(
    async (reset: boolean = false) => {
      const isInitialLoad = reset && !searchQuery.trim() && filters.categories.length === 0 &&
                            !filters.location.trim() && !filters.priceMin && !filters.priceMax;

      // Check cache for initial load
      if (isInitialLoad) {
        const cachedData = getCachedHomeListings(userId);
        if (cachedData) {
          setLoading(false);
          setListings(cachedData.slice(0, pageSize));
          setPage(1);
          setHasMore(cachedData.length > pageSize);
          if (__DEV__) console.log('[useListings] Cache hit - background refresh');
        }
      }

      if (reset) {
        if (!isInitialLoad || !getCachedHomeListings(userId)) {
          setLoading(true);
        }
        setListings([]);
      } else {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
      }

      const currentPage = reset ? 0 : page;
      const offset = currentPage * pageSize;

      try {
        const shouldFetchServices = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Service' || filters.listingType === 'CustomService';
        const shouldFetchJobs = !filters.listingType || filters.listingType === 'all' || filters.listingType === 'Job';

        const fetchPromises: Promise<{ type: 'service' | 'job'; data: any[] | null; error: any }>[] = [];

        // Service query
        if (shouldFetchServices) {
          let serviceQuery = supabase
            .from('service_listings')
            .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)');

          if (filters.listingType === 'Service') {
            serviceQuery = serviceQuery.eq('listing_type', 'Service');
          } else if (filters.listingType === 'CustomService') {
            serviceQuery = serviceQuery.eq('listing_type', 'CustomService');
          }

          serviceQuery = serviceQuery.eq('status', 'Active');

          if (searchQuery.trim()) {
            serviceQuery = serviceQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            serviceQuery = serviceQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            serviceQuery = serviceQuery.ilike('location', `%${filters.location}%`);
          }

          if (filters.priceMin) {
            serviceQuery = serviceQuery.gte('base_price', parseFloat(filters.priceMin));
          }

          if (filters.priceMax) {
            serviceQuery = serviceQuery.lte('base_price', parseFloat(filters.priceMax));
          }

          if (filters.verified) {
            serviceQuery = serviceQuery.eq('profiles.is_verified', true);
          }

          serviceQuery = serviceQuery.order('created_at', { ascending: false }).limit(pageSize * 2);

          fetchPromises.push(
            (async () => {
              const { data, error } = await serviceQuery;
              return { type: 'service' as const, data, error };
            })()
          );
        }

        // Job query
        if (shouldFetchJobs) {
          let jobQuery = supabase
            .from('jobs')
            .select('*, profiles!jobs_customer_id_fkey(*), categories(*)');

          jobQuery = jobQuery.eq('status', 'Open');

          if (searchQuery.trim()) {
            jobQuery = jobQuery.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }

          if (filters.categories.length > 0) {
            jobQuery = jobQuery.in('category_id', filters.categories);
          }

          if (filters.location.trim()) {
            jobQuery = jobQuery.ilike('location', `%${filters.location}%`);
          }

          if (filters.priceMin || filters.priceMax) {
            const conditions: string[] = ['pricing_type.eq.quote_based'];

            if (filters.priceMin && filters.priceMax) {
              conditions.push(`and(budget_min.gte.${parseFloat(filters.priceMin)},budget_max.lte.${parseFloat(filters.priceMax)})`);
              conditions.push(`and(fixed_price.gte.${parseFloat(filters.priceMin)},fixed_price.lte.${parseFloat(filters.priceMax)})`);
            } else if (filters.priceMin) {
              conditions.push(`budget_min.gte.${parseFloat(filters.priceMin)}`);
              conditions.push(`fixed_price.gte.${parseFloat(filters.priceMin)}`);
            } else if (filters.priceMax) {
              conditions.push(`budget_max.lte.${parseFloat(filters.priceMax)}`);
              conditions.push(`fixed_price.lte.${parseFloat(filters.priceMax)}`);
            }

            jobQuery = jobQuery.or(conditions.join(','));
          }

          jobQuery = jobQuery.order('created_at', { ascending: false }).limit(pageSize * 2);

          fetchPromises.push(
            (async () => {
              const { data, error } = await jobQuery;
              return { type: 'job' as const, data, error };
            })()
          );
        }

        const results = await Promise.all(fetchPromises);

        let allResults: MarketplaceListing[] = [];

        for (const result of results) {
          if (result.type === 'service' && result.data) {
            allResults = [...allResults, ...result.data.map(normalizeServiceListing)];
          } else if (result.type === 'job' && result.data) {
            allResults = [...allResults, ...result.data.map(normalizeJob)];
          }
        }

        allResults.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const paginatedResults = allResults.slice(offset, offset + pageSize);

        if (!isMountedRef.current) return;

        if (reset) {
          setListings(paginatedResults);
          setPage(1);
          setHasMore(allResults.length > pageSize);

          if (isInitialLoad) {
            setCachedHomeListings(allResults, userId);
          }
        } else {
          setListings(prev => [...prev, ...paginatedResults]);
          setPage(prev => prev + 1);
          setHasMore(allResults.length > (currentPage + 1) * pageSize);
        }

        setError(null);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setError(err.message || 'Failed to fetch listings');
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [searchQuery, filters, userId, pageSize, page, hasMore, loadingMore]
  );

  // Debounced effect
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setHasMore(true);
      fetchListings(true);
    }, debounceMs);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, filters]);

  const fetchMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      fetchListings(false);
    }
  }, [loading, loadingMore, hasMore, fetchListings]);

  const refresh = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchListings(true);
  }, [fetchListings]);

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
