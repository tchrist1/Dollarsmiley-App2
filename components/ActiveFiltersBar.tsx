import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { X, DollarSign, MapPin, Tag, Star, Award, Filter, Layers, ArrowUpDown } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { FilterOptions } from './FilterModal';
import type { Category } from '@/types/database';

interface ActiveFiltersBarProps {
  filters: FilterOptions;
  categories?: Category[];
  onRemoveFilter: (filterType: keyof FilterOptions, value?: any) => void;
  onClearAll: () => void;
  isTransitioning?: boolean;
}

// Sort option labels for display
const SORT_LABELS: Record<string, string> = {
  relevance: 'Relevance',
  price_low: 'Price: Low to High',
  price_high: 'Price: High to Low',
  rating: 'Highest Rated',
  popular: 'Most Popular',
  recent: 'Most Recent',
  distance: 'Nearest First',
  reviews: 'Most Reviews',
};

// QUICK WIN 1: Memoize active filters computation
function buildActiveFiltersList(filters: FilterOptions, categoryLookup: Map<string, string>) {
  const activeFilters: Array<{
    type: keyof FilterOptions;
    label: string;
    value?: any;
    icon: any;
    isSort?: boolean;
  }> = [];

  if (filters.listingType && filters.listingType !== 'all') {
    const typeLabels = {
      Job: 'Jobs',
      Service: 'Services',
      CustomService: 'Custom Services',
    };
    activeFilters.push({
      type: 'listingType',
      label: typeLabels[filters.listingType] || filters.listingType,
      icon: Filter,
    });
  }

  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((categoryId) => {
      const categoryName = categoryLookup.get(categoryId) || 'Category';
      activeFilters.push({
        type: 'categories',
        label: categoryName,
        value: categoryId,
        icon: Tag,
      });
    });
  }

  if (filters.serviceType) {
    activeFilters.push({
      type: 'serviceType',
      label: filters.serviceType,
      icon: Layers,
    });
  }

  if (filters.priceMin || filters.priceMax) {
    let priceLabel = '';
    if (filters.priceMin && filters.priceMax) {
      priceLabel = `$${filters.priceMin}-$${filters.priceMax}`;
    } else if (filters.priceMin) {
      priceLabel = `$${filters.priceMin}+`;
    } else if (filters.priceMax) {
      priceLabel = `Under $${filters.priceMax}`;
    }
    activeFilters.push({
      type: 'priceMin',
      label: priceLabel,
      icon: DollarSign,
    });
  }

  if (filters.minRating > 0) {
    activeFilters.push({
      type: 'minRating',
      label: `${filters.minRating}+ Stars`,
      icon: Star,
    });
  }

  // PHASE 1: Distance as first-class active filter
  if (filters.distance !== undefined && filters.distance !== null) {
    activeFilters.push({
      type: 'distance',
      label: `≤ ${filters.distance} mi`,
      icon: MapPin,
    });
  }

  if (filters.location) {
    activeFilters.push({
      type: 'location',
      label: filters.location,
      icon: MapPin,
    });
  }

  if (filters.verified) {
    activeFilters.push({
      type: 'verified',
      label: 'Verified Only',
      icon: Award,
    });
  }

  // Display current sort (non-removable, informational only)
  if (filters.sortBy && filters.sortBy !== 'relevance') {
    const sortLabel = SORT_LABELS[filters.sortBy] || filters.sortBy;
    activeFilters.push({
      type: 'sortBy',
      label: `Sorted: ${sortLabel}`,
      icon: ArrowUpDown,
      isSort: true,
    });
  }

  return activeFilters;
}

export const ActiveFiltersBar = React.memo(function ActiveFiltersBar({
  filters,
  categories = [],
  onRemoveFilter,
  onClearAll,
  isTransitioning = false
}: ActiveFiltersBarProps) {
  // Build category lookup map at render time
  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach(cat => {
      map.set(cat.id, cat.name);
    });
    return map;
  }, [categories]);

  // QUICK WIN 1: Memoize expensive computation
  const activeFilters = useMemo(() => buildActiveFiltersList(filters, categoryLookup), [filters, categoryLookup]);

  const stableFiltersRef = React.useRef(activeFilters);
  const displayFilters = useMemo(() => {
    if (!isTransitioning) {
      stableFiltersRef.current = activeFilters;
    }
    return stableFiltersRef.current;
  }, [activeFilters, isTransitioning]);

  // Memoize callbacks
  const handleRemove = useCallback((type: keyof FilterOptions, value?: any) => {
    onRemoveFilter(type, value);
  }, [onRemoveFilter]);

  if (displayFilters.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, isTransitioning && styles.containerTransitioning]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        pointerEvents={isTransitioning ? 'none' : 'auto'}
      >
        {displayFilters.map((filter, index) => {
          const IconComponent = filter.icon;
          const isSort = filter.isSort === true;
          return (
            <View
              key={`${filter.type}-${index}`}
              style={[
                styles.filterChip,
                isSort && styles.sortChip,
                isTransitioning && styles.filterChipTransitioning
              ]}
            >
              <IconComponent size={14} color={isSort ? colors.textSecondary : colors.primary} />
              <Text style={[styles.filterText, isSort && styles.sortText]}>{filter.label}</Text>
              {!isSort && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(filter.type, filter.value)}
                >
                  <X size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {displayFilters.length > 1 && (
          <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  containerTransitioning: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  sortChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  filterChipTransitioning: {
    opacity: 0.6,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  sortText: {
    color: colors.textSecondary,
    fontWeight: fontWeight.normal,
  },
  removeButton: {
    padding: 2,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
