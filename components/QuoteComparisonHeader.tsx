import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  DollarSign,
  Star,
  Clock,
  TrendingUp,
  Award,
  Filter,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export type SortOption = 'price_low' | 'price_high' | 'rating' | 'experience' | 'recent';

interface QuoteComparisonHeaderProps {
  totalQuotes: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export function QuoteComparisonHeader({
  totalQuotes,
  sortBy,
  onSortChange,
  showFilters = false,
  onToggleFilters,
}: QuoteComparisonHeaderProps) {
  const sortOptions: { value: SortOption; label: string; icon: any }[] = [
    { value: 'price_low', label: 'Lowest Price', icon: DollarSign },
    { value: 'rating', label: 'Top Rated', icon: Star },
    { value: 'experience', label: 'Most Experienced', icon: Award },
    { value: 'recent', label: 'Most Recent', icon: Clock },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Compare Quotes</Text>
          <Text style={styles.subtitle}>
            {totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'} received
          </Text>
        </View>
        {onToggleFilters && (
          <TouchableOpacity style={styles.filterButton} onPress={onToggleFilters}>
            {showFilters ? (
              <X size={20} color={colors.text} />
            ) : (
              <Filter size={20} color={colors.text} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Options */}
      <View style={styles.sortSection}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortOptions}
        >
          {sortOptions.map((option) => {
            const IconComponent = option.icon;
            const isActive = sortBy === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortChip, isActive && styles.sortChipActive]}
                onPress={() => onSortChange(option.value)}
              >
                <IconComponent
                  size={16}
                  color={isActive ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <DollarSign size={20} color={colors.success} />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Price Range</Text>
            <Text style={styles.statValue}>varies</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <Star size={20} color={colors.warning} />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Avg Rating</Text>
            <Text style={styles.statValue}>4.8</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={20} color={colors.primary} />
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Avg Jobs</Text>
            <Text style={styles.statValue}>45</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  sortChipTextActive: {
    color: colors.white,
  },
  statsSection: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
