import { supabase } from './supabase';
import { v4 as uuidv4 } from 'react-native-uuid';

export type SearchType = 'text' | 'voice' | 'image' | 'filter';
export type SearchCategory = 'providers' | 'jobs' | 'services' | 'listings';
export type ConversionType = 'booking' | 'quote' | 'message' | 'profile_view' | 'save';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface SearchTrackingParams {
  userId?: string;
  query: string;
  searchType: SearchType;
  category: SearchCategory;
  filters?: any;
  resultsCount: number;
  deviceType?: DeviceType;
}

export interface SearchAnalytics {
  id: string;
  user_id?: string;
  session_id: string;
  search_query: string;
  search_type: SearchType;
  search_category: SearchCategory;
  filters_applied: any;
  results_count: number;
  results_clicked: number[];
  first_click_position?: number;
  time_to_first_click?: number;
  search_duration?: number;
  refinement_count: number;
  converted: boolean;
  conversion_type?: ConversionType;
  device_type: DeviceType;
  created_at: string;
}

export interface PopularSearch {
  id: string;
  query: string;
  search_count: number;
  click_through_rate: number;
  conversion_rate: number;
  avg_results_count: number;
  last_searched_at: string;
  trending_score: number;
}

export interface SearchSuggestion {
  id: string;
  query: string;
  suggested_query: string;
  suggestion_type: 'autocomplete' | 'did_you_mean' | 'related' | 'popular';
  acceptance_count: number;
  show_count: number;
  acceptance_rate: number;
}

export interface ZeroResultSearch {
  id: string;
  query: string;
  search_type: SearchType;
  filters_applied: any;
  occurrence_count: number;
  last_occurred_at: string;
}

export interface SearchTrend {
  query: string;
  category?: string;
  search_count: number;
  trend_date: string;
  hour_of_day: number;
  day_of_week: number;
}

export interface SearchSummary {
  total_searches: number;
  unique_queries: number;
  avg_results_count: number;
  click_through_rate: number;
  conversion_rate: number;
  avg_search_duration: number;
}

// Session management
let currentSessionId: string | null = null;
let currentSearchId: string | null = null;
let searchStartTime: number | null = null;

// Get or create session ID
export function getSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = uuidv4() as string;
  }
  return currentSessionId;
}

// Reset session
export function resetSession(): void {
  currentSessionId = null;
  currentSearchId = null;
  searchStartTime = null;
}

// Track a search
export async function trackSearch(
  params: SearchTrackingParams
): Promise<{ success: boolean; analyticsId?: string; error?: string }> {
  try {
    const sessionId = getSessionId();
    searchStartTime = Date.now();

    const { data, error } = await supabase.rpc('track_search', {
      p_user_id: params.userId || null,
      p_session_id: sessionId,
      p_query: params.query,
      p_search_type: params.searchType,
      p_category: params.category,
      p_filters: params.filters || {},
      p_results_count: params.resultsCount,
      p_device_type: params.deviceType || 'unknown',
    });

    if (error) throw error;

    currentSearchId = data;
    return { success: true, analyticsId: data };
  } catch (error: any) {
    console.error('Error tracking search:', error);
    return { success: false, error: error.message };
  }
}

// Track a search click
export async function trackSearchClick(
  analyticsId: string,
  resultPosition: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const timeToClick = searchStartTime ? Date.now() - searchStartTime : 0;

    const { error } = await supabase.rpc('track_search_click', {
      p_analytics_id: analyticsId,
      p_result_position: resultPosition,
      p_time_to_click: timeToClick,
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error tracking search click:', error);
    return { success: false, error: error.message };
  }
}

// Track search conversion
export async function trackSearchConversion(
  analyticsId: string,
  conversionType: ConversionType
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('track_search_conversion', {
      p_analytics_id: analyticsId,
      p_conversion_type: conversionType,
    });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error tracking search conversion:', error);
    return { success: false, error: error.message };
  }
}

