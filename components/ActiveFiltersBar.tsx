import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { X, DollarSign, MapPin, Tag, Star, Award, Filter } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { FilterOptions } from './FilterModal';

interface ActiveFiltersBarProps {
  filters: FilterOptions;
  onRemoveFilter: (filterType: keyof FilterOptions, value?: any) => void;
  onClearAll: () => void;
  isTransitioning?: boolean;
}

// QUICK WIN 1: Memoize active filters computation
function buildActiveFiltersList(filters: FilterOptions) {
  const activeFilters: Array<{
    type: keyof FilterOptions;
    label: string;
    value?: any;
    icon: any;
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
      activeFilters.push({
        type: 'categories',
        label: categoryId.substring(0, 8),
        value: categoryId,
        icon: Tag,
      });
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

  if (filters.location) {
    const locationLabel = filters.distance
      ? `${filters.location} (${filters.distance} mi)`
      : filters.location;
    activeFilters.push({
      type: 'location',
      label: locationLabel,
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

  return activeFilters;
}

export const ActiveFiltersBar = React.memo(function ActiveFiltersBar({
  filters,
  onRemoveFilter,
  onClearAll,
  isTransitioning = false
}: ActiveFiltersBarProps) {
  // QUICK WIN 1: Memoize expensive computation
  const activeFilters = useMemo(() => buildActiveFiltersList(filters), [filters]);

  // Memoize callbacks
  const handleRemove = useCallback((type: keyof FilterOptions, value?: any) => {
    onRemoveFilter(type, value);
  }, [onRemoveFilter]);

  if (activeFilters.length === 0) {
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
        {activeFilters.map((filter, index) => {
          const IconComponent = filter.icon;
          return (
            <View key={`${filter.type}-${index}`} style={[styles.filterChip, isTransitioning && styles.filterChipTransitioning]}>
              <IconComponent size={14} color={colors.primary} />
              <Text style={styles.filterText}>{filter.label}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(filter.type, filter.value)}
              >
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        })}

        {activeFilters.length > 1 && (
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
  filterChipTransitioning: {
    opacity: 0.6,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
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
