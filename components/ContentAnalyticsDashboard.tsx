import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { FileText, Heart, MessageSquare, Share2, TrendingUp, Eye } from 'lucide-react-native';
import {
  getContentAnalyticsSummary,
  getContentTrendsChart,
  getEngagementTrendsChart,
  getEngagementRateChart,
  getContentTypeDistribution,
  getEngagementHeatmapData,
  getTrendingPosts,
  formatEngagement,
  formatEngagementRate,
  type ChartData,
  type DistributionData,
  type TrendingPost,
} from '@/lib/content-analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function ContentAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<any>(null);
  const [postsChart, setPostsChart] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [engagementChart, setEngagementChart] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [rateChart, setRateChart] = useState<ChartData>({ labels: [], datasets: [{ data: [] }] });
  const [typeDistribution, setTypeDistribution] = useState<DistributionData[]>([]);
  const [heatmapData, setHeatmapData] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryData, posts, engagement, rate, types, heatmap, trending] =
        await Promise.all([
          getContentAnalyticsSummary(dateRange),
          getContentTrendsChart(dateRange),
          getEngagementTrendsChart(dateRange),
          getEngagementRateChart(dateRange),
          getContentTypeDistribution(dateRange),
          getEngagementHeatmapData(7),
          getTrendingPosts(5),
        ]);

      setSummary(summaryData);
      setPostsChart(posts);
      setEngagementChart(engagement);
      setRateChart(rate);
      setTypeDistribution(types);
      setHeatmapData(heatmap);
      setTrendingPosts(trending);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    backgroundColor: colors.white,
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading content analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        {([7, 30, 90] as const).map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.dateButton, dateRange === days && styles.dateButtonActive]}
            onPress={() => setDateRange(days)}
          >
            <Text
              style={[
                styles.dateButtonText,
                dateRange === days && styles.dateButtonTextActive,
              ]}
            >
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      {summary && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <FileText size={24} color={colors.primary} />
            <Text style={styles.statValue}>{summary.totalPosts}</Text>
            <Text style={styles.statLabel}>Total Posts</Text>
          </View>

          <View style={styles.statCard}>
            <Heart size={24} color={colors.error} />
            <Text style={styles.statValue}>
              {formatEngagement(summary.totalEngagement)}
            </Text>
            <Text style={styles.statLabel}>Total Engagement</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statValue}>
              {formatEngagementRate(summary.avgEngagementRate)}
            </Text>
            <Text style={styles.statLabel}>Avg Engagement</Text>
          </View>

          <View style={styles.statCard}>
            <Share2 size={24} color={colors.secondary} />
            <Text style={styles.statValue}>{summary.trendingPosts}</Text>
            <Text style={styles.statLabel}>Trending Posts</Text>
          </View>
        </View>
      )}

      {/* Posts Created Chart */}
      {postsChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Posts Created</Text>
          <LineChart
            data={{
              labels: postsChart.labels.slice(-7),
              datasets: [
                {
                  data: postsChart.datasets[0].data.slice(-7),
                  color: () => colors.primary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Engagement Trends Chart */}
      {engagementChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Total Engagement</Text>
          <LineChart
            data={{
              labels: engagementChart.labels.slice(-7),
              datasets: [
                {
                  data: engagementChart.datasets[0].data.slice(-7),
                  color: () => colors.error,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Engagement Rate Chart */}
      {rateChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Engagement Rate (%)</Text>
          <LineChart
            data={{
              labels: rateChart.labels.slice(-7),
              datasets: [
                {
                  data: rateChart.datasets[0].data.slice(-7),
                  color: () => colors.success,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Content Type Distribution */}
      {typeDistribution.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Content Types</Text>
          <PieChart
            data={typeDistribution}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={chartConfig}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Engagement by Hour */}
      {heatmapData.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Best Posting Times</Text>
          <BarChart
            data={{
              labels: heatmapData.labels.filter((_, i) => i % 2 === 0),
              datasets: [
                {
                  data: heatmapData.datasets[0].data.filter((_, i) => i % 2 === 0),
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisSuffix="%"
          />
        </View>
      )}

      {/* Trending Posts */}
      {trendingPosts.length > 0 && (
        <View style={styles.trendingSection}>
          <Text style={styles.sectionTitle}>Trending Posts</Text>
          {trendingPosts.map((post, index) => (
            <View key={post.post_id} style={styles.trendingItem}>
              <View style={styles.trendingRank}>
                <Text style={styles.trendingRankText}>{index + 1}</Text>
              </View>
              <View style={styles.trendingContent}>
                <Text style={styles.trendingAuthor}>{post.author_name}</Text>
                <Text style={styles.trendingText} numberOfLines={2}>
                  {post.content}
                </Text>
                <View style={styles.trendingStats}>
                  <View style={styles.trendingStat}>
                    <TrendingUp size={14} color={colors.success} />
                    <Text style={styles.trendingStatText}>
                      {formatEngagement(post.total_engagement)}
                    </Text>
                  </View>
                  <View style={styles.trendingStat}>
                    <Heart size={14} color={colors.error} />
                    <Text style={styles.trendingStatText}>
                      {formatEngagementRate(post.engagement_rate)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dateButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  dateButtonTextActive: {
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  trendingSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  trendingItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trendingRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingRankText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  trendingContent: {
    flex: 1,
  },
  trendingAuthor: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  trendingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
