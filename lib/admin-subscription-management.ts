import { supabase } from './supabase';
import type { PlanName, BillingCycle, SubscriptionStatus } from './stripe-subscription-config';

export interface AdminSubscriptionPlan {
  id: string;
  name: PlanName;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly: string | null;
  stripe_price_id_yearly: string | null;
  features: any[];
  limits: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanFormData {
  name: PlanName;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  features: any[];
  limits: Record<string, any>;
  is_active: boolean;
  sort_order: number;
}

export interface AdminUserSubscription {
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
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  plan?: AdminSubscriptionPlan;
}

export interface SubscriptionMetrics {
  total_subscribers: number;
  active_subscribers: number;
  trial_subscribers: number;
  cancelled_subscribers: number;
  expired_subscribers: number;
  past_due_subscribers: number;
  mrr: number;
  arr: number;
  churn_rate: number;
  plan_distribution: Record<string, number>;
  revenue_by_plan: Record<string, number>;
}

export interface SubscriptionAnalytics {
  new_subscriptions_this_month: number;
  cancellations_this_month: number;
  upgrades_this_month: number;
  downgrades_this_month: number;
  trial_conversions: number;
  trial_conversion_rate: number;
  average_subscription_value: number;
  lifetime_value: number;
}

/**
 * Get all subscription plans (admin only)
 */
export async function getAllSubscriptionPlans(): Promise<AdminSubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all subscription plans:', error);
    return [];
  }
}

/**
 * Create a new subscription plan (admin only)
 */
