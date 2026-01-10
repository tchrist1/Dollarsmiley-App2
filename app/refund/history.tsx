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
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  ArrowLeft,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';

interface RefundRequest {
  id: string;
  production_order_id?: string;
  booking_id?: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  created_at: string;
  resolved_at?: string;
  provider_response?: string;
  production_order?: {
    title: string;
    provider: {
      full_name: string;
    };
  };
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

export default function RefundHistoryScreen() {
  const { profile } = useAuth();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (profile?.id) {
      fetchRefunds();
    }
  }, [filter, profile?.id]);

  const fetchRefunds = async () => {
    if (!profile?.id) return;

    setLoading(true);

    let query = supabase
      .from('refund_requests')
      .select(`
        *,
        production_order:production_orders(
          title,
          provider:profiles!production_orders_provider_id_fkey(full_name)
        )
      `)
      .eq('customer_id', profile.id)
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Review', color: colors.warning, Icon: Clock };
      case 'approved':
      case 'processing':
        return { label: 'Approved', color: colors.success, Icon: CheckCircle };
      case 'completed':
        return { label: 'Refunded', color: colors.success, Icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejected', color: colors.error, Icon: XCircle };
      default:
        return { label: status, color: colors.textSecondary, Icon: AlertCircle };
    }
  };

  const totalRefunded = refunds
    .filter(r => ['approved', 'completed', 'processing'].includes(r.status))
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingAmount = refunds
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);

  const renderRefundCard = (refund: RefundRequest) => {
    const statusInfo = getStatusInfo(refund.status);
    const StatusIcon = statusInfo.Icon;

    return (
      <TouchableOpacity
        key={refund.id}
        style={styles.refundCard}
        onPress={() => router.push(`/refund/status/${refund.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textLight} />
        </View>

        <Text style={styles.orderTitle} numberOfLines={1}>
          {refund.production_order?.title || 'Order Refund'}
        </Text>

        <View style={styles.amountRow}>
          <DollarSign size={18} color={colors.text} />
          <Text style={styles.amountValue}>{formatCurrency(refund.amount)}</Text>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.providerName}>
            Provider: {refund.production_order?.provider?.full_name || 'N/A'}
          </Text>
          <Text style={styles.reasonText} numberOfLines={2}>
            Reason: {refund.reason}
          </Text>
          <Text style={styles.dateText}>
            Requested {new Date(refund.created_at).toLocaleDateString()}
          </Text>
        </View>

        {refund.provider_response && refund.status !== 'pending' && (
          <View style={styles.responseSection}>
            <Text style={styles.responseLabel}>Provider Response:</Text>
            <Text style={styles.responseText} numberOfLines={2}>
              {refund.provider_response}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refund History</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <RefreshCw size={20} color={colors.success} />
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total Refunded</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRefunded)}</Text>
          </View>
        </View>
        {pendingAmount > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.warningLight }]}>
            <Clock size={20} color={colors.warning} />
            <View style={styles.summaryContent}>
              <Text style={[styles.summaryLabel, { color: colors.warningDark }]}>Pending</Text>
              <Text style={[styles.summaryValue, { color: colors.warningDark }]}>
                {formatCurrency(pendingAmount)}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.filters}>
        {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map((f) => (
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
          <Text style={styles.loadingText}>Loading refunds...</Text>
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
              <Text style={styles.emptyTitle}>No Refunds</Text>
              <Text style={styles.emptyText}>
                {filter === 'pending'
                  ? 'No pending refund requests'
                  : filter === 'approved'
                  ? 'No approved refunds'
                  : filter === 'rejected'
                  ? 'No rejected refunds'
                  : "You haven't requested any refunds yet"}
              </Text>
            </View>
          ) : (
            <View style={styles.refundList}>
              {refunds.map(renderRefundCard)}
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
  summarySection: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.successDark,
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
  refundCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  orderTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  amountValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardDetails: {
    gap: 4,
  },
  providerName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  responseSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  responseLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  responseText: {
    fontSize: fontSize.sm,
    color: colors.text,
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
