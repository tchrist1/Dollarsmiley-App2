import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import { FilterOptions, defaultFilters } from '@/components/FilterModal';

export type ViewMode = 'list' | 'grid' | 'map';
export type MapMode = 'listings' | 'providers';

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

interface HomeState {
  // Filter state
  filters: FilterOptions;
  showFilterModal: boolean;

  // UI state
  viewMode: ViewMode;
  mapMode: MapMode;
  mapZoomLevel: number;
  showMapStatusHint: boolean;

  // Search state
  searchQuery: string;
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  loadingSuggestions: boolean;

  // Carousel state
  showCarousels: boolean;
}

type HomeAction =
  | { type: 'SET_FILTERS'; payload: Partial<FilterOptions> }
  | { type: 'RESET_FILTERS'; payload?: { listingType?: 'all' | 'Job' | 'Service' | 'CustomService' } }
  | { type: 'OPEN_FILTER_MODAL' }
  | { type: 'CLOSE_FILTER_MODAL' }
  | { type: 'APPLY_FILTERS'; payload: FilterOptions }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_MAP_MODE'; payload: MapMode }
  | { type: 'SET_MAP_ZOOM'; payload: number }
  | { type: 'SHOW_MAP_HINT' }
  | { type: 'HIDE_MAP_HINT' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SUGGESTIONS'; payload: SearchSuggestion[] }
  | { type: 'SHOW_SUGGESTIONS' }
  | { type: 'HIDE_SUGGESTIONS' }
  | { type: 'SET_LOADING_SUGGESTIONS'; payload: boolean }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'ENABLE_CAROUSELS' };

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          ...defaultFilters,
          listingType: action.payload?.listingType || 'all',
        },
      };

    case 'OPEN_FILTER_MODAL':
      return { ...state, showFilterModal: true };

    case 'CLOSE_FILTER_MODAL':
      return { ...state, showFilterModal: false };

    case 'APPLY_FILTERS':
      return {
        ...state,
        filters: action.payload,
        showFilterModal: false,
      };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_MAP_MODE':
      return { ...state, mapMode: action.payload };

    case 'SET_MAP_ZOOM':
      return { ...state, mapZoomLevel: action.payload };

    case 'SHOW_MAP_HINT':
      return { ...state, showMapStatusHint: true };

    case 'HIDE_MAP_HINT':
      return { ...state, showMapStatusHint: false };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };

    case 'SHOW_SUGGESTIONS':
      return { ...state, showSuggestions: true };

    case 'HIDE_SUGGESTIONS':
      return { ...state, showSuggestions: false };

    case 'SET_LOADING_SUGGESTIONS':
      return { ...state, loadingSuggestions: action.payload };

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchQuery: '',
        suggestions: [],
        showSuggestions: false,
        loadingSuggestions: false,
      };

    case 'ENABLE_CAROUSELS':
      return { ...state, showCarousels: true };

    default:
      return state;
  }
}

interface UseHomeStateOptions {
  initialListingType?: 'all' | 'Job' | 'Service' | 'CustomService';
  initialViewMode?: ViewMode;
  initialMapMode?: MapMode;
  initialMapZoom?: number;
}

