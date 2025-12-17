/**
 * Advanced Caching System for Performance Optimization and Scaling
 *
 * Multi-tier caching strategy:
 * 1. Memory cache (fastest, volatile)
 * 2. AsyncStorage cache (persistent, local)
 * 3. Query result caching
 * 4. Cache warming strategies
 * 5. Automatic cleanup
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_MEMORY_ITEMS = 200; // Increased for scaling

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isValid(entry)) {
          // Restore to memory cache
          this.memoryCache.set(key, entry);
          return entry.data;
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set cache data
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };

    // Enforce memory cache size limit
    if (this.memoryCache.size >= this.MAX_MEMORY_ITEMS) {
      // Remove oldest entry (FIFO)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store persistently
    try {
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  /**
   * Invalidate multiple entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear from memory
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    // Clear from storage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(
        (key) => key.startsWith('cache_') && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(matchingKeys);
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      entries: Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        valid: this.isValid(entry),
      })),
    };
  }
}

export const cache = new CacheManager();

// ============================================================================
// SCALING-SPECIFIC CACHE UTILITIES
// ============================================================================

export const CacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  subscription: (userId: string) => `subscription:${userId}`,
  listings: (userId: string) => `listings:${userId}`,
  jobs: (userId: string) => `jobs:${userId}`,
  bookings: (userId: string) => `bookings:${userId}`,
  transactions: (userId: string) => `transactions:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  messages: (conversationId: string) => `messages:${conversationId}`,
  reviews: (providerId: string) => `reviews:${providerId}`,
  plans: () => 'subscription_plans',
  categories: () => 'service_categories',
};

/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache(userId: string): Promise<void> {
  try {
    // Parallel preload of critical data
    await Promise.all([
      // User profile
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (data) await cache.set(CacheKeys.profile(userId), data, 600000);
      })(),

      // Subscription
      (async () => {
        const { data } = await supabase
          .from('user_subscriptions')
          .select('*, plan:subscription_plans(*)')
          .eq('user_id', userId)
          .in('status', ['Active', 'Trialing'])
          .maybeSingle();
        if (data) await cache.set(CacheKeys.subscription(userId), data, 600000);
      })(),

      // Subscription plans (shared)
      (async () => {
        const { data } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');
        if (data) await cache.set(CacheKeys.plans(), data, 3600000);
      })(),

      // Service categories (shared)
      (async () => {
        const { data } = await supabase
          .from('service_categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (data) await cache.set(CacheKeys.categories(), data, 7200000);
      })(),
    ]);
  } catch (error) {
    console.error('Error warming cache:', error);
  }
}

/**
 * Invalidate all user-specific caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cache.invalidatePattern(userId);
}

/**
 * Preload dashboard data for faster initial render
 */
export async function preloadDashboard(userId: string): Promise<void> {
  try {
    await Promise.all([
      // Recent bookings
      (async () => {
        const { data } = await supabase
          .from('bookings')
          .select('*')
          .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) await cache.set(CacheKeys.bookings(userId), data, 300000);
      })(),

      // Unread notifications
      (async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) await cache.set(CacheKeys.notifications(userId), data, 60000);
      })(),

      // Recent transactions
      (async () => {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (data) await cache.set(CacheKeys.transactions(userId), data, 300000);
      })(),
    ]);
  } catch (error) {
    console.error('Error preloading dashboard:', error);
  }
}

/**
 * Automatic cache cleanup
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCacheCleanup(intervalMs: number = 3600000): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            const entry: CacheEntry<any> = JSON.parse(value);
            if (Date.now() - entry.timestamp > entry.ttl) {
              await AsyncStorage.removeItem(key);
            }
          } catch {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }, intervalMs);
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Query result caching with automatic refresh
 */
export async function cachedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  ttl: number = 300000,
  forceRefresh: boolean = false
): Promise<{ data: T | null; error: any; fromCache: boolean }> {
  if (!forceRefresh) {
    const cached = await cache.get<T>(queryKey);
    if (cached !== null) {
      return { data: cached, error: null, fromCache: true };
    }
  }

  const result = await queryFn();

  if (result.data && !result.error) {
    await cache.set(queryKey, result.data, ttl);
  }

  return { ...result, fromCache: false };
}

/**
 * Generate cache key for shipping rates
 */
export function getShippingRateCacheKey(
  fromZip: string,
  toZip: string,
  weight: number,
  dimensions?: { length: number; width: number; height: number }
): string {
  const dimKey = dimensions
    ? `_${dimensions.length}x${dimensions.width}x${dimensions.height}`
    : '';
  return `shipping_rates_${fromZip}_${toZip}_${weight}${dimKey}`;
}

/**
 * Cache shipping rates with 30-minute TTL
 */
export async function cacheShippingRates(
  key: string,
  rates: any[]
): Promise<void> {
  await cache.set(key, rates, 30 * 60 * 1000); // 30 minutes
}

/**
 * Get cached shipping rates
 */
export async function getCachedShippingRates(
  key: string
): Promise<any[] | null> {
  return await cache.get<any[]>(key);
}

/**
 * Cache with fallback pattern
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache it
  await cache.set(key, data, ttl);

  return data;
}

/**
 * Cache decorator for functions
 */
export function cached(ttl?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}_${JSON.stringify(args)}`;
      return await withCache(cacheKey, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
