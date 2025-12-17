import { supabase } from './supabase';

export type PlanName = 'Free' | 'Pro' | 'Premium' | 'Elite';
export type BillingCycle = 'Monthly' | 'Yearly';
export type SubscriptionStatus = 'Active' | 'Cancelled' | 'Expired' | 'PastDue' | 'Trialing';

export interface SubscriptionPlan {
  id: string;
  name: PlanName;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: string[];
  limits: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends UserSubscription {
  plan: SubscriptionPlan;
}

export interface SubscriptionMetrics {
  total_subscribers: number;
  active_subscribers: number;
  trial_subscribers: number;
  cancelled_subscribers: number;
  mrr: number;
  plan_distribution: Record<string, number>;
}

// Get all available subscription plans
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return [];
  }
}

// Get a specific plan by name
export async function getSubscriptionPlan(planName: PlanName): Promise<SubscriptionPlan | null> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    return null;
  }
}

// Get user's current subscription
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionWithPlan | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .in('status', ['Active', 'Trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

// Get plan comparison data
export async function getPlanComparison(): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_plan_comparison');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching plan comparison:', error);
    return [];
  }
}

// Check if user has access to a feature
export async function checkFeatureAccess(
  userId: string,
  featureKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_subscription_feature', {
      p_user_id: userId,
      p_feature_key: featureKey,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

// Check usage limit
export async function checkUsageLimit(
  userId: string,
  limitKey: string,
  currentUsage: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_user_id: userId,
      p_limit_key: limitKey,
      p_current_usage: currentUsage,
    });

    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return false;
  }
}

// Get user's subscription plan details
export async function getUserPlanDetails(userId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_user_subscription_plan', {
      p_user_id: userId,
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching user plan details:', error);
    return null;
  }
}

// Calculate yearly savings for a plan
export async function calculateYearlySavings(planName: PlanName): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('calculate_yearly_savings', {
      p_plan_name: planName,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error calculating yearly savings:', error);
    return 0;
  }
}

// Get subscription metrics (admin only)
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics | null> {
  try {
    const { data, error } = await supabase.rpc('get_subscription_metrics');

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        total_subscribers: Number(data[0].total_subscribers) || 0,
        active_subscribers: Number(data[0].active_subscribers) || 0,
        trial_subscribers: Number(data[0].trial_subscribers) || 0,
        cancelled_subscribers: Number(data[0].cancelled_subscribers) || 0,
        mrr: Number(data[0].mrr) || 0,
        plan_distribution: data[0].plan_distribution || {},
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return null;
  }
}

// Format price for display
// Note: For subscription prices stored in cents (Stripe format),
// divide by 100 before passing to this function
export function formatPrice(price: number): string {
  // If price is in cents (typical Stripe format > 1000), convert to dollars
  const dollars = price > 1000 ? price / 100 : price;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

// Calculate monthly equivalent of yearly price
export function getMonthlyEquivalent(yearlyPrice: number): number {
  return yearlyPrice / 12;
}

// Calculate discount percentage
export function calculateDiscountPercentage(
  monthlyPrice: number,
  yearlyPrice: number
): number {
  const yearlyEquivalent = monthlyPrice * 12;
  const discount = ((yearlyEquivalent - yearlyPrice) / yearlyEquivalent) * 100;
  return Math.round(discount);
}

// Get plan badge color
export function getPlanBadgeColor(planName: PlanName): string {
  const colors: Record<PlanName, string> = {
    Free: '#6B7280',
    Pro: '#3B82F6',
    Premium: '#8B5CF6',
    Elite: '#F59E0B',
  };
  return colors[planName];
}

// Get plan icon
export function getPlanIcon(planName: PlanName): string {
  const icons: Record<PlanName, string> = {
    Free: '🆓',
    Pro: '⭐',
    Premium: '💎',
    Elite: '👑',
  };
  return icons[planName];
}

// Check if plan has unlimited feature
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

// Format limit for display
export function formatLimit(limit: number, singularUnit: string, pluralUnit?: string): string {
  if (isUnlimited(limit)) {
    return 'Unlimited';
  }

  if (limit === 0) {
    return 'None';
  }

  const unit = limit === 1 ? singularUnit : pluralUnit || `${singularUnit}s`;
  return `${limit} ${unit}`;
}

// Get plan recommendation based on usage
export function recommendPlan(
  jobsPerMonth: number,
  needsAnalytics: boolean,
  needsAPI: boolean,
  teamSize: number
): PlanName {
  if (needsAPI || teamSize > 5) {
    return 'Premium';
  }

  if (needsAnalytics || jobsPerMonth > 10) {
    return 'Pro';
  }

  if (jobsPerMonth > 3) {
    return 'Pro';
  }

  return 'Free';
}

// Compare two plans
export function comparePlans(plan1: PlanName, plan2: PlanName): number {
  const order: Record<PlanName, number> = {
    Free: 1,
    Pro: 2,
    Premium: 3,
    Elite: 4,
  };
  return order[plan1] - order[plan2];
}

// Check if user can upgrade to plan
export function canUpgradeTo(currentPlan: PlanName, targetPlan: PlanName): boolean {
  return comparePlans(currentPlan, targetPlan) < 0;
}

// Check if user can downgrade to plan
export function canDowngradeTo(currentPlan: PlanName, targetPlan: PlanName): boolean {
  return comparePlans(currentPlan, targetPlan) > 0;
}

// Get upgrade path
export function getUpgradePath(currentPlan: PlanName): PlanName[] {
  const allPlans: PlanName[] = ['Free', 'Pro', 'Premium', 'Elite'];
  const currentIndex = allPlans.indexOf(currentPlan);
  return allPlans.slice(currentIndex + 1);
}

// Get downgrade path
export function getDowngradePath(currentPlan: PlanName): PlanName[] {
  const allPlans: PlanName[] = ['Free', 'Pro', 'Premium', 'Elite'];
  const currentIndex = allPlans.indexOf(currentPlan);
  return allPlans.slice(0, currentIndex).reverse();
}

// Check if subscription is active
export function isSubscriptionActive(subscription: UserSubscription): boolean {
  return subscription.status === 'Active' || subscription.status === 'Trialing';
}

// Check if subscription is in trial
export function isSubscriptionTrial(subscription: UserSubscription): boolean {
  return subscription.status === 'Trialing';
}

// Get days until period end
export function getDaysUntilPeriodEnd(subscription: UserSubscription): number {
  const end = new Date(subscription.current_period_end);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Check if subscription will cancel at period end
export function willCancelAtPeriodEnd(subscription: UserSubscription): boolean {
  return subscription.cancel_at_period_end;
}

// Format subscription status for display
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    Active: 'Active',
    Cancelled: 'Cancelled',
    Expired: 'Expired',
    PastDue: 'Past Due',
    Trialing: 'Trial',
  };
  return labels[status];
}

