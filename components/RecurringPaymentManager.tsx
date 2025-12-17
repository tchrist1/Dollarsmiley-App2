import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react-native';
import {
  type RecurringPayment,
  getRecurringPaymentsByBooking,
  retryFailedPayment,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getPaymentStats,
} from '@/lib/recurring-payments';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RecurringPaymentManagerProps {
  recurringBookingId: string;
  customerId: string;
  onUpdatePaymentMethod?: () => void;
}

export default function RecurringPaymentManager({
  recurringBookingId,
  customerId,
  onUpdatePaymentMethod,
}: RecurringPaymentManagerProps) {
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
    loadStats();
  }, [recurringBookingId, customerId]);

  const loadPayments = async () => {
    try {
      const data = await getRecurringPaymentsByBooking(recurringBookingId);
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getPaymentStats(customerId);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRetryPayment = async (paymentId: string) => {
    Alert.alert(
      'Retry Payment',
      'Would you like to retry processing this payment now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            setRetrying(paymentId);
            try {
              const success = await retryFailedPayment(paymentId);
              if (success) {
                Alert.alert('Success', 'Payment retry initiated');
                await loadPayments();
              } else {
                Alert.alert('Error', 'Failed to retry payment');
              }
            } catch (error) {
              console.error('Error retrying payment:', error);
              Alert.alert('Error', 'Failed to retry payment');
            } finally {
              setRetrying(null);
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle size={20} color={colors.success} />;
      case 'failed':
        return <XCircle size={20} color={colors.error} />;
      case 'processing':
        return <Clock size={20} color={colors.primary} />;
      case 'pending':
        return <Clock size={20} color={colors.warning} />;
      case 'cancelled':
        return <XCircle size={20} color={colors.textSecondary} />;
      default:
        return <AlertCircle size={20} color={colors.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const failedPayments = payments.filter(p => p.status === 'failed');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stats Card */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Payment Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <DollarSign size={24} color={colors.success} />
              <Text style={styles.statValue}>${stats.totalPaid.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Paid</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={24} color={colors.warning} />
              <Text style={styles.statValue}>${stats.totalPending.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingUp size={24} color={colors.primary} />
              <Text style={styles.statValue}>{stats.successRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </View>
      )}

      {/* Failed Payments Alert */}
      {failedPayments.length > 0 && (
        <View style={styles.alertCard}>
          <AlertCircle size={24} color={colors.error} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Payment Issues</Text>
            <Text style={styles.alertText}>
              {failedPayments.length} payment{failedPayments.length > 1 ? 's' : ''} failed. Please
              update your payment method or retry.
            </Text>
          </View>
        </View>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Payments</Text>
          {pendingPayments.map(payment => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  {getStatusIcon(payment.status)}
                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getPaymentStatusColor(payment.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getPaymentStatusColor(payment.status) },
                    ]}
                  >
                    {getPaymentStatusLabel(payment.status)}
                  </Text>
                </View>
              </View>

              {payment.next_retry_at && (
                <View style={styles.retryInfo}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.retryText}>
                    Next retry: {new Date(payment.next_retry_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Payment History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No payment history yet</Text>
          </View>
        ) : (
          payments.map(payment => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  {getStatusIcon(payment.status)}
                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                    <Text style={styles.paymentDate}>
                      {payment.charged_at
                        ? new Date(payment.charged_at).toLocaleDateString()
                        : new Date(payment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getPaymentStatusColor(payment.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getPaymentStatusColor(payment.status) },
                    ]}
                  >
                    {getPaymentStatusLabel(payment.status)}
                  </Text>
                </View>
              </View>

              {payment.status === 'failed' && (
                <>
                  {payment.failure_reason && (
                    <View style={styles.failureInfo}>
                      <AlertCircle size={14} color={colors.error} />
                      <Text style={styles.failureText}>{payment.failure_reason}</Text>
                    </View>
                  )}

                  {payment.retry_count < payment.max_retries && (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => handleRetryPayment(payment.id)}
                      disabled={retrying === payment.id}
                    >
                      {retrying === payment.id ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <RefreshCw size={16} color={colors.primary} />
                      )}
                      <Text style={styles.retryButtonText}>
                        Retry Payment ({payment.retry_count}/{payment.max_retries})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {payment.retry_count >= payment.max_retries && (
                    <View style={styles.maxRetriesInfo}>
                      <Text style={styles.maxRetriesText}>
                        Maximum retry attempts reached. Please update your payment method.
                      </Text>
                      {onUpdatePaymentMethod && (
                        <TouchableOpacity
                          style={styles.updateButton}
                          onPress={onUpdatePaymentMethod}
                        >
                          <CreditCard size={16} color={colors.white} />
                          <Text style={styles.updateButtonText}>Update Payment Method</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}

              {payment.stripe_payment_intent_id && (
                <Text style={styles.paymentId}>
                  Payment ID: {payment.stripe_payment_intent_id.slice(-8)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {onUpdatePaymentMethod && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.updateMethodButton} onPress={onUpdatePaymentMethod}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={styles.updateMethodText}>Update Payment Method</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  paymentDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  retryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  failureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  failureText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.error,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  maxRetriesInfo: {
    marginTop: spacing.sm,
  },
  maxRetriesText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  updateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  paymentId: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontFamily: 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  footer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  updateMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  updateMethodText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
