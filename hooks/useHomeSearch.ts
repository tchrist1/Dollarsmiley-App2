import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

interface UseHomeSearchOptions {
  userId: string | null;
  minQueryLength?: number;
  debounceMs?: number;
}

export function useHomeSearch(options: UseHomeSearchOptions) {
  const { userId, minQueryLength = 2, debounceMs = 300 } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortController = useRef<AbortController | undefined>(undefined);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < minQueryLength) {
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }

    abortController.current = new AbortController();
    setLoadingSuggestions(true);

    try {
      const { data, error } = await supabase
        .from('search_trends')
        .select('suggestion, search_count')
        .ilike('suggestion', `%${query}%`)
        .order('search_count', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!abortController.current.signal.aborted) {
        setSuggestions(data || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      if (!abortController.current?.signal.aborted) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    } finally {
      if (!abortController.current?.signal.aborted) {
        setLoadingSuggestions(false);
      }
    }
  }, [minQueryLength]);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length >= minQueryLength) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(query);
      }, debounceMs);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [fetchSuggestions, minQueryLength, debounceMs]);

  const selectSuggestion = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);

    // Track search selection
    if (userId) {
      supabase
        .from('search_trends')
        .insert({
          user_id: userId,
          suggestion,
          search_count: 1,
        })
        .then();
    }
  }, [userId]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (abortController.current) {
      abortController.current.abort();
    }
  }, []);

  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  return {
    searchQuery,
    suggestions,
    showSuggestions,
    loadingSuggestions,
    updateSearchQuery,
    selectSuggestion,
    clearSearch,
    hideSuggestions,
  };
}
