import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { UserPlus, MapPin, TrendingUp, Heart, Star } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEnhancedFollowSuggestions,
  getPopularProvidersNearby,
  getTrendingProvidersInCategories,
  followUser,
  type SuggestedFollower,
  type PopularProvider,
  type TrendingProvider,
} from '@/lib/followers';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface EnhancedSuggestionsProps {
  userId: string;
  onUserPress?: (userId: string) => void;
}

export default function EnhancedSuggestions({
  userId,
  onUserPress,
}: EnhancedSuggestionsProps) {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedFollower[]>([]);
  const [popularNearby, setPopularNearby] = useState<PopularProvider[]>([]);
  const [trending, setTrending] = useState<TrendingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllSuggestions();
  }, [userId]);

  const loadAllSuggestions = async () => {
    try {
      const [suggestionsData, popularData, trendingData] = await Promise.all([
        getEnhancedFollowSuggestions(userId, 10),
        getPopularProvidersNearby(userId, 50, 5),
        getTrendingProvidersInCategories(userId, 30, 5),
      ]);

      setSuggestions(suggestionsData);
      setPopularNearby(popularData);
      setTrending(trendingData);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!profile?.id || followingUsers.has(targetUserId)) return;

    setFollowingUsers(new Set(followingUsers).add(targetUserId));

    try {
      const success = await followUser(profile.id, targetUserId);

      if (success) {
        setSuggestions(suggestions.filter((s) => s.id !== targetUserId));
        setPopularNearby(popularNearby.filter((p) => p.id !== targetUserId));
        setTrending(trending.filter((t) => t.id !== targetUserId));
      } else {
        throw new Error('Failed to follow');
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      const newFollowing = new Set(followingUsers);
      newFollowing.delete(targetUserId);
      setFollowingUsers(newFollowing);
    }
  };

  const renderSuggestionCard = (item: SuggestedFollower) => {
    const isProcessing = followingUsers.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.suggestionCard}
        onPress={() => onUserPress?.(item.id)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.cardName} numberOfLines={1}>
          {item.full_name}
        </Text>

        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.suggestion_reason}</Text>
        </View>

        {item.relevance_score > 150 && (
          <View style={styles.hotIndicator}>
            <Text style={styles.hotText}>🔥</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.followCardButton}
          onPress={() => handleFollow(item.id)}
          disabled={isProcessing}
        >
          <UserPlus size={16} color={colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderPopularCard = (item: PopularProvider) => {
    const isProcessing = followingUsers.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.popularCard}
        onPress={() => onUserPress?.(item.id)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={styles.cardName} numberOfLines={1}>
          {item.full_name}
        </Text>

        <View style={styles.ratingRow}>
          <Star size={12} color={colors.secondary} fill={colors.secondary} />
          <Text style={styles.ratingText}>
            {item.average_rating.toFixed(1)} ({item.total_reviews})
          </Text>
        </View>

        <View style={styles.distanceRow}>
          <MapPin size={12} color={colors.textSecondary} />
          <Text style={styles.distanceText}>{item.distance_km}km</Text>
        </View>

        <TouchableOpacity
          style={styles.followCardButton}
          onPress={() => handleFollow(item.id)}
          disabled={isProcessing}
        >
          <UserPlus size={16} color={colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderTrendingCard = (item: TrendingProvider) => {
    const isProcessing = followingUsers.has(item.id);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.trendingCard}
        onPress={() => onUserPress?.(item.id)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {item.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.trendingBadge}>
          <TrendingUp size={12} color={colors.white} />
          <Text style={styles.trendingBadgeText}>Trending</Text>
        </View>

        <Text style={styles.cardName} numberOfLines={1}>
          {item.full_name}
        </Text>

        <Text style={styles.trendingStats}>
          {item.recent_bookings_count} bookings
        </Text>

        <TouchableOpacity
          style={styles.followCardButton}
          onPress={() => handleFollow(item.id)}
          disabled={isProcessing}
        >
          <UserPlus size={16} color={colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const hasAnySuggestions =
    suggestions.length > 0 || popularNearby.length > 0 || trending.length > 0;

  if (!hasAnySuggestions) {
    return null;
  }

  return (
    <View style={styles.container}>
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Suggested For You</Text>
            <Text style={styles.sectionSubtitle}>
              Based on your interests and connections
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {suggestions.slice(0, 10).map(renderSuggestionCard)}
          </ScrollView>
        </View>
      )}

      {popularNearby.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Nearby</Text>
            <Text style={styles.sectionSubtitle}>
              Top-rated providers in your area
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {popularNearby.map(renderPopularCard)}
          </ScrollView>
        </View>
      )}

      {trending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <Text style={styles.sectionSubtitle}>
              Active providers in your categories
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {trending.map(renderTrendingCard)}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  suggestionCard: {
    width: 140,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  popularCard: {
    width: 140,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendingCard: {
    width: 140,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  cardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  cardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  cardBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  hotIndicator: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  hotText: {
    fontSize: 16,
  },
  trendingBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
  },
  trendingBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  trendingStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  followCardButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
