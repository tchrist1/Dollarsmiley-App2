import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  AlertCircle,
  Clock,
  Users,
  Flag,
  CheckCircle,
  XCircle,
  ArrowUp,
} from 'lucide-react-native';
import {
  getModerationQueue,
  assignQueueItem,
  type QueueItem,
} from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AdminModerationQueueProps {
  onItemPress: (item: QueueItem) => void;
}

export default function AdminModerationQueue({
  onItemPress,
}: AdminModerationQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_review' | 'escalated'>('pending');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 20;

  useEffect(() => {
    loadQueue(true);
  }, [filter]);

  const loadQueue = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
      }

      const offset = reset ? 0 : page * LIMIT;
      const data = await getModerationQueue(
        {
          status: filter === 'all' ? undefined : filter,
        },
        LIMIT,
        offset
      );

      if (reset) {
        setItems(data);
      } else {
        setItems([...items, ...data]);
      }

      setHasMore(data.length === LIMIT);
      if (!reset) {
        setPage(page + 1);
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTakeItem = async (item: QueueItem) => {
    Alert.alert(
      'Take Item',
      'Assign this item to yourself for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take',
          onPress: async () => {
            const success = await assignQueueItem(item.id);
            if (success) {
              loadQueue(true);
            } else {
              Alert.alert('Error', 'Failed to assign item');
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (score: number) => {
    if (score >= 50) return colors.error;
    if (score >= 30) return colors.secondary;
    return colors.textSecondary;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color={colors.secondary} />;
      case 'in_review':
        return <AlertCircle size={16} color={colors.primary} />;
      case 'resolved':
        return <CheckCircle size={16} color={colors.success} />;
      case 'escalated':
        return <ArrowUp size={16} color={colors.error} />;
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: QueueItem }) => {
    const priorityColor = getPriorityColor(item.priority_score);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => onItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.headerLeft}>
            {getStatusIcon(item.status)}
            <Text style={styles.contentType}>{item.content_type}</Text>
            {item.auto_flagged && (
              <View style={styles.autoFlagBadge}>
                <Text style={styles.autoFlagText}>AUTO</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColor + '20' },
            ]}
          >
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {Math.round(item.priority_score)}
            </Text>
          </View>
        </View>

        <View style={styles.itemContent}>
          <Text style={styles.authorName} numberOfLines={1}>
            {item.author_profile.full_name}
          </Text>
          {item.author_profile.is_verified && (
            <Text style={styles.verifiedBadge}>✓</Text>
          )}
        </View>

        {item.report_categories && item.report_categories.length > 0 && (
          <View style={styles.categoriesRow}>
            {item.report_categories.slice(0, 3).map((cat, index) => (
              <View key={index} style={styles.categoryTag}>
                <Text style={styles.categoryIcon}>{cat.category_icon}</Text>
                <Text style={styles.categoryName}>{cat.category_name}</Text>
                {cat.report_count > 1 && (
                  <Text style={styles.categoryCount}>×{cat.report_count}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.itemFooter}>
          <View style={styles.footerLeft}>
            <Users size={14} color={colors.textSecondary} />
            <Text style={styles.footerText}>
              {item.total_reports} {item.total_reports === 1 ? 'report' : 'reports'}
            </Text>
            <Flag size={14} color={colors.textSecondary} />
            <Text style={styles.footerText}>
              {item.unique_reporters} {item.unique_reporters === 1 ? 'reporter' : 'reporters'}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {item.status === 'pending' && !item.assigned_to && (
          <TouchableOpacity
            style={styles.takeButton}
            onPress={() => handleTakeItem(item)}
          >
            <Text style={styles.takeButtonText}>Take Item</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {(['all', 'pending', 'in_review', 'escalated'] as const).map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.filterButton, filter === f && styles.filterButtonActive]}
          onPress={() => setFilter(f)}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === f && styles.filterButtonTextActive,
            ]}
          >
            {f.replace('_', ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <CheckCircle size={64} color={colors.success} />
      <Text style={styles.emptyTitle}>All Clear!</Text>
      <Text style={styles.emptyDescription}>
        No items in the moderation queue
      </Text>
    </View>
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        {renderFilters()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadQueue(true);
            }}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (hasMore && !loading) {
            loadQueue(false);
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={items.length === 0 && styles.emptyList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCard: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contentType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  autoFlagBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.secondary + '20',
    borderRadius: borderRadius.sm,
  },
  autoFlagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  priorityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  authorName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  verifiedBadge: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  categoryIcon: {
    fontSize: 12,
  },
  categoryName: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  categoryCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  takeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  takeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
