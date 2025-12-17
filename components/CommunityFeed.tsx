import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Star,
  MapPin,
  TrendingUp,
  HelpCircle,
  Lightbulb,
  Award,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  CommunityPost,
  getCommunityPosts,
  likePost,
  unlikePost,
  isPostLiked,
} from '@/lib/social';
import QuickReportButton from './QuickReportButton';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface CommunityFeedProps {
  userId?: string;
  postType?: string;
  limit?: number;
}

export function CommunityFeed({ userId, postType, limit = 20 }: CommunityFeedProps) {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
  }, [postType]);

  const fetchPosts = async () => {
    setLoading(true);
    const fetchedPosts = await getCommunityPosts(limit, 0, postType);
    setPosts(fetchedPosts);

    if (profile?.id) {
      const likedSet = new Set<string>();
      for (const post of fetchedPosts) {
        const liked = await isPostLiked(profile.id, post.id);
        if (liked) likedSet.add(post.id);
      }
      setLikedPosts(likedSet);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!profile?.id) return;

    const isLiked = likedPosts.has(postId);

    if (isLiked) {
      await unlikePost(postId);
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count: post.likes_count - 1 } : post
        )
      );
    } else {
      await likePost(postId);
      setLikedPosts((prev) => new Set(prev).add(postId));

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post
        )
      );
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'showcase':
        return <Star size={16} color={colors.warning} />;
      case 'question':
        return <HelpCircle size={16} color={colors.info} />;
      case 'tip':
        return <Lightbulb size={16} color={colors.secondary} />;
      case 'achievement':
        return <Award size={16} color={colors.success} />;
      default:
        return <TrendingUp size={16} color={colors.primary} />;
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'showcase':
        return 'Showcase';
      case 'question':
        return 'Question';
      case 'tip':
        return 'Pro Tip';
      case 'achievement':
        return 'Achievement';
      default:
        return 'Update';
    }
  };

  const renderPost = ({ item }: { item: CommunityPost }) => {
    const isLiked = likedPosts.has(item.id);
    const author = item.author;
    const primaryMedia = item.media_urls?.[0];

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => router.push(`/post/${item.id}` as any)}
        activeOpacity={0.98}
      >
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => router.push(`/profile/${author.id}` as any)}
          >
            <View style={styles.avatar}>
              {author.avatar_url ? (
                <Image source={{ uri: author.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {author.full_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <View style={styles.authorDetails}>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName}>{author.full_name}</Text>
                {author.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Star size={12} color={colors.white} fill={colors.white} />
                  </View>
                )}
              </View>
              <Text style={styles.postTime}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <View style={styles.postTypeContainer}>
              {getPostTypeIcon(item.post_type)}
              <Text style={styles.postTypeText}>{getPostTypeLabel(item.post_type)}</Text>
            </View>
            <QuickReportButton
              contentType="post"
              contentId={item.id}
              size={18}
              color={colors.textSecondary}
            />
          </View>
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        {primaryMedia && (
          <Image source={{ uri: primaryMedia }} style={styles.postImage} resizeMode="cover" />
        )}

        {item.listing && (
          <TouchableOpacity
            style={styles.listingCard}
            onPress={() => router.push(`/listing/${item.listing.id}`)}
          >
            <View style={styles.listingInfo}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {item.listing.title}
              </Text>
              <Text style={styles.listingPrice}>${item.listing.base_price}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
            activeOpacity={0.7}
          >
            <Heart
              size={20}
              color={isLiked ? colors.error : colors.textSecondary}
              fill={isLiked ? colors.error : 'none'}
            />
            <Text
              style={[styles.actionText, isLiked && { color: colors.error, fontWeight: '600' }]}
            >
              {item.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/post/${item.id}` as any)}
            activeOpacity={0.7}
          >
            <MessageCircle size={20} color={colors.textSecondary} />
            <Text style={styles.actionText}>{item.comments_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <Share2 size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading community posts...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <TrendingUp size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share something with the community!</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  postTypeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  postContent: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  listingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  listingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingTitle: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginRight: spacing.sm,
  },
  listingPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
