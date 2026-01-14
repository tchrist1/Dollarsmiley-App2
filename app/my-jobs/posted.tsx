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

export default function MyPostedJobsScreen() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'expired'>('active');
  const [metadataLoading, setMetadataLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchPostedJobs();
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

    // Fetch jobs where user is the customer
    const { data: customerJobs, error: customerError } = await supabase
      .from('jobs')
      .select('*, categories(name)')
      .eq('customer_id', profile.id)
      .in('status', statuses.length > 0 ? statuses : ['Open', 'Booked', 'Completed', 'Expired', 'Cancelled'])
      .order('created_at', { ascending: false });

    if (customerError) {
      console.error('Error fetching posted jobs:', customerError);
      throw new Error(`Failed to fetch posted jobs: ${customerError.message}`);
    }

    // Prepare jobs with basic structure
    const jobsData = customerJobs || [];
    jobsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Return jobs with basic structure (no metadata yet)
    return jobsData.map((job: any) => ({
      ...job,
      bookings: [],
      acceptances: [],
      _count: {
        quotes: 0,
        acceptances: 0,
      },
      booking: null,
    }));
  };

  // STAGE 2: Fetch metadata (deferred - non-blocking)
  const fetchJobMetadata = async (jobsData: any[]) => {
    if (!profile || jobsData.length === 0) return;

    try {
      setMetadataLoading(true);

      const jobIds = jobsData.map(j => j.id);

      // Fetch detailed bookings and acceptances for all jobs
      const [
        { data: jobBookings, error: jobBookingsError },
        { data: jobAcceptances, error: jobAcceptancesError }
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, provider:profiles!provider_id(full_name)')
          .in('job_id', jobIds),

        supabase
          .from('job_acceptances')
          .select('*')
          .in('job_id', jobIds)
      ]);

      if (jobBookingsError) {
        console.error('Error fetching job bookings:', jobBookingsError);
        return;
      }

      if (jobAcceptancesError) {
        console.error('Error fetching job acceptances:', jobAcceptancesError);
        return;
      }

      const allJobBookings = jobBookings || [];
      const allJobAcceptances = jobAcceptances || [];

      // Enrich jobs with metadata
      const enrichedJobs = jobsData.map((job: any) => {
        const jobBookingsForJob = allJobBookings.filter((b: any) => b.job_id === job.id);
        const jobAcceptancesForJob = allJobAcceptances.filter((a: any) => a.job_id === job.id);

        // Calculate counts
        let quotes = 0;
        let acceptances = 0;

        if (job.pricing_type === 'quote_based') {
          quotes = jobBookingsForJob.filter((b: any) => b.status === 'Requested').length;
        } else if (job.pricing_type === 'fixed_price') {
          acceptances = jobAcceptancesForJob.filter((a: any) => a.status === 'pending').length;
        }

        const completedBooking = jobBookingsForJob.find((b: any) => b.status === 'Completed');

        return {
          ...job,
          bookings: jobBookingsForJob,
          acceptances: jobAcceptancesForJob,
          _count: {
            quotes,
            acceptances,
          },
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
  const fetchPostedJobs = async () => {
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
      console.error('Unexpected error in fetchPostedJobs:', error);
      Alert.alert(
        'Error Loading Jobs',
        'Failed to load your posted jobs. Please check your internet connection and try again.',
        [
          { text: 'Dismiss', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchPostedJobs() },
        ]
      );
      setJobs([]);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPostedJobs();
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

          {item.status === 'Open' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push(`/jobs/${item.id}/edit` as any)}
              >
                <Edit size={16} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </TouchableOpacity>

              {item.pricing_type === 'quote_based' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/my-jobs/${item.id}/quotes` as any)}
                >
                  <MessageCircle size={16} color={colors.white} />
                  <Text style={styles.primaryButtonText}>View Quotes</Text>
                </TouchableOpacity>
              )}

              {item.pricing_type === 'fixed_price' && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push(`/my-jobs/${item.id}/interested-providers` as any)}
                >
                  <CheckCircle size={16} color={colors.white} />
                  <Text style={styles.primaryButtonText}>View Interested</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <PlusCircle size={48} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No Posted Jobs</Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'active' && "You haven't posted any active jobs yet"}
        {filter === 'completed' && "You don't have any completed jobs"}
        {filter === 'expired' && "You don't have any expired or cancelled jobs"}
      </Text>
      {filter === 'active' && (
        <Button
          title="Post a Job"
          onPress={() => router.push('/post-job')}
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
        <Text style={styles.loadingText}>Loading your posted jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Posted Jobs</Text>
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
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundAlt,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.primary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.white,
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
