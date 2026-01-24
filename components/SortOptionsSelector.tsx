import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  TrendingUp,
  DollarSign,
  Star,
  MapPin,
  Users,
  Clock,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export type SortOption =
  | 'relevance'
  | 'price_low'
  | 'price_high'
  | 'rating'
  | 'distance'
  | 'popular'
  | 'recent'
  | 'reviews';

interface SortOptionsSelectorProps {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
  showDistance?: boolean;
}

interface SortConfig {
  value: SortOption;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  directionIcon?: any;
  color: string;
  category: 'smart' | 'price' | 'quality' | 'activity';
}

const SORT_OPTIONS: SortConfig[] = [
  {
    value: 'relevance',
    label: 'Best Match',
    shortLabel: 'Relevance',
    description: 'Most relevant to your search',
    icon: TrendingUp,
    color: colors.primary,
    category: 'smart',
  },
  {
    value: 'distance',
    label: 'Nearest First',
    shortLabel: 'Distance',
    description: 'Closest providers to you',
    icon: MapPin,
    directionIcon: ArrowUp,
    color: colors.success,
    category: 'smart',
  },
  {
    value: 'rating',
    label: 'Top Rated',
    shortLabel: 'Rating',
    description: 'Highest rated providers',
    icon: Star,
    directionIcon: ArrowDown,
    color: colors.warning,
    category: 'quality',
  },
  {
    value: 'price_low',
    label: 'Lowest Price',
    shortLabel: 'Price ↑',
    description: 'Most affordable first',
    icon: DollarSign,
    directionIcon: ArrowUp,
    color: colors.success,
    category: 'price',
  },
  {
    value: 'price_high',
    label: 'Highest Price',
    shortLabel: 'Price ↓',
    description: 'Premium options first',
    icon: DollarSign,
    directionIcon: ArrowDown,
    color: colors.error,
    category: 'price',
  },
  {
    value: 'popular',
    label: 'Most Popular',
    shortLabel: 'Popular',
    description: 'Most booked providers',
    icon: Users,
    color: colors.primary,
    category: 'activity',
  },
  {
    value: 'reviews',
    label: 'Most Reviewed',
    shortLabel: 'Reviews',
    description: 'Most customer feedback',
    icon: Users,
    directionIcon: ArrowDown,
    color: colors.primary,
    category: 'quality',
  },
  {
    value: 'recent',
    label: 'Recently Added',
    shortLabel: 'Newest',
    description: 'Latest providers',
    icon: Clock,
    color: colors.textSecondary,
    category: 'activity',
  },
];

