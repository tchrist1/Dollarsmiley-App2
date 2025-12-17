import { supabase } from './supabase';
import { ChartData, DistributionData } from './analytics';

// Content Analytics Types
export interface ContentTrend {
  date: string;
  total_posts: number;
  total_engagement: number;
  avg_engagement_rate: number;
}

export interface TrendingPost {
  post_id: string;
  author_id: string;
  author_name: string;
  content: string;
  viral_score: number;
  engagement_rate: number;
  total_engagement: number;
}

export interface UserContentSummary {
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  avg_engagement_rate: number;
  best_post_id: string;
}

export interface EngagementByHour {
  hour_of_day: number;
  avg_engagement: number;
  post_count: number;
}

export interface ContentTypePerformance {
  content_type: string;
  post_count: number;
  avg_engagement_rate: number;
  total_engagement: number;
}

export interface PostPerformance {
  id: string;
  post_id: string;
  author_id: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  engagement_rate: number;
  viral_score: number;
  is_trending: boolean;
}

// Get content trends
export async function getContentTrends(days: number = 30): Promise<ContentTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_content_trends', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as ContentTrend[];
  } catch (error) {
    console.error('Error fetching content trends:', error);
    return [];
  }
}

// Get trending posts
export async function getTrendingPosts(limit: number = 10): Promise<TrendingPost[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_posts', {
      p_limit: limit,
    });

    if (error) throw error;
    return (data || []) as TrendingPost[];
  } catch (error) {
    console.error('Error fetching trending posts:', error);
    return [];
  }
}

// Get user content summary
export async function getUserContentSummary(
  userId: string,
  days: number = 30
): Promise<UserContentSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_content_summary', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;
    return data as UserContentSummary;
  } catch (error) {
    console.error('Error fetching user content summary:', error);
    return null;
  }
}

// Get engagement by hour
export async function getEngagementByHour(days: number = 7): Promise<EngagementByHour[]> {
  try {
    const { data, error } = await supabase.rpc('get_engagement_by_hour', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as EngagementByHour[];
  } catch (error) {
    console.error('Error fetching engagement by hour:', error);
    return [];
  }
}

// Get top content types
export async function getTopContentTypes(
  days: number = 30
): Promise<ContentTypePerformance[]> {
  try {
    const { data, error } = await supabase.rpc('get_top_content_types', {
      p_days: days,
    });

    if (error) throw error;
    return (data || []) as ContentTypePerformance[];
  } catch (error) {
    console.error('Error fetching top content types:', error);
    return [];
  }
}

// Get post performance for a specific post
export async function getPostPerformance(postId: string): Promise<PostPerformance | null> {
  try {
    const { data, error } = await supabase
      .from('post_performance')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle();

    if (error) throw error;
    return data as PostPerformance;
  } catch (error) {
    console.error('Error fetching post performance:', error);
    return null;
  }
}

// Get user's post performance list
export async function getUserPostPerformance(
  userId: string,
  limit: number = 20
): Promise<PostPerformance[]> {
  try {
    const { data, error } = await supabase
      .from('post_performance')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as PostPerformance[];
  } catch (error) {
    console.error('Error fetching user post performance:', error);
    return [];
  }
}

// Update post performance (trigger recalculation)
export async function updatePostPerformance(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_post_performance', {
      p_post_id: postId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating post performance:', error);
    return false;
  }
}

