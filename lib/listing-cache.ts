/**
 * PHASE 2: STRUCTURED CACHING LAYER
 *
 * Centralized cache management for marketplace data with type-safe interfaces,
 * user-specific invalidation, and configurable TTLs.
 */

import { MarketplaceListing } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string | null;
}

export interface CarouselData {
  trending: MarketplaceListing[];
  popular: MarketplaceListing[];
  recommended: MarketplaceListing[];
}

export interface TrendingSearch {
  suggestion: string;
  search_count: number;
}

// ============================================================================
// CACHE STORAGE
// ============================================================================

let homeListingsCache: CacheEntry<MarketplaceListing[]> | null = null;
let carouselCache: CacheEntry<CarouselData> | null = null;
let trendingSearchesCache: CacheEntry<TrendingSearch[]> | null = null;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_TTL = {
  HOME_LISTINGS: 3 * 60 * 1000,      // 3 minutes
  CAROUSEL_DATA: 10 * 60 * 1000,     // 10 minutes
  TRENDING_SEARCHES: 5 * 60 * 1000,  // 5 minutes
};

// ============================================================================
// UTILITIES
// ============================================================================

function isCacheValid<T>(
  cache: CacheEntry<T> | null,
  userId: string | null,
  ttl: number,
  cacheName: string
): boolean {
  if (!cache) {
    if (__DEV__) console.log(`[${cacheName}] Cache miss`);
    return false;
  }

  if (cache.userId !== userId) {
    if (__DEV__) console.log(`[${cacheName}] User mismatch`);
    return false;
  }

  const age = Date.now() - cache.timestamp;
  if (age > ttl) {
    if (__DEV__) console.log(`[${cacheName}] Expired (${Math.round(age / 1000)}s)`);
    return false;
  }

  if (__DEV__) console.log(`[${cacheName}] Hit (age: ${Math.round(age / 1000)}s)`);
  return true;
}

function createCacheEntry<T>(data: T, userId: string | null): CacheEntry<T> {
  return { data, timestamp: Date.now(), userId };
}

// ============================================================================
// HOME LISTINGS CACHE
// ============================================================================

export function getCachedHomeListings(userId: string | null): MarketplaceListing[] | null {
  if (!isCacheValid(homeListingsCache, userId, CACHE_TTL.HOME_LISTINGS, 'HOME_LISTINGS')) {
    homeListingsCache = null;
    return null;
  }
  return homeListingsCache!.data;
}

export function setCachedHomeListings(listings: MarketplaceListing[], userId: string | null): void {
  homeListingsCache = createCacheEntry(listings, userId);
  if (__DEV__) console.log(`[HOME_LISTINGS] Cached ${listings.length} items`);
}

export function invalidateHomeListingsCache(): void {
  if (homeListingsCache) {
    if (__DEV__) console.log('[HOME_LISTINGS] Invalidated');
    homeListingsCache = null;
  }
}

// ============================================================================
// CAROUSEL DATA CACHE
// ============================================================================

export function getCachedCarouselData(userId: string | null): CarouselData | null {
  if (!isCacheValid(carouselCache, userId, CACHE_TTL.CAROUSEL_DATA, 'CAROUSEL_DATA')) {
    carouselCache = null;
    return null;
  }
  return carouselCache!.data;
}

export function setCachedCarouselData(data: CarouselData, userId: string | null): void {
  carouselCache = createCacheEntry(data, userId);
  if (__DEV__) {
    const total = data.trending.length + data.popular.length + data.recommended.length;
    console.log(`[CAROUSEL_DATA] Cached ${total} items`);
  }
}

export function invalidateCarouselCache(): void {
  if (carouselCache) {
    if (__DEV__) console.log('[CAROUSEL_DATA] Invalidated');
    carouselCache = null;
  }
}

// ============================================================================
// TRENDING SEARCHES CACHE
// ============================================================================

export function getCachedTrendingSearches(userId: string | null): TrendingSearch[] | null {
  if (!isCacheValid(trendingSearchesCache, userId, CACHE_TTL.TRENDING_SEARCHES, 'TRENDING_SEARCHES')) {
    trendingSearchesCache = null;
    return null;
  }
  return trendingSearchesCache!.data;
}

export function setCachedTrendingSearches(searches: TrendingSearch[], userId: string | null): void {
  trendingSearchesCache = createCacheEntry(searches, userId);
  if (__DEV__) console.log(`[TRENDING_SEARCHES] Cached ${searches.length} items`);
}

export function invalidateTrendingSearchesCache(): void {
  if (trendingSearchesCache) {
    if (__DEV__) console.log('[TRENDING_SEARCHES] Invalidated');
    trendingSearchesCache = null;
  }
}

// ============================================================================
// GLOBAL MANAGEMENT
// ============================================================================

export function invalidateAllListingCaches(): void {
  if (__DEV__) console.log('[CACHE] Invalidating all caches');
  invalidateHomeListingsCache();
  invalidateCarouselCache();
  invalidateTrendingSearchesCache();
}

export function getCacheStats() {
  return {
    homeListings: {
      exists: !!homeListingsCache,
      age: homeListingsCache ? Date.now() - homeListingsCache.timestamp : null,
      count: homeListingsCache?.data.length,
    },
    carousel: {
      exists: !!carouselCache,
      age: carouselCache ? Date.now() - carouselCache.timestamp : null,
    },
    trendingSearches: {
      exists: !!trendingSearchesCache,
      age: trendingSearchesCache ? Date.now() - trendingSearchesCache.timestamp : null,
      count: trendingSearchesCache?.data.length,
    },
  };
}
