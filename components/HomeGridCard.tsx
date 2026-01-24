import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Star, Navigation } from 'lucide-react-native';
import { MarketplaceListing } from '@/types/database';
import CachedAvatar from '@/components/CachedAvatar';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';
import { getServiceLocationDisplay } from '@/lib/service-location-utils';

interface HomeGridCardProps {
  item: MarketplaceListing;
  onPress: (id: string, isJob: boolean) => void;
}

export const HomeGridCard = memo(({ item, onPress }: HomeGridCardProps) => {
  const isJob = item.marketplace_type === 'Job';
  const profile = isJob ? item.customer : item.provider;
  const listing = item;

  // Type label logic
  let typeLabel = { text: 'SERVICE', color: colors.success };
  if (isJob) {
    typeLabel = { text: 'JOB', color: colors.primary };
  } else if (listing.listing_type === 'CustomService') {
    typeLabel = { text: 'CUSTOM', color: colors.accent };
  }

  const mainImage = listing.featured_image_url || null;

  // Price calculation
  let priceText = '';
  let priceSuffix = '';
  if (isJob) {
    if (listing.fixed_price) {
      priceText = formatCurrency(listing.fixed_price);
      priceSuffix = '';
    } else if (listing.budget_min && listing.budget_max) {
      priceText = `${formatCurrency(listing.budget_min)}-${formatCurrency(listing.budget_max)}`;
      priceSuffix = '';
    } else if (listing.budget_min) {
      priceText = formatCurrency(listing.budget_min);
      priceSuffix = '+';
    } else {
      priceText = 'Budget TBD';
      priceSuffix = '';
    }
  } else {
    const priceType = listing.pricing_type === 'Hourly' ? 'hour' : 'job';
    priceText = formatCurrency(listing.base_price || 0);
    priceSuffix = `/${priceType}`;
  }

  return (
    <TouchableOpacity
      style={styles.gridCard}
      activeOpacity={0.7}
      onPress={() => onPress(item.id, isJob)}
    >
      {mainImage ? (
        <Image source={{ uri: mainImage }} style={styles.gridCardImage} resizeMode="cover" />
      ) : (
        <View style={[styles.gridCardImage, styles.gridCardImagePlaceholder]}>
          <Text style={styles.gridCardImagePlaceholderText}>
            {isJob ? '💼' : listing.listing_type === 'CustomService' ? '✨' : '🛠️'}
          </Text>
        </View>
      )}
      <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: typeLabel.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{typeLabel.text}</Text>
      </View>
      {listing.distance_miles != null && (
        <View style={styles.gridDistanceBadge}>
          <Navigation size={10} color={colors.white} />
          <Text style={styles.gridDistanceBadgeText}>
            {listing.distance_miles < 1
              ? `${(listing.distance_miles * 5280).toFixed(0)} ft`
              : `${listing.distance_miles.toFixed(1)} mi`}
          </Text>
        </View>
      )}
      <View style={styles.gridCardContent}>
        <View style={styles.gridHeader}>
          <CachedAvatar
            uri={profile?.avatar_url}
            size={28}
            fallbackIconSize={14}
            style={styles.gridAvatar}
          />
          {profile && (
            <Text style={styles.gridAccountName} numberOfLines={1}>
              {profile.full_name}
            </Text>
          )}
          {profile && profile.rating_average > 0 && (
            <View style={styles.gridRating}>
              <Star size={10} color={colors.warning} fill={colors.warning} />
              <Text style={styles.gridRatingText}>{profile.rating_average?.toFixed(1) || 'N/A'}</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.gridFooter}>
          <View style={styles.gridLocation}>
            <MapPin size={12} color={colors.textLight} />
            <Text style={styles.gridLocationText} numberOfLines={1}>
              {getServiceLocationDisplay(item.service_type, profile)}
            </Text>
          </View>
          <View style={styles.gridPrice}>
            <Text style={styles.gridPriceAmount}>{priceText}</Text>
            {priceSuffix ? <Text style={styles.gridPriceType}>{priceSuffix}</Text> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    margin: spacing.xs,
    minWidth: 150,
    maxWidth: 200,
    ...shadows.sm,
  },
  gridCardImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surface,
  },
  gridCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  gridCardImagePlaceholderText: {
    fontSize: 40,
  },
  gridDistanceBadge: {
    position: 'absolute',
    bottom: 128,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gridDistanceBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  gridCardContent: {
    padding: spacing.sm,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  gridAvatar: {
    borderRadius: borderRadius.full,
  },
  gridAccountName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: fontWeight.medium,
  },
  gridRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridRatingText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  gridTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  gridDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  gridLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  gridLocationText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    flex: 1,
  },
  gridPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  gridPriceAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  gridPriceType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
