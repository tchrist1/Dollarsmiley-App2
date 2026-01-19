import { renderHook, act } from '@testing-library/react-native';
import { useHomeFilters } from '@/hooks/useHomeFilters';
import { defaultFilters } from '@/components/FilterModal';

describe('useHomeFilters', () => {
  describe('initialization', () => {
    it('initializes with default filters', () => {
      const { result } = renderHook(() => useHomeFilters());

      expect(result.current.filters).toEqual({
        ...defaultFilters,
        listingType: 'all',
      });
      expect(result.current.activeFilterCount).toBe(0);
      expect(result.current.showFilterModal).toBe(false);
    });

    it('initializes with custom listing type', () => {
      const { result } = renderHook(() =>
        useHomeFilters({ initialListingType: 'Job' })
      );

      expect(result.current.filters.listingType).toBe('Job');
      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe('filter updates', () => {
    it('updates filters correctly', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ listingType: 'Service' });
      });

      expect(result.current.filters.listingType).toBe('Service');
      expect(result.current.activeFilterCount).toBe(1);
    });

    it('updates multiple filters at once', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({
          listingType: 'Job',
          rating: 4,
          priceMin: 50,
          priceMax: 200,
        });
      });

      expect(result.current.filters.listingType).toBe('Job');
      expect(result.current.filters.rating).toBe(4);
      expect(result.current.filters.priceMin).toBe(50);
      expect(result.current.filters.priceMax).toBe(200);
      expect(result.current.activeFilterCount).toBe(3); // listingType, rating, price range
    });

    it('preserves existing filters when updating', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ listingType: 'Service' });
      });

      act(() => {
        result.current.updateFilters({ rating: 5 });
      });

      expect(result.current.filters.listingType).toBe('Service');
      expect(result.current.filters.rating).toBe(5);
    });
  });

  describe('activeFilterCount calculation', () => {
    it('counts listing type filter when not "all"', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ listingType: 'Job' });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('does not count listing type when "all"', () => {
      const { result } = renderHook(() => useHomeFilters());

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('counts category filter', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ categoryId: '123' });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts price range as one filter', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ priceMin: 50, priceMax: 200 });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts distance when not default (50)', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ distanceRadius: 25 });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts rating filter', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ rating: 4 });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts sort when not "relevance"', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({ sortBy: 'price_low' });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('counts boolean filters', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({
          availableNow: true,
          hasReviews: true,
          verifiedOnly: true,
        });
      });

      expect(result.current.activeFilterCount).toBe(3);
    });

    it('counts all active filters correctly', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({
          listingType: 'Job',
          categoryId: '123',
          priceMin: 50,
          priceMax: 200,
          distanceRadius: 25,
          rating: 4,
          sortBy: 'price_low',
          availableNow: true,
          hasReviews: true,
          verifiedOnly: true,
        });
      });

      expect(result.current.activeFilterCount).toBe(9);
    });
  });

  describe('reset functionality', () => {
    it('resets filters to defaults', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.updateFilters({
          listingType: 'Job',
          rating: 4,
          priceMin: 50,
        });
      });

      expect(result.current.activeFilterCount).toBe(2);

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        ...defaultFilters,
        listingType: 'all',
      });
      expect(result.current.activeFilterCount).toBe(0);
    });

    it('preserves initial listing type on reset', () => {
      const { result } = renderHook(() =>
        useHomeFilters({ initialListingType: 'Service' })
      );

      act(() => {
        result.current.updateFilters({ rating: 5 });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters.listingType).toBe('all');
    });
  });

  describe('modal control', () => {
    it('opens filter modal', () => {
      const { result } = renderHook(() => useHomeFilters());

      expect(result.current.showFilterModal).toBe(false);

      act(() => {
        result.current.openFilterModal();
      });

      expect(result.current.showFilterModal).toBe(true);
    });

    it('closes filter modal', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.openFilterModal();
      });

      expect(result.current.showFilterModal).toBe(true);

      act(() => {
        result.current.closeFilterModal();
      });

      expect(result.current.showFilterModal).toBe(false);
    });

    it('applies filters and closes modal', () => {
      const { result } = renderHook(() => useHomeFilters());

      act(() => {
        result.current.openFilterModal();
      });

      const newFilters = {
        ...defaultFilters,
        listingType: 'Job' as const,
        rating: 5,
      };

      act(() => {
        result.current.applyFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
      expect(result.current.showFilterModal).toBe(false);
    });
  });

  describe('memoization', () => {
    it('activeFilterCount is memoized', () => {
      const { result, rerender } = renderHook(() => useHomeFilters());

      const firstCount = result.current.activeFilterCount;
      rerender();
      const secondCount = result.current.activeFilterCount;

      expect(firstCount).toBe(secondCount);
    });

    it('callbacks are stable', () => {
      const { result, rerender } = renderHook(() => useHomeFilters());

      const updateFilters1 = result.current.updateFilters;
      const resetFilters1 = result.current.resetFilters;

      rerender();

      expect(result.current.updateFilters).toBe(updateFilters1);
      expect(result.current.resetFilters).toBe(resetFilters1);
    });
  });
});
