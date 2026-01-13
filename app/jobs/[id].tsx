import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigation-utils';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { trackJobView } from '@/lib/job-analytics';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  User,
  Star,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  AlertCircle,
  Edit,
} from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  description: string;
  pricing_type: 'fixed_price' | 'quote_based';
  fixed_price?: number;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  execution_date_start: string;
  execution_date_end: string | null;
  preferred_time: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  estimated_duration_hours: number | null;
  status: string;
  photos: any;
  created_at: string;
  customer_id: string;
  customer: {
    id: string;
    full_name: string;
    rating_average: number;
    rating_count: number;
    total_bookings: number;
    user_type: string;
  };
  categories: {
    name: string;
    icon: string;
  };
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [acceptanceCount, setAcceptanceCount] = useState(0);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select(
        `
        *,
        customer:profiles!jobs_customer_id_fkey(
          id,
          full_name,
          rating_average,
          rating_count,
          total_bookings,
          user_type
        ),
        categories(name, icon)
      `
      )
      .eq('id', id)
      .single();

    if (data && !error) {
      setJob(data as any);
      if (data.photos) {
        try {
          let parsedPhotos: string[] = [];
          if (Array.isArray(data.photos)) {
            parsedPhotos = data.photos.filter((p: any) => typeof p === 'string' && p.trim() !== '');
          } else if (typeof data.photos === 'string') {
            try {
              const parsed = JSON.parse(data.photos);
              parsedPhotos = Array.isArray(parsed) ? parsed.filter((p: any) => typeof p === 'string' && p.trim() !== '') : [];
            } catch (e) {
              if (data.photos.trim() !== '') {
                parsedPhotos = [data.photos];
              }
            }
          }
          setPhotos(parsedPhotos);
        } catch (e) {
          setPhotos([]);
        }
      }

      // Track job view for analytics
      if (profile) {
        const viewerType = profile.user_type === 'Provider' || profile.user_type === 'Hybrid' ? 'provider' : 'customer';
        trackJobView(String(id), profile.id, viewerType);
      } else {
        trackJobView(String(id), undefined, 'guest');
      }

      // Check if provider has already accepted this fixed-price job
      if (profile && data.pricing_type === 'fixed_price') {
        const { data: acceptance } = await supabase
          .from('job_acceptances')
          .select('*')
          .eq('job_id', id)
          .eq('provider_id', profile.id)
          .maybeSingle();

        setHasAccepted(!!acceptance);

        // Get total acceptance count
        const { count } = await supabase
          .from('job_acceptances')
          .select('*', { count: 'exact', head: true })
          .eq('job_id', id)
          .eq('status', 'pending');

        setAcceptanceCount(count || 0);
      }
    }

    setLoading(false);
  };

  const handleAcceptFixedPriceJob = async () => {
    if (!profile || !job) return;

    Alert.alert(
      'Accept Job',
      `Accept this job for ${formatCurrency(job.fixed_price)}?\n\nThe customer will review all interested providers and choose one.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Job',
          onPress: async () => {
            setSubmitting(true);

            const { error } = await supabase.from('job_acceptances').insert({
              job_id: job.id,
              provider_id: profile.id,
              message: `I'm interested in this job at the fixed price of ${formatCurrency(job.fixed_price)}`,
            });

            setSubmitting(false);

            if (error) {
              if (error.code === '23505') {
                Alert.alert('Already Accepted', 'You have already accepted this job.');
              } else {
                Alert.alert('Error', 'Failed to accept job. Please try again.');
              }
            } else {
              Alert.alert(
                'Success',
                'You have accepted this job! The customer will review all interested providers and make a selection.'
              );
              setHasAccepted(true);
              setAcceptanceCount((prev) => prev + 1);
            }
          },
        },
      ]
    );
  };

  const handleSendQuote = () => {
    if (!profile || !job) return;
    router.push(`/jobs/${id}/send-quote` as any);
  };

  const handleContactCustomer = () => {
    Alert.alert(
      'Contact Customer',
      'Messaging feature will be available once you send a quote or the customer accepts your booking request.',
      [{ text: 'OK' }]
    );
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Budget flexible';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Budget flexible';
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const executionDate = new Date(dateString);
    const diffTime = executionDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorText}>Job not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  const daysUntil = getDaysUntil(job.execution_date_start);
  const isUrgent = daysUntil <= 3;
  const isOwnJob = profile?.id === job.customer_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.jobHeader}>
          <View style={styles.headerRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{job.categories.name}</Text>
            </View>
            {isUrgent && (
              <View style={styles.urgentBadge}>
                <Clock size={12} color={colors.white} />
                <Text style={styles.urgentText}>Urgent - {daysUntil}d</Text>
              </View>
            )}
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.postedDate}>
            Posted {new Date(job.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Photos</Text>
            <ScrollView horizontal style={styles.photosContainer} showsHorizontalScrollIndicator={false}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <DollarSign size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {job.pricing_type === 'fixed_price' ? 'Fixed Price' : 'Budget'}
                </Text>
                <Text style={styles.detailValue}>
                  {job.pricing_type === 'fixed_price' && job.fixed_price
                    ? formatCurrency(job.fixed_price)
                    : formatBudget(job.budget_min, job.budget_max)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Calendar size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date Needed</Text>
                <Text style={styles.detailValue}>
                  {new Date(job.execution_date_start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Clock size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  {job.time_window_start && job.time_window_end ? 'Specific Time Slot' : 'Preferred Time'}
                </Text>
                <Text style={styles.detailValue}>
                  {job.time_window_start && job.time_window_end
                    ? `${job.time_window_start} - ${job.time_window_end}`
                    : job.preferred_time || 'Flexible'}
                </Text>
              </View>
            </View>

            {job.estimated_duration_hours && (
              <View style={styles.detailRow}>
                <Clock size={20} color={colors.primary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Estimated Duration</Text>
                  <Text style={styles.detailValue}>
                    {`${job.estimated_duration_hours} ${job.estimated_duration_hours === 1 ? 'hour' : 'hours'}`}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailRow}>
              <MapPin size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                {!isOwnJob && profile?.user_type === 'Customer' ? (
                  <View>
                    <Text style={styles.detailValue}>
                      {job.location.split(',').slice(-2).join(',').trim() || job.location}
                    </Text>
                    <View style={styles.locationHiddenBanner}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={styles.locationHiddenText}>
                        Exact location hidden. You must be a Provider to view precise addresses.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.detailValue}>{job.location}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted By</Text>
          <TouchableOpacity
            style={styles.customerCard}
            onPress={() => {
              // Route based on user type
              // Providers and Hybrids → Store Front
              // Customers → Job Board
              if (job.customer.user_type === 'Provider' || job.customer.user_type === 'Hybrid') {
                router.push(`/provider/store/${job.customer_id}` as any);
              } else {
                router.push(`/customer/job-board/${job.customer_id}` as any);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{job.customer.full_name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{job.customer.full_name}</Text>
              {job.customer.rating_count > 0 ? (
                <View style={styles.ratingRow}>
                  <Star size={14} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.ratingText}>
                    {job.customer.rating_average ? job.customer.rating_average.toFixed(1) : '0.0'} ({job.customer.rating_count || 0} reviews)
                  </Text>
                </View>
              ) : (
                <Text style={styles.newUserText}>New user</Text>
              )}
              {job.customer.total_bookings > 0 && (
                <Text style={styles.bookingsText}>{job.customer.total_bookings} completed bookings</Text>
              )}
            </View>
            <View style={styles.viewJobBoardButton}>
              <Text style={styles.viewJobBoardText}>
                {job.customer.user_type === 'Provider' || job.customer.user_type === 'Hybrid'
                  ? 'View Store'
                  : 'View Jobs'}
              </Text>
              <ArrowRight size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {!isOwnJob && profile?.user_type !== 'Customer' && (
          <View style={styles.actionSection}>
            {job?.pricing_type === 'fixed_price' ? (
              <>
                <View style={styles.fixedPriceInfo}>
                  <DollarSign size={24} color={colors.success} />
                  <View style={styles.fixedPriceTextContainer}>
                    <Text style={styles.fixedPriceLabel}>Fixed Price Job</Text>
                    <Text style={styles.fixedPriceAmount}>{formatCurrency(job.fixed_price)}</Text>
                  </View>
                </View>
                {acceptanceCount > 0 && (
                  <Text style={styles.acceptanceCount}>
                    {acceptanceCount} {acceptanceCount === 1 ? 'provider has' : 'providers have'} already accepted
                  </Text>
                )}
                <Button
                  title={hasAccepted ? 'Already Accepted' : `Accept Job for ${formatCurrency(job.fixed_price)}`}
                  onPress={handleAcceptFixedPriceJob}
                  loading={submitting}
                  disabled={hasAccepted}
                  style={styles.actionButton}
                  leftIcon={<DollarSign size={20} color={colors.white} />}
                />
                {hasAccepted && (
                  <Text style={styles.acceptedText}>
                    You've accepted this job. The customer will review all interested providers.
                  </Text>
                )}
              </>
            ) : (
              <Button
                title="Send Quote"
                onPress={handleSendQuote}
                style={styles.actionButton}
              />
            )}
            <Button
              title="Contact Customer"
              onPress={handleContactCustomer}
              variant="outline"
              style={styles.actionButton}
              leftIcon={<MessageCircle size={20} color={colors.primary} />}
            />
          </View>
        )}

        {!isOwnJob && profile?.user_type === 'Customer' && (
          <View style={styles.actionSection}>
            <View style={styles.customerViewNotice}>
              <AlertCircle size={20} color={colors.primary} />
              <Text style={styles.customerViewText}>
                You must be a Provider to accept or book jobs.
              </Text>
            </View>
          </View>
        )}

        {isOwnJob && (
          <View style={styles.actionSection}>
            <Button
              title="Edit Job"
              onPress={() => router.push(`/jobs/${id}/edit` as any)}
              variant="primary"
              style={styles.actionButton}
              leftIcon={<Edit size={20} color={colors.white} />}
            />
            <View style={styles.ownJobNotice}>
              <AlertCircle size={20} color={colors.textSecondary} />
              <Text style={styles.ownJobText}>This is your job posting</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  jobHeader: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postedDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  photosContainer: {
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
  },
  photoWrapper: {
    marginRight: spacing.md,
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  detailsContainer: {
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  newUserText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bookingsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionSection: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 0,
  },
  ownJobNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  ownJobText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  fixedPriceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  fixedPriceTextContainer: {
    flex: 1,
  },
  fixedPriceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fixedPriceAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  acceptanceCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  acceptedText: {
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.sm,
  },
  viewJobBoardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  viewJobBoardText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  locationHiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  locationHiddenText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  customerViewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  customerViewText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
