import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, Filter, MapPin } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface HomeEmptyStateProps {
  hasFilters: boolean;
  hasSearch: boolean;
  onClearFilters?: () => void;
  onClearSearch?: () => void;
}

export const HomeEmptyState = memo<HomeEmptyStateProps>(({
  hasFilters,
  hasSearch,
  onClearFilters,
  onClearSearch,
}) => {
  if (hasFilters || hasSearch) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Search size={64} color={colors.textLight} />
        </View>
        <Text style={styles.emptyTitle}>No Results Found</Text>
        <Text style={styles.emptyMessage}>
          Try adjusting your {hasFilters && hasSearch ? 'search or filters' : hasFilters ? 'filters' : 'search'} to find what you're looking for
        </Text>
        <View style={styles.emptyActions}>
          {hasSearch && onClearSearch && (
            <TouchableOpacity style={styles.emptyButton} onPress={onClearSearch}>
              <Text style={styles.emptyButtonText}>Clear Search</Text>
            </TouchableOpacity>
          )}
          {hasFilters && onClearFilters && (
            <TouchableOpacity style={styles.emptyButton} onPress={onClearFilters}>
              <Text style={styles.emptyButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MapPin size={64} color={colors.textLight} />
      </View>
      <Text style={styles.emptyTitle}>No Listings Available</Text>
      <Text style={styles.emptyMessage}>
        Check back soon for new services and jobs in your area
      </Text>
    </View>
  );
});

HomeEmptyState.displayName = 'HomeEmptyState';

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
    marginBottom: spacing.lg,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
