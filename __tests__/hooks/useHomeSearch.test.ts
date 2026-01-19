import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useHomeSearch } from '@/hooks/useHomeSearch';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('useHomeSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockSuggestions = [
    { suggestion: 'plumber', search_count: 100 },
    { suggestion: 'plumbing repair', search_count: 80 },
    { suggestion: 'plumbing service', search_count: 60 },
  ];

  const setupMockResponse = (data: any, error: any = null) => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data, error }),
      insert: jest.fn().mockResolvedValue({ data, error }),
    };

    mockSupabase.from.mockReturnValue(mockChain as any);
    return mockChain;
  };

  describe('initialization', () => {
    it('initializes with empty state', () => {
      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      expect(result.current.searchQuery).toBe('');
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.loadingSuggestions).toBe(false);
    });

    it('accepts custom options', () => {
      const { result } = renderHook(() =>
        useHomeSearch({
          userId: 'user123',
          minQueryLength: 3,
          debounceMs: 500,
        })
      );

      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('search query updates', () => {
    it('updates search query', () => {
      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      expect(result.current.searchQuery).toBe('test');
    });

    it('does not fetch suggestions for queries below min length', async () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123', minQueryLength: 2 })
      );

      act(() => {
        result.current.updateSearchQuery('p');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSupabase.from).not.toHaveBeenCalled();
        expect(result.current.suggestions).toEqual([]);
      });
    });

    it('fetches suggestions after debounce delay', async () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123', debounceMs: 300 })
      );

      act(() => {
        result.current.updateSearchQuery('plumb');
      });

      act(() => {
        jest.advanceTimersByTime(299);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('search_trends');
        expect(result.current.suggestions).toEqual(mockSuggestions);
        expect(result.current.showSuggestions).toBe(true);
      });
    });

    it('cancels previous fetch when query changes quickly', async () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123', debounceMs: 300 })
      );

      act(() => {
        result.current.updateSearchQuery('plu');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      act(() => {
        result.current.updateSearchQuery('plumb');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      });
    });

    it('shows loading state while fetching', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnValue(promise),
      };

      mockSupabase.from.mockReturnValue(mockChain as any);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loadingSuggestions).toBe(true);
      });

      act(() => {
        resolvePromise({ data: mockSuggestions, error: null });
      });

      await waitFor(() => {
        expect(result.current.loadingSuggestions).toBe(false);
      });
    });

    it('clears suggestions when query is cleared', () => {
      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        result.current.updateSearchQuery('');
      });

      expect(result.current.suggestions).toEqual([]);
      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe('suggestion selection', () => {
    it('sets search query to selected suggestion', () => {
      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.selectSuggestion('plumbing service');
      });

      expect(result.current.searchQuery).toBe('plumbing service');
      expect(result.current.showSuggestions).toBe(false);
      expect(result.current.suggestions).toEqual([]);
    });

    it('tracks search selection when userId exists', () => {
      setupMockResponse({});

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.selectSuggestion('plumbing');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('search_trends');
    });

    it('does not track search when userId is null', () => {
      setupMockResponse({});

      const { result } = renderHook(() =>
        useHomeSearch({ userId: null })
      );

      act(() => {
        result.current.selectSuggestion('plumbing');
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('clear search', () => {
    it('clears all search state', () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.suggestions).toEqual([]);
      expect(result.current.showSuggestions).toBe(false);
    });

    it('cancels pending fetch when clearing', async () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        result.current.clearSearch();
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.suggestions).toEqual([]);
      });
    });
  });

  describe('hide suggestions', () => {
    it('hides suggestions dropdown', async () => {
      setupMockResponse(mockSuggestions);

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.showSuggestions).toBe(true);
      });

      act(() => {
        result.current.hideSuggestions();
      });

      expect(result.current.showSuggestions).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      setupMockResponse(null, new Error('Network error'));

      const { result } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.loadingSuggestions).toBe(false);
        expect(result.current.suggestions).toEqual([]);
      });

      consoleError.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('cleans up timers on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(300);
      });
    });

    it('aborts pending requests on unmount', async () => {
      setupMockResponse(mockSuggestions);

      const { result, unmount } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      act(() => {
        result.current.updateSearchQuery('test');
      });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      unmount();
    });
  });

  describe('callback stability', () => {
    it('callbacks are stable across renders', () => {
      const { result, rerender } = renderHook(() =>
        useHomeSearch({ userId: 'user123' })
      );

      const updateSearchQuery1 = result.current.updateSearchQuery;
      const selectSuggestion1 = result.current.selectSuggestion;
      const clearSearch1 = result.current.clearSearch;
      const hideSuggestions1 = result.current.hideSuggestions;

      rerender();

      expect(result.current.updateSearchQuery).toBe(updateSearchQuery1);
      expect(result.current.selectSuggestion).toBe(selectSuggestion1);
      expect(result.current.clearSearch).toBe(clearSearch1);
      expect(result.current.hideSuggestions).toBe(hideSuggestions1);
    });
  });
});
