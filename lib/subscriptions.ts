import { supabase } from './supabase';

/**
 * Subscription Feature Gates and Management
 */

export interface SubscriptionFeature {
  key: string;
  enabled: boolean;
  label: string;
}

export interface SubscriptionLimits {
  monthly_listings: number;
  monthly_jobs: number;
  photos_per_listing: number;
  featured_listings: number;
}

export interface UserSubscription {
  plan_name: string;
  features: SubscriptionFeature[];
  limits: SubscriptionLimits;
  expires_at: string | null;
}

// Feature keys that can be checked
export const FEATURES = {
  BASIC_PROFILE: 'basic_profile',
  BROWSE_SERVICES: 'browse_services',
  POST_JOBS: 'post_jobs',
  BOOK_SERVICES: 'book_services',
  PRIORITY_SUPPORT: 'priority_support',
  ANALYTICS: 'analytics',
  FEATURED_BADGE: 'featured_badge',
  CUSTOM_BRANDING: 'custom_branding',
  API_ACCESS: 'api_access',
  BULK_OPERATIONS: 'bulk_operations',
  WHITE_LABEL: 'white_label',
  DEDICATED_ACCOUNT_MANAGER: 'dedicated_account_manager',
} as const;

// Limit keys that can be checked
export const LIMITS = {
  MONTHLY_LISTINGS: 'monthly_listings',
  MONTHLY_JOBS: 'monthly_jobs',
  PHOTOS_PER_LISTING: 'photos_per_listing',
  FEATURED_LISTINGS: 'featured_listings',
} as const;

/**
 * Get user's active subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase.rpc('get_user_active_subscription', {
    user_uuid: userId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

/**
 * Check if user has access to a specific feature
 * TESTING MODE: All features unlocked
 */
export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  // TESTING MODE: Always return true to unlock all features
  return true;
}

/**
 * Check if user is within usage limit
 * TESTING MODE: No limits enforced
 */
export async function checkUsageLimit(
  userId: string,
  limitKey: string,
  currentUsage: number
): Promise<boolean> {
  // TESTING MODE: Always return true to bypass all limits
  return true;
}

/**
 * Get current usage for a specific limit
 */
export async function getCurrentUsage(
  userId: string,
  limitKey: string,
  startDate?: Date
): Promise<number> {
  const start = startDate || getMonthStart();

  try {
    switch (limitKey) {
      case LIMITS.MONTHLY_LISTINGS: {
        const { count } = await supabase
          .from('service_listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', start.toISOString());
        return count || 0;
      }

      case LIMITS.MONTHLY_JOBS: {
        const { count } = await supabase
          .from('job_posts')
          .select('*', { count: 'exact', head: true })
          .eq('posted_by', userId)
          .gte('created_at', start.toISOString());
        return count || 0;
      }

      case LIMITS.PHOTOS_PER_LISTING: {
        return 0;
      }

      case LIMITS.FEATURED_LISTINGS: {
        const { count } = await supabase
          .from('service_listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_featured', true)
          .eq('status', 'Active');
        return count || 0;
      }

      default:
        return 0;
    }
  } catch (error) {
    console.error('Error getting current usage:', error);
    return 0;
  }
}

/**
 * Get usage statistics for user
 */
export async function getUsageStats(userId: string) {
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return null;
  }

  const [listingsUsage, jobsUsage, featuredUsage] = await Promise.all([
    getCurrentUsage(userId, LIMITS.MONTHLY_LISTINGS),
    getCurrentUsage(userId, LIMITS.MONTHLY_JOBS),
    getCurrentUsage(userId, LIMITS.FEATURED_LISTINGS),
  ]);

  return {
    listings: {
      used: listingsUsage,
      limit: subscription.limits.monthly_listings,
      percentage:
        subscription.limits.monthly_listings === -1
          ? 0
          : (listingsUsage / subscription.limits.monthly_listings) * 100,
    },
    jobs: {
      used: jobsUsage,
      limit: subscription.limits.monthly_jobs,
      percentage:
        subscription.limits.monthly_jobs === -1
          ? 0
          : (jobsUsage / subscription.limits.monthly_jobs) * 100,
    },
    featured: {
      used: featuredUsage,
      limit: subscription.limits.featured_listings,
      percentage:
        subscription.limits.featured_listings === -1
          ? 0
          : (featuredUsage / subscription.limits.featured_listings) * 100,
    },
  };
}

