/**
 * PHASE 2: TRENDING SEARCHES HOOK
 *
 * Manages trending search terms and suggestions with caching.
 * Uses InteractionManager for non-blocking load.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { supabase } from '@/lib/supabase';
import {
  getCachedTrendingSearches,
  setCachedTrendingSearches,
  TrendingSearch,
} from '@/lib/listing-cache';

// ============================================================================
// TYPES
// ============================================================================

export type { TrendingSearch };

interface UseTrendingSearchesOptions {
  userId: string | null;
  enabled?: boolean;
  limit?: number;
  useInteractionManager?: boolean;
}

interface UseTrendingSearchesReturn {
  searches: TrendingSearch[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useTrendingSearches({
  userId,
  enabled = true,
  limit = 5,
  useInteractionManager = true,
}: UseTrendingSearchesOptions): UseTrendingSearchesReturn {
  const [searches, setSearches] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTrendingSearches = useCallback(async () => {
    if (!enabled) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;

    // Check cache
    const cached = getCachedTrendingSearches(userId);
    if (cached) {
      if (isMountedRef.current) {
        setSearches(cached);
        setLoading(false);
      }
      if (__DEV__) console.log('[useTrendingSearches] Cache hit');
      return;
    }

    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('popular_searches')
        .select('search_term, search_count')
        .order('search_count', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      if (data && isMountedRef.current) {
        const formattedSearches = data.map(d => ({
          suggestion: d.search_term,
          search_count: d.search_count,
        }));

        setSearches(formattedSearches);
        setCachedTrendingSearches(formattedSearches, userId);
      }

      setError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to fetch trending searches');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, enabled, limit]);

  useEffect(() => {
    if (!enabled || hasFetchedRef.current) return;

    if (useInteractionManager) {
      const task = InteractionManager.runAfterInteractions(() => {
        fetchTrendingSearches();
      });

      return () => {
        task.cancel();
      };
    } else {
      fetchTrendingSearches();
    }
  }, [enabled, useInteractionManager, fetchTrendingSearches]);

  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    setLoading(true);
    fetchTrendingSearches();
  }, [fetchTrendingSearches]);

  return {
    searches,
    loading,
    error,
    refresh,
  };
}
