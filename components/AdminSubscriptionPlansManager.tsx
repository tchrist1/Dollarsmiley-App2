import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Eye,
  EyeOff,
  TrendingUp,
  Package,
} from 'lucide-react-native';
import {
  getAllSubscriptionPlans,
  deleteSubscriptionPlan,
  togglePlanActiveStatus,
  getPlanSubscribers,
  formatCurrency,
  type AdminSubscriptionPlan,
} from '@/lib/admin-subscription-management';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AdminSubscriptionPlansManagerProps {
  onEditPlan?: (plan: AdminSubscriptionPlan) => void;
  onCreatePlan?: () => void;
}

export default function AdminSubscriptionPlansManager({
  onEditPlan,
  onCreatePlan,
}: AdminSubscriptionPlansManagerProps) {
  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getAllSubscriptionPlans();
      setPlans(data);

      // Load subscriber counts for each plan
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (plan) => {
          const subscribers = await getPlanSubscribers(plan.id);
          counts[plan.id] = subscribers.length;
        })
      );
      setSubscriberCounts(counts);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleToggleActive = async (planId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const statusText = newStatus ? 'activate' : 'deactivate';

    Alert.alert(
      `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} Plan`,
      `Are you sure you want to ${statusText} this plan? ${
        !newStatus
          ? 'Existing subscribers will keep their subscriptions, but new users cannot subscribe.'
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await togglePlanActiveStatus(planId, newStatus);
            if (result.success) {
              Alert.alert('Success', `Plan ${statusText}d successfully`);
              loadPlans();
            } else {
              Alert.alert('Error', result.error || `Failed to ${statusText} plan`);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (planId: string, planName: string) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete the ${planName} plan? This action cannot be undone. Plans with active subscribers cannot be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSubscriptionPlan(planId);
            if (result.success) {
              Alert.alert('Success', 'Plan deleted successfully');
              loadPlans();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const getPlanIcon = (planName: string): string => {
    const icons: Record<string, string> = {
      Free: '🆓',
      Pro: '⭐',
      Premium: '💎',
      Elite: '👑',
    };
    return icons[planName] || '📦';
  };

  const getPlanColor = (planName: string): string => {
    const colors: Record<string, string> = {
      Free: '#6B7280',
      Pro: '#3B82F6',
      Premium: '#8B5CF6',
      Elite: '#F59E0B',
    };
    return colors[planName] || '#6B7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscription Plans</Text>
          <Text style={styles.subtitle}>{plans.length} total plans</Text>
        </View>
        {onCreatePlan && (
          <TouchableOpacity style={styles.createButton} onPress={onCreatePlan}>
            <Plus size={20} color={colors.white} />
            <Text style={styles.createButtonText}>New Plan</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.plansGrid}>
        {plans.map((plan) => {
          const planColor = getPlanColor(plan.name);
          const subscriberCount = subscriberCounts[plan.id] || 0;
          const monthlyRevenue = subscriberCount * plan.price_monthly;

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                { borderTopColor: planColor },
                !plan.is_active && styles.inactivePlanCard,
              ]}
            >
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Text style={styles.planIcon}>{getPlanIcon(plan.name)}</Text>
                  <View style={styles.planTitleContainer}>
                    <Text style={styles.planName}>{plan.display_name}</Text>
                    {!plan.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveBadgeText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.planActions}>
                  {onEditPlan && (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => onEditPlan(plan)}
                    >
                      <Edit size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() =>
                      handleToggleActive(plan.id, plan.is_active)
                    }
                  >
                    {plan.is_active ? (
                      <Eye size={18} color={colors.success} />
                    ) : (
                      <EyeOff size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  {plan.name !== 'Free' && (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDelete(plan.id, plan.display_name)}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.planDescription} numberOfLines={2}>
                {plan.description}
              </Text>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Monthly</Text>
                  <Text style={styles.priceValue}>
                    {formatCurrency(plan.price_monthly)}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Yearly</Text>
                  <View style={styles.yearlyPriceContainer}>
                    <Text style={styles.priceValue}>
                      {formatCurrency(plan.price_yearly)}
                    </Text>
                    {plan.price_monthly > 0 && plan.price_yearly > 0 && (
                      <Text style={styles.savingsText}>
                        Save{' '}
                        {Math.round(
                          ((plan.price_monthly * 12 - plan.price_yearly) /
                            (plan.price_monthly * 12)) *
                            100
                        )}
                        %
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Users size={16} color={colors.primary} />
                  <Text style={styles.statLabel}>Subscribers</Text>
                  <Text style={styles.statValue}>{subscriberCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <DollarSign size={16} color={colors.success} />
                  <Text style={styles.statLabel}>Monthly Revenue</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(monthlyRevenue)}
                  </Text>
                </View>
              </View>

              <View style={styles.limitsContainer}>
                <Text style={styles.limitsTitle}>Limits</Text>
                <View style={styles.limitsList}>
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <View key={key} style={styles.limitItem}>
                      <Text style={styles.limitKey}>
                        {key
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Text>
                      <Text style={styles.limitValue}>
                        {value === -1 ? 'Unlimited' : value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>
                  Features ({plan.features?.length || 0})
                </Text>
                <View style={styles.featuresList}>
                  {plan.features?.slice(0, 3).map((feature: any, index: number) => (
                    <Text key={index} style={styles.featureItem}>
                      {feature.enabled ? '✓' : '✗'} {feature.label}
                    </Text>
                  ))}
                  {plan.features && plan.features.length > 3 && (
                    <Text style={styles.moreFeatures}>
                      +{plan.features.length - 3} more
                    </Text>
                  )}
                </View>
              </View>

              {plan.stripe_price_id_monthly || plan.stripe_price_id_yearly ? (
                <View style={styles.stripeInfo}>
                  <Package size={14} color={colors.textSecondary} />
                  <Text style={styles.stripeText}>Stripe Connected</Text>
                </View>
              ) : (
                <View style={styles.stripeInfo}>
                  <Package size={14} color={colors.warning} />
                  <Text style={styles.stripeWarning}>No Stripe IDs</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {plans.length === 0 && (
        <View style={styles.emptyContainer}>
          <Package size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No subscription plans</Text>
          <Text style={styles.emptySubtext}>
            Create your first plan to get started
          </Text>
          {onCreatePlan && (
            <TouchableOpacity style={styles.emptyButton} onPress={onCreatePlan}>
              <Plus size={20} color={colors.white} />
              <Text style={styles.emptyButtonText}>Create Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  plansGrid: {
    padding: spacing.md,
    gap: spacing.md,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderTopWidth: 4,
    gap: spacing.md,
  },
  inactivePlanCard: {
    opacity: 0.6,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planIcon: {
    fontSize: 32,
  },
  planTitleContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  inactiveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.textSecondary + '20',
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  planActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  planDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  priceContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  yearlyPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  savingsText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  limitsContainer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  limitsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  limitsList: {
    gap: spacing.xs,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitKey: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  limitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  featuresContainer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  featuresTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  featuresList: {
    gap: spacing.xs,
  },
  featureItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  moreFeatures: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  stripeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stripeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  stripeWarning: {
    fontSize: fontSize.xs,
    color: colors.warning,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
