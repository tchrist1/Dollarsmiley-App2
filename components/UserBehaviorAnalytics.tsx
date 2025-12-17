import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  TrendingUp,
  Eye,
  Clock,
  Zap,
  Activity,
  Target,
  Calendar,
  Award,
} from 'lucide-react-native';
import {
  getUserBehaviorInsights,
  getUserEngagementMetrics,
  formatEngagementScore,
  getEngagementColor,
  formatDuration,
  type BehaviorInsights,
  type EngagementMetrics,
} from '@/lib/behavior-tracking';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UserBehaviorAnalyticsProps {
  userId: string;
  days?: number;
}

export default function UserBehaviorAnalytics({
  userId,
  days = 30,
}: UserBehaviorAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<BehaviorInsights | null>(null);
  const [metrics, setMetrics] = useState<EngagementMetrics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(days);

  useEffect(() => {
    loadData();
  }, [userId, selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [insightsData, metricsData] = await Promise.all([
        getUserBehaviorInsights(userId, selectedPeriod),
        getUserEngagementMetrics(
          userId,
          new Date(Date.now() - selectedPeriod * 24 * 60 * 60 * 1000),
          new Date()
        ),
      ]);

      setInsights(insightsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading behavior analytics:', error);
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

  if (!insights) {
    return (
      <View style={styles.emptyContainer}>
        <Activity size={48} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No activity data available</Text>
      </View>
    );
  }

  const avgEngagementScore = insights.avg_engagement_score || 0;
  const engagementLabel = formatEngagementScore(avgEngagementScore);
  const engagementColor = getEngagementColor(avgEngagementScore);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[7, 14, 30, 90].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Engagement Score Card */}
      <View style={[styles.scoreCard, { borderLeftColor: engagementColor }]}>
        <View style={styles.scoreHeader}>
          <Award size={32} color={engagementColor} />
          <View style={styles.scoreContent}>
            <Text style={styles.scoreLabel}>Engagement Score</Text>
            <View style={styles.scoreValueRow}>
              <Text style={[styles.scoreValue, { color: engagementColor }]}>
                {avgEngagementScore.toFixed(1)}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={[styles.scoreStatus, { color: engagementColor }]}>
              {engagementLabel}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${avgEngagementScore}%`,
                backgroundColor: engagementColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Calendar size={24} color={colors.primary} />
          <Text style={styles.metricValue}>
            {insights.avg_sessions_per_day.toFixed(1)}
          </Text>
          <Text style={styles.metricLabel}>Sessions/Day</Text>
        </View>

        <View style={styles.metricCard}>
          <Clock size={24} color={colors.secondary} />
          <Text style={styles.metricValue}>
            {insights.avg_time_per_session_minutes.toFixed(0)}m
          </Text>
          <Text style={styles.metricLabel}>Avg Session</Text>
        </View>

        <View style={styles.metricCard}>
          <Zap size={24} color={colors.warning} />
          <Text style={styles.metricValue}>{insights.total_events}</Text>
          <Text style={styles.metricLabel}>Total Events</Text>
        </View>

        <View style={styles.metricCard}>
          <Eye size={24} color={colors.success} />
          <Text style={styles.metricValue}>{insights.unique_screens}</Text>
          <Text style={styles.metricLabel}>Screens Viewed</Text>
        </View>
      </View>

      {/* Activity Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Activity Details</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Target size={16} color={colors.primary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Most Visited Screen</Text>
            <Text style={styles.detailValue}>{insights.most_visited_screen}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Zap size={16} color={colors.secondary} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Most Used Feature</Text>
            <Text style={styles.detailValue}>{insights.most_used_feature}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Activity size={16} color={colors.success} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Unique Features Used</Text>
            <Text style={styles.detailValue}>{insights.unique_features}</Text>
          </View>
        </View>
      </View>

      {/* Daily Engagement Chart */}
      {metrics.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Engagement</Text>
          <View style={styles.chart}>
            {metrics.slice(0, 14).reverse().map((metric, index) => {
              const maxScore = Math.max(...metrics.map((m) => m.engagement_score));
              const height = (metric.engagement_score / maxScore) * 100;
              const color = getEngagementColor(metric.engagement_score);

              return (
                <View key={metric.date} style={styles.chartBar}>
                  <View
                    style={[
                      styles.chartBarFill,
                      {
                        height: `${height}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                  <Text style={styles.chartLabel}>
                    {new Date(metric.date).getDate()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Activity */}
      {metrics.length > 0 && (
        <View style={styles.recentCard}>
          <Text style={styles.recentTitle}>Recent Activity</Text>
          {metrics.slice(0, 5).map((metric) => (
            <View key={metric.date} style={styles.recentRow}>
              <View style={styles.recentDate}>
                <Text style={styles.recentDateText}>
                  {new Date(metric.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.recentStats}>
                <Text style={styles.recentStat}>
                  {metric.sessions_count} session{metric.sessions_count !== 1 ? 's' : ''}
                </Text>
                <Text style={styles.recentSeparator}>•</Text>
                <Text style={styles.recentStat}>
                  {formatDuration(metric.total_time_seconds)}
                </Text>
                <Text style={styles.recentSeparator}>•</Text>
                <Text style={styles.recentStat}>{metric.events_count} events</Text>
              </View>
              <View
                style={[
                  styles.recentScore,
                  { backgroundColor: getEngagementColor(metric.engagement_score) },
                ]}
              >
                <Text style={styles.recentScoreText}>
                  {metric.engagement_score.toFixed(0)}
                </Text>
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
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  scoreCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  scoreMax: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  scoreStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  detailsCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  detailsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailIcon: {
    width: 32,
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginTop: 2,
  },
  chartCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: spacing.xs,
  },
  chartBar: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBarFill: {
    width: '100%',
    borderTopLeftRadius: borderRadius.xs,
    borderTopRightRadius: borderRadius.xs,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: fontSize.xxs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  recentCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  recentTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentDate: {
    width: 60,
  },
  recentDateText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  recentStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recentStat: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  recentSeparator: {
    fontSize: fontSize.xs,
    color: colors.border,
  },
  recentScore: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentScoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
