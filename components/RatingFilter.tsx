import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RatingFilterProps {
  minRating: number;
  onRatingChange: (rating: number) => void;
  showStats?: boolean;
}

// QUICK WIN 3: Simplified rating options (removed heavy decorations)
const RATING_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 4.5, label: '4.5+' },
  { value: 5, label: '5' },
];

// QUICK WIN 3: Simplified and memoized component
export const RatingFilter = React.memo(function RatingFilter({
  minRating,
  onRatingChange,
  showStats = false,
}: RatingFilterProps) {

  // QUICK WIN 3: Simplified star rendering (no half-stars, no complex fills)
  const renderSimpleStars = (count: number) => {
    if (count === 0) return null;
    return (
      <View style={styles.starsRow}>
        {[...Array(Math.floor(count))].map((_, i) => (
          <Star
            key={i}
            size={14}
            color={colors.warning}
            fill={colors.warning}
          />
        ))}
      </View>
    );
  };

  // QUICK WIN 3: Simplified UI (no complex decorations)
  return (
    <View style={styles.container}>
      {/* Quick rating presets */}
      <View style={styles.presetsRow}>
        {RATING_OPTIONS.map((option) => {
          const isSelected = minRating === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.presetChip,
                isSelected && styles.presetChipSelected,
              ]}
              onPress={() => onRatingChange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.presetLabel,
                  isSelected && styles.presetLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              {option.value > 0 && renderSimpleStars(option.value)}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current selection display */}
      {minRating > 0 && (
        <View style={styles.selectionDisplay}>
          <Text style={styles.selectionText}>
            Showing providers with {minRating}+ star ratings
          </Text>
        </View>
      )}
    </View>
  );
});

// QUICK WIN 3: Simplified styles (removed unused styles)
const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetChip: {
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
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  presetLabelSelected: {
    color: colors.white,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  selectionDisplay: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
