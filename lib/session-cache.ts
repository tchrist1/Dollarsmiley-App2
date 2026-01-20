/**
 * PHASE 4: LIGHTWEIGHT SESSION CACHING
 *
 * Purpose: Reduce redundant network requests and repeated computations
 * Scope: Session-only (no persistence), static or low-volatility data
 * Invalidation: TTL expiry, logout, account switch
 *
 * CONSTRAINTS:
 * - No business logic changes
 * - No Supabase query modifications
 * - No persistence across app restarts
 * - No UI behavior changes
 * - Transparent to user
 */

// ============================================================================
// CACHE ENTRY TYPE
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string | null;
}

// ============================================================================
// TRENDING SEARCHES CACHE
// ============================================================================
// Purpose: Avoid re-fetching trending searches on every Home visit
// TTL: 5 minutes (searches change slowly)
// Invalidation: TTL expiry, user change

interface TrendingSearch {
  suggestion: string;
  search_count: number;
}

let trendingSearchesCache: CacheEntry<TrendingSearch[]> | null = null;
const TRENDING_SEARCHES_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const getCachedTrendingSearches = (userId: string | null): TrendingSearch[] | null => {
  if (!trendingSearchesCache) {
    return null;
  }

  if (trendingSearchesCache.userId !== userId) {
    trendingSearchesCache = null;
    return null;
  }

  const age = Date.now() - trendingSearchesCache.timestamp;
  if (age > TRENDING_SEARCHES_TTL_MS) {
    trendingSearchesCache = null;
    return null;
  }

  return trendingSearchesCache.data;
};

export const setCachedTrendingSearches = (data: TrendingSearch[], userId: string | null) => {
  trendingSearchesCache = {
    data,
    timestamp: Date.now(),
    userId,
  };
};

export const invalidateTrendingSearchesCache = () => {
  if (trendingSearchesCache) {
    trendingSearchesCache = null;
  }
};

// ============================================================================
// CAROUSEL SECTIONS CACHE
// ============================================================================
// Purpose: Avoid re-fetching trending/popular/recommended on every Home visit
// TTL: 10 minutes (carousel data changes slowly)
// Invalidation: TTL expiry, user change

interface CarouselData {
  trending: any[];
  popular: any[];
  recommended: any[];
}

let carouselCache: CacheEntry<CarouselData> | null = null;
const CAROUSEL_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getCachedCarouselData = (userId: string | null): CarouselData | null => {
  if (!carouselCache) {
    return null;
  }

  if (carouselCache.userId !== userId) {
    carouselCache = null;
    return null;
  }

  const age = Date.now() - carouselCache.timestamp;
  if (age > CAROUSEL_TTL_MS) {
    carouselCache = null;
    return null;
  }

  return carouselCache.data;
};

export const setCachedCarouselData = (data: CarouselData, userId: string | null) => {
  carouselCache = {
    data,
    timestamp: Date.now(),
    userId,
  };
};

export const invalidateCarouselCache = () => {
  if (carouselCache) {
    carouselCache = null;
  }
};

// ============================================================================
// GEOCODING CACHE
// ============================================================================
// Purpose: Avoid re-geocoding same addresses repeatedly
// TTL: Session lifetime (addresses don't change)
// Key: address string
// Invalidation: User change only (addresses stable)

interface GeocodedLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

let geocodingCache: Map<string, CacheEntry<GeocodedLocation>> = new Map();
const GEOCODING_TTL_MS = 60 * 60 * 1000; // 1 hour (addresses very stable)

export const getCachedGeocode = (address: string, userId: string | null): GeocodedLocation | null => {
  const normalizedAddress = address.trim().toLowerCase();
  const entry = geocodingCache.get(normalizedAddress);

  if (!entry) {
    return null;
  }

  if (entry.userId !== userId) {
    geocodingCache.delete(normalizedAddress);
    return null;
  }

  const age = Date.now() - entry.timestamp;
  if (age > GEOCODING_TTL_MS) {
    geocodingCache.delete(normalizedAddress);
    return null;
  }

  return entry.data;
};

export const setCachedGeocode = (address: string, location: GeocodedLocation, userId: string | null) => {
  const normalizedAddress = address.trim().toLowerCase();
  geocodingCache.set(normalizedAddress, {
    data: location,
    timestamp: Date.now(),
    userId,
  });
};

export const invalidateGeocodingCache = () => {
  if (geocodingCache.size > 0) {
    geocodingCache.clear();
  }
};

// ============================================================================
// CATEGORIES CACHE (Module-level for cross-component sharing)
// ============================================================================
// Purpose: Share categories across FilterModal and other components
// TTL: Session lifetime (categories very stable)
// Invalidation: User change, manual refresh

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  [key: string]: any;
}

let categoriesCache: CacheEntry<Category[]> | null = null;
const CATEGORIES_TTL_MS = 60 * 60 * 1000; // 1 hour (very stable)

export const getCachedCategories = (userId: string | null): Category[] | null => {
  if (!categoriesCache) {
    return null;
  }

  if (categoriesCache.userId !== userId) {
    categoriesCache = null;
    return null;
  }

  const age = Date.now() - categoriesCache.timestamp;
  if (age > CATEGORIES_TTL_MS) {
    categoriesCache = null;
    return null;
  }

  return categoriesCache.data;
};

export const setCachedCategories = (data: Category[], userId: string | null) => {
  categoriesCache = {
    data,
    timestamp: Date.now(),
    userId,
  };
};

export const invalidateCategoriesCache = () => {
  if (categoriesCache) {
    categoriesCache = null;
  }
};

// ============================================================================
// GLOBAL CACHE INVALIDATION (on logout or account switch)
// ============================================================================

export const invalidateAllCaches = () => {
  invalidateTrendingSearchesCache();
  invalidateCarouselCache();
  invalidateGeocodingCache();
  invalidateCategoriesCache();
};

// ============================================================================
// CACHE STATISTICS (DEV-only)
// ============================================================================

export const getCacheStats = () => {
  if (!__DEV__) return null;

  return {
    trendingSearches: trendingSearchesCache ? {
      entries: trendingSearchesCache.data.length,
      age: Math.round((Date.now() - trendingSearchesCache.timestamp) / 1000),
    } : null,
    carousel: carouselCache ? {
      trending: carouselCache.data.trending.length,
      popular: carouselCache.data.popular.length,
      recommended: carouselCache.data.recommended.length,
      age: Math.round((Date.now() - carouselCache.timestamp) / 1000),
    } : null,
    geocoding: {
      entries: geocodingCache.size,
    },
    categories: categoriesCache ? {
      entries: categoriesCache.data.length,
      age: Math.round((Date.now() - categoriesCache.timestamp) / 1000),
    } : null,
  };
};
