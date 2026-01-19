import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

function TestComponent() {
  const state = useHomeState();

  return (
    <View>
      <Text testID="search-query">{state.searchQuery}</Text>
      <Text testID="view-mode">{state.viewMode}</Text>
      <Text testID="filter-count">{state.activeFilterCount}</Text>
      <Text testID="show-modal">{state.showFilterModal ? 'true' : 'false'}</Text>
      <Text testID="show-carousels">{state.showCarousels ? 'true' : 'false'}</Text>
      <Text testID="has-active-filters">{state.hasActiveFilters ? 'true' : 'false'}</Text>
      <Text testID="is-search-active">{state.isSearchActive ? 'true' : 'false'}</Text>
      <Text testID="should-show-carousels">{state.shouldShowCarousels ? 'true' : 'false'}</Text>

      <TouchableOpacity
        testID="update-search"
        onPress={() => state.updateSearchQuery('plumber')}
      />
      <TouchableOpacity
        testID="clear-search"
        onPress={() => state.clearSearch()}
      />
      <TouchableOpacity
        testID="change-view-grid"
        onPress={() => state.changeViewMode('grid')}
      />
      <TouchableOpacity
        testID="change-view-list"
        onPress={() => state.changeViewMode('list')}
      />
      <TouchableOpacity
        testID="change-view-map"
        onPress={() => state.changeViewMode('map')}
      />
      <TouchableOpacity
        testID="open-filters"
        onPress={() => state.openFilterModal()}
      />
      <TouchableOpacity
        testID="close-filters"
        onPress={() => state.closeFilterModal()}
      />
      <TouchableOpacity
        testID="update-filters"
        onPress={() => state.updateFilters({ listingType: 'Job', rating: 4 })}
      />
      <TouchableOpacity
        testID="reset-filters"
        onPress={() => state.resetFilters()}
      />
      <TouchableOpacity
        testID="enable-carousels"
        onPress={() => state.enableCarousels()}
      />
    </View>
  );
}

