import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Star, Zap, Crown, TrendingUp } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export type FeaturedBadgeVariant = 'default' | 'compact' | 'large' | 'minimal';
export type FeaturedBadgeStyle = 'star' | 'lightning' | 'crown' | 'trending';

interface FeaturedBadgeProps {
  variant?: FeaturedBadgeVariant;
  style?: FeaturedBadgeStyle;
  daysRemaining?: number;
  showDaysRemaining?: boolean;
  customText?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline';
}

export default function FeaturedBadge({
  variant = 'default',
  style = 'star',
  daysRemaining,
  showDaysRemaining = false,
  customText,
  position = 'top-right',
}: FeaturedBadgeProps) {
  const getIcon = () => {
    const iconSize = variant === 'compact' || variant === 'minimal' ? 14 : variant === 'large' ? 24 : 16;
    const iconColor = colors.white;

    switch (style) {
      case 'lightning':
        return <Zap size={iconSize} color={iconColor} fill={iconColor} />;
      case 'crown':
        return <Crown size={iconSize} color={iconColor} fill={iconColor} />;
      case 'trending':
        return <TrendingUp size={iconSize} color={iconColor} />;
      case 'star':
      default:
        return <Star size={iconSize} color={iconColor} fill={iconColor} />;
    }
  };

  const getBadgeColor = () => {
    if (daysRemaining !== undefined) {
      if (daysRemaining >= 14) return '#10B981'; // Green
      if (daysRemaining >= 7) return '#3B82F6'; // Blue
      if (daysRemaining >= 3) return '#F59E0B'; // Orange
      return '#EF4444'; // Red
    }
    return '#F59E0B'; // Default orange/gold
  };

  const getText = () => {
    if (customText) return customText;
    if (variant === 'minimal') return '';
    if (variant === 'compact') return 'Featured';
    return 'Featured';
  };

  const getDaysText = () => {
    if (!showDaysRemaining || daysRemaining === undefined) return '';
    if (daysRemaining === 0) return 'Expires today';
    if (daysRemaining === 1) return '1 day left';
    return `${daysRemaining} days left`;
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return styles.positionTopLeft;
      case 'top-right':
        return styles.positionTopRight;
      case 'bottom-left':
        return styles.positionBottomLeft;
      case 'bottom-right':
        return styles.positionBottomRight;
      case 'inline':
      default:
        return {};
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return styles.badgeCompact;
      case 'large':
        return styles.badgeLarge;
      case 'minimal':
        return styles.badgeMinimal;
      case 'default':
      default:
        return styles.badgeDefault;
    }
  };

  const badgeColor = getBadgeColor();
  const text = getText();
  const daysText = getDaysText();

  return (
    <View style={[styles.container, getPositionStyles()]}>
      <View
        style={[
          styles.badge,
          getVariantStyles(),
          { backgroundColor: badgeColor },
        ]}
      >
        {getIcon()}
        {text && <Text style={styles.badgeText}>{text}</Text>}
      </View>
      {daysText && (
        <View style={[styles.daysRemaining, { backgroundColor: badgeColor }]}>
          <Text style={styles.daysText}>{daysText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeDefault: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgeMinimal: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 0,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  daysRemaining: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  daysText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  positionTopLeft: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
  },
  positionTopRight: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  positionBottomLeft: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    zIndex: 10,
  },
  positionBottomRight: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
});
