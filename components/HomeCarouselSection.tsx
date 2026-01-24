import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Star } from 'lucide-react-native';
import { MarketplaceListing } from '@/types/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';
import { getServiceLocationDisplay } from '@/lib/service-location-utils';

interface HomeCarouselSectionProps {
  title: string;
  icon: React.ReactNode;
  data: MarketplaceListing[];
  carouselType: 'trending' | 'popular' | 'recommended';
  onSeeAll: (type: string) => void;
}

export const HomeCarouselSection = memo<HomeCarouselSectionProps>(({
  title,
  icon,
  data,
  carouselType,
  onSeeAll,
}) => {
  const getListingTypeLabel = useCallback((listing: MarketplaceListing) => {
    if (listing.marketplace_type === 'Job') {
      return { text: 'JOB', color: colors.success };
    }
    if (listing.listing_type === 'CustomService') {
      return { text: 'CUSTOM', color: colors.secondary };
    }
    return { text: 'SERVICE', color: colors.primary };
  }, []);

  const renderCarouselCard = useCallback(({ item }: { item: MarketplaceListing }) => {
    const isJob = item.marketplace_type === 'Job';
    const profile = isJob ? item.customer : item.provider;
    const typeLabel = getListingTypeLabel(item);

    let price = '';
    if (isJob) {
      price = item.fixed_price
        ? formatCurrency(item.fixed_price)
        : (item.budget_min ? formatCurrency(item.budget_min) : 'TBD');
    } else {
      price = formatCurrency(item.base_price || 0);
    }

    return (
      <TouchableOpacity
        style={styles.carouselCard}
        onPress={() => router.push(isJob ? `/jobs/${item.id}` : `/listing/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.carouselCardContent}>
          <View style={styles.carouselCardHeader}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.carouselAvatar} />
            ) : (
              <View style={[styles.carouselAvatar, styles.carouselAvatarPlaceholder]}>
                <Text style={styles.carouselAvatarText}>
                  {(profile?.full_name || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.carouselAccountName} numberOfLines={1}>
              {profile?.full_name || 'Provider'}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeLabel.color }]}>
              <Text style={styles.typeBadgeText}>{typeLabel.text}</Text>
            </View>
          </View>

          <Text style={styles.carouselCardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.carouselCardLocation} numberOfLines={1}>
            {getServiceLocationDisplay(item.service_type, profile)}
          </Text>

          <View style={styles.carouselCardFooter}>
            <Text style={styles.carouselCardPrice}>{price}</Text>
            {profile?.rating_average && profile.rating_average > 0 && (
              <View style={styles.carouselCardRating}>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <Text style={styles.carouselCardRatingText}>
                  {profile.rating_average.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getListingTypeLabel]);

  if (data.length === 0) return null;

  return (
    <View style={styles.carouselSection}>
      <View style={styles.carouselHeader}>
        <View style={styles.carouselTitleRow}>
          {icon}
          <Text style={styles.carouselTitle}>{title}</Text>
        </View>
        <TouchableOpacity onPress={() => onSeeAll(carouselType)}>
          <Text style={styles.seeAllText}>See All →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={data}
        renderItem={renderCarouselCard}
        keyExtractor={(item) => `carousel-${carouselType}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselList}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </View>
  );
});

HomeCarouselSection.displayName = 'HomeCarouselSection';

const styles = StyleSheet.create({
  carouselSection: {
    marginBottom: spacing.lg,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  carouselTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  carouselTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  seeAllText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  carouselList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  carouselCard: {
    width: 200,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carouselCardContent: {
    gap: spacing.xs,
  },
  carouselCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  carouselAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  carouselAvatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselAvatarText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  carouselAccountName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  typeBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: fontWeight.semibold,
  },
  carouselCardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    lineHeight: fontSize.md * 1.3,
  },
  carouselCardLocation: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  carouselCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  carouselCardPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  carouselCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  carouselCardRatingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
});
