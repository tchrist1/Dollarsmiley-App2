import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { UserPlus, Star, Briefcase } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowSuggestions, followUser, FollowSuggestion } from '@/lib/social';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface FollowSuggestionsProps {
  title?: string;
  limit?: number;
  horizontal?: boolean;
}

export function FollowSuggestions({
  title = 'Suggested Providers',
  limit = 5,
  horizontal = true,
}: FollowSuggestionsProps) {
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile?.id) {
      fetchSuggestions();
    }
  }, [profile]);

  const fetchSuggestions = async () => {
    if (!profile?.id) return;

    setLoading(true);
    const data = await getFollowSuggestions(profile.id, limit);
    setSuggestions(data);
    setLoading(false);
  };

  const handleFollow = async (userId: string) => {
    const success = await followUser(userId);

    if (success) {
      setFollowingIds((prev) => new Set(prev).add(userId));
      setSuggestions((prev) => prev.filter((s) => s.profile_id !== userId));
    }
  };

  const renderSuggestion = (suggestion: FollowSuggestion) => {
    const isFollowing = followingIds.has(suggestion.profile_id);

    return (
      <TouchableOpacity
        key={suggestion.profile_id}
        style={[styles.suggestionCard, horizontal && styles.suggestionCardHorizontal]}
        onPress={() => router.push(`/profile/${suggestion.profile_id}` as any)}
        activeOpacity={0.9}
      >
        <View style={styles.avatarContainer}>
          {suggestion.avatar_url ? (
            <Image source={{ uri: suggestion.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {suggestion.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {suggestion.is_verified && (
            <View style={styles.verifiedBadge}>
              <Star size={12} color={colors.white} fill={colors.white} />
            </View>
          )}
        </View>

        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionName} numberOfLines={1}>
            {suggestion.full_name}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={styles.statText}>{suggestion.rating_average.toFixed(1)}</Text>
            </View>
            <View style={styles.statItem}>
              <Briefcase size={12} color={colors.textSecondary} />
              <Text style={styles.statText}>{suggestion.total_bookings}</Text>
            </View>
          </View>

          {suggestion.mutual_followers_count > 0 && (
            <Text style={styles.mutualText}>
              {suggestion.mutual_followers_count} mutual connection
              {suggestion.mutual_followers_count > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={(e) => {
            e.stopPropagation();
            if (!isFollowing) {
              handleFollow(suggestion.profile_id);
            }
          }}
          activeOpacity={0.7}
        >
          <UserPlus size={16} color={isFollowing ? colors.textSecondary : colors.white} />
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
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

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {suggestions.map(renderSuggestion)}
        </ScrollView>
      ) : (
        <View style={styles.verticalList}>{suggestions.map(renderSuggestion)}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  verticalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  suggestionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  suggestionCardHorizontal: {
    width: 280,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  mutualText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  followingButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
});
