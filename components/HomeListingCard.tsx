import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Star, Navigation } from 'lucide-react-native';
import { MarketplaceListing } from '@/types/database';
import CachedAvatar from '@/components/CachedAvatar';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';
import { getServiceLocationDisplay } from '@/lib/service-location-utils';

interface HomeListingCardProps {
  item: MarketplaceListing;
  onPress: (id: string, isJob: boolean) => void;
}

export const HomeListingCard = memo(({ item, onPress }: HomeListingCardProps) => {
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

  // Price calculation
  let priceText = '';
  if (isJob) {
    if (listing.fixed_price) {
      priceText = formatCurrency(listing.fixed_price);
    } else if (listing.budget_min && listing.budget_max) {
      priceText = `${formatCurrency(listing.budget_min)} - ${formatCurrency(listing.budget_max)}`;
    } else if (listing.budget_min) {
      priceText = `From ${formatCurrency(listing.budget_min)}`;
    } else {
      priceText = 'Budget TBD';
    }
  } else {
    const priceType = listing.pricing_type === 'Hourly' ? 'hour' : 'job';
    priceText = `${formatCurrency(listing.base_price || 0)}/${priceType}`;
  }

  return (
    <TouchableOpacity
      style={styles.listingCard}
      activeOpacity={0.7}
      onPress={() => onPress(item.id, isJob)}
    >
      <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: typeLabel.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, zIndex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{typeLabel.text}</Text>
      </View>
      <View style={styles.listingContent}>
        <Text style={styles.listingTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.listingDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.listingMeta}>
          <View style={styles.listingLocation}>
            <MapPin size={14} color={colors.textLight} />
            <Text style={styles.listingLocationText} numberOfLines={1}>
              {getServiceLocationDisplay(item.service_type, profile)}
            </Text>
            {item.distance_miles != null && (
              <View style={styles.distanceBadge}>
                <Navigation size={10} color={colors.textLight} />
                <Text style={styles.distanceBadgeText}>
                  {item.distance_miles.toFixed(1)} mi
                </Text>
              </View>
            )}
          </View>
          {profile?.rating_average && profile.rating_average > 0 && (
            <View style={styles.listingRating}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.listingRatingText}>
                {profile.rating_average.toFixed(1)} ({profile.rating_count || 0})
              </Text>
            </View>
          )}
        </View>
        <View style={styles.listingFooter}>
          <View style={styles.listingProvider}>
            <CachedAvatar
              uri={profile?.avatar_url}
              size={32}
              fallbackIconSize={16}
              style={styles.providerAvatar}
            />
            <Text style={styles.providerName} numberOfLines={1}>
              {profile?.full_name || 'Anonymous'}
            </Text>
          </View>
          <Text style={styles.listingPrice}>{priceText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listingContent: {
    padding: spacing.md,
  },
  listingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listingDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  listingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  listingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  listingLocationText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  distanceBadgeText: {
    fontSize: 10,
    color: colors.textLight,
    fontWeight: fontWeight.medium,
  },
  listingRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listingRatingText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  listingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listingProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  providerAvatar: {
    borderRadius: borderRadius.full,
  },
  providerName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  listingPrice: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
});
