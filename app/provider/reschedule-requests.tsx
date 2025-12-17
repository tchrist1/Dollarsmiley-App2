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
import { ArrowLeft, Filter, AlertCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RescheduleRequestCard } from '@/components/RescheduleRequestCard';

type FilterType = 'pending' | 'approved' | 'denied' | 'all';

interface RescheduleRequest {
  id: string;
  booking_id: string;
  requested_by: string;
  current_date: string;
  current_time: string;
  proposed_date: string;
  proposed_time: string;
  reason: string;
  status: string;
  response_message?: string;
  responded_at?: string;
  created_at: string;
  booking?: {
    title: string;
    customer?: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

export default function RescheduleRequestsScreen() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RescheduleRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RescheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');

  useEffect(() => {
    if (profile?.user_type !== 'Provider' && profile?.user_type !== 'Hybrid') {
      router.back();
      return;
    }
    loadRequests();
  }, [profile]);

  useEffect(() => {
    applyFilter();
  }, [requests, filter]);

  const loadRequests = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      if (!profile) return;

      const { data, error } = await supabase
        .from('reschedule_requests')
        .select(
          `
          *,
          booking:bookings!reschedule_requests_booking_id_fkey(
            title,
            customer:profiles!bookings_customer_id_fkey(
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq('booking.provider_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error loading reschedule requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRequests(requests);
      return;
    }

    const statusMap: Record<FilterType, string> = {
      pending: 'Pending',
      approved: 'Approved',
      denied: 'Denied',
      all: '',
    };

    const filtered = requests.filter((req) => req.status === statusMap[filter]);
    setFilteredRequests(filtered);
  };

  const getFilterCount = (filterType: FilterType): number => {
    if (filterType === 'all') return requests.length;

    const statusMap: Record<FilterType, string> = {
      pending: 'Pending',
      approved: 'Approved',
      denied: 'Denied',
      all: '',
    };

    return requests.filter((req) => req.status === statusMap[filterType]).length;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reschedule Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const pendingCount = getFilterCount('pending');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {pendingCount > 0 && (
        <View style={styles.alertBanner}>
          <AlertCircle size={20} color={colors.warning} />
          <Text style={styles.alertText}>
            {pendingCount} request{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''}{' '}
            your attention
          </Text>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <Filter size={16} color={colors.textSecondary} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['pending', 'approved', 'denied', 'all'] as FilterType[]).map((filterType) => {
            const count = getFilterCount(filterType);
            const isActive = filter === filterType;

            return (
              <TouchableOpacity
                key={filterType}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setFilter(filterType)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                </Text>
                {count > 0 && (
                  <View
                    style={[styles.filterBadge, isActive && styles.filterBadgeActive]}
                  >
                    <Text
                      style={[styles.filterBadgeText, isActive && styles.filterBadgeTextActive]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRequests(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Requests</Text>
            <Text style={styles.emptyText}>
              {filter === 'pending'
                ? "You don't have any pending reschedule requests"
                : filter === 'all'
                ? "You haven't received any reschedule requests yet"
                : `No ${filter} reschedule requests`}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <RescheduleRequestCard
              key={request.id}
              request={request}
              isProvider={true}
              onUpdate={() => loadRequests()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
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
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  alertText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
  },
  filterBadgeActive: {
    backgroundColor: colors.white + '30',
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  filterBadgeTextActive: {
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
    padding: spacing.xxl,
    marginTop: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
});