// Track current search click
export async function trackCurrentSearchClick(
  resultPosition: number
): Promise<{ success: boolean; error?: string }> {
  if (!currentSearchId) {
    return { success: false, error: 'No active search' };
  }
  return await trackSearchClick(currentSearchId, resultPosition);
}

// Track current search conversion
export async function trackCurrentSearchConversion(
  conversionType: ConversionType
): Promise<{ success: boolean; error?: string }> {
  if (!currentSearchId) {
    return { success: false, error: 'No active search' };
  }
  return await trackSearchConversion(currentSearchId, conversionType);
}

// Get popular searches
export async function getPopularSearches(limit: number = 10): Promise<PopularSearch[]> {
  try {
    const { data, error } = await supabase
      .from('popular_searches')
      .select('*')
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular searches:', error);
    return [];
  }
}

// Get trending searches
export async function getTrendingSearches(limit: number = 10): Promise<PopularSearch[]> {
  try {
    const { data, error } = await supabase.rpc('get_trending_searches', {
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trending searches:', error);
    return [];
  }
}

// Get search suggestions
export async function getSearchSuggestions(
  query: string,
  type: 'autocomplete' | 'related' | 'popular' = 'related'
): Promise<SearchSuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('search_suggestions')
      .select('*')
      .eq('query', query)
      .eq('suggestion_type', type)
      .order('acceptance_rate', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    return [];
  }
}

// Accept a suggestion
export async function acceptSuggestion(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_suggestions')
      .update({
        acceptance_count: supabase.sql`acceptance_count + 1`,
        acceptance_rate: supabase.sql`(acceptance_count + 1)::numeric / show_count::numeric * 100`,
      })
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error accepting suggestion:', error);
  }
}

// Show a suggestion
export async function showSuggestion(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_suggestions')
      .update({
        show_count: supabase.sql`show_count + 1`,
        acceptance_rate: supabase.sql`acceptance_count::numeric / (show_count + 1)::numeric * 100`,
      })
      .eq('id', suggestionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error showing suggestion:', error);
  }
}

// Get zero result searches (admin only)
export async function getZeroResultSearches(limit: number = 20): Promise<ZeroResultSearch[]> {
  try {
    const { data, error } = await supabase
      .from('zero_result_searches')
      .select('*')
      .order('occurrence_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching zero result searches:', error);
    return [];
  }
}

// Get search trends
export async function getSearchTrends(
  days: number = 7,
  query?: string
): Promise<SearchTrend[]> {
  try {
    let queryBuilder = supabase
      .from('search_trends')
      .select('*')
      .gte('trend_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('trend_date', { ascending: false })
      .order('search_count', { ascending: false });

    if (query) {
      queryBuilder = queryBuilder.eq('query', query);
    }

    const { data, error } = await queryBuilder.limit(100);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching search trends:', error);
    return [];
  }
}

// Get search analytics summary
export async function getSearchAnalyticsSummary(
  userId: string,
  days: number = 30
): Promise<SearchSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_search_analytics_summary', {
      p_user_id: userId,
      p_days: days,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        total_searches: Number(data[0].total_searches) || 0,
        unique_queries: Number(data[0].unique_queries) || 0,
        avg_results_count: Number(data[0].avg_results_count) || 0,
        click_through_rate: Number(data[0].click_through_rate) || 0,
        conversion_rate: Number(data[0].conversion_rate) || 0,
        avg_search_duration: Number(data[0].avg_search_duration) || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching search analytics summary:', error);
    return null;
  }
}

// Get user search history
export async function getUserSearchHistory(
  userId: string,
  limit: number = 20
): Promise<SearchAnalytics[]> {
  try {
    const { data, error } = await supabase
      .from('search_analytics')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user search history:', error);
    return [];
  }
}

