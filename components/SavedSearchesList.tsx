import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import {
  Search,
  Bell,
  BellOff,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import {
  getSavedSearches,
  deleteSavedSearch,
  toggleSearchActive,
  toggleSearchNotifications,
  updateSearchMatches,
  formatSearchCriteria,
  type SavedSearch,
} from '@/lib/saved-searches';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SavedSearchesListProps {
  onSearchPress?: (search: SavedSearch) => void;
  onCreatePress?: () => void;
}

export default function SavedSearchesList({
  onSearchPress,
  onCreatePress,
}: SavedSearchesListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadSearches();
  }, [user]);

  const loadSearches = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getSavedSearches(user.id);
      setSearches(data);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSearches();
    setRefreshing(false);
  };

  const handleSearchPress = (search: SavedSearch) => {
    if (onSearchPress) {
      onSearchPress(search);
    } else {
      // Navigate to search results
      router.push({
        pathname: '/search-results',
        params: { searchId: search.id },
      });
    }
  };

  const handleToggleActive = async (searchId: string, currentStatus: boolean) => {
    setUpdatingId(searchId);
    try {
      const result = await toggleSearchActive(searchId, !currentStatus);
      if (result.success) {
        setSearches(
          searches.map((s) =>
            s.id === searchId ? { ...s, is_active: !currentStatus } : s
          )
        );
      }
    } catch (error) {
      console.error('Error toggling search:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleNotifications = async (
    searchId: string,
    currentStatus: boolean
  ) => {
    setUpdatingId(searchId);
    try {
      const result = await toggleSearchNotifications(searchId, !currentStatus);
      if (result.success) {
        setSearches(
          searches.map((s) =>
            s.id === searchId ? { ...s, notification_enabled: !currentStatus } : s
          )
        );
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRefreshMatches = async (searchId: string) => {
    setUpdatingId(searchId);
    try {
      const result = await updateSearchMatches(searchId);
      if (result.success) {
        Alert.alert(
          'Matches Updated',
          `Found ${result.newMatches || 0} new matches`
        );
        await loadSearches();
      }
    } catch (error) {
      console.error('Error refreshing matches:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = (search: SavedSearch) => {
    Alert.alert(
      'Delete Saved Search',
      `Are you sure you want to delete "${search.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSavedSearch(search.id);
            if (result.success) {
              setSearches(searches.filter((s) => s.id !== search.id));
            }
          },
        },
      ]
    );
  };

  const renderSearchItem = ({ item }: { item: SavedSearch }) => {
    const isUpdating = updatingId === item.id;
    const criteriaText = formatSearchCriteria(item.search_criteria);
    const hasNewMatches = item.match_count > 0;

    return (
      <TouchableOpacity
        style={[styles.searchCard, !item.is_active && styles.searchCardInactive]}
        onPress={() => handleSearchPress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.searchHeader}>
          <View style={styles.searchIcon}>
            <Search size={20} color={item.is_active ? colors.primary : colors.textSecondary} />
          </View>
          <View style={styles.searchInfo}>
            <Text style={styles.searchName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.searchType}>{item.search_type}</Text>
          </View>
          {hasNewMatches && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{item.match_count}</Text>
            </View>
          )}
        </View>

        {/* Criteria */}
        <Text style={styles.criteria} numberOfLines={2}>
          {criteriaText}
        </Text>

        {/* Meta Info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Updated {new Date(item.updated_at).toLocaleDateString()}
          </Text>
          <Text style={styles.metaText}>
            Notifications: {item.notification_frequency}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Active Toggle */}
          <View style={styles.actionItem}>
            <Text style={styles.actionLabel}>Active</Text>
            <Switch
              value={item.is_active}
              onValueChange={() => handleToggleActive(item.id, item.is_active)}
              disabled={isUpdating}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Notification Toggle */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() =>
                handleToggleNotifications(item.id, item.notification_enabled)
              }
              disabled={isUpdating}
            >
              {item.notification_enabled ? (
                <Bell size={20} color={colors.primary} />
              ) : (
                <BellOff size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Refresh */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleRefreshMatches(item.id)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDelete(item)}
              disabled={isUpdating}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading saved searches...</Text>
      </View>
    );
  }

  if (searches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Search size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Saved Searches</Text>
        <Text style={styles.emptyText}>
          Save your searches to get notified when new matches are available
        </Text>
        {onCreatePress && (
          <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
            <Plus size={20} color={colors.white} />
            <Text style={styles.createButtonText}>Create Saved Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <FlatList
      data={searches}
      renderItem={renderSearchItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      ListHeaderComponent={
        onCreatePress ? (
          <TouchableOpacity
            style={styles.createButtonHeader}
            onPress={onCreatePress}
          >
            <Plus size={20} color={colors.primary} />
            <Text style={styles.createButtonHeaderText}>New Saved Search</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
  },
  createButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  createButtonHeaderText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  searchCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchCardInactive: {
    opacity: 0.6,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  searchIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  searchInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  searchType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  matchBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  matchBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  criteria: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: spacing.md,
  },
});
