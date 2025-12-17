import { supabase } from './supabase';

export interface JobAnalytics {
  job_id: string;
  customer_id: string;
  total_views: number;
  unique_viewers: number;
  total_quotes: number;
  avg_quote_amount: number;
  min_quote_amount: number;
  max_quote_amount: number;
  total_saves: number;
  total_shares: number;
  click_through_rate: number;
  converted: boolean;
  conversion_type?: string;
  conversion_date?: string;
  conversion_value?: number;
  visibility_score: number;
  engagement_score: number;
  conversion_score: number;
  overall_score: number;
  created_at: string;
  updated_at: string;
}

export interface JobPerformanceMetrics {
  metric_date: string;
  total_jobs_posted: number;
  active_jobs: number;
  completed_jobs: number;
  expired_jobs: number;
  cancelled_jobs: number;
  total_views: number;
  avg_views_per_job: number;
  total_quotes_received: number;
  avg_quotes_per_job: number;
  avg_quote_amount: number;
  total_conversions: number;
  conversion_rate: number;
}

export interface JobAnalyticsSummary {
  total_jobs: number;
  total_views: number;
  total_quotes: number;
  total_conversions: number;
  avg_views_per_job: number;
  avg_quotes_per_job: number;
  conversion_rate: number;
  avg_overall_score: number;
}

export interface JobView {
  id: string;
  job_id: string;
  viewer_id?: string;
  viewer_type: 'provider' | 'customer' | 'guest';
  session_id?: string;
  view_duration?: number;
  created_at: string;
}

export interface JobAnalyticsDetail {
  job_id: string;
  total_views: number;
  unique_viewers: number;
  total_quotes: number;
  avg_quote_amount: number;
  min_quote_amount: number;
  max_quote_amount: number;
  total_saves: number;
  converted: boolean;
  conversion_value?: number;
  visibility_score: number;
  engagement_score: number;
  conversion_score: number;
  overall_score: number;
  job_details: {
    title: string;
    status: string;
    budget_min?: number;
    budget_max?: number;
    created_at: string;
  };
}

export interface PerformanceTrend {
  metric_date: string;
  jobs_posted: number;
  total_views: number;
  total_quotes: number;
  conversions: number;
  avg_views_per_job: number;
  conversion_rate: number;
}

// Track a job view
export async function trackJobView(
  jobId: string,
  viewerId?: string,
  viewerType: 'provider' | 'customer' | 'guest' = 'guest',
  sessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('track_job_view', {
      p_job_id: jobId,
      p_viewer_id: viewerId || null,
      p_viewer_type: viewerType,
      p_session_id: sessionId || null,
    });

    if (error) throw error;
    return { success: data };
  } catch (error: any) {
    console.error('Error tracking job view:', error);
    return { success: false, error: error.message };
  }
}

// Get job analytics for a specific job
export async function getJobAnalytics(jobId: string): Promise<JobAnalyticsDetail | null> {
  try {
    const { data, error } = await supabase.rpc('get_job_analytics_summary', {
      p_job_id: jobId,
    });

    if (error) throw error;
    return data as JobAnalyticsDetail;
  } catch (error) {
    console.error('Error fetching job analytics:', error);
    return null;
  }
}

// Get user's overall job analytics summary
export async function getUserJobAnalyticsSummary(
  userId: string,
  days: number = 30
): Promise<JobAnalyticsSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_job_analytics', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      const row = data[0];
      return {
        total_jobs: Number(row.total_jobs) || 0,
        total_views: Number(row.total_views) || 0,
        total_quotes: Number(row.total_quotes) || 0,
        total_conversions: Number(row.total_conversions) || 0,
        avg_views_per_job: Number(row.avg_views_per_job) || 0,
        avg_quotes_per_job: Number(row.avg_quotes_per_job) || 0,
        conversion_rate: Number(row.conversion_rate) || 0,
        avg_overall_score: Number(row.avg_overall_score) || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching user job analytics:', error);
    return null;
  }
}

// Get job performance trends
export async function getJobPerformanceTrends(
  userId: string,
  days: number = 30
): Promise<PerformanceTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_job_performance_trends', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as PerformanceTrend[];
  } catch (error) {
    console.error('Error fetching job performance trends:', error);
    return [];
  }
}

// Get all job analytics for user
export async function getUserJobAnalytics(userId: string): Promise<JobAnalytics[]> {
  try {
    const { data, error } = await supabase
      .from('job_analytics')
      .select('*')
      .eq('customer_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user job analytics:', error);
    return [];
  }
}

