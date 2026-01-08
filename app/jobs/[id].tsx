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
  preferred_time: string;
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
  };
  categories: {
    name: string;
    icon: string;
  };
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
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
          total_bookings
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

  const handleSendQuote = async () => {
    if (!profile || !job) return;

    Alert.prompt(
      'Send Quote',
      'Enter your proposed price for this job:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async (price) => {
            if (!price || isNaN(Number(price))) {
              Alert.alert('Error', 'Please enter a valid price');
              return;
            }

            setSubmitting(true);

            const bookingData = {
              customer_id: job.customer_id,
              provider_id: profile.id,
              job_id: job.id,
              title: job.title,
              description: `Quote for: ${job.title}`,
              scheduled_date: job.execution_date_start,
              scheduled_time: job.preferred_time,
              location: job.location,
              price: Number(price),
              status: 'Requested',
              payment_status: 'Pending',
            };

            const { error } = await supabase.from('bookings').insert(bookingData);

            setSubmitting(false);

            if (error) {
              Alert.alert('Error', 'Failed to send quote. Please try again.');
              console.error('Quote error:', error);
            } else {
              Alert.alert(
                'Quote Sent!',
                'Your quote has been sent to the customer. You will be notified if they accept.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  },
                ]
              );
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
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
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack('/jobs')}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.detailLabel}>Budget</Text>
                <Text style={styles.detailValue}>{formatBudget(job.budget_min, job.budget_max)}</Text>
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
                <Text style={styles.detailLabel}>Preferred Time</Text>
                <Text style={styles.detailValue}>{job.preferred_time}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={20} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{job.location}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted By</Text>
          <View style={styles.customerCard}>
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
          </View>
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
                loading={submitting}
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
});
