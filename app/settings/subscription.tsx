import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Crown,
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Settings,
  Receipt,
  Shield,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserSubscription,
  getSubscriptionPlans,
  formatPrice,
  getDaysUntilPeriodEnd,
  isSubscriptionActive,
  getStatusColor,
  formatSubscriptionStatus,
  willCancelAtPeriodEnd,
  type SubscriptionWithPlan,
  type SubscriptionPlan,
  type PlanName,
} from '@/lib/stripe-subscription-config';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function SubscriptionManagementScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionWithPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const [subData, plansData] = await Promise.all([
        getUserSubscription(user.id),
        getSubscriptionPlans(),
      ]);

      setSubscription(subData);
      setAvailablePlans(plansData);
    } catch (error) {
      console.error('Error loading subscription:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubscriptionData();
  };

  const handleChangePlan = () => {
    router.push('/subscription');
  };

  const handleCancelSubscription = () => {
    if (!subscription || !isSubscriptionActive(subscription)) {
      return;
    }

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: confirmCancellation,
        },
      ]
    );
  };

  const confirmCancellation = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: subscription?.stripe_subscription_id,
        },
      });

      if (error) throw error;

      Alert.alert(
        'Subscription Cancelled',
        'Your subscription has been cancelled. You will continue to have access until the end of your billing period.',
        [{ text: 'OK', onPress: loadSubscriptionData }]
      );
    } catch (error: any) {
      console.error('Cancel error:', error);
      Alert.alert('Error', error.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) {
      return;
    }

    Alert.alert(
      'Reactivate Subscription',
      'Would you like to reactivate your subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Reactivate',
          onPress: async () => {
            setProcessing(true);
            try {
              // Call edge function to reactivate
              const { error } = await supabase.functions.invoke('reactivate-subscription', {
                body: {
                  subscriptionId: subscription.stripe_subscription_id,
                },
              });

              if (error) throw error;

              Alert.alert('Success', 'Your subscription has been reactivated!', [
                { text: 'OK', onPress: loadSubscriptionData },
              ]);
            } catch (error: any) {
              console.error('Reactivate error:', error);
              Alert.alert('Error', error.message || 'Failed to reactivate subscription');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePaymentMethod = () => {
    router.push('/payment-methods');
  };

  const handleViewInvoices = () => {
    router.push('/settings/invoices');
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Pro':
        return <TrendingUp size={32} color="#3B82F6" />;
      case 'Premium':
        return <Crown size={32} color="#8B5CF6" />;
      case 'Elite':
        return <Crown size={32} color="#F59E0B" />;
      default:
        return <Shield size={32} color={colors.textSecondary} />;
    }
  };

  const getUpgradeOptions = () => {
    if (!subscription?.plan) return [];

    const currentPlanIndex = availablePlans.findIndex(
      (p) => p.id === subscription.plan_id
    );

    return availablePlans.slice(currentPlanIndex + 1);
  };

  const getDowngradeOptions = () => {
    if (!subscription?.plan) return [];

    const currentPlanIndex = availablePlans.findIndex(
      (p) => p.id === subscription.plan_id
    );

    return availablePlans.slice(0, currentPlanIndex);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading subscription...</Text>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.emptyContainer}>
        <Shield size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Active Subscription</Text>
        <Text style={styles.emptyText}>
          You're currently on the Free plan. Upgrade to unlock premium features.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/subscription')}
        >
          <Text style={styles.emptyButtonText}>View Plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = getDaysUntilPeriodEnd(subscription);
  const willCancel = willCancelAtPeriodEnd(subscription);
  const isActive = isSubscriptionActive(subscription);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Manage Subscription',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              {getPlanIcon(subscription.plan.name)}
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>{subscription.plan.display_name} Plan</Text>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(subscription.status) },
                  ]}
                />
                <Text style={styles.statusText}>
                  {formatSubscriptionStatus(subscription.status)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.planDescription}>
            {subscription.plan.description}
          </Text>

          <View style={styles.divider} />

          {/* Billing Info */}
          <View style={styles.billingSection}>
            <View style={styles.billingRow}>
              <View style={styles.billingInfo}>
                <Calendar size={20} color={colors.textSecondary} />
                <Text style={styles.billingLabel}>Billing Cycle</Text>
              </View>
              <Text style={styles.billingValue}>{subscription.billing_cycle}</Text>
            </View>

            <View style={styles.billingRow}>
              <View style={styles.billingInfo}>
                <CreditCard size={20} color={colors.textSecondary} />
                <Text style={styles.billingLabel}>Amount</Text>
              </View>
              <Text style={styles.billingValue}>
                {formatPrice(
                  subscription.billing_cycle === 'Yearly'
                    ? subscription.plan.price_yearly
                    : subscription.plan.price_monthly
                )}
                /{subscription.billing_cycle === 'Yearly' ? 'year' : 'month'}
              </Text>
            </View>

            <View style={styles.billingRow}>
              <View style={styles.billingInfo}>
                <RefreshCw size={20} color={colors.textSecondary} />
                <Text style={styles.billingLabel}>
                  {willCancel ? 'Ends on' : 'Renews on'}
                </Text>
              </View>
              <Text style={styles.billingValue}>
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Trial or Cancellation Notice */}
          {subscription.status === 'Trialing' && (
            <View style={styles.trialNotice}>
              <Shield size={20} color={colors.primary} />
              <Text style={styles.trialText}>
                Free trial ends in {daysRemaining} days. You won't be charged until then.
              </Text>
            </View>
          )}

          {willCancel && (
            <View style={styles.cancelNotice}>
              <AlertCircle size={20} color={colors.warning} />
              <Text style={styles.cancelText}>
                Your subscription will end in {daysRemaining} days. You can reactivate anytime.
              </Text>
            </View>
          )}

          {!willCancel && isActive && daysRemaining <= 7 && (
            <View style={styles.renewalNotice}>
              <Calendar size={20} color={colors.success} />
              <Text style={styles.renewalText}>
                Your subscription renews in {daysRemaining} days.
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Manage Plan</Text>

          {isActive && !willCancel && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleChangePlan}
              >
                <View style={styles.actionIcon}>
                  <ArrowUpCircle size={24} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Change Plan</Text>
                  <Text style={styles.actionDescription}>
                    Upgrade or downgrade your subscription
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUpdatePaymentMethod}
              >
                <View style={styles.actionIcon}>
                  <CreditCard size={24} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Payment Method</Text>
                  <Text style={styles.actionDescription}>
                    Update your billing information
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleViewInvoices}
              >
                <View style={styles.actionIcon}>
                  <Receipt size={24} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Invoices</Text>
                  <Text style={styles.actionDescription}>
                    View and download past invoices
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {willCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleReactivateSubscription}
              disabled={processing}
            >
              <View style={styles.actionIcon}>
                <RefreshCw size={24} color={colors.white} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.actionTitleWhite]}>
                  Reactivate Subscription
                </Text>
                <Text style={[styles.actionDescription, styles.actionDescriptionWhite]}>
                  Continue your subscription
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {isActive && !willCancel && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={handleCancelSubscription}
              disabled={processing}
            >
              <View style={styles.actionIcon}>
                <X size={24} color={colors.error} />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, styles.actionTitleDanger]}>
                  Cancel Subscription
                </Text>
                <Text style={styles.actionDescription}>
                  You'll have access until {new Date(subscription.current_period_end).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Included Features</Text>
          <View style={styles.featuresList}>
            {Array.isArray(subscription.plan.features) &&
              subscription.plan.features.map((feature, index) => {
                const featureText = typeof feature === 'string'
                  ? feature
                  : feature?.label || feature?.key || 'Unknown feature';

                return (
                  <View key={index} style={styles.featureRow}>
                    <Check size={18} color={colors.success} />
                    <Text style={styles.featureText}>{featureText}</Text>
                  </View>
                );
              })}
          </View>
        </View>

        {/* Upgrade Options */}
        {getUpgradeOptions().length > 0 && (
          <View style={styles.upgradeSection}>
            <Text style={styles.sectionTitle}>Available Upgrades</Text>
            {getUpgradeOptions().map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={styles.planOption}
                onPress={() =>
                  router.push({
                    pathname: '/subscription/checkout',
                    params: {
                      plan: plan.name,
                      billing: subscription.billing_cycle,
                    },
                  })
                }
              >
                <View style={styles.planOptionContent}>
                  <Text style={styles.planOptionName}>{plan.display_name}</Text>
                  <Text style={styles.planOptionPrice}>
                    {formatPrice(
                      subscription.billing_cycle === 'Yearly'
                        ? plan.price_yearly
                        : plan.price_monthly
                    )}
                    /{subscription.billing_cycle === 'Yearly' ? 'year' : 'month'}
                  </Text>
                </View>
                <ArrowUpCircle size={24} color={colors.success} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Support Info */}
        <View style={styles.supportSection}>
          <Shield size={24} color={colors.textSecondary} />
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our support team at support@dollarsmiley.com or call 1-800-DOLLAR-1
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => Alert.alert('Support', 'support@dollarsmiley.com\n1-800-DOLLAR-1')}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  currentPlanCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  planIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  planDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  billingSection: {
    gap: spacing.sm,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  billingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  billingLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  billingValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  trialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  trialText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 18,
  },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  cancelText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 18,
  },
  renewalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  renewalText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.success,
    lineHeight: 18,
  },
  actionsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonDanger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  actionTitleWhite: {
    color: colors.white,
  },
  actionTitleDanger: {
    color: colors.error,
  },
  actionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionDescriptionWhite: {
    color: colors.white + 'CC',
  },
  featuresSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  upgradeSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  planOptionContent: {
    flex: 1,
  },
  planOptionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  planOptionPrice: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  supportSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  supportText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  supportButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.lg,
  },
  supportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
