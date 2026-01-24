import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Search, MapPin, SlidersHorizontal, TrendingUp, Clock, X, Navigation, List, LayoutGrid } from 'lucide-react-native';
import { FilterOptions } from '@/components/FilterModal';
import { ActiveFiltersBar } from '@/components/ActiveFiltersBar';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';
import { colors } from '@/constants/theme';

interface HomeHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchFocus: () => void;
  onClearSearch: () => void;
  onVoiceResults: (results: any[], query: string) => void;
  onVoiceError: (error: string) => void;
  onImageResults: (matches: any[], analysis: any) => void;
  onImageError: (error: string) => void;
  filters: FilterOptions;
  onRemoveFilter: (filterType: keyof FilterOptions, value?: any) => void;
  onClearAllFilters: () => void;
  isTransitioning: boolean;
  viewMode: 'list' | 'grid' | 'map';
  onViewModeChange: (mode: 'list' | 'grid' | 'map') => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  filterIndicatorText: string;
  onClearFiltersAndSearch: () => void;
  styles: any;
}

export function HomeHeader({
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onClearSearch,
  onVoiceResults,
  onVoiceError,
  onImageResults,
  onImageError,
  filters,
  onRemoveFilter,
  onClearAllFilters,
  isTransitioning,
  viewMode,
  onViewModeChange,
  onOpenFilters,
  activeFilterCount,
  filterIndicatorText,
  onClearFiltersAndSearch,
  styles,
}: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Discover Services</Text>
      </View>

      <View style={styles.searchBarWrapper}>
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for event-party services and jobs near you"
            placeholderTextColor="#7A7A7A"
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearSearch}
              onPress={onClearSearch}
            >
              <X size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
          <VoiceSearchButton
            searchType="providers"
            onResults={onVoiceResults}
            onError={onVoiceError}
          />
          <ImageSearchButton
            onResults={onImageResults}
            onError={onImageError}
          />
        </View>
      </View>

      <ActiveFiltersBar
        filters={filters}
        onRemoveFilter={onRemoveFilter}
        onClearAll={onClearAllFilters}
        isTransitioning={isTransitioning}
      />

      <View style={styles.filterRowContainer}>
        <View style={styles.filterRow}>
          <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
            onPress={() => onViewModeChange('list')}
            activeOpacity={0.7}
          >
            <List size={18} color={viewMode === 'list' ? colors.white : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
            onPress={() => onViewModeChange('grid')}
            activeOpacity={0.7}
          >
            <LayoutGrid size={18} color={viewMode === 'grid' ? colors.white : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonActive]}
            onPress={() => onViewModeChange('map')}
            activeOpacity={0.7}
          >
            <MapPin size={18} color={viewMode === 'map' ? colors.white : colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onOpenFilters}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={20} color={colors.primary} />
          <Text style={styles.filterButtonText}>Filters</Text>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        </View>
      </View>

      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText}>
            {filterIndicatorText}
          </Text>
          <TouchableOpacity
            onPress={onClearFiltersAndSearch}
          >
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