export function useHomeState(options: UseHomeStateOptions = {}) {
  const initialState: HomeState = {
    filters: {
      ...defaultFilters,
      listingType: options.initialListingType || 'all',
    },
    showFilterModal: false,
    viewMode: options.initialViewMode || 'grid',
    mapMode: options.initialMapMode || 'listings',
    mapZoomLevel: options.initialMapZoom || 12,
    showMapStatusHint: false,
    searchQuery: '',
    suggestions: [],
    showSuggestions: false,
    loadingSuggestions: false,
    showCarousels: false,
  };

  const [state, dispatch] = useReducer(homeReducer, initialState);
  const mapStatusHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Filter actions
  const updateFilters = useCallback((filters: Partial<FilterOptions>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS', payload: { listingType: options.initialListingType } });
  }, [options.initialListingType]);

  const openFilterModal = useCallback(() => {
    dispatch({ type: 'OPEN_FILTER_MODAL' });
  }, []);

  const closeFilterModal = useCallback(() => {
    dispatch({ type: 'CLOSE_FILTER_MODAL' });
  }, []);

  const applyFilters = useCallback((filters: FilterOptions) => {
    dispatch({ type: 'APPLY_FILTERS', payload: filters });
  }, []);

  // UI actions
  const changeViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const changeMapMode = useCallback((mode: MapMode) => {
    dispatch({ type: 'SET_MAP_MODE', payload: mode });
  }, []);

  const updateMapZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_MAP_ZOOM', payload: zoom });
  }, []);

  const showMapHint = useCallback((duration: number = 3000) => {
    if (mapStatusHintTimer.current) {
      clearTimeout(mapStatusHintTimer.current);
    }

    dispatch({ type: 'SHOW_MAP_HINT' });
    mapStatusHintTimer.current = setTimeout(() => {
      dispatch({ type: 'HIDE_MAP_HINT' });
      mapStatusHintTimer.current = undefined;
    }, duration);
  }, []);

  const hideMapHint = useCallback(() => {
    if (mapStatusHintTimer.current) {
      clearTimeout(mapStatusHintTimer.current);
      mapStatusHintTimer.current = undefined;
    }
    dispatch({ type: 'HIDE_MAP_HINT' });
  }, []);

  // Search actions
  const updateSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setSuggestions = useCallback((suggestions: SearchSuggestion[]) => {
    dispatch({ type: 'SET_SUGGESTIONS', payload: suggestions });
  }, []);

  const showSuggestions = useCallback(() => {
    dispatch({ type: 'SHOW_SUGGESTIONS' });
  }, []);

  const hideSuggestions = useCallback(() => {
    dispatch({ type: 'HIDE_SUGGESTIONS' });
  }, []);

  const setLoadingSuggestions = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: loading });
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: 'CLEAR_SEARCH' });
  }, []);

  // Carousel actions
  const enableCarousels = useCallback(() => {
    dispatch({ type: 'ENABLE_CAROUSELS' });
  }, []);

  // Computed values
  const activeFilterCount = useMemo(() => {
    let count = 0;
    const { filters } = state;

    if (filters.listingType !== 'all') count++;
    if (filters.categoryId) count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.distanceRadius !== 50) count++;
    if (filters.rating !== undefined) count++;
    if (filters.sortBy !== 'relevance') count++;
    if (filters.availableNow) count++;
    if (filters.hasReviews) count++;
    if (filters.verifiedOnly) count++;

    return count;
  }, [state.filters]);

  const hasActiveFilters = activeFilterCount > 0;
  const isSearchActive = state.searchQuery.length > 0;
  const shouldShowCarousels = state.showCarousels && !hasActiveFilters && !isSearchActive;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapStatusHintTimer.current) {
        clearTimeout(mapStatusHintTimer.current);
      }
    };
  }, []);

  return {
    // State
    state,

    // Filter state
    filters: state.filters,
    showFilterModal: state.showFilterModal,
    activeFilterCount,

    // UI state
    viewMode: state.viewMode,
    mapMode: state.mapMode,
    mapZoomLevel: state.mapZoomLevel,
    showMapStatusHint: state.showMapStatusHint,

    // Search state
    searchQuery: state.searchQuery,
    suggestions: state.suggestions,
    showSuggestions: state.showSuggestions,
    loadingSuggestions: state.loadingSuggestions,

    // Carousel state
    showCarousels: state.showCarousels,

    // Filter actions
    updateFilters,
    resetFilters,
    openFilterModal,
    closeFilterModal,
    applyFilters,

    // UI actions
    changeViewMode,
    changeMapMode,
    updateMapZoom,
    showMapHint,
    hideMapHint,

    // Search actions
    updateSearchQuery,
    setSuggestions,
    showSuggestions: showSuggestions,
    hideSuggestions,
    setLoadingSuggestions,
    clearSearch,

    // Carousel actions
    enableCarousels,

    // Computed values
    hasActiveFilters,
    isSearchActive,
    shouldShowCarousels,
  };
}
