import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  TrendingUp,
  Search,
  MousePointer,
  Target,
  Clock,
  BarChart3,
  Users,
  Zap,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSearchAnalyticsSummary,
  getPopularSearches,
  getTrendingSearches,
  getUserSearchHistory,
  getSearchInsights,
  formatSearchType,
  type SearchSummary,
  type PopularSearch,
  type SearchAnalytics,
} from '@/lib/search-analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SearchAnalyticsDashboardProps {
  days?: number;
  showUserHistory?: boolean;
}

export default function SearchAnalyticsDashboard({
  days = 30,
  showUserHistory = true,
}: SearchAnalyticsDashboardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<PopularSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchAnalytics[]>([]);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [user, days]);

  const loadAnalytics = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [summaryData, popular, trending, history] = await Promise.all([
        getSearchAnalyticsSummary(user.id, days),
        getPopularSearches(10),
        getTrendingSearches(10),
        showUserHistory ? getUserSearchHistory(user.id, 20) : Promise.resolve([]),
      ]);

      setSummary(summaryData);
      setPopularSearches(popular);
      setTrendingSearches(trending);
      setSearchHistory(history);

      if (history.length > 0) {
        setInsights(getSearchInsights(history));
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <Search size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Search Data</Text>
        <Text style={styles.emptyText}>
          Start searching to see your analytics
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Search size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{summary.total_searches}</Text>
            <Text style={styles.statLabel}>Total Searches</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Users size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{summary.unique_queries}</Text>
            <Text style={styles.statLabel}>Unique Queries</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <MousePointer size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>
              {summary.click_through_rate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Click Rate</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Target size={24} color={colors.error} />
            </View>
            <Text style={styles.statValue}>
              {summary.conversion_rate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Additional Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <BarChart3 size={20} color={colors.textSecondary} />
            <Text style={styles.metricLabel}>Avg Results</Text>
            <Text style={styles.metricValue}>
              {summary.avg_results_count.toFixed(0)}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Clock size={20} color={colors.textSecondary} />
            <Text style={styles.metricLabel}>Avg Duration</Text>
            <Text style={styles.metricValue}>
              {((summary.avg_search_duration || 0) / 1000).toFixed(1)}s
            </Text>
          </View>
        </View>
      </View>

      {/* Insights */}
      {insights && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Zap size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Search Insights</Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Search Quality</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${insights.avg_quality}%`,
                    backgroundColor:
                      insights.avg_quality >= 70
                        ? colors.success
                        : insights.avg_quality >= 40
                        ? colors.warning
                        : colors.error,
                  },
                ]}
              />
            </View>
            <Text style={styles.insightValue}>
              {insights.avg_quality.toFixed(0)}/100
            </Text>
          </View>

          <View style={styles.insightGrid}>
            <View style={styles.insightItem}>
              <Text style={styles.insightItemLabel}>Most Used</Text>
              <Text style={styles.insightItemValue}>
                {formatSearchType(insights.most_common_type)}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightItemLabel}>Peak Hour</Text>
              <Text style={styles.insightItemValue}>
                {insights.peak_hour}:00
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightItemLabel}>Avg Clicks</Text>
              <Text style={styles.insightItemValue}>
                {insights.avg_clicks.toFixed(1)}
              </Text>
            </View>

            <View style={styles.insightItem}>
              <Text style={styles.insightItemLabel}>Avg Results</Text>
              <Text style={styles.insightItemValue}>
                {insights.avg_results.toFixed(0)}
              </Text>
            </View>
          </View>

          {/* Conversion Funnel */}
          <View style={styles.funnelCard}>
            <Text style={styles.funnelTitle}>Conversion Funnel</Text>
            <View style={styles.funnelSteps}>
              <View style={styles.funnelStep}>
                <View
                  style={[
                    styles.funnelBar,
                    { width: '100%', backgroundColor: colors.primary },
                  ]}
                />
                <Text style={styles.funnelLabel}>Searches</Text>
                <Text style={styles.funnelValue}>
                  {insights.conversion_funnel.searches}
                </Text>
              </View>

              <View style={styles.funnelStep}>
                <View
                  style={[
                    styles.funnelBar,
                    {
                      width: `${(insights.conversion_funnel.clicks / insights.conversion_funnel.searches) * 100}%`,
                      backgroundColor: colors.warning,
                    },
                  ]}
                />
                <Text style={styles.funnelLabel}>Clicks</Text>
                <Text style={styles.funnelValue}>
                  {insights.conversion_funnel.clicks}
                </Text>
              </View>

              <View style={styles.funnelStep}>
                <View
                  style={[
                    styles.funnelBar,
                    {
                      width: `${(insights.conversion_funnel.conversions / insights.conversion_funnel.searches) * 100}%`,
                      backgroundColor: colors.success,
                    },
                  ]}
                />
                <Text style={styles.funnelLabel}>Conversions</Text>
                <Text style={styles.funnelValue}>
                  {insights.conversion_funnel.conversions}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Trending Searches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Trending Searches</Text>
        </View>
        {trendingSearches.map((search, index) => (
          <View key={search.id} style={styles.searchItem}>
            <View style={styles.searchRank}>
              <Text style={styles.searchRankText}>{index + 1}</Text>
            </View>
            <View style={styles.searchInfo}>
              <Text style={styles.searchQuery}>{search.query}</Text>
              <View style={styles.searchMeta}>
                <Text style={styles.searchMetaText}>
                  {search.search_count} searches
                </Text>
                <Text style={styles.searchMetaText}>
                  {search.click_through_rate.toFixed(0)}% CTR
                </Text>
                <Text style={styles.searchMetaText}>
                  Score: {search.trending_score.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Popular Searches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BarChart3 size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Popular Searches</Text>
        </View>
        {popularSearches.slice(0, 5).map((search, index) => (
          <View key={search.id} style={styles.searchItem}>
            <View style={styles.searchRank}>
              <Text style={styles.searchRankText}>{index + 1}</Text>
            </View>
            <View style={styles.searchInfo}>
              <Text style={styles.searchQuery}>{search.query}</Text>
              <View style={styles.searchMeta}>
                <Text style={styles.searchMetaText}>
                  {search.search_count} searches
                </Text>
                <Text style={styles.searchMetaText}>
                  {search.conversion_rate.toFixed(0)}% conversion
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Searches */}
      {showUserHistory && searchHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {searchHistory.slice(0, 10).map((search) => (
            <View key={search.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Search size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyQuery}>{search.search_query}</Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyMetaText}>
                    {formatSearchType(search.search_type)}
                  </Text>
                  <Text style={styles.historyMetaText}>
                    {search.results_count} results
                  </Text>
                  {search.converted && (
                    <Text style={[styles.historyMetaText, styles.convertedBadge]}>
                      ✓ Converted
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.historyTime}>
                {new Date(search.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  insightCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  insightTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
  insightValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  insightItemLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  insightItemValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  funnelCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  funnelTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  funnelSteps: {
    gap: spacing.sm,
  },
  funnelStep: {
    position: 'relative',
  },
  funnelBar: {
    height: 32,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  funnelLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  funnelValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  searchRank: {
    width: 32,
    height: 32,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  searchRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  searchInfo: {
    flex: 1,
  },
  searchQuery: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  searchMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  searchMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyQuery: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  historyMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  convertedBadge: {
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  historyTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
