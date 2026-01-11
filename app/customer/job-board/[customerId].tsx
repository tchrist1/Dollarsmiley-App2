import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { ArrowLeft, MessageCircle, Star, Briefcase, Calendar, Users } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/currency-utils';

interface CustomerProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  rating_average: number;
  total_reviews: number;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  budget_type: string;
  budget: number;
  status: string;
  photos: string[];
  time_window_start: string;
  time_window_end: string;
  distance?: number;
  category?: {
    name: string;
  };
}

export default function CustomerJobBoardScreen() {
  const { customerId } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchCustomerData();
    }
  }, [customerId]);

  const fetchCustomerData = async () => {
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', customerId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching customer profile:', profileError);
      setLoading(false);
      return;
    }

    setCustomer(profileData as CustomerProfile);

    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('customer_id', customerId)
      .in('status', ['Open', 'InProgress'])
      .order('created_at', { ascending: false });

    setJobs((jobsData as any) || []);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerData();
  };

  const handleContactCustomer = async () => {
    if (!customerId) return;

    const conversationId = [profile?.id, customerId].sort().join('_');

    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!existingConversation) {
      await supabase.from('conversations').insert({
        id: conversationId,
        user1_id: profile?.id,
        user2_id: customerId,
      });
    }

    router.push(`/chat/${conversationId}` as any);
  };

  const renderJobCard = (job: Job) => {
    const imageUrl = job.photos && job.photos.length > 0
      ? (typeof job.photos[0] === 'string' ? job.photos[0] : null)
      : null;

    const getStatusColor = () => {
      switch (job.status) {
        case 'Open': return colors.success;
        case 'InProgress': return colors.primary;
        default: return colors.textSecondary;
      }
    };

    return (
      <TouchableOpacity
        key={job.id}
        style={styles.jobCard}
        onPress={() => router.push(`/jobs/${job.id}` as any)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.jobImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.jobImage, styles.placeholderImage]}>
            <Briefcase size={32} color={colors.textLight} />
          </View>
        )}

        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {job.title}
          </Text>

          <Text style={styles.categoryText}>
            {job.category?.name || 'Uncategorized'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {job.budget_type === 'Fixed' ? formatCurrency(job.budget) : 'Quote Required'}
            </Text>
          </View>

          {job.time_window_start && (
            <View style={styles.timeRow}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={styles.timeText}>
                {new Date(job.time_window_start).toLocaleDateString()}
              </Text>
            </View>
          )}

          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {job.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const joinedDate = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading job board...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Customer not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Board</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.customerHeader}>
          {customer.avatar_url ? (
            <Image
              source={{ uri: customer.avatar_url }}
              style={styles.customerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.customerAvatar, styles.placeholderAvatar]}>
              <Users size={40} color={colors.textLight} />
            </View>
          )}

          <Text style={styles.customerName}>
            {customer.display_name || 'Customer'}
          </Text>

          {customer.rating_average > 0 && (
            <View style={styles.ratingRow}>
              <Star size={16} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingLargeText}>
                {customer.rating_average.toFixed(1)}
              </Text>
              <Text style={styles.reviewCount}>
                ({customer.total_reviews} {customer.total_reviews === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          )}

          <Text style={styles.joinedText}>
            Joined {joinedDate}
          </Text>

          <Button
            title="Contact Customer"
            onPress={handleContactCustomer}
            icon={<MessageCircle size={20} color={colors.white} />}
            style={styles.contactButton}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Jobs ({jobs.length})</Text>
        </View>

        <View style={styles.jobsGrid}>
          {jobs.map(renderJobCard)}
        </View>

        {jobs.length === 0 && (
          <View style={styles.emptyState}>
            <Briefcase size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No active jobs available</Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIconButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  customerHeader: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  customerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  ratingLargeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
  },
  reviewCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  joinedText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  contactButton: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
  },
  jobsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  jobCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  jobImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobInfo: {
    padding: spacing.sm,
  },
  jobTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    minHeight: 36,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as any,
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as any,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    marginBottom: spacing.lg,
  },
  backButton: {
    minWidth: 120,
  },
});
