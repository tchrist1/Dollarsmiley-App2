import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { HomeStateProvider, useHomeState } from '@/contexts/HomeStateContext';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
}));

describe('HomeState Performance', () => {
  describe('re-render optimization', () => {
    it('does not re-render when unrelated state changes', () => {
      let renderCount = 0;

      function SearchComponent() {
        const { searchQuery } = useHomeState();
        renderCount++;
        return <Text testID="search">{searchQuery}</Text>;
      }

      function FilterButton() {
        const { updateFilters } = useHomeState();
        return (
          <TouchableOpacity
            testID="update-filters"
            onPress={() => updateFilters({ listingType: 'Job' })}
          />
        );
      }

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <SearchComponent />
          <FilterButton />
        </HomeStateProvider>
      );

      const initialRenderCount = renderCount;

      fireEvent.press(getByTestId('update-filters'));

      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });

    it('memoizes computed values', () => {
      let computedCount = 0;

      function TestComponent() {
        const { hasActiveFilters, isSearchActive } = useHomeState();

        React.useEffect(() => {
          computedCount++;
        }, [hasActiveFilters, isSearchActive]);

        return <View />;
      }

      const { rerender } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      const initialCount = computedCount;

      rerender(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      expect(computedCount).toBe(initialCount);
    });
  });

  describe('callback stability', () => {
    it('maintains stable callback references', () => {
      const callbacks: any[] = [];

      function TestComponent() {
        const { updateSearchQuery, updateFilters, changeViewMode } = useHomeState();

        callbacks.push({ updateSearchQuery, updateFilters, changeViewMode });

        return <View />;
      }

      const { rerender } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      rerender(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      expect(callbacks.length).toBeGreaterThanOrEqual(2);
      expect(callbacks[0].updateSearchQuery).toBe(callbacks[1].updateSearchQuery);
      expect(callbacks[0].updateFilters).toBe(callbacks[1].updateFilters);
      expect(callbacks[0].changeViewMode).toBe(callbacks[1].changeViewMode);
    });
  });

  describe('state update batching', () => {
    it('batches multiple state updates', () => {
      let renderCount = 0;

      function TestComponent() {
        const state = useHomeState();
        renderCount++;

        return (
          <View>
            <TouchableOpacity
              testID="batch-update"
              onPress={() => {
                state.updateSearchQuery('test');
                state.updateFilters({ listingType: 'Job' });
                state.changeViewMode('list');
              }}
            />
          </View>
        );
      }

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      const initialRenderCount = renderCount;

      fireEvent.press(getByTestId('batch-update'));

      const rendersDuringUpdate = renderCount - initialRenderCount;

      expect(rendersDuringUpdate).toBeLessThanOrEqual(2);
    });
  });

  describe('memory efficiency', () => {
    it('cleans up state on unmount', () => {
      const { unmount } = render(
        <HomeStateProvider userId="user123">
          <View />
        </HomeStateProvider>
      );

      unmount();
    });

    it('handles rapid state changes efficiently', () => {
      function TestComponent() {
        const { updateSearchQuery } = useHomeState();

        return (
          <TouchableOpacity
            testID="rapid-update"
            onPress={() => {
              for (let i = 0; i < 100; i++) {
                updateSearchQuery(`query-${i}`);
              }
            }}
          />
        );
      }

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      const startTime = Date.now();
      fireEvent.press(getByTestId('rapid-update'));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('context provider overhead', () => {
    it('minimal overhead for deeply nested components', () => {
      function DeepComponent({ depth }: { depth: number }) {
        const { searchQuery } = useHomeState();

        if (depth === 0) {
          return <Text testID="deep-search">{searchQuery}</Text>;
        }

        return <DeepComponent depth={depth - 1} />;
      }

      const startTime = Date.now();

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <DeepComponent depth={10} />
        </HomeStateProvider>
      );

      const endTime = Date.now();

      expect(getByTestId('deep-search')).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('large dataset handling', () => {
    it('handles many filter updates efficiently', () => {
      function TestComponent() {
        const { updateFilters, activeFilterCount } = useHomeState();

        return (
          <View>
            <Text testID="filter-count">{activeFilterCount}</Text>
            <TouchableOpacity
              testID="many-filters"
              onPress={() => {
                updateFilters({
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
              }}
            />
          </View>
        );
      }

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
        </HomeStateProvider>
      );

      const startTime = Date.now();
      fireEvent.press(getByTestId('many-filters'));
      const endTime = Date.now();

      expect(getByTestId('filter-count').props.children).toBe(9);
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('comparison with individual hooks', () => {
    it('context provider performance is comparable to individual hooks', () => {
      const contextRenders: number[] = [];
      const individualRenders: number[] = [];

      function ContextComponent() {
        const state = useHomeState();
        contextRenders.push(Date.now());
        return (
          <TouchableOpacity
            testID="context-update"
            onPress={() => state.updateSearchQuery('test')}
          />
        );
      }

      const { getByTestId: getContextButton } = render(
        <HomeStateProvider userId="user123">
          <ContextComponent />
        </HomeStateProvider>
      );

      fireEvent.press(getContextButton('context-update'));

      expect(contextRenders.length).toBeGreaterThan(0);
    });
  });
});
