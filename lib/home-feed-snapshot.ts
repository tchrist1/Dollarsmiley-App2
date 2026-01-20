import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { MarketplaceListing } from '@/types/database';

// ============================================================================
// HOME FEED SNAPSHOT SYSTEM
// Tier 3 Performance Layer
// ============================================================================

const SNAPSHOT_PREFIX = 'home_feed_snapshot:';
const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 minutes client-side TTL

interface SnapshotData {
  listings: MarketplaceListing[];
  timestamp: number;
  cursor: { created_at: string; id: string } | null;
}

interface SnapshotMinimal {
  id: string;
  marketplace_type: 'Service' | 'Job';
  title: string;
  price: number;
  image_url: string;
  created_at: string;
  rating: number | null;
  provider_id: string;
  provider_name: string;
  location: string;
  listing_type: string;
}

/**
 * Generate cache key for home feed snapshot
 */
export function getSnapshotCacheKey(userId: string | null, context?: { location?: string }): string {
  if (!userId) {
    return `${SNAPSHOT_PREFIX}guest`;
  }

  if (context?.location) {
    return `${SNAPSHOT_PREFIX}user:${userId}:location:${context.location}`;
  }

  return `${SNAPSHOT_PREFIX}user:${userId}`;
}

/**
 * Fetch snapshot from server-side cache
 * This is FAST - returns minimal data optimized for instant display
 */
export async function fetchHomeFeedSnapshot(
  userId: string | null,
  limit: number = 20
): Promise<SnapshotMinimal[] | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_home_feed_snapshot', {
        p_user_id: userId,
        p_limit: limit
      });

    if (error) {
      console.error('[Snapshot] Server fetch error:', error);
      return null;
    }

    return data as SnapshotMinimal[];
  } catch (err) {
    console.error('[Snapshot] Exception during fetch:', err);
    return null;
  }
}

/**
 * Get cached snapshot from AsyncStorage
 * Returns null if expired or not found
 */
export async function getCachedSnapshot(
  userId: string | null,
  context?: { location?: string }
): Promise<SnapshotData | null> {
  try {
    const key = getSnapshotCacheKey(userId, context);
    const cached = await AsyncStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const snapshot: SnapshotData = JSON.parse(cached);
    const now = Date.now();

    // Check if expired
    if (now - snapshot.timestamp > SNAPSHOT_TTL_MS) {
      // Clean up expired snapshot
      await AsyncStorage.removeItem(key);
      return null;
    }

    return snapshot;
  } catch (err) {
    console.error('[Snapshot] Error reading cache:', err);
    return null;
  }
}

/**
 * Save snapshot to AsyncStorage
 */
export async function saveSnapshot(
  userId: string | null,
  listings: MarketplaceListing[],
  cursor: { created_at: string; id: string } | null = null,
  context?: { location?: string }
): Promise<void> {
  try {
    const key = getSnapshotCacheKey(userId, context);
    const snapshot: SnapshotData = {
      listings,
      timestamp: Date.now(),
      cursor
    };

    await AsyncStorage.setItem(key, JSON.stringify(snapshot));
  } catch (err) {
    console.error('[Snapshot] Error saving cache:', err);
  }
}

/**
 * Invalidate snapshot cache (call when user logs out or data changes)
 */
export async function invalidateSnapshot(
  userId: string | null,
  context?: { location?: string }
): Promise<void> {
  try {
    const key = getSnapshotCacheKey(userId, context);
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.error('[Snapshot] Error invalidating cache:', err);
  }
}

/**
 * Invalidate all snapshots for a user
 */
export async function invalidateAllSnapshots(userId: string | null): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const snapshotKeys = keys.filter(key =>
      key.startsWith(SNAPSHOT_PREFIX) &&
      (userId ? key.includes(userId) : key.includes('guest'))
    );

    if (snapshotKeys.length > 0) {
      await AsyncStorage.multiRemove(snapshotKeys);
    }
  } catch (err) {
    console.error('[Snapshot] Error invalidating all snapshots:', err);
  }
}

/**
 * Convert minimal snapshot data to MarketplaceListing format
 * This creates a lightweight listing object for immediate display
 */
export function snapshotToMarketplaceListing(snapshot: SnapshotMinimal): MarketplaceListing {
  const isJob = snapshot.marketplace_type === 'Job';

  if (isJob) {
    return {
      marketplace_type: 'Job',
      id: snapshot.id,
      title: snapshot.title,
      budget: snapshot.price,
      photos: snapshot.image_url ? [snapshot.image_url] : [],
      created_at: snapshot.created_at,
      customer: {
        id: snapshot.provider_id,
        full_name: snapshot.provider_name
      },
      city: snapshot.location.split(',')[0]?.trim() || '',
      state: snapshot.location.split(',')[1]?.trim() || '',
      description: '', // Will be hydrated later
      status: 'open',
      category_id: null,
      customer_id: snapshot.provider_id
    } as any;
  } else {
    return {
      marketplace_type: 'Service',
      id: snapshot.id,
      title: snapshot.title,
      price: snapshot.price,
      image_url: snapshot.image_url,
      featured_image_url: snapshot.image_url,
      created_at: snapshot.created_at,
      average_rating: snapshot.rating || 0,
      provider: {
        id: snapshot.provider_id,
        full_name: snapshot.provider_name
      },
      listing_type: snapshot.listing_type,
      description: '', // Will be hydrated later
      status: 'Active',
      provider_id: snapshot.provider_id
    } as any;
  }
}

/**
 * Pre-warm home feed data
 * Call this after user login to prepare data before Home screen opens
 */
export async function prewarmHomeFeed(userId: string | null): Promise<void> {
  try {
    // Check if we already have a recent snapshot
    const cached = await getCachedSnapshot(userId);
    if (cached && Date.now() - cached.timestamp < 60000) {
      // Snapshot is less than 1 minute old, no need to refresh
      return;
    }

    // Fetch new snapshot from server
    const snapshot = await fetchHomeFeedSnapshot(userId, 20);

    if (snapshot && snapshot.length > 0) {
      // Convert to marketplace listings
      const listings = snapshot.map(snapshotToMarketplaceListing);

      // Save to cache
      await saveSnapshot(userId, listings, {
        created_at: snapshot[snapshot.length - 1].created_at,
        id: snapshot[snapshot.length - 1].id
      });

      if (__DEV__) {
        console.log(`[Prewarm] Cached ${snapshot.length} listings for instant display`);
      }
    }
  } catch (err) {
    console.error('[Prewarm] Error warming home feed:', err);
  }
}

/**
 * Get instant home feed
 * Returns cached data immediately if available, null otherwise
 * Use this for instant display on Home screen open
 */
export async function getInstantHomeFeed(
  userId: string | null
): Promise<{ listings: MarketplaceListing[]; cursor: { created_at: string; id: string } | null } | null> {
  try {
    const cached = await getCachedSnapshot(userId);

    if (cached) {
      return {
        listings: cached.listings,
        cursor: cached.cursor
      };
    }

    return null;
  } catch (err) {
    console.error('[InstantFeed] Error:', err);
    return null;
  }
}
