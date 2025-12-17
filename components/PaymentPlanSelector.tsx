import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CheckCircle, Clock, Calendar, Info } from 'lucide-react-native';
import {
  getEligiblePaymentPlans,
  calculatePaymentPlanDetails,
  getPaymentScheduleSummary,
  formatCurrency,
  getFrequencyDisplay,
  type PaymentPlan,
} from '@/lib/payment-plans';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface PaymentPlanSelectorProps {
  bookingAmount: number;
  onSelectPlan: (plan: PaymentPlan | null) => void;
  selectedPlanId?: string | null;
}

export default function PaymentPlanSelector({
  bookingAmount,
  onSelectPlan,
  selectedPlanId,
}: PaymentPlanSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, [bookingAmount]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const eligiblePlans = await getEligiblePaymentPlans(bookingAmount);
      setPlans(eligiblePlans);
    } catch (error) {
      console.error('Error loading payment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: PaymentPlan | null) => {
    onSelectPlan(plan);
  };

  const toggleExpand = (planId: string) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (plans.length === 0) {
    return (
      <View style={styles.noPlansContainer}>
        <Info size={24} color={colors.textSecondary} />
        <Text style={styles.noPlansText}>
          No payment plans available for this booking amount
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Payment Plan</Text>
        <Text style={styles.subtitle}>
          Split your payment of {formatCurrency(bookingAmount)} into multiple installments
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.planCard,
          selectedPlanId === null && styles.planCardSelected,
        ]}
        onPress={() => handleSelectPlan(null)}
      >
        <View style={styles.planHeader}>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>Pay in Full</Text>
            <Text style={styles.planDescription}>Pay the full amount now</Text>
          </View>
          {selectedPlanId === null && (
            <CheckCircle size={24} color={colors.primary} />
          )}
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amount}>{formatCurrency(bookingAmount)}</Text>
        </View>
      </TouchableOpacity>

      {plans.map((plan) => {
        const details = calculatePaymentPlanDetails(plan, bookingAmount);
        const isSelected = selectedPlanId === plan.id;
        const isExpanded = expandedPlanId === plan.id;
        const schedule = getPaymentScheduleSummary(plan, bookingAmount);

        return (
          <View key={plan.id}>
            <TouchableOpacity
              style={[styles.planCard, isSelected && styles.planCardSelected]}
              onPress={() => handleSelectPlan(plan)}
            >
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                {isSelected && <CheckCircle size={24} color={colors.primary} />}
              </View>

              <View style={styles.planDetails}>
                {details.down_payment > 0 && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Calendar size={16} color={colors.textSecondary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Down Payment</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(details.down_payment)} today
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Clock size={16} color={colors.textSecondary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Installments</Text>
                    <Text style={styles.detailValue}>
                      {plan.installments_count} × {formatCurrency(details.installment_amount)}
                    </Text>
                    <Text style={styles.detailSubtext}>
                      {getFrequencyDisplay(plan.installment_frequency)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleExpand(plan.id)}
              >
                <Text style={styles.expandButtonText}>
                  {isExpanded ? 'Hide Details' : 'View Schedule'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.scheduleContainer}>
                <Text style={styles.scheduleTitle}>Payment Schedule</Text>
                {schedule.map((item, index) => (
                  <View key={index} style={styles.scheduleItem}>
                    <View style={styles.scheduleBullet} />
                    <Text style={styles.scheduleText}>{item}</Text>
                  </View>
                ))}
                <View style={styles.scheduleNote}>
                  <Info size={14} color={colors.info} />
                  <Text style={styles.scheduleNoteText}>
                    Payments will be automatically charged on due dates
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.footer}>
        <View style={styles.infoCard}>
          <Info size={20} color={colors.info} />
          <Text style={styles.infoText}>
            Payment plans are interest-free. You'll be charged automatically on each
            installment due date. Make sure your payment method is up to date.
          </Text>
        </View>
      </View>
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
    padding: spacing.xl,
  },
  noPlansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  noPlansText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.md,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  amount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planDetails: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  detailIcon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  detailContent: {
    flex: 1,
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detailSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  scheduleContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  scheduleTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  scheduleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  scheduleText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  scheduleNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  scheduleNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
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
