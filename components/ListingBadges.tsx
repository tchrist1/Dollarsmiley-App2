import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Package, Truck, Star, Zap } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Props {
  listingType?: 'Service' | 'CustomService';
  fulfillmentOptions?: string[];
  hasShipping?: boolean;
  shippingMode?: 'Platform' | 'External';
  hasVAS?: boolean;
  showAll?: boolean;
}

export default function ListingBadges({
  listingType,
  fulfillmentOptions = [],
  hasShipping,
  shippingMode,
  hasVAS,
  showAll = true,
}: Props) {
  const badges = [];

  if (listingType === 'CustomService') {
    badges.push({
      key: 'custom',
      label: 'Custom Service',
      icon: <Star size={12} color={colors.info} />,
      color: colors.info,
    });
  }

  if (fulfillmentOptions.includes('Pickup')) {
    badges.push({
      key: 'pickup',
      label: 'Pickup',
      icon: <Package size={12} color={colors.success} />,
      color: colors.success,
    });
  }

  if (fulfillmentOptions.includes('DropOff')) {
    badges.push({
      key: 'dropoff',
      label: 'Drop-off',
      icon: <Package size={12} color={colors.warning} />,
      color: colors.warning,
    });
  }

  if (hasShipping || fulfillmentOptions.includes('Shipping')) {
    const shippingLabel = shippingMode === 'Platform' ? 'Platform Shipping' : 'Shipping';
    badges.push({
      key: 'shipping',
      label: shippingLabel,
      icon: <Truck size={12} color={colors.primary} />,
      color: colors.primary,
    });
  }

  if (hasVAS) {
    badges.push({
      key: 'vas',
      label: 'Add-ons',
      icon: <Zap size={12} color={colors.secondary} />,
      color: colors.secondary,
    });
  }

  if (badges.length === 0) {
    return null;
  }

  const displayBadges = showAll ? badges : badges.slice(0, 3);
  const remainingCount = badges.length - displayBadges.length;

  return (
    <View style={styles.container}>
      {displayBadges.map((badge) => (
        <View
          key={badge.key}
          style={[styles.badge, { backgroundColor: badge.color + '20', borderColor: badge.color + '50' }]}
        >
          {badge.icon}
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      ))}
      {remainingCount > 0 && (
        <View style={[styles.badge, styles.moreBadge]}>
          <Text style={styles.moreText}>+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  moreBadge: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  moreText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
