import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Star, TrendingUp, Award, Users } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RatingFilterProps {
  minRating: number;
  onRatingChange: (rating: number) => void;
  showStats?: boolean;
}

const RATING_OPTIONS = [
  {
    value: 0,
    label: 'Any Rating',
    description: 'Show all providers',
    icon: Users,
    stars: 0,
  },
  {
    value: 3,
    label: '3+ Stars',
    description: 'Good providers',
    icon: TrendingUp,
    stars: 3,
  },
  {
    value: 4,
    label: '4+ Stars',
    description: 'Great providers',
    icon: Star,
    stars: 4,
  },
  {
    value: 4.5,
    label: '4.5+ Stars',
    description: 'Excellent providers',
    icon: Award,
    stars: 4.5,
  },
  {
    value: 5,
    label: '5 Stars',
    description: 'Perfect rating only',
    icon: Award,
    stars: 5,
  },
];

export function RatingFilter({
  minRating,
  onRatingChange,
  showStats = false,
}: RatingFilterProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const renderStars = (rating: number, isSelected: boolean, isCompact: boolean = false) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - Math.ceil(rating);

    const starSize = isCompact ? 14 : 18;
    const starColor = isSelected ? colors.white : colors.warning;

    return (
      <View style={styles.starsRow}>
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            size={starSize}
            color={starColor}
            fill={starColor}
          />
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <View style={styles.halfStarContainer}>
            <Star
              size={starSize}
              color={starColor}
              fill="none"
              strokeWidth={2}
            />
            <View style={[styles.halfStarFill, { width: starSize / 2 }]}>
              <Star
                size={starSize}
                color={starColor}
                fill={starColor}
              />
            </View>
          </View>
        )}
        {/* Empty stars */}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={starSize}
            color={starColor}
            fill="none"
            strokeWidth={2}
          />
        ))}
      </View>
    );
  };

  const getRatingColor = (rating: number): string => {
    if (rating === 0) return colors.textSecondary;
    if (rating < 4) return colors.warning;
    if (rating < 4.5) return colors.primary;
    if (rating < 5) return colors.success;
    return colors.error;
  };

  const getProviderCount = (rating: number): string => {
    // Mock data - replace with actual counts from database
    const counts: Record<number, number> = {
      0: 1250,
      3: 850,
      4: 520,
      4.5: 180,
      5: 45,
    };
    return counts[rating]?.toString() || '0';
  };

  return (
    <View style={styles.container}>
      {/* Interactive Star Display */}
      <View style={styles.interactiveStars}>
        <View style={styles.largeStarsContainer}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= minRating;
            const isHovered = hoverRating !== null && star <= hoverRating;

            return (
              <TouchableOpacity
                key={star}
                onPress={() => onRatingChange(star)}
                onPressIn={() => setHoverRating(star)}
                onPressOut={() => setHoverRating(null)}
                style={styles.largeStar}
                activeOpacity={0.7}
              >
                <Star
                  size={40}
                  color={isFilled || isHovered ? colors.warning : colors.border}
                  fill={isFilled || isHovered ? colors.warning : 'none'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.interactiveLabel}>
          {minRating === 0 ? 'Tap stars to set minimum rating' : `${minRating}+ stars minimum`}
        </Text>
      </View>

      {/* Preset Options */}
      <View style={styles.presetsContainer}>
        {RATING_OPTIONS.map((option) => {
          const isSelected = minRating === option.value;
          const Icon = option.icon;
          const bgColor = isSelected ? getRatingColor(option.value) : colors.surface;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.presetCard,
                isSelected && styles.presetCardSelected,
                isSelected && { backgroundColor: bgColor },
              ]}
              onPress={() => onRatingChange(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.presetHeader}>
                <Icon
                  size={20}
                  color={isSelected ? colors.white : colors.primary}
                />
                <Text
                  style={[
                    styles.presetLabel,
                    isSelected && styles.presetLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </View>

              {option.stars > 0 && (
                <View style={styles.presetStars}>
                  {renderStars(option.stars, isSelected, true)}
                </View>
              )}

              <Text
                style={[
                  styles.presetDescription,
                  isSelected && styles.presetDescriptionSelected,
                ]}
              >
                {option.description}
              </Text>

              {showStats && (
                <View style={styles.statsRow}>
                  <Users
                    size={12}
                    color={isSelected ? colors.white : colors.textLight}
                  />
                  <Text
                    style={[
                      styles.statsText,
                      isSelected && styles.statsTextSelected,
                    ]}
                  >
                    {getProviderCount(option.value)} providers
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rating Distribution (if stats enabled) */}
      {showStats && (
        <View style={styles.distributionContainer}>
          <Text style={styles.distributionTitle}>Rating Distribution</Text>
          <View style={styles.distributionBars}>
            {[5, 4, 3, 2, 1].map((stars) => (
              <View key={stars} style={styles.distributionRow}>
                <Text style={styles.distributionStars}>{stars}</Text>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <View style={styles.distributionBarContainer}>
                  <View
                    style={[
                      styles.distributionBar,
                      { width: `${Math.random() * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.distributionPercent}>
                  {Math.floor(Math.random() * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => onRatingChange(4)}
        >
          <Text style={styles.quickActionText}>Top Rated (4+)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => onRatingChange(0)}
        >
          <Text style={styles.quickActionText}>Clear Selection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  interactiveStars: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  largeStarsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  largeStar: {
    padding: spacing.xs,
  },
  interactiveLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  halfStarContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  halfStarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  presetsContainer: {
    gap: spacing.sm,
  },
  presetCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  presetCardSelected: {
    borderColor: 'transparent',
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  presetLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  presetLabelSelected: {
    color: colors.white,
  },
  presetStars: {
    marginBottom: spacing.xs,
  },
  presetDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  presetDescriptionSelected: {
    color: colors.white,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statsText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  statsTextSelected: {
    color: colors.white,
    opacity: 0.8,
  },
  distributionContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  distributionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  distributionBars: {
    gap: spacing.sm,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  distributionStars: {
    fontSize: fontSize.sm,
    color: colors.text,
    width: 12,
  },
  distributionBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionBar: {
    height: '100%',
    backgroundColor: colors.warning,
  },
  distributionPercent: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    width: 35,
    textAlign: 'right',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
});
