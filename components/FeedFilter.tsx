import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Users, TrendingUp, Clock, Grid } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export type FeedFilterType = 'all' | 'following' | 'trending' | 'recent';

interface FeedFilterProps {
  activeFilter: FeedFilterType;
  onFilterChange: (filter: FeedFilterType) => void;
  followingCount?: number;
  showFollowingCount?: boolean;
}

interface FilterOption {
  id: FeedFilterType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

export default function FeedFilter({
  activeFilter,
  onFilterChange,
  followingCount,
  showFollowingCount = true,
}: FeedFilterProps) {
  const filterOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'All Posts',
      icon: Grid,
      description: 'See everything',
    },
    {
      id: 'following',
      label: 'Following',
      icon: Users,
      description: `${followingCount || 0} people`,
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: TrendingUp,
      description: 'Hot right now',
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: Clock,
      description: 'Latest posts',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activeFilter === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => onFilterChange(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.filterContent}>
                <Icon
                  size={20}
                  color={isActive ? colors.white : colors.text}
                  strokeWidth={2}
                />
                <View style={styles.filterText}>
                  <Text
                    style={[styles.filterLabel, isActive && styles.filterLabelActive]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.filterDescription,
                      isActive && styles.filterDescriptionActive,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function FeedFilterChips({
  activeFilter,
  onFilterChange,
  followingCount,
}: FeedFilterProps) {
  const chipOptions: FilterOption[] = [
    {
      id: 'all',
      label: 'All',
      icon: Grid,
      description: '',
    },
    {
      id: 'following',
      label: followingCount ? `Following (${followingCount})` : 'Following',
      icon: Users,
      description: '',
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: TrendingUp,
      description: '',
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: Clock,
      description: '',
    },
  ];

  return (
    <View style={styles.chipsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
      >
        {chipOptions.map((option) => {
          const Icon = option.icon;
          const isActive = activeFilter === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onFilterChange(option.id)}
              activeOpacity={0.7}
            >
              <Icon
                size={16}
                color={isActive ? colors.white : colors.text}
                strokeWidth={2}
              />
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    minWidth: 140,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterText: {
    flex: 1,
  },
  filterLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  filterLabelActive: {
    color: colors.white,
  },
  filterDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filterDescriptionActive: {
    color: colors.white,
    opacity: 0.9,
  },
  chipsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chipsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  chipLabelActive: {
    color: colors.white,
  },
});
