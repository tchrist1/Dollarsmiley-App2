import { supabase } from './supabase';

/**
 * Admin Analytics Data Fetching Functions
 */

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export interface DistributionData {
  name: string;
  value: number;
  color: string;
  legendFontColor?: string;
  legendFontSize?: number;
}

export interface AnalyticsOverview {
  userGrowth: {
    current: number;
    previous: number;
    percentageChange: number;
  };
  revenueGrowth: {
    current: number;
    previous: number;
    percentageChange: number;
  };
  bookingGrowth: {
    current: number;
    previous: number;
    percentageChange: number;
  };
  averageBookingValue: number;
  platformFeeRate: number;
  totalProviders: number;
  totalCustomers: number;
}

/**
 * Get time-series data for user growth
 */
export async function getUserGrowthData(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, new_users, total_users')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching user growth data:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const totalUsers = data.map((d) => d.total_users || 0);

  return {
    labels,
    datasets: [{ data: totalUsers }],
  };
}

/**
 * Get time-series data for revenue
 */
export async function getRevenueData(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, total_revenue, platform_fees')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching revenue data:', error);
    return { labels: [], datasets: [{ data: [] }, { data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const totalRevenue = data.map((d) => parseFloat(d.total_revenue || '0'));
  const platformFees = data.map((d) => parseFloat(d.platform_fees || '0'));

  return {
    labels,
    datasets: [
      { data: totalRevenue },
      { data: platformFees },
    ],
  };
}

/**
 * Get time-series data for bookings
 */
export async function getBookingsData(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, total_bookings, completed_bookings')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching bookings data:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const completedBookings = data.map((d) => d.completed_bookings || 0);

  return {
    labels,
    datasets: [{ data: completedBookings }],
  };
}

/**
 * Get time-series data for active users
 */
export async function getActiveUsersData(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, active_users')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching active users data:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const activeUsers = data.map((d) => d.active_users || 0);

  return {
    labels,
    datasets: [{ data: activeUsers }],
  };
}

/**
 * Get user type distribution (pie chart data)
 */
export async function getUserTypeDistribution(): Promise<DistributionData[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_type');

  if (error || !data) {
    console.error('Error fetching user type distribution:', error);
    return [];
  }

  const customerCount = data.filter((u) => u.user_type === 'Customer').length;
  const providerCount = data.filter((u) => u.user_type === 'Provider').length;

  return [
    {
      name: 'Customers',
      value: customerCount,
      color: '#007AFF',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Providers',
      value: providerCount,
      color: '#34C759',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ];
}

/**
 * Get subscription tier distribution
 */
export async function getSubscriptionDistribution(): Promise<DistributionData[]> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('plan_id, subscription_plans(name)')
    .eq('status', 'Active');

  if (error || !data) {
    console.error('Error fetching subscription distribution:', error);
    return [];
  }

  const counts: Record<string, number> = {};
  const colors: Record<string, string> = {
    Free: '#8E8E93',
    Pro: '#007AFF',
    Premium: '#FF9500',
    Elite: '#FFD700',
  };

  data.forEach((sub: any) => {
    const planName = sub.subscription_plans?.name || 'Unknown';
    counts[planName] = (counts[planName] || 0) + 1;
  });

  return Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    color: colors[name] || '#8E8E93',
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));
}

/**
 * Get top categories by listings
 */
