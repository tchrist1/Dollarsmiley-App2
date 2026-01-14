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
  userBooking?: {
    id: string;
    status: string;
    price: number;
    can_review: boolean;
    review_submitted: boolean;
  };
  userAcceptance?: {
    id: string;
    status: string;
  };
  booking?: {
    id: string;
    can_review: boolean;
    review_submitted: boolean;
    customer_id: string;
    customer: {
      full_name: string;
    };
  };
}

export default function MyAppliedJobsScreen() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'expired'>('active');
  const [metadataLoading, setMetadataLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchAppliedJobs();
    }
  }, [profile, filter]);

  // STAGE 1: Fetch core job data (critical - blocking)
  const fetchCoreJobs = async () => {
    if (!profile) return null;

    // Determine which statuses to fetch based on filter
    let statuses: string[] = [];
    if (filter === 'active') {
      statuses = ['Open', 'Booked'];
    } else if (filter === 'completed') {
      statuses = ['Completed'];
    } else if (filter === 'expired') {
      statuses = ['Expired', 'Cancelled'];
    }

    // Get all job IDs where user has bookings or acceptances
    const [
      { data: userBookings, error: bookingsError },
      { data: userAcceptances, error: acceptancesError }
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('job_id, id, status, provider_id, price')
        .eq('provider_id', profile.id),

      supabase
        .from('job_acceptances')
        .select('job_id, id, status, provider_id')
        .eq('provider_id', profile.id)
    ]);

    if (bookingsError) {
      console.error('Error fetching user bookings:', bookingsError);
    }

    if (acceptancesError) {
      console.error('Error fetching user acceptances:', acceptancesError);
    }

    // Combine job IDs from both sources
    const bookingJobIds = userBookings?.map(b => b.job_id).filter(Boolean) || [];
    const acceptanceJobIds = userAcceptances?.map(a => a.job_id).filter(Boolean) || [];
    const allProviderJobIds = Array.from(new Set([...bookingJobIds, ...acceptanceJobIds]));

    if (allProviderJobIds.length === 0) {
      return [];
    }

    // Fetch provider jobs
    let providerQuery = supabase
      .from('jobs')
      .select('*, categories(name)')
      .in('id', allProviderJobIds);

    if (statuses.length > 0) {
      providerQuery = providerQuery.in('status', statuses);
    }

    const { data: providerJobsData, error: providerError } = await providerQuery;

    if (providerError) {
      console.error('Error fetching provider jobs:', providerError);
      throw new Error(`Failed to fetch applied jobs: ${providerError.message}`);
    }

    // Prepare jobs with basic structure + user's booking/acceptance info
    const jobsData = providerJobsData || [];
    jobsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Attach user booking/acceptance info immediately (critical for visibility)
    return jobsData.map((job: any) => {
      const userBooking = userBookings?.find((b: any) => b.job_id === job.id);
      const userAcceptance = userAcceptances?.find((a: any) => a.job_id === job.id);

      return {
        ...job,
        userBooking: userBooking || null,
        userAcceptance: userAcceptance || null,
        booking: null,
      };
    });
  };

  // STAGE 2: Fetch metadata (deferred - non-blocking)
  const fetchJobMetadata = async (jobsData: any[]) => {
    if (!profile || jobsData.length === 0) return;

    try {
      setMetadataLoading(true);

      const jobIds = jobsData.map(j => j.id);

      // Fetch detailed booking information for completed jobs (for review)
      const { data: completedBookings, error: completedBookingsError } = await supabase
        .from('bookings')
        .select('*, customer:profiles!customer_id(full_name)')
        .in('job_id', jobIds)
        .eq('status', 'Completed')
        .eq('provider_id', profile.id);

      if (completedBookingsError) {
        console.error('Error fetching completed bookings:', completedBookingsError);
        return;
      }

      const allCompletedBookings = completedBookings || [];

      // Enrich jobs with metadata
      const enrichedJobs = jobsData.map((job: any) => {
        const completedBooking = allCompletedBookings.find((b: any) => b.job_id === job.id);

        return {
          ...job,
          booking: completedBooking || null,
        };
      });

      // Update jobs with metadata
      setJobs(enrichedJobs);
    } catch (error) {
      console.error('Error fetching job metadata:', error);
    } finally {
      setMetadataLoading(false);
    }
  };

  // Main fetch function coordinating two-stage loading
  const fetchAppliedJobs = async () => {
    if (!profile) return;

    setLoading(true);

    try {
      // STAGE 1: Fetch core jobs (blocking)
      const coreJobs = await fetchCoreJobs();

      if (!coreJobs) {
        throw new Error('Failed to fetch core jobs');
      }

      // Set jobs immediately - UI can render now
      setJobs(coreJobs as any);

      // Release loading state - UI renders
      setLoading(false);
      setRefreshing(false);

      // STAGE 2: Fetch metadata (non-blocking, deferred)
      setTimeout(() => {
        fetchJobMetadata(coreJobs);
      }, 50);

    } catch (error) {
      console.error('Unexpected error in fetchAppliedJobs:', error);
      Alert.alert(
        'Error Loading Jobs',
        'Failed to load your applied jobs. Please check your internet connection and try again.',
        [
          { text: 'Dismiss', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchAppliedJobs() },
        ]
      );
      setJobs([]);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAppliedJobs();
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

        <View style={styles.jobContent}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.jobDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.jobDetails}>
            <View style={styles.detailRow}>
              <DollarSign size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{formatBudget(item)}</Text>
            </View>

            {item.categories && (
              <View style={styles.detailRow}>
                <Text style={styles.categoryBadge}>{item.categories.name}</Text>
              </View>
            )}
          </View>

          <View style={styles.jobFooter}>
            <View style={styles.detailRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.dateText}>
                {new Date(item.execution_date_start).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {item.booking && item.booking.can_review && !item.booking.review_submitted && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/review/${item.booking!.id}` as any)}
            >
              <Star size={16} color={colors.primary} />
              <Text style={styles.reviewButtonText}>Leave a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Search size={48} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No Applied Jobs</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'active' && "You haven't applied to any active jobs yet"}
        {filter === 'completed' && "You don't have any completed jobs"}
        {filter === 'expired' && "You don't have any expired jobs"}
      </Text>
      {filter === 'active' && (
        <Button
          title="Browse Jobs"
          onPress={() => router.push('/jobs')}
          variant="primary"
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your applied jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Applied Jobs</Text>
        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={() => router.push('/analytics/job-analytics')}
        >
          <BarChart3 size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'expired' && styles.filterButtonActive]}
          onPress={() => setFilter('expired')}
        >
          <Text style={[styles.filterText, filter === 'expired' && styles.filterTextActive]}>
            Expired
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderJobCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
  },
  analyticsButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundAlt,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  list: {
    padding: spacing.lg,
  },
  emptyList: {
    flex: 1,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  quoteCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    color: colors.white,
  },
  jobContent: {
    padding: spacing.md,
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  jobDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  jobDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
  },
  categoryBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as any,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
  },
  reviewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
});
