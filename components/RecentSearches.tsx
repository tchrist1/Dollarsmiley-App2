import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Clock, X, Trash2 } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import type { SearchHistoryEntry } from '@/lib/job-search';

interface RecentSearchesProps {
  searches: SearchHistoryEntry[];
  onSearchSelect: (query: string, filters?: any) => void;
  onDeleteSearch: (entryId: string) => void;
  onClearAll: () => void;
  maxVisible?: number;
}

export function RecentSearches({
  searches,
  onSearchSelect,
  onDeleteSearch,
  onClearAll,
  maxVisible = 10,
}: RecentSearchesProps) {
  if (searches.length === 0) {
    return null;
  }

  const visibleSearches = searches.slice(0, maxVisible);
  const hasFilters = (entry: SearchHistoryEntry) => {
    return (
      entry.filters_applied &&
      Object.keys(entry.filters_applied).some((key) => {
        const value = entry.filters_applied![key as keyof typeof entry.filters_applied];
        if (key === 'categories') {
          return Array.isArray(value) && value.length > 0;
        }
        return value !== undefined && value !== null;
      })
    );
  };

  const getFilterCount = (entry: SearchHistoryEntry): number => {
    if (!entry.filters_applied) return 0;

    let count = 0;
    const filters = entry.filters_applied;

    if (filters.categories && filters.categories.length > 0) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.location) count++;
    if (filters.sortBy) count++;

    return count;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clock size={18} color={colors.textSecondary} />
          <Text style={styles.headerTitle}>Recent Searches</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{searches.length}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
          <Trash2 size={16} color={colors.error} />
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.searchesList}
      >
        {visibleSearches.map((entry) => {
          const filterCount = getFilterCount(entry);

          return (
            <View key={entry.id} style={styles.searchCard}>
              <TouchableOpacity
                style={styles.searchCardMain}
                onPress={() => onSearchSelect(entry.search_query, entry.filters_applied)}
              >
                <View style={styles.searchCardHeader}>
                  <Text style={styles.searchQuery} numberOfLines={2}>
                    {entry.search_query}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDeleteSearch(entry.id)}
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchCardFooter}>
                  <Text style={styles.timestamp}>{formatTimestamp(entry.created_at)}</Text>
                  {entry.results_count !== undefined && entry.results_count > 0 && (
                    <Text style={styles.resultsCount}>{entry.results_count} results</Text>
                  )}
                </View>

                {filterCount > 0 && (
                  <View style={styles.filtersIndicator}>
                    <Text style={styles.filtersText}>{filterCount} filters applied</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  searchesList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  searchCard: {
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  searchCardMain: {
    padding: spacing.md,
  },
  searchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  searchQuery: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  searchCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  resultsCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filtersIndicator: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  filtersText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