// Get search performance by category
export async function getSearchPerformanceByCategory(
  days: number = 30
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('search_analytics')
      .select('search_category, results_count, converted')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    // Aggregate by category
    const categoryStats: Record<string, any> = {};

    data?.forEach((item) => {
      const category = item.search_category || 'unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          total_searches: 0,
          total_results: 0,
          conversions: 0,
        };
      }
      categoryStats[category].total_searches++;
      categoryStats[category].total_results += item.results_count;
      if (item.converted) {
        categoryStats[category].conversions++;
      }
    });

    return Object.values(categoryStats).map((stat) => ({
      ...stat,
      avg_results: stat.total_results / stat.total_searches,
      conversion_rate: (stat.conversions / stat.total_searches) * 100,
    }));
  } catch (error) {
    console.error('Error fetching search performance by category:', error);
    return [];
  }
}

// Update trending scores (should be run periodically)
export async function updateTrendingScores(): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_trending_scores');
    if (error) throw error;
  } catch (error) {
    console.error('Error updating trending scores:', error);
  }
}

// Format search type for display
export function formatSearchType(type: SearchType): string {
  const labels: Record<SearchType, string> = {
    text: 'Text Search',
    voice: 'Voice Search',
    image: 'Image Search',
    filter: 'Filter Search',
  };
  return labels[type];
}

// Format device type for display
export function formatDeviceType(type: DeviceType): string {
  const labels: Record<DeviceType, string> = {
    mobile: 'Mobile',
    tablet: 'Tablet',
    desktop: 'Desktop',
    unknown: 'Unknown',
  };
  return labels[type];
}

// Get search quality score
export function calculateSearchQuality(analytics: SearchAnalytics): number {
  let score = 0;

  // Results count (max 30 points)
  if (analytics.results_count > 0) {
    score += Math.min(30, analytics.results_count * 2);
  }

  // Click-through (20 points)
  if (analytics.results_clicked.length > 0) {
    score += 20;
  }

  // Fast first click (20 points)
  if (analytics.time_to_first_click && analytics.time_to_first_click < 5000) {
    score += 20;
  }

  // Low refinement count (15 points)
  if (analytics.refinement_count === 0) {
    score += 15;
  } else if (analytics.refinement_count === 1) {
    score += 10;
  }

  // Conversion (15 points)
  if (analytics.converted) {
    score += 15;
  }

  return score;
}

// Get search insights
export function getSearchInsights(analytics: SearchAnalytics[]): any {
  const insights = {
    total_searches: analytics.length,
    avg_results: 0,
    avg_clicks: 0,
    avg_quality: 0,
    most_common_type: 'text' as SearchType,
    peak_hour: 0,
    conversion_funnel: {
      searches: 0,
      clicks: 0,
      conversions: 0,
    },
  };

  if (analytics.length === 0) return insights;

  // Calculate averages
  insights.avg_results =
    analytics.reduce((sum, a) => sum + a.results_count, 0) / analytics.length;
  insights.avg_clicks =
    analytics.reduce((sum, a) => sum + a.results_clicked.length, 0) / analytics.length;
  insights.avg_quality =
    analytics.reduce((sum, a) => sum + calculateSearchQuality(a), 0) / analytics.length;

  // Most common search type
  const typeCounts: Record<SearchType, number> = {
    text: 0,
    voice: 0,
    image: 0,
    filter: 0,
  };
  analytics.forEach((a) => {
    typeCounts[a.search_type]++;
  });
  insights.most_common_type = Object.entries(typeCounts).sort(
    ([, a], [, b]) => b - a
  )[0][0] as SearchType;

  // Peak hour
  const hourCounts: Record<number, number> = {};
  analytics.forEach((a) => {
    const hour = new Date(a.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  insights.peak_hour = Number(
    Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 0
  );

  // Conversion funnel
  insights.conversion_funnel.searches = analytics.length;
  insights.conversion_funnel.clicks = analytics.filter(
    (a) => a.results_clicked.length > 0
  ).length;
  insights.conversion_funnel.conversions = analytics.filter((a) => a.converted).length;

  return insights;
}

// Detect current device type
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'unknown';

  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
