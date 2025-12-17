import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  Check,
  X,
  Crown,
  Star,
  Zap,
  Gift,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSubscriptionPlans,
  getUserSubscription,
  calculateYearlySavings,
  formatPrice,
  calculateDiscountPercentage,
  getPlanBadgeColor,
  type SubscriptionPlan,
  type PlanName,
} from '@/lib/stripe-subscription-config';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SubscriptionPlanSelectorProps {
  onSelectPlan: (planName: PlanName, billingCycle: 'Monthly' | 'Yearly') => void;
  currentPlanName?: PlanName;
  highlightPlan?: PlanName;
  showComparison?: boolean;
}

export default function SubscriptionPlanSelector({
  onSelectPlan,
  currentPlanName,
  highlightPlan = 'Pro',
  showComparison = true,
}: SubscriptionPlanSelectorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isYearly, setIsYearly] = useState(true);
  const [savings, setSavings] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const plansData = await getSubscriptionPlans();
      setPlans(plansData);

      // Calculate savings for each plan
      const savingsData: Record<string, number> = {};
      for (const plan of plansData) {
        if (plan.name !== 'Free') {
          const saving = await calculateYearlySavings(plan.name as PlanName);
          savingsData[plan.name] = saving;
        }
      }
      setSavings(savingsData);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanPrice = (plan: SubscriptionPlan) => {
    return isYearly ? plan.price_yearly : plan.price_monthly;
  };

  const getMonthlyEquivalent = (plan: SubscriptionPlan) => {
    return isYearly ? plan.price_yearly / 12 : plan.price_monthly;
  };

  const getPlanIconComponent = (planName: string) => {
    switch (planName) {
      case 'Free':
        return <Gift size={28} color={colors.textSecondary} />;
      case 'Pro':
        return <Star size={28} color="#3B82F6" />;
      case 'Premium':
        return <Zap size={28} color="#8B5CF6" />;
      case 'Elite':
        return <Crown size={28} color="#F59E0B" />;
      default:
        return <Sparkles size={28} color={colors.primary} />;
    }
  };

  const isCurrentPlan = (planName: string) => {
    return currentPlanName === planName;
  };

  const isRecommended = (planName: string) => {
    return planName === highlightPlan;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the perfect plan for your needs
        </Text>
      </View>

      {/* Billing Toggle */}
      <View style={styles.billingToggle}>
        <Text
          style={[
            styles.billingLabel,
            !isYearly && styles.billingLabelActive,
          ]}
        >
          Monthly
        </Text>

        <Switch
          value={isYearly}
          onValueChange={setIsYearly}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.white}
        />

        <View style={styles.yearlyOption}>
          <Text
            style={[
              styles.billingLabel,
              isYearly && styles.billingLabelActive,
            ]}
          >
            Yearly
          </Text>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsBadgeText}>Save 17%</Text>
          </View>
        </View>
      </View>

      {/* Plans Grid */}
      <View style={styles.plansGrid}>
        {plans.map((plan) => {
          const price = getPlanPrice(plan);
          const monthlyEquiv = getMonthlyEquivalent(plan);
          const isCurrent = isCurrentPlan(plan.name);
          const recommended = isRecommended(plan.name);

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                recommended && styles.planCardRecommended,
                isCurrent && styles.planCardCurrent,
              ]}
            >
              {/* Recommended Badge */}
              {recommended && (
                <View style={styles.recommendedBadge}>
                  <TrendingUp size={14} color={colors.white} />
                  <Text style={styles.recommendedText}>MOST POPULAR</Text>
                </View>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Shield size={14} color={colors.white} />
                  <Text style={styles.currentText}>CURRENT PLAN</Text>
                </View>
              )}

              {/* Plan Header */}
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  {getPlanIconComponent(plan.name)}
                </View>
                <Text style={styles.planName}>{plan.display_name}</Text>
                <Text style={styles.planDescription}>{plan.description}</Text>
              </View>

              {/* Pricing */}
              <View style={styles.pricingSection}>
                {plan.name === 'Free' ? (
                  <View>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceAmount}>$0</Text>
                      <Text style={styles.pricePeriod}>/mo</Text>
                    </View>
                    <Text style={styles.priceSubtext}>Free forever</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceAmount}>
                        ${monthlyEquiv.toFixed(2)}
                      </Text>
                      <Text style={styles.pricePeriod}>/mo</Text>
                    </View>
                    {isYearly && (
                      <Text style={styles.priceSubtext}>
                        {formatPrice(price)} billed yearly
                      </Text>
                    )}
                    {!isYearly && (
                      <Text style={styles.priceSubtext}>
                        Billed monthly
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  recommended && styles.selectButtonRecommended,
                  isCurrent && styles.selectButtonDisabled,
                ]}
                onPress={() => onSelectPlan(plan.name as PlanName, isYearly ? 'Yearly' : 'Monthly')}
                disabled={isCurrent}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    recommended && styles.selectButtonTextRecommended,
                  ]}
                >
                  {isCurrent ? 'Current Plan' : plan.name === 'Free' ? 'Get Started Free' : 'Upgrade Now'}
                </Text>
                {!isCurrent && <ArrowRight size={20} color={recommended ? colors.white : colors.text} />}
              </TouchableOpacity>

              {/* Features List */}
              <View style={styles.featuresList}>
                {Array.isArray(plan.features) && plan.features.slice(0, 6).map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={18} color={colors.success} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
                {Array.isArray(plan.features) && plan.features.length > 6 && (
                  <Text style={styles.moreFeatures}>
                    + {plan.features.length - 6} more features
                  </Text>
                )}
              </View>

              {/* Savings Highlight */}
              {isYearly && savings[plan.name] > 0 && (
                <View style={styles.savingsHighlight}>
                  <Sparkles size={16} color={colors.success} />
                  <Text style={styles.savingsHighlightText}>
                    You save {formatPrice(savings[plan.name])} per year
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Feature Comparison Table */}
      {showComparison && (
        <View style={styles.comparisonSection}>
          <Text style={styles.comparisonTitle}>Feature Comparison</Text>

          <View style={styles.comparisonTable}>
            {/* Header Row */}
            <View style={styles.tableHeader}>
              <View style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>Feature</Text>
              </View>
              {plans.map((plan) => (
                <View key={plan.id} style={styles.tablePlanCell}>
                  <Text style={styles.tablePlanName}>{plan.display_name}</Text>
                </View>
              ))}
            </View>

            {/* Feature Rows */}
            {[
              { label: 'Job Posts per Month', key: 'max_jobs_per_month' },
              { label: 'Featured Listings', key: 'featured_listings' },
              { label: 'Priority Support', key: 'priority_support' },
              { label: 'Analytics', key: 'analytics_access' },
              { label: 'API Access', key: 'api_access' },
              { label: 'Custom Branding', key: 'custom_branding' },
              { label: 'Team Seats', key: 'team_seats' },
            ].map((row, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableFeatureCell}>
                  <Text style={styles.tableFeatureText}>{row.label}</Text>
                </View>
                {plans.map((plan) => {
                  const value = plan.limits?.[row.key];
                  return (
                    <View key={plan.id} style={styles.tableValueCell}>
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check size={20} color={colors.success} />
                        ) : (
                          <X size={20} color={colors.textTertiary} />
                        )
                      ) : typeof value === 'number' ? (
                        <Text style={styles.tableValueText}>
                          {value === -1 ? '∞' : value === 0 ? '–' : value}
                        </Text>
                      ) : (
                        <X size={20} color={colors.textTertiary} />
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Trust Indicators */}
      <View style={styles.trustSection}>
        <View style={styles.trustItem}>
          <Shield size={32} color={colors.success} />
          <Text style={styles.trustTitle}>Secure Payment</Text>
          <Text style={styles.trustText}>256-bit SSL encryption</Text>
        </View>
        <View style={styles.trustItem}>
          <Check size={32} color={colors.success} />
          <Text style={styles.trustTitle}>14-Day Trial</Text>
          <Text style={styles.trustText}>No credit card required</Text>
        </View>
        <View style={styles.trustItem}>
          <X size={32} color={colors.success} />
          <Text style={styles.trustTitle}>Cancel Anytime</Text>
          <Text style={styles.trustText}>No questions asked</Text>
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I change plans later?</Text>
          <Text style={styles.faqAnswer}>
            Yes! Upgrade or downgrade anytime. Changes take effect immediately.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>What happens after the free trial?</Text>
          <Text style={styles.faqAnswer}>
            You'll be charged after 14 days. Cancel before then and pay nothing.
          </Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQuestion}>Can I get a refund?</Text>
          <Text style={styles.faqAnswer}>
            Yes, we offer a 30-day money-back guarantee on all paid plans.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.md,
    alignSelf: 'center',
  },
  billingLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  billingLabelActive: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
  yearlyOption: {
    alignItems: 'center',
  },
  savingsBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 2,
  },
  savingsBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  plansGrid: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
  },
  planCardRecommended: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  planCardCurrent: {
    borderColor: colors.success,
    backgroundColor: colors.surface,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  recommendedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  currentBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  currentText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  planHeader: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  planIconContainer: {
    width: 72,
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  planDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pricingSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  priceAmount: {
    fontSize: 56,
    fontWeight: fontWeight.bold,
    color: colors.text,
    lineHeight: 64,
  },
  pricePeriod: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  priceSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  selectButtonRecommended: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectButtonDisabled: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  selectButtonTextRecommended: {
    color: colors.white,
  },
  featuresList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  moreFeatures: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  savingsHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  savingsHighlightText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  comparisonSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  comparisonTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  comparisonTable: {
    gap: spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  tableHeaderCell: {
    flex: 2,
  },
  tableHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tablePlanCell: {
    flex: 1,
    alignItems: 'center',
  },
  tablePlanName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableFeatureCell: {
    flex: 2,
  },
  tableFeatureText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  tableValueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableValueText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  trustSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  trustText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  faqSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  faqTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  faqItem: {
    marginBottom: spacing.lg,
  },
  faqQuestion: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  faqAnswer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