// PHASE 2B: Memoized for filter modal performance
export const SortOptionsSelector = React.memo(function SortOptionsSelector({
  sortBy,
  onSortChange,
  showDistance = true,
}: SortOptionsSelectorProps) {
  // PHASE 2B: Memoize filtered options to prevent recalculation
  const filteredOptions = React.useMemo(() =>
    showDistance
      ? SORT_OPTIONS
      : SORT_OPTIONS.filter((opt) => opt.value !== 'distance'),
    [showDistance]
  );

  // PHASE 2B: Memoize selected option lookup
  const selectedOption = React.useMemo(() =>
    SORT_OPTIONS.find((opt) => opt.value === sortBy),
    [sortBy]
  );

  // PHASE 2B: Memoize category filter function
  const getOptionsForCategory = React.useCallback((category: string) => {
    return filteredOptions.filter((opt) => opt.category === category);
  }, [filteredOptions]);

  return (
    <View style={styles.container}>
      {/* Current Selection Display */}
      <View style={styles.currentSelection}>
        <View style={styles.currentHeader}>
          <Text style={styles.currentLabel}>Current Sort</Text>
          {selectedOption?.directionIcon && (
            <View style={styles.directionBadge}>
              {React.createElement(selectedOption.directionIcon, {
                size: 12,
                color: colors.white,
              })}
            </View>
          )}
        </View>
        <View style={styles.currentValue}>
          {selectedOption && (
            <>
              {React.createElement(selectedOption.icon, {
                size: 24,
                color: selectedOption.color,
              })}
              <View style={styles.currentText}>
                <Text style={styles.currentTitle}>{selectedOption.label}</Text>
                <Text style={styles.currentDescription}>{selectedOption.description}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Quick Sort Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickChips}
        contentContainerStyle={styles.quickChipsContent}
      >
        {filteredOptions.map((option) => {
          const isSelected = sortBy === option.value;
          const Icon = option.icon;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.quickChip,
                isSelected && styles.quickChipSelected,
                isSelected && { borderColor: option.color },
              ]}
              onPress={() => onSortChange(option.value)}
              activeOpacity={0.7}
            >
              <Icon
                size={16}
                color={isSelected ? option.color : colors.textSecondary}
              />
              <Text
                style={[
                  styles.quickChipText,
                  isSelected && styles.quickChipTextSelected,
                  isSelected && { color: option.color },
                ]}
              >
                {option.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grouped Sort Options */}
      <View style={styles.groupedOptions}>
        {/* Smart Sorting */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Zap size={16} color={colors.primary} />
            <Text style={styles.groupTitle}>Smart Sorting</Text>
          </View>
          <View style={styles.groupOptions}>
            {getOptionsForCategory('smart').map((option) => (
              <SortOptionCard
                key={option.value}
                option={option}
                isSelected={sortBy === option.value}
                onSelect={() => onSortChange(option.value)}
              />
            ))}
          </View>
        </View>

        {/* Price Sorting */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <DollarSign size={16} color={colors.success} />
            <Text style={styles.groupTitle}>By Price</Text>
          </View>
          <View style={styles.groupOptions}>
            {getOptionsForCategory('price').map((option) => (
              <SortOptionCard
                key={option.value}
                option={option}
                isSelected={sortBy === option.value}
                onSelect={() => onSortChange(option.value)}
              />
            ))}
          </View>
        </View>

        {/* Quality Sorting */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Star size={16} color={colors.warning} />
            <Text style={styles.groupTitle}>By Quality</Text>
          </View>
          <View style={styles.groupOptions}>
            {getOptionsForCategory('quality').map((option) => (
              <SortOptionCard
                key={option.value}
                option={option}
                isSelected={sortBy === option.value}
                onSelect={() => onSortChange(option.value)}
              />
            ))}
          </View>
        </View>

        {/* Activity Sorting */}
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <TrendingUp size={16} color={colors.primary} />
            <Text style={styles.groupTitle}>By Activity</Text>
          </View>
          <View style={styles.groupOptions}>
            {getOptionsForCategory('activity').map((option) => (
              <SortOptionCard
                key={option.value}
                option={option}
                isSelected={sortBy === option.value}
                onSelect={() => onSortChange(option.value)}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
});

interface SortOptionCardProps {
  option: SortConfig;
  isSelected: boolean;
  onSelect: () => void;
}

// PHASE 2B: Memoized to prevent re-renders when other options change
const SortOptionCard = React.memo(function SortOptionCard({ option, isSelected, onSelect }: SortOptionCardProps) {
  const Icon = option.icon;
  const DirectionIcon = option.directionIcon;

  return (
    <TouchableOpacity
      style={[
        styles.optionCard,
        isSelected && styles.optionCardSelected,
        isSelected && { borderColor: option.color, backgroundColor: option.color + '10' },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.optionIcon}>
        <Icon size={20} color={isSelected ? option.color : colors.textSecondary} />
        {DirectionIcon && (
          <View
            style={[
              styles.directionIconSmall,
              isSelected && { backgroundColor: option.color },
            ]}
          >
            <DirectionIcon size={10} color={colors.white} />
          </View>
        )}
      </View>
      <View style={styles.optionContent}>
        <Text
          style={[
            styles.optionLabel,
            isSelected && styles.optionLabelSelected,
            isSelected && { color: option.color },
          ]}
        >
          {option.label}
        </Text>
        <Text style={[styles.optionDescription, isSelected && styles.optionDescriptionSelected]}>
          {option.description}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: option.color }]}>
          <Text style={styles.checkmarkIcon}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  currentSelection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  currentLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  directionBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currentText: {
    flex: 1,
  },
  currentTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  currentDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  quickChips: {
    maxHeight: 50,
  },
  quickChipsContent: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  quickChipSelected: {
    backgroundColor: colors.white,
  },
  quickChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  quickChipTextSelected: {
    fontWeight: fontWeight.bold,
  },
  groupedOptions: {
    gap: spacing.lg,
  },
  group: {
    gap: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  groupTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  groupOptions: {
    gap: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  optionCardSelected: {
    backgroundColor: colors.white,
  },
  optionIcon: {
    position: 'relative',
  },
  directionIconSmall: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontWeight: fontWeight.bold,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});
