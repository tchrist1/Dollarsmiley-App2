import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { X, DollarSign, Calendar, MapPin, Tag } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { JobFilters } from './FilterModal';

interface ActiveFiltersBarProps {
  filters: JobFilters;
  onRemoveFilter: (filterType: keyof JobFilters, value?: any) => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({ filters, onRemoveFilter, onClearAll }: ActiveFiltersBarProps) {
  const activeFilters: Array<{
    type: keyof JobFilters;
    label: string;
    value?: any;
    icon: any;
  }> = [];

  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((category) => {
      activeFilters.push({
        type: 'categories',
        label: category,
        value: category,
        icon: Tag,
      });
    });
  }

  if (filters.minPrice || filters.maxPrice) {
    let priceLabel = '';
    if (filters.minPrice && filters.maxPrice) {
      priceLabel = `$${filters.minPrice}-$${filters.maxPrice}`;
    } else if (filters.minPrice) {
      priceLabel = `$${filters.minPrice}+`;
    } else if (filters.maxPrice) {
      priceLabel = `Under $${filters.maxPrice}`;
    }
    activeFilters.push({
      type: 'minPrice',
      label: priceLabel,
      icon: DollarSign,
    });
  }

  if (filters.startDate || filters.endDate) {
    let dateLabel = '';
    if (filters.startDate && filters.endDate) {
      dateLabel = `${filters.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${filters.endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    } else if (filters.startDate) {
      dateLabel = `From ${filters.startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    } else if (filters.endDate) {
      dateLabel = `Until ${filters.endDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })}`;
    }
    activeFilters.push({
      type: 'startDate',
      label: dateLabel,
      icon: Calendar,
    });
  }

  if (filters.location) {
    const locationLabel = filters.radius
      ? `${filters.location} (${filters.radius} mi)`
      : filters.location;
    activeFilters.push({
      type: 'location',
      label: locationLabel,
      icon: MapPin,
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeFilters.map((filter, index) => {
          const IconComponent = filter.icon;
          return (
            <View key={`${filter.type}-${index}`} style={styles.filterChip}>
              <IconComponent size={14} color={colors.primary} />
              <Text style={styles.filterText}>{filter.label}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveFilter(filter.type, filter.value)}
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
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
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
