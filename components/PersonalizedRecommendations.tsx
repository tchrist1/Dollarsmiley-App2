import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Heart,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPersonalizedProviderRecommendations,
  recordInteraction,
  addToFavorites,
  formatRecommendationReason,
  calculateRecommendationConfidence,
  getConfidenceColor,
  type Recommendation,
} from '@/lib/recommendation-engine';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useRouter } from 'expo-router';

interface PersonalizedRecommendationsProps {
  limit?: number;
  onProviderPress?: (providerId: string) => void;
}

export default function PersonalizedRecommendations({
  limit = 10,
  onProviderPress,
}: PersonalizedRecommendationsProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user]);

  const loadRecommendations = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getPersonalizedProviderRecommendations(user.id, limit);
      setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderPress = async (providerId: string) => {
    if (!user?.id) return;

    await recordInteraction(user.id, 'provider', providerId, 'view');

    if (onProviderPress) {
      onProviderPress(providerId);
    } else {
      router.push(`/listing/${providerId}`);
    }
  };

  const handleAddToFavorites = async (providerId: string) => {
    if (!user?.id) return;

    const result = await addToFavorites(user.id, providerId);
    if (result.success) {
      await recordInteraction(user.id, 'provider', providerId, 'bookmark');
    }
  };

  const handleDismiss = async (providerId: string) => {
    setDismissedIds(new Set(dismissedIds).add(providerId));
  };

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedIds.has(rec.provider_id)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  if (visibleRecommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={20} color={colors.primary} />
          <Text style={styles.title}>Recommended For You</Text>
        </View>
        <TouchableOpacity onPress={loadRecommendations}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleRecommendations.map((rec) => {
          const confidence = calculateRecommendationConfidence(rec.recommendation_score);
          const confidenceColor = getConfidenceColor(confidence);

          return (
            <TouchableOpacity
              key={rec.provider_id}
              style={styles.card}
              onPress={() => handleProviderPress(rec.provider_id)}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => handleDismiss(rec.provider_id)}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
                <Star size={12} color={colors.white} fill={colors.white} />
                <Text style={styles.confidenceText}>
                  {rec.recommendation_score.toFixed(1)}
                </Text>
              </View>

              <View style={styles.imageContainer}>
                <View style={styles.imagePlaceholder}>
                  <Users size={32} color={colors.primary} />
                </View>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.providerName} numberOfLines={1}>
                  {rec.provider_name}
                </Text>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {rec.category_name}
                </Text>

                <View style={styles.reasonBadge}>
                  <TrendingUp size={12} color={colors.primary} />
                  <Text style={styles.reasonText} numberOfLines={1}>
                    {formatRecommendationReason(rec.recommendation_reason)}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.favoriteButton}
                    onPress={() => handleAddToFavorites(rec.provider_id)}
                  >
                    <Heart size={16} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  refreshText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 28,
    height: 28,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confidenceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    zIndex: 10,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
  },
  cardContent: {
    padding: spacing.md,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  reasonText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  favoriteButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
