import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
} from 'lucide-react-native';
import {
  formatCurrency,
  getPaymentPlanStatusColor,
  getInstallmentStatusColor,
  getPaymentPlanProgress,
  getTotalPaidAmount,
  getRemainingBalance,
  type BookingPaymentPlan,
  type PaymentInstallment,
} from '@/lib/payment-plans';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface PaymentPlanDetailsProps {
  paymentPlan: BookingPaymentPlan;
  installments: PaymentInstallment[];
  onPayInstallment?: (installment: PaymentInstallment) => void;
}

export default function PaymentPlanDetails({
  paymentPlan,
  installments,
  onPayInstallment,
}: PaymentPlanDetailsProps) {
  const statusColor = getPaymentPlanStatusColor(paymentPlan.status);
  const progress = getPaymentPlanProgress(paymentPlan);
  const totalPaid = getTotalPaidAmount(paymentPlan);
  const remainingBalance = getRemainingBalance(paymentPlan);

  const getInstallmentIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return <CheckCircle size={20} color={colors.success} />;
      case 'Failed':
        return <AlertCircle size={20} color={colors.error} />;
      case 'Pending':
        return <Clock size={20} color={colors.warning} />;
      default:
        return <Clock size={20} color={colors.textSecondary} />;
    }
  };

  const isInstallmentDue = (installment: PaymentInstallment) => {
    if (installment.status !== 'Pending') return false;
    const today = new Date();
    const dueDate = new Date(installment.due_date);
    return dueDate <= today;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
        <View style={styles.statusHeader}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Payment Plan Status</Text>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {paymentPlan.status}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusPercentage}>{Math.round(progress)}%</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {paymentPlan.installments_paid} of {paymentPlan.installments_count}{' '}
            payments completed
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(paymentPlan.total_amount)}
          </Text>
        </View>

        {paymentPlan.down_payment_amount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Down Payment</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(paymentPlan.down_payment_amount)}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelContainer}>
            <DollarSign size={16} color={colors.success} />
            <Text style={styles.summaryLabel}>Total Paid</Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totalPaid)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelContainer}>
            <TrendingUp size={16} color={colors.warning} />
            <Text style={styles.summaryLabel}>Remaining Balance</Text>
          </View>
          <Text style={[styles.summaryValue, { color: colors.warning }]}>
            {formatCurrency(remainingBalance)}
          </Text>
        </View>

        {paymentPlan.next_payment_date && paymentPlan.status === 'Active' && (
          <View style={styles.nextPaymentCard}>
            <Calendar size={16} color={colors.primary} />
            <View style={styles.nextPaymentInfo}>
              <Text style={styles.nextPaymentLabel}>Next Payment Due</Text>
              <Text style={styles.nextPaymentDate}>
                {new Date(paymentPlan.next_payment_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.installmentsCard}>
        <Text style={styles.sectionTitle}>Installment Schedule</Text>

        <View style={styles.installmentsList}>
          {installments.map((installment) => {
            const isDue = isInstallmentDue(installment);
            const statusColor = getInstallmentStatusColor(installment.status);

            return (
              <View
                key={installment.id}
                style={[
                  styles.installmentItem,
                  isDue && styles.installmentItemDue,
                ]}
              >
                <View style={styles.installmentHeader}>
                  <View style={styles.installmentInfo}>
                    <View style={styles.installmentNumberContainer}>
                      {getInstallmentIcon(installment.status)}
                      <Text style={styles.installmentNumber}>
                        Payment {installment.installment_number}
                      </Text>
                    </View>
                    <Text style={styles.installmentDate}>
                      Due: {new Date(installment.due_date).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles.installmentRight}>
                    <Text style={styles.installmentAmount}>
                      {formatCurrency(installment.amount)}
                    </Text>
                    <View
                      style={[
                        styles.installmentStatusBadge,
                        { backgroundColor: statusColor + '20' },
                      ]}
                    >
                      <Text
                        style={[styles.installmentStatus, { color: statusColor }]}
                      >
                        {installment.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {installment.paid_at && (
                  <Text style={styles.paidDate}>
                    Paid on {new Date(installment.paid_at).toLocaleDateString()}
                  </Text>
                )}

                {installment.failure_reason && (
                  <View style={styles.failureContainer}>
                    <AlertCircle size={14} color={colors.error} />
                    <Text style={styles.failureText}>
                      {installment.failure_reason}
                    </Text>
                  </View>
                )}

                {isDue && onPayInstallment && (
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => onPayInstallment(installment)}
                  >
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {paymentPlan.status === 'Active' && (
        <View style={styles.infoCard}>
          <AlertCircle size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Payments will be automatically charged to your saved payment method on
            the due date. Make sure your payment information is up to date to avoid
            payment failures.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusInfo: {
    gap: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPercentage: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressInfo: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  nextPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  nextPaymentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  nextPaymentLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  nextPaymentDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  installmentsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  installmentsList: {
    gap: spacing.md,
  },
  installmentItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  installmentItemDue: {
    borderWidth: 2,
    borderColor: colors.warning,
  },
  installmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  installmentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  installmentNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  installmentNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  installmentDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  installmentRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  installmentAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  installmentStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  installmentStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  paidDate: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontStyle: 'italic',
  },
  failureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '15',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  failureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  payButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
});
