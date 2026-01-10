import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency-utils';
import ProviderRefundReviewCard from '@/components/ProviderRefundReviewCard';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

interface RefundRequest {
  id: string;
  production_order_id: string;
  customer_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  created_at: string;
  resolved_at?: string;
  provider_response?: string;
  customer?: {
    full_name: string;
  };
  production_order?: {
    title: string;
    escrow_amount: number;
  };
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

export default function ProviderRefundsScreen() {
  const { profile } = useAuth();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('pending');

  useEffect(() => {
    if (profile?.id) {
      fetchRefunds();
    }
  }, [filter, profile?.id]);

  const fetchRefunds = async () => {
    if (!profile?.id) return;

    setLoading(true);

    const { data: orders } = await supabase
      .from('production_orders')
      .select('id')
      .eq('provider_id', profile.id);

    if (!orders || orders.length === 0) {
      setRefunds([]);
      setLoading(false);
      return;
    }

    const orderIds = orders.map(o => o.id);

    let query = supabase
      .from('refund_requests')
      .select(`
        *,
        customer:profiles!refund_requests_customer_id_fkey(full_name),
        production_order:production_orders(title, escrow_amount)
      `)
      .in('production_order_id', orderIds)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRefunds(data as any);
    }

    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRefunds();
    setRefreshing(false);
  }, [filter, profile?.id]);

  const pendingCount = refunds.filter(r => r.status === 'pending').length;
  const totalPendingAmount = refunds
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund Requests</Text>
        <View style={styles.headerRight} />
      </View>

      {pendingCount > 0 && (
        <View style={styles.alertBanner}>
          <AlertCircle size={20} color={colors.warning} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>
              {pendingCount} Pending Request{pendingCount > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertText}>
              Total: {formatCurrency(totalPendingAmount)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.filters}>
        {(['pending', 'approved', 'rejected', 'all'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading refund requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {refunds.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={64} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Refund Requests</Text>
              <Text style={styles.emptyText}>
                {filter === 'pending'
                  ? 'You have no pending refund requests to review'
                  : filter === 'approved'
                  ? 'No approved refunds'
                  : filter === 'rejected'
                  ? 'No rejected refunds'
                  : 'No refund requests found'}
              </Text>
            </View>
          ) : (
            <View style={styles.refundList}>
              {refunds.map((refund) => (
                <ProviderRefundReviewCard
                  key={refund.id}
                  refund={refund}
                  onActionComplete={fetchRefunds}
                />
              ))}
            </View>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
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
  headerRight: {
    width: 40,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.warningDark,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: 2,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  refundList: {
    padding: spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});
