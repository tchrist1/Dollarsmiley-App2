import { supabase } from './supabase';
import { getUserSubscription, type SubscriptionPlan } from './stripe-subscription-config';

export type UsageMetric =
  | 'job_posts'
  | 'listings'
  | 'bookings'
  | 'messages'
  | 'featured_listings'
  | 'api_calls'
  | 'storage_mb'
  | 'team_seats';

export interface UsageData {
  metric: UsageMetric;
  count: number;
  limit: number;
  percentage: number;
  unlimited: boolean;
  remaining: number;
  exceeded: boolean;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  metric: UsageMetric;
  count: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export interface UsageSummary {
  userId: string;
  plan: SubscriptionPlan;
  usage: UsageData[];
  periodStart: string;
  periodEnd: string;
  hasExceeded: boolean;
}

export async function trackUsage(
  userId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<{ success: boolean; usage: UsageData | null; error?: string }> {
  try {
    // Get current period
    const { periodStart, periodEnd } = getCurrentPeriod();

    // Get or create usage record
    const { data: existingUsage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('metric', metric)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .single();

    let newCount = amount;
    if (existingUsage) {
      newCount = existingUsage.count + amount;

      await supabase
        .from('usage_tracking')
        .update({
          count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUsage.id);
    } else {
      await supabase.from('usage_tracking').insert({
        user_id: userId,
        metric,
        count: newCount,
        period_start: periodStart,
        period_end: periodEnd,
      });
    }

    // Check against limits
    const usageData = await checkUsageLimit(userId, metric);

    if (usageData.exceeded) {
      return {
        success: false,
        usage: usageData,
        error: `${metric.replace(/_/g, ' ')} limit exceeded`,
      };
    }

    return { success: true, usage: usageData };
  } catch (error: any) {
    console.error('Error tracking usage:', error);
    return { success: false, usage: null, error: error.message };
  }
}

export async function checkUsageLimit(
  userId: string,
  metric: UsageMetric
): Promise<UsageData> {
  // TESTING MODE: Always return unlimited usage
  return {
    metric,
    count: 0,
    limit: -1,
    percentage: 0,
    unlimited: true,
    remaining: Infinity,
    exceeded: false,
  };
}

export async function canPerformAction(
  userId: string,
  metric: UsageMetric,
  amount: number = 1
): Promise<{ allowed: boolean; usage: UsageData; message?: string }> {
  // TESTING MODE: Always allow all actions with unlimited usage
  return {
    allowed: true,
    usage: {
      metric,
      count: 0,
      limit: -1,
      percentage: 0,
      unlimited: true,
      remaining: Infinity,
      exceeded: false,
    },
  };
}

export async function getUserUsageSummary(userId: string): Promise<UsageSummary | null> {
  try {
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || null;

    if (!plan) {
      return null;
    }

    const { periodStart, periodEnd } = getCurrentPeriod();

    // Get all usage for current period
    const { data: usageRecords } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd);

    // Build usage data for all metrics
    const metrics: UsageMetric[] = [
      'job_posts',
      'listings',
      'bookings',
      'messages',
      'featured_listings',
      'api_calls',
      'storage_mb',
      'team_seats',
    ];

    const usage: UsageData[] = [];
    let hasExceeded = false;

    for (const metric of metrics) {
      const record = usageRecords?.find((r) => r.metric === metric);
      const count = record?.count || 0;
      const limit = getMetricLimit(plan, metric);
      const unlimited = limit === -1;
      const remaining = unlimited ? Infinity : Math.max(0, limit - count);
      const percentage = unlimited ? 0 : (count / limit) * 100;
      const exceeded = !unlimited && count >= limit;

      if (exceeded) {
        hasExceeded = true;
      }

      usage.push({
        metric,
        count,
        limit,
        percentage,
        unlimited,
        remaining,
        exceeded,
      });
    }

    return {
      userId,
      plan,
      usage,
      periodStart,
      periodEnd,
      hasExceeded,
    };
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return null;
  }
}

export async function resetUsage(userId: string): Promise<void> {
  try {
    const { periodStart, periodEnd } = getCurrentPeriod();

    await supabase
      .from('usage_tracking')
      .delete()
      .eq('user_id', userId)
      .lt('period_end', periodStart);
  } catch (error) {
    console.error('Error resetting usage:', error);
    throw error;
  }
}

export async function getUsageHistory(
  userId: string,
  metric: UsageMetric,
  months: number = 6
): Promise<UsageRecord[]> {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('metric', metric)
      .gte('period_start', startDate.toISOString())
      .order('period_start', { ascending: false });

    return data || [];
  } catch (error) {
    console.error('Error getting usage history:', error);
    return [];
  }
}

export function getCurrentPeriod(): { periodStart: string; periodEnd: string } {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export function getMetricLimit(plan: SubscriptionPlan | null, metric: UsageMetric): number {
  if (!plan) {
    // Default free plan limits
    return getFreePlanLimit(metric);
  }

  const limits = plan.limits || {};

  switch (metric) {
    case 'job_posts':
      return limits.max_jobs_per_month ?? -1;
    case 'listings':
      return limits.monthly_listings ?? -1;
    case 'featured_listings':
      return limits.featured_listings ?? 0;
    case 'bookings':
      return limits.max_bookings_per_month ?? -1;
    case 'messages':
      return limits.max_messages_per_day ?? -1;
    case 'api_calls':
      return limits.api_calls_per_month ?? 0;
    case 'storage_mb':
      return limits.storage_limit_mb ?? 100;
    case 'team_seats':
      return limits.team_seats ?? 1;
    default:
      return -1;
  }
}

function getFreePlanLimit(metric: UsageMetric): number {
  const freeLimits: Record<UsageMetric, number> = {
    job_posts: 3,
    listings: 5,
    featured_listings: 0,
    bookings: 10,
    messages: 50,
    api_calls: 0,
    storage_mb: 100,
    team_seats: 1,
  };

  return freeLimits[metric] ?? -1;
}

export function getMetricLabel(metric: UsageMetric): string {
  const labels: Record<UsageMetric, string> = {
    job_posts: 'Job Posts',
    listings: 'Listings',
    featured_listings: 'Featured Listings',
    bookings: 'Bookings',
    messages: 'Messages',
    api_calls: 'API Calls',
    storage_mb: 'Storage (MB)',
    team_seats: 'Team Seats',
  };

  return labels[metric] || metric;
}

export function getMetricIcon(metric: UsageMetric): string {
  const icons: Record<UsageMetric, string> = {
    job_posts: 'briefcase',
    listings: 'list',
    featured_listings: 'star',
    bookings: 'calendar',
    messages: 'message-square',
    api_calls: 'code',
    storage_mb: 'hard-drive',
    team_seats: 'users',
  };

  return icons[metric] || 'activity';
}

export function formatUsageCount(metric: UsageMetric, count: number): string {
  if (metric === 'storage_mb') {
    if (count >= 1024) {
      return `${(count / 1024).toFixed(2)} GB`;
    }
    return `${count} MB`;
  }

  return count.toString();
}

export function getUsageWarningThreshold(): number {
  return 80; // Show warning at 80% usage
}

export function shouldShowUsageWarning(percentage: number): boolean {
  return percentage >= getUsageWarningThreshold();
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 100) {
    return '#EF4444'; // Red
  } else if (percentage >= 80) {
    return '#F59E0B'; // Orange
  } else if (percentage >= 60) {
    return '#3B82F6'; // Blue
  }
  return '#10B981'; // Green
}
