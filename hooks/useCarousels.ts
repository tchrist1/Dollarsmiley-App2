/**
 * PHASE 2: CAROUSEL DATA HOOK
 *
 * Manages trending, popular, and recommended listings for home screen carousels.
 * Implements lazy loading with delay to avoid blocking initial render.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MarketplaceListing } from '@/types/database';
import {
  getCachedCarouselData,
  setCachedCarouselData,
} from '@/lib/listing-cache';

// ============================================================================
// TYPES
// ============================================================================

interface UseCarouselsOptions {
  userId: string | null;
  enabled?: boolean;
  lazyLoadDelayMs?: number;
}

interface UseCarouselsReturn {
  trending: MarketplaceListing[];
  popular: MarketplaceListing[];
  recommended: MarketplaceListing[];
  loading: boolean;
  error: string | null;
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
    title: String(service.title || 'Untitled'),
    description: String(service.description || ''),
    category_id: service.category_id,
    location: String(service.location || ''),
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
    provider: service.profiles || null,
    category: service.categories || null,
    distance_miles: service.distance_miles,
    view_count: service.view_count || 0,
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
    title: String(job.title || 'Untitled Job'),
    description: String(job.description || ''),
    category_id: job.category_id,
    location: String(job.location || ''),
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
    customer: job.profiles || null,
    category: job.categories || null,
    distance_miles: job.distance_miles,
    view_count: 0,
  };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useCarousels({
  userId,
  enabled = true,
  lazyLoadDelayMs = 2000,
}: UseCarouselsOptions): UseCarouselsReturn {
  const [trending, setTrending] = useState<MarketplaceListing[]>([]);
  const [popular, setPopular] = useState<MarketplaceListing[]>([]);
  const [recommended, setRecommended] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState(false);

  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Lazy loading trigger
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        setShouldFetch(true);
      }
    }, lazyLoadDelayMs);

    return () => clearTimeout(timer);
  }, [enabled, lazyLoadDelayMs]);

  const fetchCarouselData = useCallback(async () => {
    if (!enabled || !shouldFetch) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;

    // Check cache
    const cached = getCachedCarouselData(userId);
    if (cached) {
      if (isMountedRef.current) {
        setTrending(cached.trending);
        setPopular(cached.popular);
        setRecommended(cached.recommended);
        setLoading(false);
      }
      if (__DEV__) console.log('[useCarousels] Cache hit - background refresh');
    }

    setLoading(true);

    try {
      const [servicesResult, jobsResult] = await Promise.all([
        supabase
          .from('service_listings')
          .select('*, profiles!service_listings_provider_id_fkey(*), categories(*)')
          .eq('status', 'Active')
          .order('view_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('jobs')
          .select('*, profiles!jobs_customer_id_fkey(*), categories(*)')
          .eq('status', 'Open')
          .order('created_at', { ascending: false })
          .limit(15),
      ]);

      const allServices = servicesResult.data ? servicesResult.data.map(normalizeServiceListing) : [];
      const allJobs = jobsResult.data ? jobsResult.data.map(normalizeJob) : [];
      const allListings = [...allServices, ...allJobs];

      if (allListings.length > 0 && isMountedRef.current) {
        // Trending: by view count
        const trendingListings = allListings
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 10);

        // Popular: by rating then views
        const popularListings = allListings
          .sort((a, b) => {
            const aProfile = a.provider || a.customer;
            const bProfile = b.provider || b.customer;
            const aRating = aProfile?.rating_average || 0;
            const bRating = bProfile?.rating_average || 0;

            if (aRating > 0 && bRating > 0) {
              const ratingDiff = bRating - aRating;
              if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
              return (bProfile?.rating_count || 0) - (aProfile?.rating_count || 0);
            }

            if (aRating > 0) return -1;
            if (bRating > 0) return 1;

            return (b.view_count || 0) - (a.view_count || 0);
          })
          .slice(0, 10);

        // Recommended: newest
        const recommendedListings = allListings
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);

        setTrending(trendingListings);
        setPopular(popularListings);
        setRecommended(recommendedListings);

        setCachedCarouselData(
          { trending: trendingListings, popular: popularListings, recommended: recommendedListings },
          userId
        );
      }

      setError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to fetch carousel data');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, enabled, shouldFetch]);

  useEffect(() => {
    if (shouldFetch && !hasFetchedRef.current) {
      fetchCarouselData();
    }
  }, [shouldFetch, fetchCarouselData]);

  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    setLoading(true);
    fetchCarouselData();
  }, [fetchCarouselData]);

  return {
    trending,
    popular,
    recommended,
    loading,
    error,
    refresh,
  };
}
