import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { getMutualFollows, type MutualFollow } from '@/lib/followers';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function MutualFollowsScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [mutuals, setMutuals] = useState<MutualFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    if (userId) {
      loadMutuals(true);
    }
  }, [userId]);

  const loadMutuals = async (reset: boolean = false) => {
    if (!userId) return;

    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      }

      const offset = reset ? 0 : page * LIMIT;
      const data = await getMutualFollows(userId, LIMIT, offset);

      if (reset) {
        setMutuals(data);
      } else {
        setMutuals([...mutuals, ...data]);
      }

      setHasMore(data.length === LIMIT);
      if (!reset) {
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error loading mutual follows:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUserPress = (selectedUserId: string) => {
    router.push(`/profile/${selectedUserId}`);
  };

  const renderMutual = ({ item }: { item: MutualFollow }) => (
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

          <Text style={styles.mutualSince}>
            Mutual since {new Date(item.mutual_since).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.mutualBadge}>
        <Users size={16} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>No mutual follows yet</Text>
      <Text style={styles.emptyDescription}>
        When you and another user follow each other, they'll appear here
      </Text>
    </View>
  );

  if (loading && mutuals.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Mutual Follows',
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
          title: 'Mutual Follows',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
        }}
      />
      <FlatList
        data={mutuals}
        keyExtractor={(item) => item.id}
        renderItem={renderMutual}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadMutuals(true);
        }}
        onEndReached={() => {
          if (hasMore && !loading) {
            loadMutuals(false);
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={mutuals.length === 0 && styles.emptyList}
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
  mutualSince: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  mutualBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
