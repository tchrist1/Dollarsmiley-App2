import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Crown, Zap, Star, ArrowLeft, Grid, List } from 'lucide-react-native';
import SubscriptionComparison from '@/components/SubscriptionComparison';
import SubscriptionUsageTracker from '@/components/SubscriptionUsageTracker';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: { key: string; enabled: boolean; label: string }[];
  limits: {
    monthly_listings: number;
    monthly_jobs: number;
    photos_per_listing: number;
    featured_listings: number;
  };
  sort_order: number;
}

interface UserSubscription {
  plan_name: string;
  status: string;
  current_period_end: string;
  billing_cycle: string;
  cancel_at_period_end: boolean;
}

export default function SubscriptionScreen() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('cards');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansResponse, subscriptionResponse] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'),
        profile
          ? supabase
              .from('user_subscriptions')
              .select('*, plan:subscription_plans(name)')
              .eq('user_id', profile.id)
              .eq('status', 'Active')
              .single()
          : null,
      ]);

      if (plansResponse.data) {
        setPlans(plansResponse.data);
      }

      if (subscriptionResponse?.data) {
        setCurrentSubscription({
          plan_name: (subscriptionResponse.data.plan as any).name,
          status: subscriptionResponse.data.status,
          current_period_end: subscriptionResponse.data.current_period_end,
          billing_cycle: subscriptionResponse.data.billing_cycle,
          cancel_at_period_end: subscriptionResponse.data.cancel_at_period_end,
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!profile) {
      Alert.alert('Authentication Required', 'Please sign in to subscribe');
      return;
    }

    if (currentSubscription?.plan_name === plan.name) {
      Alert.alert('Already Subscribed', `You are currently on the ${plan.display_name}`);
      return;
    }

    setProcessing(true);

    try {
      if (plan.name === 'Free') {
        await subscribeToFreePlan();
      } else {
        await subscribeToProPlan(plan);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process subscription');
    } finally {
      setProcessing(false);
    }
  };

  const subscribeToFreePlan = async () => {
    if (!profile) return;

    const freePlan = plans.find((p) => p.name === 'Free');
    if (!freePlan) return;

    if (currentSubscription) {
      const { error: cancelError } = await supabase
        .from('user_subscriptions')
        .update({ status: 'Cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('status', 'Active');

      if (cancelError) throw cancelError;
    }

    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: profile.id,
      plan_id: freePlan.id,
      status: 'Active',
      current_period_start: new Date().toISOString(),
      current_period_end: null,
    });

    if (error) throw error;

    await supabase
      .from('profiles')
      .update({ subscription_plan: 'Free' })
      .eq('id', profile.id);

    Alert.alert('Success', 'Downgraded to Free plan');
    fetchData();
  };

  const subscribeToProPlan = async (plan: SubscriptionPlan) => {
    Alert.alert(
      'Upgrade Required',
      `To subscribe to ${plan.display_name}, you need to set up payment. This feature requires Stripe integration.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => {
            Alert.alert(
              'Stripe Integration',
              'To enable subscriptions:\n\n1. Set up your Stripe account\n2. Add Stripe price IDs to subscription plans\n3. Implement Stripe subscription checkout\n\nContact support for assistance.',
            );
          },
        },
      ]
    );
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Pro':
        return <Zap size={32} color={colors.primary} />;
      case 'Premium':
        return <Star size={32} color={colors.warning} />;
      case 'Elite':
        return <Crown size={32} color={colors.success} />;
      default:
        return null;
    }
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const price = billingCycle === 'Monthly' ? plan.price_monthly : plan.price_yearly;
    if (price === 0) return 'Free';

    const displayPrice = billingCycle === 'Yearly' ? (price / 12).toFixed(2) : price.toFixed(2);
    return `$${displayPrice}/${billingCycle === 'Monthly' ? 'mo' : 'mo*'}`;
  };

  const renderPlan = (plan: SubscriptionPlan) => {
    const isCurrentPlan = currentSubscription?.plan_name === plan.name;
    const isPopular = plan.name === 'Premium';

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          isPopular && styles.planCardPopular,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          {getPlanIcon(plan.name)}
          <Text style={styles.planName}>{plan.display_name}</Text>
          <Text style={styles.planDescription}>{plan.description}</Text>
        </View>

        <View style={styles.planPricing}>
          <Text style={styles.planPrice}>{formatPrice(plan)}</Text>
          {billingCycle === 'Yearly' && plan.price_yearly > 0 && (
            <Text style={styles.planPriceNote}>Billed ${plan.price_yearly}/year</Text>
          )}
        </View>

        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Check size={16} color={colors.success} />
              <Text style={styles.featureText}>{feature.label}</Text>
            </View>
          ))}

          <View style={styles.limitsSection}>
            <Text style={styles.limitsSectionTitle}>Usage Limits:</Text>
            {plan.limits.monthly_listings !== -1 && (
              <Text style={styles.limitsText}>
                • {plan.limits.monthly_listings} listings per month
              </Text>
            )}
            {plan.limits.monthly_listings === -1 && (
              <Text style={styles.limitsText}>• Unlimited listings</Text>
            )}
            {plan.limits.monthly_jobs !== -1 && (
              <Text style={styles.limitsText}>
                • {plan.limits.monthly_jobs} job posts per month
              </Text>
            )}
            {plan.limits.monthly_jobs === -1 && (
              <Text style={styles.limitsText}>• Unlimited job posts</Text>
            )}
            <Text style={styles.limitsText}>
              • {plan.limits.photos_per_listing} photos per listing
            </Text>
            {plan.limits.featured_listings > 0 && (
              <Text style={styles.limitsText}>
                • {plan.limits.featured_listings} featured listing
                {plan.limits.featured_listings > 1 ? 's' : ''}
              </Text>
            )}
            {plan.limits.featured_listings === -1 && (
              <Text style={styles.limitsText}>• Unlimited featured listings</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            isCurrentPlan && styles.subscribeButtonCurrent,
            isPopular && !isCurrentPlan && styles.subscribeButtonPopular,
          ]}
          onPress={() => handleSubscribe(plan)}
          disabled={processing || isCurrentPlan}
        >
          <Text
            style={[
              styles.subscribeButtonText,
              isCurrentPlan && styles.subscribeButtonTextCurrent,
            ]}
          >
            {isCurrentPlan ? 'Current Plan' : `Choose ${plan.display_name}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Plans</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Choose Your Plan</Text>
          <Text style={styles.introText}>
            Unlock premium features and grow your business with Dollarsmiley
          </Text>
        </View>

        {profile && (
          <SubscriptionUsageTracker
            userId={profile.id}
            onUpgradePress={() => {
              setViewMode('cards');
            }}
          />
        )}

        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'cards' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('cards')}
          >
            <Grid size={20} color={viewMode === 'cards' ? colors.primary : colors.textSecondary} />
            <Text
              style={[
                styles.viewToggleText,
                viewMode === 'cards' && styles.viewToggleTextActive,
              ]}
            >
              Plans
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'comparison' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setViewMode('comparison')}
          >
            <List
              size={20}
              color={viewMode === 'comparison' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewToggleText,
                viewMode === 'comparison' && styles.viewToggleTextActive,
              ]}
            >
              Compare
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === 'Monthly' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingCycle('Monthly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'Monthly' && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === 'Yearly' && styles.billingOptionActive,
            ]}
            onPress={() => setBillingCycle('Yearly')}
          >
            <Text
              style={[
                styles.billingOptionText,
                billingCycle === 'Yearly' && styles.billingOptionTextActive,
              ]}
            >
              Yearly
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsBadgeText}>Save 17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {viewMode === 'cards' ? (
          <>
            {currentSubscription && (
              <View style={styles.currentPlanBanner}>
                <Text style={styles.currentPlanText}>
                  Current Plan:{' '}
                  <Text style={styles.currentPlanName}>{currentSubscription.plan_name}</Text>
                </Text>
                {currentSubscription.current_period_end && (
                  <Text style={styles.currentPlanExpiry}>
                    {currentSubscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                    {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.plansContainer}>{plans.map((plan) => renderPlan(plan))}</View>
          </>
        ) : (
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonHeader}>
              <View style={styles.comparisonHeaderCell} />
              <Text style={styles.comparisonPlanName}>Free</Text>
              <Text style={styles.comparisonPlanName}>Pro</Text>
              <Text style={styles.comparisonPlanName}>Premium</Text>
              <Text style={styles.comparisonPlanName}>Elite</Text>
            </View>
            <SubscriptionComparison highlightPlan={currentSubscription?.plan_name as any} />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All plans include secure payments, real-time messaging, and customer support.
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
    padding: spacing.lg,
  },
  intro: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  introTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  introText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  billingOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  billingOptionActive: {
    backgroundColor: colors.primary,
  },
  billingOptionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  billingOptionTextActive: {
    color: colors.white,
  },
  savingsBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  savingsBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  currentPlanBanner: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  currentPlanText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  currentPlanName: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  currentPlanExpiry: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  plansContainer: {
    gap: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.md,
  },
  planCardPopular: {
    borderColor: colors.primary,
  },
  planCardCurrent: {
    borderColor: colors.success,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  popularBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  planDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  planPricing: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planPrice: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  planPriceNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  planFeatures: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  limitsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  limitsSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  limitsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  subscribeButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  subscribeButtonPopular: {
    backgroundColor: colors.primary,
  },
  subscribeButtonCurrent: {
    backgroundColor: colors.success,
  },
  subscribeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  subscribeButtonTextCurrent: {
    color: colors.white,
  },
  footer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.white,
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  viewToggleTextActive: {
    color: colors.primary,
  },
  comparisonContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  comparisonHeaderCell: {
    flex: 2,
  },
  comparisonPlanName: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
});
