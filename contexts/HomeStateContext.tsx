import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { FilterOptions } from '@/components/FilterModal';
import { useHomeFilters } from '@/hooks/useHomeFilters';
import { useHomeUIState, ViewMode, MapMode } from '@/hooks/useHomeUIState';
import { useHomeSearch } from '@/hooks/useHomeSearch';

interface HomeStateContextValue {
  // Filter state
  filters: FilterOptions;
  activeFilterCount: number;
  showFilterModal: boolean;
  updateFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  applyFilters: (filters: FilterOptions) => void;

  // UI state
  viewMode: ViewMode;
  mapMode: MapMode;
  mapZoomLevel: number;
  showMapStatusHint: boolean;
  changeViewMode: (mode: ViewMode) => void;
  changeMapMode: (mode: MapMode) => void;
  updateMapZoom: (zoom: number) => void;
  showMapHint: (duration?: number) => void;
  hideMapHint: () => void;

  // Search state
  searchQuery: string;
  suggestions: Array<{ suggestion: string; search_count: number }>;
  showSuggestions: boolean;
  loadingSuggestions: boolean;
  updateSearchQuery: (query: string) => void;
  selectSuggestion: (suggestion: string) => void;
  clearSearch: () => void;
  hideSuggestions: () => void;

  // Carousel state
  showCarousels: boolean;
  enableCarousels: () => void;

  // Combined helpers
  hasActiveFilters: boolean;
  isSearchActive: boolean;
  shouldShowCarousels: boolean;
}

const HomeStateContext = createContext<HomeStateContextValue | undefined>(undefined);

interface HomeStateProviderProps {
  children: ReactNode;
  userId: string | null;
  initialListingType?: 'all' | 'Job' | 'Service' | 'CustomService';
}

export function HomeStateProvider({ children, userId, initialListingType }: HomeStateProviderProps) {
  const filterState = useHomeFilters({ initialListingType });
  const uiState = useHomeUIState();
  const searchState = useHomeSearch({ userId, minQueryLength: 2, debounceMs: 300 });

  const [showCarousels, setShowCarousels] = useState(false);

  const enableCarousels = useCallback(() => {
    setShowCarousels(true);
  }, []);

  // Combined computed values
  const hasActiveFilters = filterState.activeFilterCount > 0;
  const isSearchActive = searchState.searchQuery.length > 0;
  const shouldShowCarousels = showCarousels && !hasActiveFilters && !isSearchActive;

  const value = useMemo<HomeStateContextValue>(
    () => ({
      // Filter state
      ...filterState,

      // UI state
      ...uiState,

      // Search state
      ...searchState,

      // Carousel state
      showCarousels,
      enableCarousels,

      // Combined helpers
      hasActiveFilters,
      isSearchActive,
      shouldShowCarousels,
    }),
    [filterState, uiState, searchState, showCarousels, enableCarousels, hasActiveFilters, isSearchActive, shouldShowCarousels]
  );

  return <HomeStateContext.Provider value={value}>{children}</HomeStateContext.Provider>;
}

export function useHomeState() {
  const context = useContext(HomeStateContext);
  if (!context) {
    throw new Error('useHomeState must be used within HomeStateProvider');
  }
  return context;
}