export async function createSubscriptionPlan(
  planData: SubscriptionPlanFormData
): Promise<{ success: boolean; data?: AdminSubscriptionPlan; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([planData])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating subscription plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update subscription plan (admin only)
 */
export async function updateSubscriptionPlan(
  planId: string,
  updates: Partial<SubscriptionPlanFormData>
): Promise<{ success: boolean; data?: AdminSubscriptionPlan; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error updating subscription plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete subscription plan (admin only)
 */
export async function deleteSubscriptionPlan(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if any users have this plan
    const { count } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId)
      .in('status', ['Active', 'Trialing']);

    if (count && count > 0) {
      return {
        success: false,
        error: `Cannot delete plan with ${count} active subscriber(s)`,
      };
    }

    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting subscription plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Toggle plan active status (admin only)
 */
export async function togglePlanActiveStatus(
  planId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error toggling plan status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all user subscriptions (admin only)
 */
export async function getAllUserSubscriptions(
  filters?: {
    status?: SubscriptionStatus;
    plan_id?: string;
    search?: string;
  }
): Promise<AdminUserSubscription[]> {
  try {
    let query = supabase
      .from('user_subscriptions')
      .select(`
        *,
        user:profiles!user_subscriptions_user_id_fkey(id, full_name, email),
        plan:subscription_plans(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.plan_id) {
      query = query.eq('plan_id', filters.plan_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Apply search filter client-side if provided
    let results = data || [];
    if (filters?.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(
        (sub: any) =>
          sub.user?.full_name?.toLowerCase().includes(searchLower) ||
          sub.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    return results;
  } catch (error) {
    console.error('Error fetching user subscriptions:', error);
    return [];
  }
}

/**
 * Get subscription metrics (admin only)
 */
export async function getSubscriptionMetrics(): Promise<SubscriptionMetrics | null> {
  try {
    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('user_subscriptions')
      .select('status')
      .in('status', ['Active', 'Trialing', 'Cancelled', 'Expired', 'PastDue']);

    const total = statusCounts?.length || 0;
    const active = statusCounts?.filter((s) => s.status === 'Active').length || 0;
    const trialing = statusCounts?.filter((s) => s.status === 'Trialing').length || 0;
    const cancelled = statusCounts?.filter((s) => s.status === 'Cancelled').length || 0;
    const expired = statusCounts?.filter((s) => s.status === 'Expired').length || 0;
    const pastDue = statusCounts?.filter((s) => s.status === 'PastDue').length || 0;

    // Get active subscriptions with plan details
    const { data: activeSubscriptions } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .in('status', ['Active', 'Trialing']);

    // Calculate MRR and plan distribution
    let mrr = 0;
    const planDistribution: Record<string, number> = {};
    const revenueByPlan: Record<string, number> = {};

    activeSubscriptions?.forEach((sub: any) => {
      const plan = sub.plan;
      if (!plan) return;

      // Count plan distribution
      planDistribution[plan.name] = (planDistribution[plan.name] || 0) + 1;

      // Calculate MRR
      let revenue = 0;
      if (sub.billing_cycle === 'Monthly') {
        revenue = plan.price_monthly;
      } else if (sub.billing_cycle === 'Yearly') {
        revenue = plan.price_yearly / 12;
      }
      mrr += revenue;

      // Revenue by plan
      revenueByPlan[plan.name] = (revenueByPlan[plan.name] || 0) + revenue;
    });

    // Calculate ARR
    const arr = mrr * 12;

    // Calculate churn rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentCancellations } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('status', 'Cancelled')
      .gte('cancelled_at', thirtyDaysAgo.toISOString());

    const churnRate =
      total > 0 ? ((recentCancellations?.length || 0) / total) * 100 : 0;

    return {
      total_subscribers: total,
      active_subscribers: active,
      trial_subscribers: trialing,
      cancelled_subscribers: cancelled,
      expired_subscribers: expired,
      past_due_subscribers: pastDue,
      mrr,
      arr,
      churn_rate: churnRate,
      plan_distribution: planDistribution,
      revenue_by_plan: revenueByPlan,
    };
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return null;
  }
}

/**
 * Get subscription analytics (admin only)
 */
export async function getSubscriptionAnalytics(): Promise<SubscriptionAnalytics | null> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // New subscriptions this month
    const { count: newSubscriptions } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'Expired');

    // Cancellations this month
    const { count: cancellations } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Cancelled')
      .gte('cancelled_at', monthStart.toISOString());

    // Get all subscriptions with plan details for average calculations
    const { data: allSubs } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .in('status', ['Active', 'Trialing']);

    // Calculate average subscription value
    let totalValue = 0;
    allSubs?.forEach((sub: any) => {
      if (sub.billing_cycle === 'Monthly') {
        totalValue += sub.plan?.price_monthly || 0;
      } else if (sub.billing_cycle === 'Yearly') {
        totalValue += sub.plan?.price_yearly || 0;
      }
    });

    const averageValue = allSubs && allSubs.length > 0 ? totalValue / allSubs.length : 0;

    // Get trial conversions
    const { data: completedTrials } = await supabase
      .from('user_subscriptions')
      .select('status, trial_end')
      .not('trial_end', 'is', null)
      .lt('trial_end', now.toISOString())
      .gte('trial_end', monthStart.toISOString());

    const trialConversions =
      completedTrials?.filter((t) => t.status === 'Active').length || 0;
    const totalTrials = completedTrials?.length || 0;
    const conversionRate = totalTrials > 0 ? (trialConversions / totalTrials) * 100 : 0;

    // Estimate lifetime value (simplified: average value * 12 months)
    const lifetimeValue = averageValue * 12;

    return {
      new_subscriptions_this_month: newSubscriptions || 0,
      cancellations_this_month: cancellations || 0,
      upgrades_this_month: 0,
      downgrades_this_month: 0,
      trial_conversions: trialConversions,
      trial_conversion_rate: conversionRate,
      average_subscription_value: averageValue,
      lifetime_value: lifetimeValue,
    };
  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    return null;
  }
}

/**
 * Manually update user subscription status (admin only)
 */
export async function updateUserSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Cancelled') {
      updates.cancelled_at = new Date().toISOString();
      updates.cancel_at_period_end = false;
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update(updates)
      .eq('id', subscriptionId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating subscription status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get subscription history for a user (admin only)
 */
export async function getUserSubscriptionHistory(
  userId: string
): Promise<AdminUserSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user subscription history:', error);
    return [];
  }
}

/**
 * Get plan subscribers (admin only)
 */
export async function getPlanSubscribers(
  planId: string
): Promise<AdminUserSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        user:profiles!user_subscriptions_user_id_fkey(id, full_name, email)
      `)
      .eq('plan_id', planId)
      .in('status', ['Active', 'Trialing'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching plan subscribers:', error);
    return [];
  }
}

/**
 * Export subscription data (admin only)
 */
export async function exportSubscriptionData(
  format: 'csv' | 'json' = 'csv'
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const subscriptions = await getAllUserSubscriptions();

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(subscriptions, null, 2),
      };
    }

    // CSV format
    const headers = [
      'User ID',
      'User Name',
      'Email',
      'Plan',
      'Status',
      'Billing Cycle',
      'Period Start',
      'Period End',
      'Created At',
    ];

    const rows = subscriptions.map((sub) => [
      sub.user_id,
      sub.user?.full_name || '',
      sub.user?.email || '',
      sub.plan?.display_name || '',
      sub.status,
      sub.billing_cycle || '',
      sub.current_period_start || '',
      sub.current_period_end || '',
      sub.created_at,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return { success: true, data: csv };
  } catch (error: any) {
    console.error('Error exporting subscription data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get revenue trends (admin only)
 */
export async function getRevenueTrends(
  months: number = 12
): Promise<Array<{ month: string; mrr: number; subscribers: number }>> {
  try {
    const trends: Array<{ month: string; mrr: number; subscribers: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      // Get active subscriptions for that month
      const { data: subs } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .in('status', ['Active', 'Trialing'])
        .lte('created_at', nextMonthDate.toISOString())
        .or(
          `current_period_end.gte.${monthDate.toISOString()},current_period_end.is.null`
        );

      let mrr = 0;
      subs?.forEach((sub: any) => {
        if (sub.billing_cycle === 'Monthly') {
          mrr += sub.plan?.price_monthly || 0;
        } else if (sub.billing_cycle === 'Yearly') {
          mrr += (sub.plan?.price_yearly || 0) / 12;
        }
      });

      trends.push({
        month: monthDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        mrr,
        subscribers: subs?.length || 0,
      });
    }

    return trends;
  } catch (error) {
    console.error('Error fetching revenue trends:', error);
    return [];
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    Active: '#10B981',
    Trialing: '#3B82F6',
    Cancelled: '#EF4444',
    Expired: '#6B7280',
    PastDue: '#F59E0B',
  };
  return colors[status];
}
