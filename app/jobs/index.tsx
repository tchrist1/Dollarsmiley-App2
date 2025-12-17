import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  TrendingUp,
  Briefcase,
  X,
  Search,
} from 'lucide-react-native';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';
import SaveJobButton from '@/components/SaveJobButton';

interface Job {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  execution_date_start: string;
  execution_date_end: string | null;
  preferred_time: string;
  status: string;
  created_at: string;
  customer: {
    full_name: string;
    rating_average: number;
    rating_count: number;
  };
  categories: {
    name: string;
    icon: string;
  };
}

export default function JobsScreen() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'nearby' | 'recent' | 'urgent'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const PAGE_SIZE = 20;

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchJobs(true);
  }, [filter, searchQuery]);

  const handleVoiceResults = (results: any[], query: string) => {
    if (results.length > 0) {
      setJobs(results);
      setSearchQuery(query);
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice search error:', error);
  };

  const handleImageResults = (matches: any[], analysis: any) => {
    if (matches.length > 0) {
      // Set the analysis description as the search query
      setSearchQuery(analysis.description || 'Image search results');
    }
  };

  const handleImageError = (error: string) => {
    console.error('Image search error:', error);
  };

  const fetchJobs = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setJobs([]);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    const currentPage = reset ? 0 : page;
    const offset = currentPage * PAGE_SIZE;

    let query = supabase
      .from('jobs')
      .select(
        `
        *,
        customer:profiles!jobs_customer_id_fkey(full_name, rating_average, rating_count),
        categories(name, icon)
      `,
        { count: 'exact' }
      )
      .eq('status', 'Open')
      .gte('execution_date_start', new Date().toISOString().split('T')[0]);

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    if (filter === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (filter === 'urgent') {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      query = query
        .lte('execution_date_start', threeDaysFromNow.toISOString().split('T')[0])
        .order('execution_date_start', { ascending: true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (data && !error) {
      if (reset) {
        setJobs(data as any);
        setPage(1);
      } else {
        setJobs((prev) => [...prev, ...(data as any)]);
        setPage((prev) => prev + 1);
      }

      setHasMore(data.length === PAGE_SIZE);
    }

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchJobs(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchJobs(true);
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const executionDate = new Date(dateString);
    const diffTime = executionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Budget not specified';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Budget not specified';
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    const daysUntil = getDaysUntil(item.execution_date_start);
    const isUrgent = daysUntil <= 3;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/jobs/${item.id}` as any)}
      >
        <View style={styles.jobHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.categories.name}</Text>
          </View>
          {isUrgent && (
            <View style={styles.urgentBadge}>
              <Clock size={12} color={colors.white} />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
          <View style={styles.saveButton}>
            <SaveJobButton jobId={item.id} size={20} />
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.jobDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.jobMeta}>
          <View style={styles.metaRow}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(item.execution_date_start).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.budgetContainer}>
            <DollarSign size={16} color={colors.primary} />
            <Text style={styles.budgetText}>{formatBudget(item.budget_min, item.budget_max)}</Text>
          </View>
          <View style={styles.timeContainer}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.timeText}>{item.preferred_time}</Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.customer.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.customer.full_name}</Text>
            {item.customer.rating_count > 0 && (
              <Text style={styles.customerRating}>
                ⭐ {item.customer.rating_average ? item.customer.rating_average.toFixed(1) : '0.0'} ({item.customer.rating_count || 0})
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Briefcase size={64} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No jobs available</Text>
      <Text style={styles.emptyText}>
        {filter === 'urgent'
          ? 'No urgent jobs at the moment'
          : filter === 'nearby'
          ? 'No jobs found in your area'
          : 'Check back soon for new opportunities'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Jobs</Text>
        <Text style={styles.subtitle}>Find opportunities that match your skills</Text>

        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <X size={16} color={colors.textLight} />
            </TouchableOpacity>
          )}
          <VoiceSearchButton
            searchType="jobs"
            onResults={handleVoiceResults}
            onError={handleVoiceError}
          />
          <ImageSearchButton
            onResults={handleImageResults}
            onError={handleImageError}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'recent' && styles.filterChipActive]}
          onPress={() => setFilter('recent')}
        >
          <TrendingUp size={16} color={filter === 'recent' ? colors.white : colors.textSecondary} />
          <Text style={[styles.filterText, filter === 'recent' && styles.filterTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'urgent' && styles.filterChipActive]}
          onPress={() => setFilter('urgent')}
        >
          <Clock size={16} color={filter === 'urgent' ? colors.white : colors.textSecondary} />
          <Text style={[styles.filterText, filter === 'urgent' && styles.filterTextActive]}>
            Urgent
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more jobs...</Text>
              </View>
            ) : !hasMore && jobs.length > 0 ? (
              <View style={styles.endReachedContainer}>
                <Text style={styles.endReachedText}>You've reached the end</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
  },
  clearButton: {
    padding: spacing.xs,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    gap: spacing.xs,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  listContainer: {
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
  saveButton: {
    marginLeft: 'auto',
  },
  categoryBadge: {
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
  jobMeta: {
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
  jobFooter: {
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  endReachedContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  endReachedText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});
