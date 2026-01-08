import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Award,
  Users,
  DollarSign,
} from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  execution_date_start: string;
  preferred_time: string;
  fixed_price: number;
  pricing_type: string;
}

interface Provider {
  id: string;
  full_name: string;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
  bio: string;
  avatar_url?: string;
}

interface Acceptance {
  id: string;
  job_id: string;
  provider_id: string;
  status: string;
  message?: string;
  accepted_at: string;
  provider: Provider;
}

type SortOption = 'rating' | 'experience' | 'recent';

export default function InterestedProvidersScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);
  const [sortedAcceptances, setSortedAcceptances] = useState<Acceptance[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [selectedAcceptance, setSelectedAcceptance] = useState<Acceptance | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => {
    fetchJobAndAcceptances();
  }, [id]);

  useEffect(() => {
    sortAcceptances();
  }, [acceptances, sortBy]);

  const fetchJobAndAcceptances = async () => {
    setLoading(true);

    const [jobResult, acceptancesResult] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      supabase
        .from('job_acceptances')
        .select(
          `
          id,
          job_id,
          provider_id,
          status,
          message,
          accepted_at,
          provider:profiles!job_acceptances_provider_id_fkey(
            id,
            full_name,
            rating_average,
            rating_count,
            total_bookings,
            bio,
            avatar_url
          )
        `
        )
        .eq('job_id', id)
        .eq('status', 'pending')
        .order('accepted_at', { ascending: false }),
    ]);

    if (jobResult.data && !jobResult.error) {
      setJob(jobResult.data as any);
    }

    if (acceptancesResult.data && !acceptancesResult.error) {
      setAcceptances(acceptancesResult.data as any);
    }

    setLoading(false);
  };

  const sortAcceptances = () => {
    const sorted = [...acceptances].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.provider.rating_average - a.provider.rating_average;
        case 'experience':
          return b.provider.total_bookings - a.provider.total_bookings;
        case 'recent':
          return new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime();
        default:
          return 0;
      }
    });
    setSortedAcceptances(sorted);
  };

  const handleAwardJob = async (acceptanceId: string, providerId: string) => {
    if (!job || !profile) return;

    Alert.alert(
      'Award Job',
      'Are you sure you want to award this job to this provider? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Award Job',
          style: 'default',
          onPress: async () => {
            setAwarding(acceptanceId);

            const { error } = await supabase
              .from('job_acceptances')
              .update({
                status: 'awarded',
                awarded_at: new Date().toISOString(),
              })
              .eq('id', acceptanceId);

            setAwarding(null);

            if (error) {
              Alert.alert('Error', 'Failed to award job. Please try again.');
              console.error('Award error:', error);
            } else {
              Alert.alert(
                'Job Awarded!',
                'The provider has been notified. You can now proceed with payment and booking.',
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
      ]
    );
  };

  const handleViewProfile = (providerId: string) => {
    const acceptance = sortedAcceptances.find((a) => a.provider_id === providerId);
    if (acceptance) {
      setSelectedAcceptance(acceptance);
      setDetailModalVisible(true);
    }
  };

  const handleContactProvider = (providerId: string) => {
    Alert.alert(
      'Contact Provider',
      'You can message providers after awarding the job.',
      [{ text: 'OK' }]
    );
  };

  const getSortLabel = (option: SortOption): string => {
    switch (option) {
      case 'rating':
        return 'Highest Rated';
      case 'experience':
        return 'Most Experienced';
      case 'recent':
        return 'Most Recent';
      default:
        return 'Sort';
    }
  };

  const getInsights = () => {
    if (sortedAcceptances.length === 0) {
      return { highestRated: null, mostExperienced: null, fastest: null };
    }

    const highestRated = sortedAcceptances.reduce(
      (max, a) => (a.provider.rating_average > max.provider.rating_average ? a : max),
      sortedAcceptances[0]
    );
    const mostExperienced = sortedAcceptances.reduce(
      (max, a) => (a.provider.total_bookings > max.provider.total_bookings ? a : max),
      sortedAcceptances[0]
    );
    const fastest = sortedAcceptances.reduce(
      (earliest, a) =>
        new Date(a.accepted_at) < new Date(earliest.accepted_at) ? a : earliest,
      sortedAcceptances[0]
    );

    return {
      highestRated: highestRated.id,
      mostExperienced: mostExperienced.id,
      fastest: fastest.id,
    };
  };

  const insights = getInsights();

  const renderProviderCard = ({ item }: { item: Acceptance }) => {
    const isHighestRated = item.id === insights.highestRated;
    const isMostExperienced = item.id === insights.mostExperienced;
    const isFastest = item.id === insights.fastest;
    const hasVerification = item.provider.rating_count > 10;
    const isExperienced = item.provider.total_bookings > 50;

    const badges = [];
    if (isHighestRated) badges.push({ label: 'Top Rated', color: colors.warning });
    if (isMostExperienced) badges.push({ label: 'Most Experienced', color: colors.primary });
    if (isFastest) badges.push({ label: 'Quick Response', color: colors.success });

    return (
      <TouchableOpacity
        style={[styles.card, badges.length > 0 && styles.cardHighlighted]}
        onPress={() => {
          setSelectedAcceptance(item);
          setDetailModalVisible(true);
        }}
      >
        {/* Badges */}
        {badges.length > 0 && (
          <View style={styles.badgeContainer}>
            {badges.map((badge, index) => (
              <View key={index} style={[styles.badge, { backgroundColor: badge.color + '15' }]}>
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Provider Header */}
        <View style={styles.providerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.provider.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{item.provider.full_name}</Text>

            {/* Rating */}
            {item.provider.rating_count > 0 ? (
              <View style={styles.ratingRow}>
                <Award size={14} color={colors.warning} />
                <Text style={styles.ratingText}>
                  {item.provider.rating_average.toFixed(1)} ({item.provider.rating_count} reviews)
                </Text>
              </View>
            ) : (
              <Text style={styles.newProviderText}>New Provider</Text>
            )}

            {/* Stats */}
            <View style={styles.statsRow}>
              <Text style={styles.statText}>{item.provider.total_bookings} completed jobs</Text>
              {isExperienced && (
                <View style={styles.experienceBadge}>
                  <Text style={styles.experienceText}>Experienced</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Bio */}
        {item.provider.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText} numberOfLines={3}>
              {item.provider.bio}
            </Text>
          </View>
        )}

        {/* Message from provider */}
        {item.message && (
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText} numberOfLines={4}>
              {item.message}
            </Text>
          </View>
        )}

        {/* Acceptance Time */}
        <View style={styles.timeSection}>
          <Calendar size={12} color={colors.textLight} />
          <Text style={styles.timeText}>
            Accepted {new Date(item.accepted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.awardButton, awarding === item.id && styles.awardButtonDisabled]}
            onPress={() => handleAwardJob(item.id, item.provider_id)}
            disabled={awarding === item.id}
          >
            <Text style={styles.awardButtonText}>
              {awarding === item.id ? 'Awarding...' : 'Award Job'}
            </Text>
          </TouchableOpacity>
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleViewProfile(item.provider_id)}
            >
              <Text style={styles.secondaryButtonText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleContactProvider(item.provider_id)}
            >
              <Text style={styles.secondaryButtonText}>Message</Text>
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
        <Text style={styles.loadingText}>Loading interested providers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interested Providers</Text>
        <View style={styles.backButton} />
      </View>

      {/* Job Summary */}
      {job && (
        <View style={styles.jobSummary}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>
          <View style={styles.jobMeta}>
            <View style={styles.metaItem}>
              <DollarSign size={16} color={colors.primary} />
              <Text style={styles.priceText}>${Math.round(job.fixed_price).toLocaleString('en-US')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {new Date(job.execution_date_start).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{job.location}</Text>
            </View>
          </View>
        </View>
      )}

      {sortedAcceptances.length > 0 ? (
        <>
          {/* Sort Header */}
          <View style={styles.sortHeader}>
            <View style={styles.countSection}>
              <Users size={18} color={colors.primary} />
              <Text style={styles.countText}>
                {sortedAcceptances.length} {sortedAcceptances.length === 1 ? 'provider' : 'providers'} interested
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => {
                Alert.alert('Sort By', '', [
                  {
                    text: 'Highest Rated',
                    onPress: () => setSortBy('rating'),
                  },
                  {
                    text: 'Most Experienced',
                    onPress: () => setSortBy('experience'),
                  },
                  {
                    text: 'Most Recent',
                    onPress: () => setSortBy('recent'),
                  },
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                ]);
              }}
            >
              <Text style={styles.sortButtonText}>{getSortLabel(sortBy)}</Text>
            </TouchableOpacity>
          </View>

          {/* Provider List */}
          <FlatList
            data={sortedAcceptances}
            renderItem={renderProviderCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Users size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No providers yet</Text>
          <Text style={styles.emptyText}>
            Providers will accept your fixed-price job. Check back soon!
          </Text>
        </View>
      )}

      {/* Detail Modal */}
      {selectedAcceptance && (
        <Modal
          visible={detailModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Provider Details</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Text style={styles.closeButton}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {selectedAcceptance.provider.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.modalProviderName}>{selectedAcceptance.provider.full_name}</Text>

                {selectedAcceptance.provider.rating_count > 0 && (
                  <View style={styles.modalRating}>
                    <Award size={16} color={colors.warning} />
                    <Text style={styles.modalRatingText}>
                      {selectedAcceptance.provider.rating_average.toFixed(1)} (
                      {selectedAcceptance.provider.rating_count} reviews)
                    </Text>
                  </View>
                )}

                <Text style={styles.modalStats}>
                  {selectedAcceptance.provider.total_bookings} completed jobs
                </Text>

                {selectedAcceptance.provider.bio && (
                  <View style={styles.modalBio}>
                    <Text style={styles.modalBioLabel}>About</Text>
                    <Text style={styles.modalBioText}>{selectedAcceptance.provider.bio}</Text>
                  </View>
                )}

                {selectedAcceptance.message && (
                  <View style={styles.modalMessage}>
                    <Text style={styles.modalBioLabel}>Message</Text>
                    <Text style={styles.modalBioText}>{selectedAcceptance.message}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalAwardButton}
                  onPress={() => {
                    setDetailModalVisible(false);
                    handleAwardJob(selectedAcceptance.id, selectedAcceptance.provider_id);
                  }}
                >
                  <Text style={styles.modalAwardButtonText}>Award Job</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  jobSummary: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  sortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  sortButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listContainer: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  providerHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  providerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  providerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.medium,
  },
  newProviderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  experienceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.full,
  },
  experienceText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  bioSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  bioText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  messageSection: {
    padding: spacing.md,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  messageLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  actionSection: {
    gap: spacing.sm,
  },
  awardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  awardButtonDisabled: {
    opacity: 0.6,
  },
  awardButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  emptyState: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  modalBody: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalAvatarText: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  modalProviderName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  modalRatingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  modalStats: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  modalBio: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  modalBioLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalBioText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  modalMessage: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  modalAwardButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalAwardButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