// Get job views
export async function getJobViews(jobId: string, limit: number = 50): Promise<JobView[]> {
  try {
    const { data, error } = await supabase
      .from('job_views')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching job views:', error);
    return [];
  }
}

// Get top performing jobs
export async function getTopPerformingJobs(
  userId: string,
  limit: number = 10
): Promise<JobAnalyticsDetail[]> {
  try {
    const { data, error } = await supabase
      .from('job_analytics')
      .select('job_id')
      .eq('customer_id', userId)
      .order('overall_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Fetch full analytics for top jobs
    const topJobs = await Promise.all(
      data.map((job) => getJobAnalytics(job.job_id))
    );

    return topJobs.filter((job) => job !== null) as JobAnalyticsDetail[];
  } catch (error) {
    console.error('Error fetching top performing jobs:', error);
    return [];
  }
}

// Get job analytics by status
export async function getJobAnalyticsByStatus(
  userId: string
): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('job_analytics')
      .select('job_id, jobs(status)')
      .eq('customer_id', userId);

    if (error) throw error;

    const statusCounts: Record<string, number> = {
      Open: 0,
      Booked: 0,
      Completed: 0,
      Expired: 0,
      Cancelled: 0,
    };

    data?.forEach((item: any) => {
      const status = item.jobs?.status;
      if (status && statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    return statusCounts;
  } catch (error) {
    console.error('Error fetching job analytics by status:', error);
    return {};
  }
}

// Get quote statistics
export async function getQuoteStatistics(userId: string): Promise<{
  total_quotes: number;
  avg_quote_amount: number;
  min_quote_amount: number;
  max_quote_amount: number;
  jobs_with_quotes: number;
  jobs_without_quotes: number;
}> {
  try {
    const { data, error } = await supabase
      .from('job_analytics')
      .select('total_quotes, avg_quote_amount, min_quote_amount, max_quote_amount')
      .eq('customer_id', userId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_quotes: 0,
        avg_quote_amount: 0,
        min_quote_amount: 0,
        max_quote_amount: 0,
        jobs_with_quotes: 0,
        jobs_without_quotes: 0,
      };
    }

    const totalQuotes = data.reduce((sum, job) => sum + (job.total_quotes || 0), 0);
    const jobsWithQuotes = data.filter((job) => job.total_quotes > 0).length;
    const jobsWithoutQuotes = data.length - jobsWithQuotes;

    const quotesWithAmounts = data.filter((job) => job.avg_quote_amount > 0);
    const avgQuoteAmount =
      quotesWithAmounts.length > 0
        ? quotesWithAmounts.reduce((sum, job) => sum + (job.avg_quote_amount || 0), 0) /
          quotesWithAmounts.length
        : 0;

    const allMinQuotes = data
      .filter((job) => job.min_quote_amount > 0)
      .map((job) => job.min_quote_amount);
    const minQuoteAmount = allMinQuotes.length > 0 ? Math.min(...allMinQuotes) : 0;

    const allMaxQuotes = data
      .filter((job) => job.max_quote_amount > 0)
      .map((job) => job.max_quote_amount);
    const maxQuoteAmount = allMaxQuotes.length > 0 ? Math.max(...allMaxQuotes) : 0;

    return {
      total_quotes: totalQuotes,
      avg_quote_amount: avgQuoteAmount,
      min_quote_amount: minQuoteAmount,
      max_quote_amount: maxQuoteAmount,
      jobs_with_quotes: jobsWithQuotes,
      jobs_without_quotes: jobsWithoutQuotes,
    };
  } catch (error) {
    console.error('Error fetching quote statistics:', error);
    return {
      total_quotes: 0,
      avg_quote_amount: 0,
      min_quote_amount: 0,
      max_quote_amount: 0,
      jobs_with_quotes: 0,
      jobs_without_quotes: 0,
    };
  }
}

// Format score for display
export function formatScore(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

// Get score color
export function getScoreColor(score: number): string {
  if (score >= 90) return '#10B981'; // Green
  if (score >= 75) return '#3B82F6'; // Blue
  if (score >= 60) return '#F59E0B'; // Orange
  if (score >= 40) return '#EF4444'; // Red
  return '#6B7280'; // Gray
}

// Get conversion rate color
export function getConversionRateColor(rate: number): string {
  if (rate >= 50) return '#10B981'; // Green
  if (rate >= 30) return '#3B82F6'; // Blue
  if (rate >= 15) return '#F59E0B'; // Orange
  if (rate >= 5) return '#EF4444'; // Red
  return '#6B7280'; // Gray
}

// Format conversion rate
export function formatConversionRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

// Get performance insight
export function getPerformanceInsight(analytics: JobAnalyticsSummary): string {
  if (analytics.total_jobs === 0) {
    return 'Post your first job to start tracking analytics';
  }

  if (analytics.conversion_rate >= 50) {
    return 'Excellent performance! Your jobs are converting very well.';
  }

  if (analytics.conversion_rate >= 30) {
    return 'Good job! Your conversion rate is above average.';
  }

  if (analytics.avg_views_per_job < 10) {
    return 'Try improving your job descriptions to attract more views.';
  }

  if (analytics.avg_quotes_per_job < 2) {
    return 'Consider adjusting your budget to attract more quotes.';
  }

  return 'Keep posting jobs to improve your performance metrics.';
}

// Get visibility insight
export function getVisibilityInsight(avgViews: number): string {
  if (avgViews >= 50) return 'Great visibility! Your jobs are getting noticed.';
  if (avgViews >= 25) return 'Good visibility. Keep optimizing your job posts.';
  if (avgViews >= 10) return 'Moderate visibility. Consider improving titles and descriptions.';
  return 'Low visibility. Try using more specific keywords in your job posts.';
}

// Get quote insight
export function getQuoteInsight(avgQuotes: number, totalJobs: number): string {
  if (totalJobs === 0) return 'Post jobs to start receiving quotes.';
  if (avgQuotes >= 5) return 'Excellent! Your jobs are attracting many providers.';
  if (avgQuotes >= 3) return 'Good quote rate. Your budgets seem competitive.';
  if (avgQuotes >= 1) return 'Getting quotes, but consider adjusting budgets or details.';
  return 'Low quote rate. Review your job descriptions and budgets.';
}

// Calculate trend direction
export function calculateTrendDirection(
  current: number,
  previous: number
): 'up' | 'down' | 'stable' {
  const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  if (percentChange > 5) return 'up';
  if (percentChange < -5) return 'down';
  return 'stable';
}

// Format trend percentage
export function formatTrendPercentage(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const percentChange = ((current - previous) / previous) * 100;
  const sign = percentChange > 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(1)}%`;
}

// Get best time to post
export function getBestTimeToPost(trends: PerformanceTrend[]): string {
  if (trends.length < 7) return 'Not enough data yet';

  // Analyze which days got most views per job
  const dayPerformance = trends.map((trend) => ({
    day: new Date(trend.metric_date).toLocaleDateString('en-US', { weekday: 'short' }),
    avgViews: trend.avg_views_per_job,
  }));

  const sortedDays = dayPerformance.sort((a, b) => b.avgViews - a.avgViews);

  return `Best days to post: ${sortedDays.slice(0, 2).map((d) => d.day).join(' and ')}`;
}

// Calculate score improvement suggestion
export function getScoreImprovementSuggestions(analytics: JobAnalyticsDetail): string[] {
  const suggestions: string[] = [];

  if (analytics.visibility_score < 60) {
    suggestions.push('Add more details and photos to increase visibility');
    suggestions.push('Use relevant keywords in your title and description');
  }

  if (analytics.engagement_score < 60) {
    suggestions.push('Set a competitive budget to attract more quotes');
    suggestions.push('Respond quickly to provider questions');
  }

  if (analytics.conversion_score < 60 && analytics.total_quotes > 0) {
    suggestions.push('Review and compare quotes carefully');
    suggestions.push('Check provider ratings before making a decision');
  }

  if (suggestions.length === 0) {
    suggestions.push('Great job! Keep maintaining this level of quality.');
  }

  return suggestions;
}

// Export chart data for visualization
export function prepareChartData(trends: PerformanceTrend[]): {
  labels: string[];
  viewsData: number[];
  quotesData: number[];
  conversionsData: number[];
} {
  const labels = trends.map((t) =>
    new Date(t.metric_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  );

  const viewsData = trends.map((t) => t.total_views);
  const quotesData = trends.map((t) => t.total_quotes);
  const conversionsData = trends.map((t) => t.conversions);

  return { labels, viewsData, quotesData, conversionsData };
}
