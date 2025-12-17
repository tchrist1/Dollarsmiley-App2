import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { UserPlus, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getEnhancedFollowSuggestions,
  followUser,
  type SuggestedFollower,
} from '@/lib/followers';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function SuggestionsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedFollower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (userId) {
      loadSuggestions();
    }
  }, [userId]);

  const loadSuggestions = async () => {
    if (!userId) return;

    try {
      const data = await getEnhancedFollowSuggestions(userId, 30);
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!profile?.id || followingUsers.has(targetUserId)) return;

    setFollowingUsers(new Set(followingUsers).add(targetUserId));

    try {
      const success = await followUser(profile.id, targetUserId);

      if (success) {
        setSuggestions(suggestions.filter((s) => s.id !== targetUserId));
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

  const handleUserPress = (selectedUserId: string) => {
    router.push(`/profile/${selectedUserId}`);
  };

  const renderSuggestion = ({ item }: { item: SuggestedFollower }) => {
    const isProcessing = followingUsers.has(item.id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => handleUserPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.full_name}
              </Text>
              {item.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>

            <Text style={styles.userType}>
              {item.user_type === 'provider' ? 'Service Provider' : 'User'}
            </Text>

            <View style={styles.suggestionInfo}>
              <Text style={styles.suggestionReason}>
                {item.suggestion_reason}
              </Text>
              {item.distance_km && (
                <Text style={styles.distanceText}>
                  {' • '}{item.distance_km}km away
                </Text>
              )}
            </View>

            {item.relevance_score > 100 && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>Hot</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.followButton}
          onPress={() => handleFollow(item.id)}
          disabled={isProcessing}
        >
          <UserPlus size={16} color={colors.white} />
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No suggestions</Text>
      <Text style={styles.emptyDescription}>
        Follow more people to get personalized suggestions based on mutual connections
      </Text>
    </View>
  );

  if (loading && suggestions.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Suggested For You',
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.white,
            },
            headerTintColor: colors.text,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Suggested For You',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
        }}
      />
      <FlatList
        data={suggestions}
        keyExtractor={(item) => item.id}
        renderItem={renderSuggestion}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadSuggestions();
        }}
        contentContainerStyle={suggestions.length === 0 && styles.emptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
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
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.xs,
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  userType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  suggestionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  suggestionReason: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  distanceText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  hotBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  hotBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  followButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