describe('HomeState Integration', () => {
  const renderWithProvider = (userId: string | null = 'user123') => {
    return render(
      <HomeStateProvider userId={userId}>
        <TestComponent />
      </HomeStateProvider>
    );
  };

  describe('initial state', () => {
    it('renders with default state', () => {
      const { getByTestId } = renderWithProvider();

      expect(getByTestId('search-query').props.children).toBe('');
      expect(getByTestId('view-mode').props.children).toBe('grid');
      expect(getByTestId('filter-count').props.children).toBe(0);
      expect(getByTestId('show-modal').props.children).toBe('false');
      expect(getByTestId('show-carousels').props.children).toBe('false');
      expect(getByTestId('has-active-filters').props.children).toBe('false');
      expect(getByTestId('is-search-active').props.children).toBe('false');
      expect(getByTestId('should-show-carousels').props.children).toBe('false');
    });
  });

  describe('search interactions', () => {
    it('updates search query', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('search-query').props.children).toBe('plumber');
      expect(getByTestId('is-search-active').props.children).toBe('true');
    });

    it('clears search query', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('update-search'));
      expect(getByTestId('search-query').props.children).toBe('plumber');

      fireEvent.press(getByTestId('clear-search'));
      expect(getByTestId('search-query').props.children).toBe('');
      expect(getByTestId('is-search-active').props.children).toBe('false');
    });

    it('hides carousels when search is active', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      expect(getByTestId('should-show-carousels').props.children).toBe('true');

      fireEvent.press(getByTestId('update-search'));
      expect(getByTestId('should-show-carousels').props.children).toBe('false');

      fireEvent.press(getByTestId('clear-search'));
      expect(getByTestId('should-show-carousels').props.children).toBe('true');
    });
  });

  describe('view mode interactions', () => {
    it('changes to list view', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('change-view-list'));

      expect(getByTestId('view-mode').props.children).toBe('list');
    });

    it('changes to map view', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('change-view-map'));

      expect(getByTestId('view-mode').props.children).toBe('map');
    });

    it('changes back to grid view', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('change-view-list'));
      expect(getByTestId('view-mode').props.children).toBe('list');

      fireEvent.press(getByTestId('change-view-grid'));
      expect(getByTestId('view-mode').props.children).toBe('grid');
    });
  });

  describe('filter interactions', () => {
    it('opens filter modal', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('open-filters'));

      expect(getByTestId('show-modal').props.children).toBe('true');
    });

    it('closes filter modal', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('open-filters'));
      expect(getByTestId('show-modal').props.children).toBe('true');

      fireEvent.press(getByTestId('close-filters'));
      expect(getByTestId('show-modal').props.children).toBe('false');
    });

    it('updates filters and counts', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('update-filters'));

      expect(getByTestId('filter-count').props.children).toBe(2);
      expect(getByTestId('has-active-filters').props.children).toBe('true');
    });

    it('resets filters', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('update-filters'));
      expect(getByTestId('filter-count').props.children).toBe(2);

      fireEvent.press(getByTestId('reset-filters'));
      expect(getByTestId('filter-count').props.children).toBe(0);
      expect(getByTestId('has-active-filters').props.children).toBe('false');
    });

    it('hides carousels when filters are active', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      expect(getByTestId('should-show-carousels').props.children).toBe('true');

      fireEvent.press(getByTestId('update-filters'));
      expect(getByTestId('should-show-carousels').props.children).toBe('false');

      fireEvent.press(getByTestId('reset-filters'));
      expect(getByTestId('should-show-carousels').props.children).toBe('true');
    });
  });

  describe('carousel visibility logic', () => {
    it('shows carousels when enabled and no filters/search', () => {
      const { getByTestId } = renderWithProvider();

      expect(getByTestId('should-show-carousels').props.children).toBe('false');

      fireEvent.press(getByTestId('enable-carousels'));
      expect(getByTestId('should-show-carousels').props.children).toBe('true');
    });

    it('hides carousels when filters are active', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      fireEvent.press(getByTestId('update-filters'));

      expect(getByTestId('should-show-carousels').props.children).toBe('false');
    });

    it('hides carousels when search is active', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('should-show-carousels').props.children).toBe('false');
    });

    it('hides carousels when both filters and search are active', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      fireEvent.press(getByTestId('update-filters'));
      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('should-show-carousels').props.children).toBe('false');
    });

    it('shows carousels when both filters and search are cleared', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));
      fireEvent.press(getByTestId('update-filters'));
      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('should-show-carousels').props.children).toBe('false');

      fireEvent.press(getByTestId('reset-filters'));
      fireEvent.press(getByTestId('clear-search'));

      expect(getByTestId('should-show-carousels').props.children).toBe('true');
    });
  });

  describe('complex workflows', () => {
    it('handles full user journey: search -> filter -> view change -> reset', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('update-search'));
      expect(getByTestId('is-search-active').props.children).toBe('true');

      fireEvent.press(getByTestId('update-filters'));
      expect(getByTestId('has-active-filters').props.children).toBe('true');

      fireEvent.press(getByTestId('change-view-list'));
      expect(getByTestId('view-mode').props.children).toBe('list');

      fireEvent.press(getByTestId('reset-filters'));
      expect(getByTestId('has-active-filters').props.children).toBe('false');

      fireEvent.press(getByTestId('clear-search'));
      expect(getByTestId('is-search-active').props.children).toBe('false');
    });

    it('handles modal open -> filter update -> apply', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('open-filters'));
      expect(getByTestId('show-modal').props.children).toBe('true');

      fireEvent.press(getByTestId('update-filters'));
      expect(getByTestId('filter-count').props.children).toBe(2);

      fireEvent.press(getByTestId('close-filters'));
      expect(getByTestId('show-modal').props.children).toBe('false');
      expect(getByTestId('filter-count').props.children).toBe(2);
    });
  });

  describe('computed values consistency', () => {
    it('maintains consistent computed values across state changes', () => {
      const { getByTestId } = renderWithProvider();

      fireEvent.press(getByTestId('enable-carousels'));

      expect(getByTestId('has-active-filters').props.children).toBe('false');
      expect(getByTestId('is-search-active').props.children).toBe('false');
      expect(getByTestId('should-show-carousels').props.children).toBe('true');

      fireEvent.press(getByTestId('update-filters'));

      expect(getByTestId('has-active-filters').props.children).toBe('true');
      expect(getByTestId('is-search-active').props.children).toBe('false');
      expect(getByTestId('should-show-carousels').props.children).toBe('false');

      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('has-active-filters').props.children).toBe('true');
      expect(getByTestId('is-search-active').props.children).toBe('true');
      expect(getByTestId('should-show-carousels').props.children).toBe('false');
    });
  });

  describe('multiple component instances', () => {
    it('shares state across multiple components', () => {
      function SecondComponent() {
        const state = useHomeState();
        return <Text testID="second-search-query">{state.searchQuery}</Text>;
      }

      const { getByTestId } = render(
        <HomeStateProvider userId="user123">
          <TestComponent />
          <SecondComponent />
        </HomeStateProvider>
      );

      fireEvent.press(getByTestId('update-search'));

      expect(getByTestId('search-query').props.children).toBe('plumber');
      expect(getByTestId('second-search-query').props.children).toBe('plumber');
    });
  });

  describe('error handling', () => {
    it('throws error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => render(<TestComponent />)).toThrow(
        'useHomeState must be used within HomeStateProvider'
      );

      consoleError.mockRestore();
    });
  });
});
