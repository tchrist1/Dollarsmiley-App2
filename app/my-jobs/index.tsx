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
  PlusCircle,
  BarChart3,
  GitBranch,
  Edit,
  Star,
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
  _count?: {
    quotes: number;
    acceptances: number;
  };
  booking?: {
    id: string;
    can_review: boolean;
    review_submitted: boolean;
    provider_id: string;
    provider: {
      full_name: string;
    };
  };
}

interface Quote {
  id: string;
  price: number;
  status: string;
  provider: {
    full_name: string;
    rating_average: number;
    rating_count: number;
  };
}

export default function MyJobsScreen() {
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

    let query = supabase
      .from('jobs')
      .select(
        `
        *,
        categories(name),
        bookings(
          id,
          can_review,
          review_submitted,
          provider_id,
          status,
          provider:profiles!provider_id(full_name)
        )
      `
      )
      .eq('customer_id', profile.id);

    if (filter === 'active') {
      query = query.in('status', ['Open', 'Booked']);
    } else if (filter === 'completed') {
      query = query.eq('status', 'Completed');
    } else if (filter === 'expired') {
      query = query.eq('status', 'Expired');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (data && !error) {
      const jobsWithCounts = await Promise.all(
        data.map(async (job: any) => {
          let quotes = 0;
          let acceptances = 0;

          if (job.pricing_type === 'quote_based') {
            const { count } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id)
              .eq('status', 'Requested');
            quotes = count || 0;
          } else if (job.pricing_type === 'fixed_price') {
            const { count } = await supabase
              .from('job_acceptances')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id)
              .eq('status', 'pending');
            acceptances = count || 0;
          }

          const completedBooking = job.bookings?.find((b: any) => b.status === 'Completed');

          return {
            ...job,
            _count: {
              quotes,
              acceptances,
            },
            booking: completedBooking || null,
          };
        })
      );

      setJobs(jobsWithCounts as any);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const handleCancelJob = async (jobId: string) => {
    Alert.alert('Cancel Job', 'Are you sure you want to cancel this job posting?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('jobs')
            .update({ status: 'Cancelled' })
            .eq('id', jobId);

          if (error) {
            Alert.alert('Error', 'Failed to cancel job. Please try again.');
          } else {
            Alert.alert('Success', 'Job has been cancelled successfully.');
            fetchJobs();
          }
        },
      },
    ]);
  };

  const handleViewQuotes = (jobId: string) => {
    router.push(`/my-jobs/${jobId}/quotes` as any);
  };

  const handleViewInterestedProviders = (jobId: string) => {
    router.push(`/my-jobs/${jobId}/interested-providers` as any);
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

  const renderJobCard = ({ item }: { item: Job }) => (
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
        {item._count && item._count.quotes > 0 && (
          <View style={styles.quoteBadge}>
            <MessageCircle size={12} color={colors.white} />
            <Text style={styles.quoteCount}>{item._count.quotes} quote{item._count.quotes > 1 ? 's' : ''}</Text>
          </View>
        )}
        {item._count && item._count.acceptances > 0 && (
          <View style={styles.quoteBadge}>
            <CheckCircle size={12} color={colors.white} />
            <Text style={styles.quoteCount}>{item._count.acceptances} interested</Text>
          </View>
        )}
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
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/jobs/${item.id}/edit` as any)}
              >
                <Edit size={16} color={colors.primary} />
                <Text style={styles.editButtonText} numberOfLines={1}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timelineButton}
                onPress={() => router.push(`/jobs/${item.id}/timeline` as any)}
              >
                <GitBranch size={16} color={colors.textSecondary} />
                <Text style={styles.timelineText} numberOfLines={1}>Timeline</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              {item.pricing_type === 'quote_based' && item._count && item._count.quotes > 0 && (
                <TouchableOpacity
                  style={styles.viewProvidersButton}
                  onPress={() => handleViewQuotes(item.id)}
                >
                  <MessageCircle size={16} color={colors.primary} />
                  <Text style={styles.viewProvidersText} numberOfLines={1}>View Quotes</Text>
                </TouchableOpacity>
              )}
              {item.pricing_type === 'fixed_price' && item._count && item._count.acceptances > 0 && (
                <TouchableOpacity
                  style={styles.viewProvidersButton}
                  onPress={() => handleViewInterestedProviders(item.id)}
                >
                  <CheckCircle size={16} color={colors.primary} />
                  <Text style={styles.viewProvidersText} numberOfLines={1}>Providers</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelJob(item.id)}
              >
                <Text style={styles.cancelText} numberOfLines={1}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
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
            {item.status === 'Completed' && item.booking && item.booking.can_review && !item.booking.review_submitted && (
              <TouchableOpacity
                style={styles.rateProviderButton}
                onPress={() => router.push(`/review/${item.booking!.id}` as any)}
              >
                <Star size={16} color={colors.warning} />
                <Text style={styles.rateProviderText} numberOfLines={1}>Rate Provider</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PlusCircle size={64} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No jobs {filter === 'active' ? 'posted' : filter}</Text>
      <Text style={styles.emptyText}>
        {filter === 'active'
          ? 'Post a job to get quotes from local service providers'
          : filter === 'completed'
          ? 'Your completed jobs will appear here'
          : 'Expired jobs will be listed here'}
      </Text>
      {filter === 'active' && (
        <Button
          title="Post a Job"
          onPress={() => router.push('/(tabs)/post-job')}
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Jobs</Text>
          <Text style={styles.subtitle}>Track and manage your job postings</Text>
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
          <Text style={styles.loadingText}>Loading your jobs...</Text>
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
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 40,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  timelineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 40,
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
  rateProviderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 40,
  },
  rateProviderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  viewProvidersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 40,
  },
  viewProvidersText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    minHeight: 40,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    textAlign: 'center',
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
