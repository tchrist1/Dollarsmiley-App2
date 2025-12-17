import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { UserPlus, UserMinus, Search, Users, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface User {
  id: string;
  full_name: string;
  avatar_url?: string;
  user_type: string;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_followed_by: boolean;
  followed_at?: string;
}

interface FollowerFollowingListProps {
  userId: string;
  type: 'followers' | 'following';
  onUserPress?: (userId: string) => void;
}

export default function FollowerFollowingList({
  userId,
  type,
  onUserPress,
}: FollowerFollowingListProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [unfollowingUsers, setUnfollowingUsers] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    loadUsers(true);
  }, [userId, type, searchQuery]);

  const loadUsers = async (reset: boolean = false) => {
    if (!profile?.id) return;

    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      }

      const offset = reset ? 0 : page * LIMIT;
      const rpcFunction = type === 'followers' ? 'get_user_followers' : 'get_user_following';

      const { data, error } = await supabase.rpc(rpcFunction, {
        p_user_id: userId,
        p_current_user_id: profile.id,
        result_limit: LIMIT,
        result_offset: offset,
        search_query: searchQuery || null,
      });

      if (error) throw error;

      const newUsers = (data || []) as User[];

      if (reset) {
        setUsers(newUsers);
      } else {
        setUsers([...users, ...newUsers]);
      }

      setHasMore(newUsers.length === LIMIT);
      if (!reset) {
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!profile?.id || followingUsers.has(targetUserId)) return;

    setFollowingUsers(new Set(followingUsers).add(targetUserId));

    const optimisticUsers = users.map((u) =>
      u.id === targetUserId
        ? { ...u, is_following: true, followers_count: u.followers_count + 1 }
        : u
    );
    setUsers(optimisticUsers);

    try {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: profile.id,
        following_id: targetUserId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error following user:', error);
      const revertUsers = users.map((u) =>
        u.id === targetUserId
          ? { ...u, is_following: false, followers_count: u.followers_count - 1 }
          : u
      );
      setUsers(revertUsers);
      Alert.alert('Error', 'Failed to follow user');
    } finally {
      const newFollowing = new Set(followingUsers);
      newFollowing.delete(targetUserId);
      setFollowingUsers(newFollowing);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!profile?.id || unfollowingUsers.has(targetUserId)) return;

    setUnfollowingUsers(new Set(unfollowingUsers).add(targetUserId));

    const optimisticUsers = users.map((u) =>
      u.id === targetUserId
        ? { ...u, is_following: false, followers_count: Math.max(0, u.followers_count - 1) }
        : u
    );
    setUsers(optimisticUsers);

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', profile.id)
        .eq('following_id', targetUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      const revertUsers = users.map((u) =>
        u.id === targetUserId
          ? { ...u, is_following: true, followers_count: u.followers_count + 1 }
          : u
      );
      setUsers(revertUsers);
      Alert.alert('Error', 'Failed to unfollow user');
    } finally {
      const newUnfollowing = new Set(unfollowingUsers);
      newUnfollowing.delete(targetUserId);
      setUnfollowingUsers(newUnfollowing);
    }
  };

  const renderUser = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === profile?.id;
    const isProcessing = followingUsers.has(item.id) || unfollowingUsers.has(item.id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => onUserPress?.(item.id)}
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

            <View style={styles.stats}>
              <Text style={styles.statText}>
                {item.followers_count} {item.followers_count === 1 ? 'follower' : 'followers'}
              </Text>
              <Text style={styles.statDot}>•</Text>
              <Text style={styles.statText}>
                {item.following_count} following
              </Text>
            </View>

            {item.is_followed_by && item.is_following && (
              <View style={styles.mutualBadge}>
                <Users size={12} color={colors.textSecondary} />
                <Text style={styles.mutualText}>Mutual</Text>
              </View>
            )}
          </View>
        </View>

        {!isCurrentUser && (
          <View style={styles.actions}>
            {item.is_following ? (
              <TouchableOpacity
                style={styles.followingButton}
                onPress={() => handleUnfollow(item.id)}
                disabled={isProcessing}
              >
                <Check size={16} color={colors.textSecondary} />
                <Text style={styles.followingButtonText}>Following</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => handleFollow(item.id)}
                disabled={isProcessing}
              >
                <UserPlus size={16} color={colors.white} />
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${type}...`}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No users found' : `No ${type} yet`}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery
          ? 'Try a different search'
          : type === 'followers'
          ? "Users who follow this account will appear here"
          : 'Accounts followed by this user will appear here'}
      </Text>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadUsers(true);
        }}
        onEndReached={() => {
          if (hasMore && !loading) {
            loadUsers(false);
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={users.length === 0 && styles.emptyList}
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
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
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
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
  mutualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  mutualText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  followingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  followingButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
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
