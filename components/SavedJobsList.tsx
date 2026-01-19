import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import {
  Bookmark,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  AlertCircle,
  Trash2,
  Search,
  Filter,
  X,
  TrendingUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import {
  getSavedJobs,
  searchSavedJobs,
  filterSavedJobsByStatus,
  removeSavedJob,
  formatJobBudget,
  getDaysUntilExecution,
  isJobUrgent,
  isJobExpired,
  formatExecutionDate,
  getTimeSinceSaved,
  type SavedJob,
} from '@/lib/saved-jobs';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface SavedJobsListProps {
  onJobPress?: (job: SavedJob) => void;
}

export default function SavedJobsList({ onJobPress }: SavedJobsListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<SavedJob[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Closed'>('all');

  useEffect(() => {
    loadJobs();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchQuery, statusFilter]);

  const loadJobs = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getSavedJobs(user.id, 100, 0);
      setJobs(data);
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const applyFilters = async () => {
    let filtered = jobs;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(queryLower) ||
          job.description.toLowerCase().includes(queryLower) ||
          job.category_name.toLowerCase().includes(queryLower) ||
          job.location.toLowerCase().includes(queryLower)
      );
    }

    setFilteredJobs(filtered);
  };

  const handleJobPress = (job: SavedJob) => {
    if (onJobPress) {
      onJobPress(job);
    } else {
      router.push(`/jobs/${job.job_id}` as any);
    }
  };

  const handleRemove = (job: SavedJob) => {
    Alert.alert(
      'Remove Saved Job',
      `Remove "${job.title}" from your saved jobs?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            const result = await removeSavedJob(user.id, job.job_id);
            if (result.success) {
              setJobs(jobs.filter((j) => j.saved_job_id !== job.saved_job_id));
              Alert.alert('Success', 'Job removed from saved list');
            } else {
              Alert.alert('Error', result.error || 'Failed to remove job');
            }
          },
        },
      ]
    );
  };

  const renderJobCard = ({ item }: { item: SavedJob }) => {
    const daysUntil = getDaysUntilExecution(item.execution_date_start);
    const isUrgent = isJobUrgent(item.execution_date_start);
    const expired = isJobExpired(item.execution_date_start, item.status);
    const timeSaved = getTimeSinceSaved(item.saved_at);

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => handleJobPress(item)}
      >
        {/* Header */}
        <View style={styles.jobHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category_name}</Text>
          </View>
          {isUrgent && !expired && (
            <View style={styles.urgentBadge}>
              <Clock size={12} color={colors.white} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
          {expired && (
            <View style={styles.expiredBadge}>
              <AlertCircle size={12} color={colors.white} />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
          <View style={styles.savedIndicator}>
            <Bookmark size={16} color={colors.primary} fill={colors.primary} />
          </View>
        </View>

        {/* Title & Description */}
        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.jobDescription} numberOfLines={3}>
          {item.description}
        </Text>

        {/* Meta Info */}
        <View style={styles.metaContainer}>
          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {formatExecutionDate(item.execution_date_start)}
            </Text>
          </View>
        </View>

        {/* Budget & Time */}
        <View style={styles.footerContainer}>
          <View style={styles.budgetContainer}>
            <DollarSign size={16} color={colors.primary} />
            <Text style={styles.budgetText}>
              {formatJobBudget(item.budget_min, item.budget_max)}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>{item.preferred_time}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.customer_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customer_name}</Text>
            {item.customer_rating && (
              <Text style={styles.customerRating}>
                ⭐ {item.customer_rating.toFixed(1)}
              </Text>
            )}
          </View>
          <Text style={styles.savedTime}>{timeSaved}</Text>
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Your Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(item)}
          >
            <Trash2 size={18} color={colors.error} />
            <Text style={styles.actionButtonTextDanger}>Remove</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading saved jobs...</Text>
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Bookmark size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Saved Jobs</Text>
        <Text style={styles.emptyText}>
          Browse jobs and tap the bookmark icon to save them for later
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search saved jobs..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text
            style={[styles.filterText, statusFilter === 'all' && styles.filterTextActive]}
          >
            All ({jobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'Open' && styles.filterChipActive]}
          onPress={() => setStatusFilter('Open')}
        >
          <Text
            style={[styles.filterText, statusFilter === 'Open' && styles.filterTextActive]}
          >
            Open ({jobs.filter((j) => j.status === 'Open').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, statusFilter === 'Closed' && styles.filterChipActive]}
          onPress={() => setStatusFilter('Closed')}
        >
          <Text
            style={[styles.filterText, statusFilter === 'Closed' && styles.filterTextActive]}
          >
            Closed ({jobs.filter((j) => j.status === 'Closed').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
        </Text>
      </View>

      {/* Job List */}
      <FlatList
        data={filteredJobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.saved_job_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyFilterContainer}>
            <Filter size={48} color={colors.textSecondary} />
            <Text style={styles.emptyFilterTitle}>No Results</Text>
            <Text style={styles.emptyFilterText}>
              Try adjusting your filters or search query
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  resultsHeader: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  resultsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  categoryBadge: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  urgentText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  expiredText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  savedIndicator: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  jobDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  budgetText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  customerRating: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  savedTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  notesContainer: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  notesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionButtonTextDanger: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  emptyFilterContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyFilterTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyFilterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
