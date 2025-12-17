import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { UserPlus, Users } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSuggestedUsersToFollow } from '@/lib/feed-filter';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SuggestedUser {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  posts_count: number;
}

interface EmptyFollowingFeedProps {
  onFollowUser?: () => void;
}

export default function EmptyFollowingFeed({ onFollowUser }: EmptyFollowingFeedProps) {
  const { profile } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  const loadSuggestedUsers = async () => {
    if (!profile?.id) return;

    try {
      const users = await getSuggestedUsersToFollow(profile.id, 5);
      setSuggestedUsers(users);
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!profile?.id || followingUsers.has(userId)) return;

    setFollowingUsers(new Set(followingUsers).add(userId));

    try {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: profile.id,
        following_id: userId,
      });

      if (error) throw error;

      if (onFollowUser) {
        onFollowUser();
      }
    } catch (error) {
      console.error('Error following user:', error);
      const newFollowing = new Set(followingUsers);
      newFollowing.delete(userId);
      setFollowingUsers(newFollowing);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.emptyState}>
        <View style={styles.iconContainer}>
          <Users size={64} color={colors.textSecondary} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Your Following Feed is Empty</Text>
        <Text style={styles.description}>
          Follow people to see their posts here. Start by following some suggested users
          below.
        </Text>
      </View>

      {suggestedUsers.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.sectionTitle}>Suggested for You</Text>

          {suggestedUsers.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>
                      {user.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View style={styles.userDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName}>{user.full_name}</Text>
                    {user.is_verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✓</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.userType}>
                    {user.user_type === 'provider' ? 'Service Provider' : 'User'}
                  </Text>

                  <View style={styles.stats}>
                    <Text style={styles.statText}>
                      {user.followers_count} {user.followers_count === 1 ? 'follower' : 'followers'}
                    </Text>
                    <Text style={styles.statDot}>•</Text>
                    <Text style={styles.statText}>
                      {user.posts_count} {user.posts_count === 1 ? 'post' : 'posts'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.followButton,
                  followingUsers.has(user.id) && styles.followingButton,
                ]}
                onPress={() => handleFollowUser(user.id)}
                disabled={followingUsers.has(user.id)}
              >
                <UserPlus
                  size={16}
                  color={followingUsers.has(user.id) ? colors.textSecondary : colors.white}
                />
                <Text
                  style={[
                    styles.followButtonText,
                    followingUsers.has(user.id) && styles.followingButtonText,
                  ]}
                >
                  {followingUsers.has(user.id) ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    padding: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  suggestionsSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
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
  avatarPlaceholderText: {
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
  },
  verifiedBadge: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statDot: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
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
