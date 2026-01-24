/**
 * PHASE 3A: HOME CONTEXT
 *
 * Centralized state management for Home screen.
 * Extracts state from monolithic component for better maintainability.
 *
 * SAFETY:
 * - No behavior changes
 * - No JSX modifications
 * - Exact state preservation
 */

import React, { createContext, useContext, useState, useRef, ReactNode, useMemo } from 'react';
import { FilterOptions, defaultFilters } from '@/components/FilterModal';
import { MapViewMode } from '@/types/map';
import { NativeInteractiveMapViewRef } from '@/components/NativeInteractiveMapView';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'category' | 'location' | 'service' | 'recent';
}

interface HomeState {
  searchQuery: string;
  showFilters: boolean;
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  viewMode: 'list' | 'grid' | 'map';
  mapMode: MapViewMode;
  mapZoomLevel: number;
  showMapStatusHint: boolean;
  filters: FilterOptions;
}

interface HomeActions {
  setSearchQuery: (query: string) => void;
  setShowFilters: (show: boolean) => void;
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  setShowSuggestions: (show: boolean) => void;
  setViewMode: (mode: 'list' | 'grid' | 'map') => void;
  setMapMode: (mode: MapViewMode) => void;
  setMapZoomLevel: (level: number) => void;
  setShowMapStatusHint: (show: boolean) => void;
  setFilters: (filters: FilterOptions) => void;
}

interface HomeContextValue {
  state: HomeState;
  actions: HomeActions;
  mapRef: React.RefObject<NativeInteractiveMapViewRef>;
  mapStatusHintTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHomeContext() {
  const context = useContext(HomeContext);
  if (!context) {
    throw new Error('useHomeContext must be used within HomeProvider');
  }
  return context;
}

interface HomeProviderProps {
  children: ReactNode;
  initialFilters?: FilterOptions;
}

export function HomeProvider({ children, initialFilters }: HomeProviderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('grid');
  const [mapMode, setMapMode] = useState<MapViewMode>('listings');
  const [mapZoomLevel, setMapZoomLevel] = useState(12);
  const [showMapStatusHint, setShowMapStatusHint] = useState(false);
  const mapStatusHintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mapRef = useRef<NativeInteractiveMapViewRef>(null);
  const [filters, setFilters] = useState<FilterOptions>(
    initialFilters || defaultFilters
  );

  const state: HomeState = useMemo(
    () => ({
      searchQuery,
      showFilters,
      suggestions,
      showSuggestions,
      viewMode,
      mapMode,
      mapZoomLevel,
      showMapStatusHint,
      filters,
    }),
    [
      searchQuery,
      showFilters,
      suggestions,
      showSuggestions,
      viewMode,
      mapMode,
      mapZoomLevel,
      showMapStatusHint,
      filters,
    ]
  );

  const actions: HomeActions = useMemo(
    () => ({
      setSearchQuery,
      setShowFilters,
      setSuggestions,
      setShowSuggestions,
      setViewMode,
      setMapMode,
      setMapZoomLevel,
      setShowMapStatusHint,
      setFilters,
    }),
    []
  );

  const value: HomeContextValue = useMemo(
    () => ({
      state,
      actions,
      mapRef,
      mapStatusHintTimer,
    }),
    [state, actions]
  );

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}