/**
 * Check if user can perform an action based on limits
 * TESTING MODE: All actions allowed
 */
export async function canPerformAction(
  userId: string,
  action: 'create_listing' | 'create_job' | 'feature_listing'
): Promise<{ allowed: boolean; reason?: string; limit?: number; current?: number }> {
  // TESTING MODE: Always allow all actions
  return { allowed: true };
}

/**
 * Get feature comparison between plans
 */
export function getFeatureComparison() {
  return {
    features: [
      {
        category: 'Core Features',
        items: [
          {
            name: 'Browse Services',
            free: true,
            pro: true,
            premium: true,
            elite: true,
          },
          {
            name: 'Book Services',
            free: true,
            pro: true,
            premium: true,
            elite: true,
          },
          {
            name: 'Post Jobs',
            free: true,
            pro: true,
            premium: true,
            elite: true,
          },
          {
            name: 'Real-time Messaging',
            free: true,
            pro: true,
            premium: true,
            elite: true,
          },
        ],
      },
      {
        category: 'Limits',
        items: [
          {
            name: 'Monthly Listings',
            free: '3',
            pro: '10',
            premium: '50',
            elite: 'Unlimited',
          },
          {
            name: 'Monthly Jobs',
            free: '5',
            pro: '20',
            premium: '100',
            elite: 'Unlimited',
          },
          {
            name: 'Photos per Listing',
            free: '3',
            pro: '10',
            premium: '20',
            elite: '50',
          },
          {
            name: 'Featured Listings',
            free: '0',
            pro: '1',
            premium: '5',
            elite: 'Unlimited',
          },
        ],
      },
      {
        category: 'Support & Analytics',
        items: [
          {
            name: 'Customer Support',
            free: 'Email',
            pro: 'Priority',
            premium: 'Priority',
            elite: '24/7 Priority',
          },
          {
            name: 'Analytics',
            free: false,
            pro: 'Basic',
            premium: 'Advanced',
            elite: 'Advanced',
          },
          {
            name: 'Custom Branding',
            free: false,
            pro: false,
            premium: true,
            elite: true,
          },
        ],
      },
      {
        category: 'Advanced Features',
        items: [
          {
            name: 'API Access',
            free: false,
            pro: false,
            premium: 'Limited',
            elite: 'Full',
          },
          {
            name: 'Bulk Operations',
            free: false,
            pro: false,
            premium: true,
            elite: true,
          },
          {
            name: 'White Label',
            free: false,
            pro: false,
            premium: false,
            elite: true,
          },
          {
            name: 'Account Manager',
            free: false,
            pro: false,
            premium: false,
            elite: true,
          },
        ],
      },
    ],
  };
}

/**
 * Get upgrade suggestions based on usage
 */
export async function getUpgradeSuggestions(userId: string) {
  const stats = await getUsageStats(userId);
  const subscription = await getUserSubscription(userId);

  if (!stats || !subscription) {
    return [];
  }

  const suggestions = [];

  // Check if hitting limits
  if (stats.listings.percentage >= 80 && subscription.limits.monthly_listings !== -1) {
    suggestions.push({
      reason: 'listing_limit',
      message: `You've used ${stats.listings.used} of ${stats.listings.limit} monthly listings`,
      severity: stats.listings.percentage >= 100 ? 'high' : 'medium',
    });
  }

  if (stats.jobs.percentage >= 80 && subscription.limits.monthly_jobs !== -1) {
    suggestions.push({
      reason: 'job_limit',
      message: `You've used ${stats.jobs.used} of ${stats.jobs.limit} monthly job posts`,
      severity: stats.jobs.percentage >= 100 ? 'high' : 'medium',
    });
  }

  if (
    stats.featured.limit === 0 &&
    (subscription.plan_name === 'Free' || subscription.plan_name === 'Pro')
  ) {
    suggestions.push({
      reason: 'featured_listings',
      message: 'Get featured listings to boost visibility',
      severity: 'low',
    });
  }

  return suggestions;
}

// Helper function to get start of current month
function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
