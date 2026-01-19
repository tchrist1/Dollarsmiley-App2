/**
 * Force refresh utility to clear all caches and reload data
 * Use this when listings are not showing up due to stale cache
 */

import { invalidateAllListingCaches } from './listing-cache';
import { invalidateAllCaches } from './session-cache';

/**
 * Clear all caches and force a complete data refresh
 * Call this function from the debug menu or developer console
 */
export function forceRefreshAllData() {
  console.log('\n=== FORCE REFRESH: Clearing All Caches ===\n');

  // Clear listing caches
  invalidateAllListingCaches();
  console.log('✅ Listing caches cleared');

  // Clear session caches
  invalidateAllCaches();
  console.log('✅ Session caches cleared');

  console.log('\n=== Cache Clearing Complete ===');
  console.log('Please pull down to refresh the home screen to reload data.\n');

  return {
    success: true,
    message: 'All caches cleared. Pull down to refresh.',
  };
}

/**
 * Get current cache status for debugging
 */
export function getCacheDebugInfo() {
  const { getCacheStats } = require('./listing-cache');
  const stats = getCacheStats();

  console.log('\n=== Cache Debug Info ===\n');
  console.log('Home Listings Cache:', {
    exists: stats.homeListings.exists,
    count: stats.homeListings.count,
    ageSeconds: stats.homeListings.age ? Math.round(stats.homeListings.age / 1000) : null,
  });
  console.log('Carousel Cache:', {
    exists: stats.carousel.exists,
    ageSeconds: stats.carousel.age ? Math.round(stats.carousel.age / 1000) : null,
  });
  console.log('Trending Searches:', {
    exists: stats.trendingSearches.exists,
    count: stats.trendingSearches.count,
    ageSeconds: stats.trendingSearches.age ? Math.round(stats.trendingSearches.age / 1000) : null,
  });

  return stats;
}

// Make available globally for console access
if (typeof global !== 'undefined') {
  (global as any).forceRefreshAllData = forceRefreshAllData;
  (global as any).getCacheDebugInfo = getCacheDebugInfo;
}
