import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SlidersHorizontal } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';

interface HomeHeaderProps {
  title: string;
  activeFilterCount: number;
  onOpenFilters: () => void;
  adminBanner?: React.ReactNode;
}

export const HomeHeader = memo<HomeHeaderProps>(({
  title,
  activeFilterCount,
  onOpenFilters,
  adminBanner,
}) => {
  return (
    <View style={styles.container}>
      {adminBanner}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={onOpenFilters}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={20} color={colors.white} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{String(activeFilterCount)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

HomeHeader.displayName = 'HomeHeader';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filterButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
