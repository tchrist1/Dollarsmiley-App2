import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  RecommendationResult,
  generatePersonalizedRecommendations,
  getPopularListings,
  getTrendingListings,
  getNearbyListings,
  getCollaborativeRecommendations,
} from '@/lib/recommendations';
import { Star, MapPin, TrendingUp, Users, Sparkles } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.7;

interface RecommendationsCarouselProps {
  userId?: string;
  type?: 'personalized' | 'popular' | 'trending' | 'nearby' | 'collaborative';
  title?: string;
  userLocation?: { latitude: number; longitude: number };
  limit?: number;
}

export function RecommendationsCarousel({
  userId,
  type = 'personalized',
  title,
  userLocation,
  limit = 10,
}: RecommendationsCarouselProps) {
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [userId, type]);

  const fetchRecommendations = async () => {
    setLoading(true);

    try {
      let results: RecommendationResult[] = [];

      switch (type) {
        case 'personalized':
          results = userId
            ? await generatePersonalizedRecommendations(userId, limit)
            : await getPopularListings(limit);
          break;

        case 'popular':
          results = await getPopularListings(limit);
          break;

        case 'trending':
          results = await getTrendingListings(limit);
          break;

        case 'nearby':
          results =
            userLocation && userLocation.latitude && userLocation.longitude
              ? await getNearbyListings(userLocation.latitude, userLocation.longitude, 25, limit)
              : [];
          break;

        case 'collaborative':
          results = userId ? await getCollaborativeRecommendations(userId, limit) : [];
          break;

        default:
          results = await getPopularListings(limit);
      }

      setRecommendations(results);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'trending':
        return <TrendingUp size={20} color={colors.primary} />;
      case 'collaborative':
        return <Users size={20} color={colors.primary} />;
      case 'nearby':
        return <MapPin size={20} color={colors.primary} />;
      case 'personalized':
        return <Sparkles size={20} color={colors.primary} />;
      default:
        return <Star size={20} color={colors.primary} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'personalized':
        return 'Recommended for You';
      case 'popular':
        return 'Popular Services';
      case 'trending':
        return 'Trending This Week';
      case 'nearby':
        return 'Services Near You';
      case 'collaborative':
        return 'Others Also Viewed';
      default:
        return 'Recommended Services';
    }
  };

  const renderCard = (item: RecommendationResult) => {
    const listing = item.listing;
    const provider = listing.provider;

    // Extract URL from photo object or use fallback
    const getPhotoUrl = () => {
      const photo = listing.photos?.[0];
      if (!photo) return 'https://images.pexels.com/photos/4098369/pexels-photo-4098369.jpeg';

      // Handle if photos is an array of objects with url property
      if (typeof photo === 'object' && photo.url) {
        return typeof photo.url === 'string' ? photo.url : 'https://images.pexels.com/photos/4098369/pexels-photo-4098369.jpeg';
      }

      // Handle if photos is an array of strings
      if (typeof photo === 'string') {
        return photo;
      }

      return 'https://images.pexels.com/photos/4098369/pexels-photo-4098369.jpeg';
    };

    const primaryPhoto = getPhotoUrl();

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => router.push(`/listing/${listing.id}`)}
        activeOpacity={0.9}
      >
        <Image source={{ uri: primaryPhoto }} style={styles.cardImage} />

        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{item.score}%</Text>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {listing.title || 'Untitled'}
          </Text>

          <View style={styles.providerRow}>
            <View style={styles.providerAvatar}>
              <Text style={styles.providerAvatarText}>
                {provider?.full_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName} numberOfLines={1}>
                {provider?.full_name || 'Unknown Provider'}
              </Text>
              {provider?.rating_average > 0 && (
                <View style={styles.ratingRow}>
                  <Star size={12} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.ratingText}>
                    {provider.rating_average.toFixed(1)} ({provider.rating_count || 0})
                  </Text>
                </View>
              )}
            </View>
          </View>

          {listing.location && (
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {listing.location}
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.price}>{formatCurrency(listing.base_price)}</Text>
            </View>
            {item.reasoning && (
              <View style={styles.reasoningBadge}>
                <Text style={styles.reasoningText} numberOfLines={1}>
                  {item.reasoning}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {getTypeIcon()}
          <Text style={styles.title}>{title || getDefaultTitle()}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {getTypeIcon()}
        <Text style={styles.title}>{title || getDefaultTitle()}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + spacing.md}
        decelerationRate="fast"
      >
        {recommendations.map((item) => renderCard(item))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  loadingContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border + '20',
    ...shadows.md,
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  scoreBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    height: 40,
    letterSpacing: -0.3,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  providerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: -0.5,
  },
  reasoningBadge: {
    flex: 1,
    marginLeft: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  reasoningText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
  },
});
