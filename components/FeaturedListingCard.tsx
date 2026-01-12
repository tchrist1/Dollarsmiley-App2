import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Star,
  TrendingUp,
  Eye,
  ArrowRight,
} from 'lucide-react-native';
import FeaturedBadge from './FeaturedBadge';
import { trackFeaturedImpression, trackFeaturedClick } from '@/lib/featured-listings';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface FeaturedListingCardProps {
  listing: any;
  featuredId: string;
  daysRemaining?: number;
  impressions?: number;
  clicks?: number;
  variant?: 'default' | 'compact' | 'hero';
  showStats?: boolean;
}

function FeaturedListingCard({
  listing,
  featuredId,
  daysRemaining,
  impressions = 0,
  clicks = 0,
  variant = 'default',
  showStats = false,
}: FeaturedListingCardProps) {
  const router = useRouter();

  // Helper function to extract image URL
  const getImageUrl = (imageData: any): string | null => {
    if (!imageData) return null;

    // Handle if it's an object with url property
    if (typeof imageData === 'object' && imageData.url) {
      return typeof imageData.url === 'string' ? imageData.url : null;
    }

    // Handle if it's a string
    if (typeof imageData === 'string') {
      return imageData;
    }

    return null;
  };

  const primaryImageUrl = getImageUrl(listing.images?.[0]);

  useEffect(() => {
    // Track impression when card is rendered
    if (featuredId) {
      trackFeaturedImpression(featuredId);
    }
  }, [featuredId]);

  const handlePress = () => {
    // Track click
    if (featuredId) {
      trackFeaturedClick(featuredId);
    }

    router.push(`/listing/${listing.id}`);
  };

  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

  if (variant === 'hero') {
    return (
      <TouchableOpacity
        style={styles.heroCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.heroImageContainer}>
          {primaryImageUrl && (
            <Image
              source={{ uri: primaryImageUrl, cache: 'force-cache' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroOverlay} />
          <FeaturedBadge
            variant="large"
            style="crown"
            position="top-right"
            daysRemaining={daysRemaining}
            showDaysRemaining
          />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <View style={styles.categoryBadge}>
              <TrendingUp size={14} color={colors.primary} />
              <Text style={styles.categoryText}>
                {listing.category?.name || 'Featured'}
              </Text>
            </View>
            {listing.provider?.average_rating && (
              <View style={styles.ratingBadge}>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingText}>
                  {listing.provider.average_rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle} numberOfLines={2}>
            {listing.title}
          </Text>

          <Text style={styles.heroDescription} numberOfLines={2}>
            {listing.description}
          </Text>

          <View style={styles.heroFooter}>
            <View style={styles.providerInfo}>
              {listing.provider?.avatar_url && typeof listing.provider.avatar_url === 'string' && (
                <Image
                  source={{ uri: listing.provider.avatar_url }}
                  style={styles.providerAvatar}
                />
              )}
              <Text style={styles.providerName} numberOfLines={1}>
                {listing.provider?.full_name || 'Provider'}
              </Text>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Starting at</Text>
              <Text style={styles.heroPrice}>{formatCurrency(listing.price)}</Text>
            </View>
          </View>

          {showStats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Eye size={14} color={colors.textSecondary} />
                <Text style={styles.statText}>{impressions} views</Text>
              </View>
              <View style={styles.statItem}>
                <TrendingUp size={14} color={colors.textSecondary} />
                <Text style={styles.statText}>{ctr}% CTR</Text>
              </View>
            </View>
          )}

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <ArrowRight size={16} color={colors.white} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.compactImageContainer}>
          {primaryImageUrl && (
            <Image
              source={{ uri: primaryImageUrl }}
              style={styles.compactImage}
              resizeMode="cover"
            />
          )}
          <FeaturedBadge
            variant="minimal"
            style="star"
            position="top-left"
          />
        </View>

        <View style={styles.compactContent}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {listing.title}
          </Text>

          <View style={styles.compactMeta}>
            {listing.provider?.average_rating && (
              <View style={styles.compactRating}>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <Text style={styles.compactRatingText}>
                  {listing.provider.average_rating.toFixed(1)}
                </Text>
              </View>
            )}
            <Text style={styles.compactPrice}>{formatCurrency(listing.price)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Default variant
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {primaryImageUrl && (
          <Image
            source={{ uri: primaryImageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <View style={styles.imageOverlay} />
        <FeaturedBadge
          variant="default"
          style="star"
          position="top-right"
          daysRemaining={daysRemaining}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>
            {listing.category?.name || 'Service'}
          </Text>
          {listing.provider?.average_rating && (
            <View style={styles.rating}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>
                {listing.provider.average_rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {listing.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.provider}>
            {listing.provider?.avatar_url && typeof listing.provider.avatar_url === 'string' && (
              <Image
                source={{ uri: listing.provider.avatar_url }}
                style={styles.avatar}
              />
            )}
            <Text style={styles.providerNameText} numberOfLines={1}>
              {listing.provider?.full_name || 'Provider'}
            </Text>
          </View>

          <Text style={styles.price}>{formatCurrency(listing.price)}</Text>
        </View>

        {showStats && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Eye size={12} color={colors.textSecondary} />
              <Text style={styles.statValueText}>{impressions}</Text>
            </View>
            <View style={styles.stat}>
              <TrendingUp size={12} color={colors.textSecondary} />
              <Text style={styles.statValueText}>{ctr}%</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(FeaturedListingCard);

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  heroContent: {
    padding: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 28,
  },
  heroDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  providerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  heroPrice: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  viewButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  compactCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactImageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactContent: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  compactMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactRatingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  compactPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  providerNameText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValueText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
