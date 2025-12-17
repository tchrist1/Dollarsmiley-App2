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
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react-native';
import {
  getUserPaymentPlans,
  getUpcomingInstallments,
  getOverdueInstallments,
  formatCurrency,
  getPaymentPlanStatusColor,
  getPaymentPlanProgress,
  getRemainingBalance,
  type BookingPaymentPlan,
  type PaymentInstallment,
} from '@/lib/payment-plans';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentPlansScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<BookingPaymentPlan[]>([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState<any[]>([]);
  const [overdueInstallments, setOverdueInstallments] = useState<PaymentInstallment[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [plans, upcoming, overdue] = await Promise.all([
        getUserPaymentPlans(user.id),
        getUpcomingInstallments(user.id),
        getOverdueInstallments(user.id),
      ]);

      setPaymentPlans(plans);
      setUpcomingInstallments(upcoming);
      setOverdueInstallments(overdue);
    } catch (error) {
      console.error('Error loading payment plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePlanPress = (planId: string) => {
    router.push(`/payment-plans/${planId}`);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view payment plans</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Plans</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const activePlans = paymentPlans.filter((p) => p.status === 'Active');
  const completedPlans = paymentPlans.filter((p) => p.status === 'Completed');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Plans</Text>
        <Text style={styles.subtitle}>
          {paymentPlans.length} total plan{paymentPlans.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {overdueInstallments.length > 0 && (
          <View style={styles.alertCard}>
            <AlertCircle size={24} color={colors.error} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Overdue Payments</Text>
              <Text style={styles.alertText}>
                You have {overdueInstallments.length} overdue payment
                {overdueInstallments.length !== 1 ? 's' : ''}. Please update your
                payment method to avoid service interruption.
              </Text>
            </View>
          </View>
        )}

        {upcomingInstallments.length > 0 && overdueInstallments.length === 0 && (
          <View style={styles.upcomingCard}>
            <Clock size={24} color={colors.warning} />
            <View style={styles.upcomingContent}>
              <Text style={styles.upcomingTitle}>Upcoming Payments</Text>
              <Text style={styles.upcomingText}>
                {upcomingInstallments.length} payment
                {upcomingInstallments.length !== 1 ? 's' : ''} due in the next 7 days
              </Text>
            </View>
          </View>
        )}

        {activePlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Plans</Text>
            {activePlans.map((plan) => {
              const statusColor = getPaymentPlanStatusColor(plan.status);
              const progress = getPaymentPlanProgress(plan);
              const remaining = getRemainingBalance(plan);

              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, { borderLeftColor: statusColor }]}
                  onPress={() => handlePlanPress(plan.id)}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planInfo}>
                      <Text style={styles.planTitle} numberOfLines={1}>
                        {plan.booking?.title || 'Booking'}
                      </Text>
                      <Text style={styles.planDate}>
                        {plan.booking?.scheduled_date &&
                          new Date(plan.booking.scheduled_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                      <Text style={styles.statusText}>{plan.status}</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                      {plan.installments_paid} of {plan.installments_count} payments
                      completed
                    </Text>
                  </View>

                  <View style={styles.planDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Remaining Balance</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(remaining)}
                      </Text>
                    </View>
                    {plan.next_payment_date && (
                      <View style={styles.detailRow}>
                        <View style={styles.detailLabelContainer}>
                          <Calendar size={14} color={colors.textSecondary} />
                          <Text style={styles.detailLabel}>Next Payment</Text>
                        </View>
                        <Text style={styles.detailValue}>
                          {new Date(plan.next_payment_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {completedPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Plans</Text>
            {completedPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  { borderLeftColor: colors.success, opacity: 0.7 },
                ]}
                onPress={() => handlePlanPress(plan.id)}
              >
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle} numberOfLines={1}>
                      {plan.booking?.title || 'Booking'}
                    </Text>
                    <Text style={styles.planDate}>
                      {plan.booking?.scheduled_date &&
                        new Date(plan.booking.scheduled_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <CheckCircle size={24} color={colors.success} />
                </View>

                <View style={styles.completedInfo}>
                  <Text style={styles.completedText}>
                    All payments completed - {formatCurrency(plan.total_amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {paymentPlans.length === 0 && (
          <View style={styles.emptyContainer}>
            <DollarSign size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No payment plans yet</Text>
            <Text style={styles.emptySubtext}>
              Payment plans will appear here when you book services with
              installment payments
            </Text>
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.error + '15',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
  },
  alertContent: {
    flex: 1,
    gap: spacing.xs,
  },
  alertTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.warning + '15',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  upcomingContent: {
    flex: 1,
    gap: spacing.xs,
  },
  upcomingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  upcomingText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 20,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.md,
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
  planTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  planDate: {
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
  progressContainer: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  planDetails: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  completedInfo: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
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
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
