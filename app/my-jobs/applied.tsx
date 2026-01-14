import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Eye,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  BarChart3,
  GitBranch,
} from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  pricing_type: 'quote_based' | 'fixed_price';
  fixed_price: number | null;
  location: string;
  execution_date_start: string;
  preferred_time: string;
  status: string;
  created_at: string;
  categories: {
    name: string;
  };
  userAcceptance?: any;
  userBooking?: any;
}

export default function MyAppliedJobsScreen() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'expired'>('active');

  useEffect(() => {
    if (profile) {
      fetchJobs();
    }
  }, [profile, filter]);

  const fetchJobs = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      let statuses: string[] = [];
      if (filter === 'active') {
        statuses = ['Open', 'Booked'];
      } else if (filter === 'completed') {
        statuses = ['Completed'];
      } else if (filter === 'expired') {
        statuses = ['Expired', 'Cancelled'];
      }

      const { data: jobParticipations, error } = await supabase
        .rpc('get_my_applied_jobs', {
          status_filter: statuses.length > 0 ? statuses : null
        });

      if (error) {
        console.error('Error fetching applied jobs:', error);
        throw new Error(`Failed to fetch applied jobs: ${error.message}`);
      }

      const jobsWithFormatting = (jobParticipations || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        budget_min: job.budget_min,
        budget_max: job.budget_max,
        pricing_type: job.pricing_type,
        fixed_price: job.fixed_price,
        location: job.location,
        execution_date_start: job.execution_date_start,
        preferred_time: job.preferred_time,
        status: job.status,
        created_at: job.created_at,
        categories: {
          name: job.category_name
        },
        userBooking: job.user_booking,
        userAcceptance: job.user_acceptance,
      }));

      setJobs(jobsWithFormatting as any);
    } catch (error) {
      console.error('Unexpected error in fetchJobs:', error);
      Alert.alert(
        'Error Loading Jobs',
        'Failed to load your applied jobs. Please check your internet connection and try again.',
        [
          { text: 'Dismiss', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchJobs() },
        ]
      );
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return colors.success;
      case 'Booked':
        return colors.primary;
      case 'Completed':
        return colors.success;
      case 'Expired':
        return colors.textLight;
      case 'Cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <Eye size={14} color={colors.success} />;
      case 'Booked':
        return <CheckCircle size={14} color={colors.primary} />;
      case 'Completed':
        return <CheckCircle size={14} color={colors.success} />;
      case 'Expired':
        return <XCircle size={14} color={colors.textLight} />;
      case 'Cancelled':
        return <XCircle size={14} color={colors.error} />;
      default:
        return <AlertCircle size={14} color={colors.textSecondary} />;
    }
  };

  const formatBudget = (job: Job) => {
    if (job.pricing_type === 'fixed_price' && job.fixed_price) {
      return `$${Math.round(job.fixed_price).toLocaleString('en-US')} (Fixed)`;
    }
    const { budget_min, budget_max } = job;
    if (!budget_min && !budget_max) return 'Flexible';
    if (budget_min && budget_max) return `$${budget_min}-$${budget_max}`;
    if (budget_min) return `$${budget_min}+`;
    if (budget_max) return `Up to $${budget_max}`;
    return 'Flexible';
  };

  const renderJobCard = ({ item }: { item: Job }) => {
    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/jobs/${item.id}` as any)}
      >
        <View style={styles.jobHeader}>
          <View style={styles.statusContainer}>
            {getStatusIcon(item.status)}
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
          <View style={styles.badgesContainer}>
            {item.userBooking && item.pricing_type === 'quote_based' && (
              <View style={[styles.quoteBadge, { backgroundColor: colors.info }]}>
                <MessageCircle size={12} color={colors.white} />
                <Text style={styles.quoteCount}>Quote Sent</Text>
              </View>
            )}
            {item.userAcceptance && item.pricing_type === 'fixed_price' && (
              <View style={[
                styles.quoteBadge,
                item.userAcceptance.status === 'awarded' && { backgroundColor: colors.success },
                item.userAcceptance.status === 'pending' && { backgroundColor: colors.warning },
                item.userAcceptance.status === 'rejected' && { backgroundColor: colors.error },
              ]}>
                <CheckCircle size={12} color={colors.white} />
                <Text style={styles.quoteCount}>
                  {item.userAcceptance.status === 'awarded' ? 'Awarded' :
                   item.userAcceptance.status === 'pending' ? 'Pending' : 'Rejected'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.jobTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.categoryText}>{item.categories.name}</Text>

        <View style={styles.jobMeta}>
          <View style={styles.metaRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(item.execution_date_start).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{item.preferred_time}</Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.budgetContainer}>
            <DollarSign size={16} color={colors.primary} />
            <Text style={styles.budgetText}>{formatBudget(item)}</Text>
          </View>
          <View style={styles.locationContainer}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          {item.status === 'Open' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.timelineButtonFull}
                onPress={() => router.push(`/jobs/${item.id}/timeline` as any)}
              >
                <GitBranch size={16} color={colors.textSecondary} />
                <Text style={styles.timelineText} numberOfLines={1}>Timeline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status !== 'Open' && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.timelineButtonFull}
                onPress={() => router.push(`/jobs/${item.id}/timeline` as any)}
              >
                <GitBranch size={16} color={colors.textSecondary} />
                <Text style={styles.timelineText} numberOfLines={1}>Timeline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const getEmptyStateText = () => {
      if (filter === 'active') {
        return 'No active job applications';
      } else if (filter === 'completed') {
        return 'No completed jobs';
      } else {
        return 'No expired or cancelled jobs';
      }
    };

    const getEmptyStateDescription = () => {
      if (filter === 'active') {
        return 'Jobs you apply to or get booked for will appear here';
      } else if (filter === 'completed') {
        return 'Your completed jobs will appear here';
      } else {
        return 'Expired and cancelled jobs will be listed here';
      }
    };

    return (
      <View style={styles.emptyState}>
        <Search size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>{getEmptyStateText()}</Text>
        <Text style={styles.emptyText}>{getEmptyStateDescription()}</Text>
        {filter === 'active' && (
          <Button
            title="Find Jobs"
            onPress={() => router.push('/jobs')}
            style={styles.emptyButton}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Applied Jobs</Text>
          <Text style={styles.subtitle}>Jobs you applied to</Text>
        </View>
        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={() => router.push('/analytics/job-analytics' as any)}
        >
          <BarChart3 size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'expired' && styles.filterChipActive]}
          onPress={() => setFilter('expired')}
        >
          <Text style={[styles.filterText, filter === 'expired' && styles.filterTextActive]}>
            Expired
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your applied jobs...</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  analyticsButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  quoteCount: {
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
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginLeft: spacing.md,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  actionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 40,
  },
  timelineText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
  emptyButton: {
    marginTop: spacing.md,
  },
});
