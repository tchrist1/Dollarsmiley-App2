import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import {
  getCustomerRefunds,
  getCustomerRefundStats,
  subscribeToRefundUpdates,
  formatCurrency,
  getRefundStatusColor,
  getRefundStatusText,
  getRefundReasonDisplay,
  type CustomerRefund,
} from '@/lib/customer-refunds';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function RefundsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);
  const [stats, setStats] = useState({
    total_refunds: 0,
    pending_refunds: 0,
    completed_refunds: 0,
    total_refunded_amount: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadRefunds();

      const unsubscribe = subscribeToRefundUpdates(user.id, () => {
        loadRefunds();
      });

      return unsubscribe;
    }
  }, [user?.id]);

  const loadRefunds = async () => {
    if (!user?.id) return;

    try {
      const [refundsData, statsData] = await Promise.all([
        getCustomerRefunds(user.id),
        getCustomerRefundStats(user.id),
      ]);

      setRefunds(refundsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading refunds:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRefunds();
  };

  const handleRefundPress = (refundId: string) => {
    router.push(`/refund/status/${refundId}`);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view refunds</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Refunds</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Refunds</Text>
        <Text style={styles.subtitle}>
          {stats.total_refunds} total refund{stats.total_refunds !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
          <Clock size={20} color={colors.warning} />
          <Text style={styles.statValue}>{stats.pending_refunds}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <CheckCircle size={20} color={colors.success} />
          <Text style={styles.statValue}>{stats.completed_refunds}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <DollarSign size={20} color={colors.primary} />
          <Text style={styles.statValue}>
            {formatCurrency(stats.total_refunded_amount)}
          </Text>
          <Text style={styles.statLabel}>Total Refunded</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {refunds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No refund requests yet</Text>
            <Text style={styles.emptySubtext}>
              Your refund requests will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.refundsList}>
            {refunds.map((refund) => {
              const statusColor = getRefundStatusColor(refund.status);
              const statusText = getRefundStatusText(refund.status);

              return (
                <TouchableOpacity
                  key={refund.id}
                  style={[styles.refundCard, { borderLeftColor: statusColor }]}
                  onPress={() => handleRefundPress(refund.id)}
                >
                  <View style={styles.refundHeader}>
                    <View style={styles.refundInfo}>
                      <Text style={styles.refundBooking} numberOfLines={1}>
                        {refund.booking?.title || 'Booking'}
                      </Text>
                      <Text style={styles.refundReason}>
                        {getRefundReasonDisplay(refund.reason)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor },
                      ]}
                    >
                      <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                  </View>

                  <View style={styles.refundDetails}>
                    <View style={styles.amountContainer}>
                      <DollarSign size={16} color={colors.success} />
                      <Text style={styles.amount}>
                        {formatCurrency(refund.amount)}
                      </Text>
                    </View>
                    <Text style={styles.date}>
                      {new Date(refund.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {refund.notes && (
                    <Text style={styles.notes} numberOfLines={2}>
                      {refund.notes}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
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
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refundsList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  refundCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  refundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refundInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  refundBooking: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  refundReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  refundDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