// Get content trends chart data
export async function getContentTrendsChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getContentTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const posts = trends.map((t) => t.total_posts);

    return {
      labels,
      datasets: [{ data: posts }],
    };
  } catch (error) {
    console.error('Error generating content trends chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get engagement trends chart data
export async function getEngagementTrendsChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getContentTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const engagement = trends.map((t) => t.total_engagement);

    return {
      labels,
      datasets: [{ data: engagement }],
    };
  } catch (error) {
    console.error('Error generating engagement trends chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get engagement rate trends chart data
export async function getEngagementRateChart(days: number = 30): Promise<ChartData> {
  try {
    const trends = await getContentTrends(days);

    const labels = trends.map((t) =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    );

    const rates = trends.map((t) => Number(t.avg_engagement_rate) || 0);

    return {
      labels,
      datasets: [{ data: rates }],
    };
  } catch (error) {
    console.error('Error generating engagement rate chart:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Get content type distribution
export async function getContentTypeDistribution(
  days: number = 30
): Promise<DistributionData[]> {
  try {
    const types = await getTopContentTypes(days);

    const colors: Record<string, string> = {
      media: '#007AFF',
      location: '#34C759',
      text: '#FF9500',
    };

    return types.map((type) => ({
      name: formatContentType(type.content_type),
      value: type.post_count,
      color: colors[type.content_type] || '#8E8E93',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    }));
  } catch (error) {
    console.error('Error generating content type distribution:', error);
    return [];
  }
}

// Get engagement by hour heatmap data
export async function getEngagementHeatmapData(days: number = 7): Promise<ChartData> {
  try {
    const hourly = await getEngagementByHour(days);

    const labels = hourly.map((h) => `${h.hour_of_day}:00`);
    const engagement = hourly.map((h) => Number(h.avg_engagement) || 0);

    return {
      labels,
      datasets: [{ data: engagement }],
    };
  } catch (error) {
    console.error('Error generating engagement heatmap:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
}

// Calculate content analytics summary
export async function getContentAnalyticsSummary(days: number = 30) {
  try {
    const trends = await getContentTrends(days);

    if (trends.length === 0) {
      return {
        totalPosts: 0,
        totalEngagement: 0,
        avgEngagementRate: 0,
        totalViews: 0,
        trendingPosts: 0,
      };
    }

    const totalPosts = trends.reduce((sum, t) => sum + t.total_posts, 0);
    const totalEngagement = trends.reduce((sum, t) => sum + t.total_engagement, 0);
    const avgEngagementRate =
      trends.reduce((sum, t) => sum + Number(t.avg_engagement_rate), 0) / trends.length;

    const trendingCount = await getTrendingPosts(100);

    return {
      totalPosts,
      totalEngagement,
      avgEngagementRate: avgEngagementRate.toFixed(2),
      trendingPosts: trendingCount.length,
    };
  } catch (error) {
    console.error('Error calculating content summary:', error);
    return {
      totalPosts: 0,
      totalEngagement: 0,
      avgEngagementRate: '0',
      trendingPosts: 0,
    };
  }
}

// Format content type for display
function formatContentType(type: string): string {
  const formatted: Record<string, string> = {
    media: 'With Media',
    location: 'With Location',
    text: 'Text Only',
  };

  return formatted[type] || type;
}

// Format engagement number
export function formatEngagement(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

// Format percentage
export function formatEngagementRate(rate: number | string): string {
  const num = typeof rate === 'string' ? parseFloat(rate) : rate;
  return `${num.toFixed(1)}%`;
}

// Get best posting time
export async function getBestPostingTime(days: number = 30): Promise<number> {
  try {
    const hourly = await getEngagementByHour(days);

    if (hourly.length === 0) return 12; // Default to noon

    const best = hourly.reduce((max, curr) =>
      Number(curr.avg_engagement) > Number(max.avg_engagement) ? curr : max
    );

    return best.hour_of_day;
  } catch (error) {
    console.error('Error calculating best posting time:', error);
    return 12;
  }
}

// Calculate viral potential
export function calculateViralPotential(performance: PostPerformance): number {
  const { viral_score, engagement_rate } = performance;

  let score = 0;

  if (viral_score > 500) score += 40;
  else if (viral_score > 200) score += 30;
  else if (viral_score > 100) score += 20;
  else if (viral_score > 50) score += 10;

  if (engagement_rate > 10) score += 40;
  else if (engagement_rate > 5) score += 30;
  else if (engagement_rate > 2) score += 20;
  else if (engagement_rate > 1) score += 10;

  return Math.min(score, 100);
}

// Get viral potential label
export function getViralPotentialLabel(score: number): string {
  if (score >= 80) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Medium';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

// Get viral potential color
export function getViralPotentialColor(score: number): string {
  if (score >= 80) return '#34C759'; // green
  if (score >= 60) return '#007AFF'; // blue
  if (score >= 40) return '#FF9500'; // orange
  if (score >= 20) return '#FF3B30'; // red
  return '#8E8E93'; // gray
}