export async function getTopCategories(limit: number = 5): Promise<{ category: string; count: number }[]> {
  const { data, error } = await supabase
    .from('service_listings')
    .select('category_id, categories(name)')
    .eq('status', 'Active');

  if (error || !data) {
    console.error('Error fetching top categories:', error);
    return [];
  }

  const counts: Record<string, number> = {};

  data.forEach((listing: any) => {
    const categoryName = listing.categories?.name || 'Uncategorized';
    counts[categoryName] = (counts[categoryName] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get analytics overview with growth metrics
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [currentPeriod, previousPeriod] = await Promise.all([
    supabase
      .from('platform_metrics')
      .select('*')
      .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('platform_metrics')
      .select('*')
      .gte('metric_date', sixtyDaysAgo.toISOString().split('T')[0])
      .lt('metric_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('metric_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const current = currentPeriod.data;
  const previous = previousPeriod.data;

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const currentUsers = current?.total_users || 0;
  const previousUsers = previous?.total_users || 0;
  const currentRevenue = parseFloat(current?.total_revenue || '0');
  const previousRevenue = parseFloat(previous?.total_revenue || '0');
  const currentBookings = current?.completed_bookings || 0;
  const previousBookings = previous?.completed_bookings || 0;

  const { count: providersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'Provider');

  const { count: customersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'Customer');

  return {
    userGrowth: {
      current: currentUsers,
      previous: previousUsers,
      percentageChange: calculatePercentageChange(currentUsers, previousUsers),
    },
    revenueGrowth: {
      current: currentRevenue,
      previous: previousRevenue,
      percentageChange: calculatePercentageChange(currentRevenue, previousRevenue),
    },
    bookingGrowth: {
      current: currentBookings,
      previous: previousBookings,
      percentageChange: calculatePercentageChange(currentBookings, previousBookings),
    },
    averageBookingValue: currentBookings > 0 ? currentRevenue / currentBookings : 0,
    platformFeeRate: currentRevenue > 0 ? (parseFloat(current?.platform_fees || '0') / currentRevenue) * 100 : 10,
    totalProviders: providersCount || 0,
    totalCustomers: customersCount || 0,
  };
}

/**
 * Get listing activity data
 */
export async function getListingActivityData(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, total_listings, active_listings')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching listing activity:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const activeListings = data.map((d) => d.active_listings || 0);

  return {
    labels,
    datasets: [{ data: activeListings }],
  };
}

/**
 * Get booking completion rate over time
 */
export async function getBookingCompletionRate(days: number = 30): Promise<ChartData> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('platform_metrics')
    .select('metric_date, total_bookings, completed_bookings')
    .gte('metric_date', startDate.toISOString().split('T')[0])
    .order('metric_date', { ascending: true });

  if (error || !data) {
    console.error('Error fetching booking completion rate:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }

  const labels = data.map((d) => new Date(d.metric_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  const completionRate = data.map((d) => {
    const total = d.total_bookings || 0;
    const completed = d.completed_bookings || 0;
    return total > 0 ? (completed / total) * 100 : 0;
  });

  return {
    labels,
    datasets: [{ data: completionRate }],
  };
}

// Enhanced Analytics Types
export interface UserEngagementSummary {
  total_sessions: number;
  total_time_minutes: number;
  avg_session_duration: number;
  total_pages_viewed: number;
  total_listings_viewed: number;
  total_searches: number;
  total_bookings: number;
  total_messages: number;
  total_posts: number;
  total_interactions: number;
  active_days: number;
  last_active: string;
}

export interface EngagementTrend {
  date: string;
  dau: number;
  total_sessions: number;
  avg_session_duration: number;
  total_events: number;
}

export interface TopEvent {
  event_type: string;
  event_count: number;
  unique_users: number;
}

export interface CohortRetention {
  cohort_date: string;
  period_number: number;
  period_type: string;
  total_users: number;
  active_users: number;
  retention_rate: number;
}

// Log user activity event
export async function logUserActivity(
  eventType: string,
  eventCategory: string,
  options: {
    pageUrl?: string;
    referenceId?: string;
    referenceType?: string;
    metadata?: any;
    sessionId?: string;
  } = {}
): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('log_user_activity', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_event_category: eventCategory,
      p_page_url: options.pageUrl || null,
      p_reference_id: options.referenceId || null,
      p_reference_type: options.referenceType || null,
      p_metadata: options.metadata || {},
      p_session_id: options.sessionId || null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error logging user activity:', error);
    return false;
  }
}

// Get user engagement summary
export async function getUserEngagementSummary(
  userId: string,
  days: number = 30
): Promise<UserEngagementSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_engagement_summary', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return data as UserEngagementSummary;
  } catch (error) {
    console.error('Error fetching user engagement summary:', error);
    return null;
  }
}

// Get engagement trends
export async function getEngagementTrends(days: number = 30): Promise<EngagementTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_engagement_trends', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as EngagementTrend[];
  } catch (error) {
    console.error('Error fetching engagement trends:', error);
    return [];
  }
}

// Get top events
export async function getTopEvents(days: number = 7, limit: number = 10): Promise<TopEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_top_events', {
      p_days: days,
      p_limit: limit,
    });

    if (error) throw error;
    return (data || []) as TopEvent[];
  } catch (error) {
    console.error('Error fetching top events:', error);
    return [];
  }
}

// Get cohort retention data
export async function getCohortRetention(
  cohortDate: string,
  periods: number = 12,
  periodType: 'day' | 'week' | 'month' = 'week'
): Promise<CohortRetention[]> {
  try {
    const { data, error } = await supabase
      .from('cohort_analytics')
      .select('*')
      .eq('cohort_date', cohortDate)
      .eq('period_type', periodType)
      .lte('period_number', periods)
      .order('period_number', { ascending: true });

    if (error) throw error;
    return (data || []) as CohortRetention[];
  } catch (error) {
    console.error('Error fetching cohort retention:', error);
    return [];
  }
}

// Get DAU/MAU ratio
export async function getDAUMAURatio(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getEngagementTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const dauData = trends.map((t) => t.dau);

    return {
      labels,
      datasets: [{ data: dauData }],
    };
  } catch (error) {
    console.error('Error calculating DAU/MAU ratio:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get session duration trends
export async function getSessionDurationTrends(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getEngagementTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const durationData = trends.map((t) => Number(t.avg_session_duration) || 0);

    return {
      labels,
      datasets: [{ data: durationData }],
    };
  } catch (error) {
    console.error('Error fetching session duration trends:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get event distribution
export async function getEventDistribution(days: number = 7): Promise<DistributionData[]> {
  try {
    const events = await getTopEvents(days, 6);

    const colors = [
      '#007AFF',
      '#34C759',
      '#FF9500',
      '#FF3B30',
      '#5856D6',
      '#AF52DE',
    ];

    return events.map((event, index) => ({
      name: formatEventName(event.event_type),
      value: event.event_count,
      color: colors[index % colors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  } catch (error) {
    console.error('Error fetching event distribution:', error);
    return [];
  }
}

// Helper function to format event names
function formatEventName(eventType: string): string {
  return eventType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get user retention curve
export async function getUserRetentionCurve(
  cohortDate: string,
  periods: number = 12
): Promise<ChartData> {
  try {
    const retention = await getCohortRetention(cohortDate, periods, 'week');

    const labels = retention.map((r) => `Week ${r.period_number}`);
    const retentionRates = retention.map((r) => Number(r.retention_rate) || 0);

    return {
      labels,
      datasets: [{ data: retentionRates }],
    };
  } catch (error) {
    console.error('Error fetching retention curve:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Calculate and update engagement metrics for user
export async function updateUserEngagementMetrics(
  userId: string,
  date?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_user_engagement_metrics', {
      p_user_id: userId,
      p_date: date || new Date().toISOString().split('T')[0],
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating engagement metrics:', error);
    return false;
  }
}
