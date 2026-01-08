import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getProviderTimeExtensionRequests, getCustomerTimeExtensionRequests } from '@/lib/time-extensions';
import TimeExtensionRequestCard from '@/components/TimeExtensionRequestCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ArrowLeft, Clock, Filter } from 'lucide-react-native';

interface TimeExtensionWithJob {
  id: string;
  requested_additional_hours: number;
  reason: string;
  requested_at: string;
  proposed_price_adjustment?: number;
  original_estimated_duration?: number;
  provider_id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  job?: {
    id: string;
    title: string;
    customer_id: string;
  };
  provider?: {
    full_name: string;
  };
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'declined';

export default function TimeExtensionsScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<TimeExtensionWithJob[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const isProvider = profile?.account_type === 'provider';

  useEffect(() => {
    fetchTimeExtensions();
  }, [profile?.id]);

  const fetchTimeExtensions = async () => {
    if (!profile?.id) return;

    setLoading(true);

    try {
      let extensionsData;

      if (isProvider) {
        const { data } = await getProviderTimeExtensionRequests(profile.id);
        extensionsData = data || [];
      } else {
        const { data } = await getCustomerTimeExtensionRequests(profile.id);
        extensionsData = data || [];
      }

      const requestsWithDetails = await Promise.all(
        extensionsData.map(async (request) => {
          const { data: job } = await supabase
            .from('jobs')
            .select('id, title, customer_id')
            .eq('id', request.job_id)
            .maybeSingle();

          let providerName;
          if (!isProvider && request.provider_id) {
            const { data: providerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', request.provider_id)
              .maybeSingle();
            providerName = providerProfile?.full_name;
          }

          return {
            ...request,
            job,
            provider: providerName ? { full_name: providerName } : undefined,
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching time extensions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTimeExtensions();
  };

  const filteredRequests = requests.filter((request) => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const declinedCount = requests.filter((r) => r.status === 'declined').length;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <Clock size={24} color={colors.primary} />
            <Text style={styles.headerTitle}>Time Extensions</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {isProvider
              ? 'Your time extension requests'
              : 'Requests from providers'}
          </Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'all' && styles.filterChipTextActive,
            ]}
          >
            All ({requests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipActive]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'pending' && styles.filterChipTextActive,
            ]}
          >
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'approved' && styles.filterChipActive]}
          onPress={() => setFilterStatus('approved')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'approved' && styles.filterChipTextActive,
            ]}
          >
            Approved ({approvedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'declined' && styles.filterChipActive]}
          onPress={() => setFilterStatus('declined')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterStatus === 'declined' && styles.filterChipTextActive,
            ]}
          >
            Declined ({declinedCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>
              {filterStatus === 'all'
                ? 'No Time Extensions'
                : `No ${filterStatus} requests`}
            </Text>
            <Text style={styles.emptyStateText}>
              {isProvider
                ? filterStatus === 'all'
                  ? 'You haven\'t requested any time extensions yet'
                  : `You have no ${filterStatus} time extension requests`
                : filterStatus === 'all'
                ? 'No time extension requests from providers yet'
                : `No ${filterStatus} requests to review`}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <TimeExtensionRequestCard
              key={request.id}
              request={request}
              jobTitle={request.job?.title || 'Unknown Job'}
              providerName={request.provider?.full_name}
              onResponseSubmitted={fetchTimeExtensions}
              isCustomer={!isProvider}
            />
          ))
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  headerContent: {
    gap: spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