// Get status color
export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    Active: '#10B981',
    Cancelled: '#EF4444',
    Expired: '#6B7280',
    PastDue: '#F59E0B',
    Trialing: '#3B82F6',
  };
  return colors[status];
}

// Format billing cycle
export function formatBillingCycle(cycle: BillingCycle): string {
  return cycle === 'Monthly' ? 'per month' : 'per year';
}

// Get next billing date text
export function getNextBillingText(subscription: UserSubscription): string {
  if (willCancelAtPeriodEnd(subscription)) {
    return `Cancels on ${new Date(subscription.current_period_end).toLocaleDateString()}`;
  }

  return `Next billing on ${new Date(subscription.current_period_end).toLocaleDateString()}`;
}

// Feature groupings for display
export interface FeatureGroup {
  title: string;
  features: string[];
}

export function groupFeatures(features: string[]): FeatureGroup[] {
  const groups: FeatureGroup[] = [
    {
      title: 'Core Features',
      features: features.filter((f) =>
        f.includes('job') || f.includes('search') || f.includes('profile')
      ),
    },
    {
      title: 'Advanced Features',
      features: features.filter((f) =>
        f.includes('analytics') || f.includes('API') || f.includes('custom')
      ),
    },
    {
      title: 'Support & Success',
      features: features.filter((f) =>
        f.includes('support') || f.includes('manager') || f.includes('training')
      ),
    },
  ];

  // Add remaining features to "Other Features"
  const categorized = groups.flatMap((g) => g.features);
  const remaining = features.filter((f) => !categorized.includes(f));

  if (remaining.length > 0) {
    groups.push({
      title: 'Other Features',
      features: remaining,
    });
  }

  return groups.filter((g) => g.features.length > 0);
}

// Stripe product configuration
export const STRIPE_CONFIG = {
  products: {
    Pro: {
      name: 'Pro Plan',
      description: 'For active service providers',
      metadata: {
        tier: 'pro',
      },
    },
    Premium: {
      name: 'Premium Plan',
      description: 'For growing businesses',
      metadata: {
        tier: 'premium',
      },
    },
    Elite: {
      name: 'Elite Plan',
      description: 'For enterprise organizations',
      metadata: {
        tier: 'elite',
      },
    },
  },
  prices: {
    Pro: {
      monthly: {
        unit_amount: 2999,
        currency: 'usd',
        recurring: { interval: 'month' },
      },
      yearly: {
        unit_amount: 29990,
        currency: 'usd',
        recurring: { interval: 'year' },
      },
    },
    Premium: {
      monthly: {
        unit_amount: 7999,
        currency: 'usd',
        recurring: { interval: 'month' },
      },
      yearly: {
        unit_amount: 79990,
        currency: 'usd',
        recurring: { interval: 'year' },
      },
    },
    Elite: {
      monthly: {
        unit_amount: 19999,
        currency: 'usd',
        recurring: { interval: 'month' },
      },
      yearly: {
        unit_amount: 199990,
        currency: 'usd',
        recurring: { interval: 'year' },
      },
    },
  },
};
