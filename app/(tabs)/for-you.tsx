import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Sparkles,
  TrendingUp,
  MapPin,
  Star,
  Briefcase,
  Users,
  Heart,
  Bookmark,
  Share2,
  Filter,
  Search,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useScreenTracking } from '@/hooks/useBehaviorTracking';
import {
  getPersonalizedProviderRecommendations,
  getTrendingItems,
  getUserPreferences,
  recordInteraction,
  type Recommendation,
} from '@/lib/recommendation-engine';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import PersonalizedRecommendations from '@/components/PersonalizedRecommendations';

type FeedSection =
  | 'recommendations'
  | 'trending'
  | 'nearby'
  | 'top_rated'
  | 'new_providers';

interface FeedItem {
  type: 'provider' | 'job' | 'post';
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  rating?: number;
  distance?: string;
  image?: string;
  badge?: string;
  metadata?: Record<string, any>;
}

export default function ForYouScreen() {
  useScreenTracking('ForYou');
  const { profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<FeedSection>('recommendations');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadFeed();
    }
  }, [profile?.id, activeSection]);

  const loadFeed = async () => {
    if (!profile?.id) return;

    setLoading(true);
    setError(null);
    try {
      const [prefs, recommendations, trending] = await Promise.all([
        getUserPreferences(profile.id),
        getPersonalizedProviderRecommendations(profile.id, 20),
        getTrendingItems('provider', 10, 48),
      ]);

      let items: FeedItem[] = [];

      switch (activeSection) {
        case 'recommendations':
          items = recommendations.map((rec) => ({
            type: 'provider' as const,
            id: rec.provider_id,
            title: rec.provider_name,
            subtitle: rec.category_name,
            category: rec.category_name,
            badge: `${rec.recommendation_score.toFixed(1)} match`,
            metadata: { reason: rec.recommendation_reason },
          }));
          break;
        case 'trending':
          items = trending.map((item) => ({
            type: 'provider' as const,
            id: item.item_id,
            title: 'Trending Provider',
            badge: '🔥 Trending',
            metadata: { interactions: item.total_weight },
          }));
          break;
      }

      setFeedItems(items);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError('Failed to load feed. Pull to refresh.');
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [activeSection]);

  const handleItemPress = async (item: FeedItem) => {
    if (!profile?.id) return;

    await recordInteraction(profile.id, item.type, item.id, 'view', {
      source: 'for_you_feed',
      section: activeSection,
    });

    if (item.type === 'provider') {
      router.push(`/listing/${item.id}`);
    } else if (item.type === 'job') {
      router.push(`/jobs/${item.id}`);
    }
  };

  const handleLike = async (item: FeedItem) => {
    if (!profile?.id) return;
    await recordInteraction(profile.id, item.type, item.id, 'like');
  };

  const handleBookmark = async (item: FeedItem) => {
    if (!profile?.id) return;
    await recordInteraction(profile.id, item.type, item.id, 'bookmark');
  };

  const handleShare = async (item: FeedItem) => {
    if (!profile?.id) return;
    await recordInteraction(profile.id, item.type, item.id, 'share');
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Sparkles size={24} color={colors.primary} />
            <Text style={styles.headerTitle}>For You</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push('/jobs/index')}
            >
              <Search size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Filter size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'recommendations' && styles.tabActive,
            ]}
            onPress={() => setActiveSection('recommendations')}
          >
            <Sparkles
              size={16}
              color={
                activeSection === 'recommendations' ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeSection === 'recommendations' && styles.tabTextActive,
              ]}
            >
              For You
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'trending' && styles.tabActive]}
            onPress={() => setActiveSection('trending')}
          >
            <TrendingUp
              size={16}
              color={activeSection === 'trending' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeSection === 'trending' && styles.tabTextActive]}
            >
              Trending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'nearby' && styles.tabActive]}
            onPress={() => setActiveSection('nearby')}
          >
            <MapPin
              size={16}
              color={activeSection === 'nearby' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeSection === 'nearby' && styles.tabTextActive]}
            >
              Nearby
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'top_rated' && styles.tabActive]}
            onPress={() => setActiveSection('top_rated')}
          >
            <Star
              size={16}
              color={
                activeSection === 'top_rated' ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeSection === 'top_rated' && styles.tabTextActive,
              ]}
            >
              Top Rated
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'new_providers' && styles.tabActive]}
            onPress={() => setActiveSection('new_providers')}
          >
            <Users
              size={16}
              color={
                activeSection === 'new_providers' ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeSection === 'new_providers' && styles.tabTextActive,
              ]}
            >
              New
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Feed Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Recommendations Carousel */}
        {activeSection === 'recommendations' && (
          <PersonalizedRecommendations limit={15} />
        )}

        {/* Feed Items */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your feed...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Oops!</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : feedItems.length > 0 ? (
          <View style={styles.feedList}>
            {feedItems.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={styles.feedCard}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.avatarPlaceholder}>
                      <Users size={20} color={colors.primary} />
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.subtitle && (
                        <Text style={styles.cardSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>

                {/* Card Image */}
                <View style={styles.cardImage}>
                  <View style={styles.imagePlaceholder}>
                    <Briefcase size={48} color={colors.primary} />
                  </View>
                </View>

                {/* Card Meta */}
                <View style={styles.cardMeta}>
                  {item.rating && (
                    <View style={styles.metaItem}>
                      <Star size={14} color={colors.warning} fill={colors.warning} />
                      <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  {item.category && (
                    <View style={styles.metaItem}>
                      <Briefcase size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{item.category}</Text>
                    </View>
                  )}
                  {item.distance && (
                    <View style={styles.metaItem}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{item.distance}</Text>
                    </View>
                  )}
                </View>

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(item)}
                  >
                    <Heart size={20} color={colors.text} />
                    <Text style={styles.actionText}>Like</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleBookmark(item)}
                  >
                    <Bookmark size={20} color={colors.text} />
                    <Text style={styles.actionText}>Save</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShare(item)}
                  >
                    <Share2 size={20} color={colors.text} />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Sparkles size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>
              Browse providers and interact with content to get personalized
              recommendations
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  feedList: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  feedCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
