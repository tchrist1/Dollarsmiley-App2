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
  FileText,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  TrendingUp,
  Award,
} from 'lucide-react-native';
import {
  getUserContentSummary,
  getBestPostingTime,
  formatEngagement,
  formatEngagementRate,
  type UserContentSummary,
} from '@/lib/content-analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UserContentPerformanceProps {
  userId: string;
}

export default function UserContentPerformance({ userId }: UserContentPerformanceProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<UserContentSummary | null>(null);
  const [bestTime, setBestTime] = useState<number>(12);

  useEffect(() => {
    loadPerformance();
  }, [userId, dateRange]);

  const loadPerformance = async () => {
    setLoading(true);
    try {
      const [summaryData, bestPostingTime] = await Promise.all([
        getUserContentSummary(userId, dateRange),
        getBestPostingTime(dateRange),
      ]);

      setSummary(summaryData);
      setBestTime(bestPostingTime);
    } catch (error) {
      console.error('Error loading performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceScore = (): number => {
    if (!summary) return 0;

    const postsScore = Math.min((summary.total_posts / 20) * 25, 25);
    const viewsScore = Math.min((summary.total_views / 1000) * 25, 25);
    const engagementScore = Math.min((Number(summary.avg_engagement_rate) / 5) * 25, 25);
    const likesScore = Math.min((summary.total_likes / 100) * 25, 25);

    return Math.round(postsScore + viewsScore + engagementScore + likesScore);
  };

  const getPerformanceLevel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Fair';
    return 'Getting Started';
  };

  const getPerformanceColor = (score: number): string => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.primary;
    if (score >= 40) return colors.secondary;
    return colors.error;
  };

  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <FileText size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No content performance data</Text>
      </View>
    );
  }

  const performanceScore = getPerformanceScore();
  const performanceLevel = getPerformanceLevel(performanceScore);
  const performanceColor = getPerformanceColor(performanceScore);

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
            style={[
              styles.dateButton,
              dateRange === days && styles.dateButtonActive,
            ]}
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

      {/* Performance Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: performanceColor }]}>
            {performanceScore}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreTitle}>Content Performance</Text>
          <Text style={[styles.scoreLevel, { color: performanceColor }]}>
            {performanceLevel}
          </Text>
        </View>
        <Award size={32} color={performanceColor} />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <FileText size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{summary.total_posts}</Text>
          <Text style={styles.statLabel}>Posts Created</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <Eye size={24} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{formatEngagement(summary.total_views)}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
            <Heart size={24} color={colors.error} />
          </View>
          <Text style={styles.statValue}>{formatEngagement(summary.total_likes)}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
            <TrendingUp size={24} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>
            {formatEngagementRate(summary.avg_engagement_rate)}
          </Text>
          <Text style={styles.statLabel}>Avg Engagement</Text>
        </View>
      </View>

      {/* Engagement Breakdown */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Engagement Breakdown</Text>

        <View style={styles.breakdownList}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Heart size={20} color={colors.error} />
              <Text style={styles.breakdownLabel}>Likes</Text>
            </View>
            <Text style={styles.breakdownValue}>
              {formatEngagement(summary.total_likes)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <MessageSquare size={20} color={colors.primary} />
              <Text style={styles.breakdownLabel}>Comments</Text>
            </View>
            <Text style={styles.breakdownValue}>
              {formatEngagement(summary.total_comments)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Share2 size={20} color={colors.success} />
              <Text style={styles.breakdownLabel}>Shares</Text>
            </View>
            <Text style={styles.breakdownValue}>
              {formatEngagement(summary.total_shares)}
            </Text>
          </View>
        </View>
      </View>

      {/* Insights Section */}
      <View style={styles.insightsSection}>
        <Text style={styles.sectionTitle}>Insights</Text>

        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <TrendingUp size={24} color={colors.primary} />
          </View>
          <View style={styles.insightContent}>
            <Text style={styles.insightTitle}>Best Posting Time</Text>
            <Text style={styles.insightValue}>{formatTime(bestTime)}</Text>
            <Text style={styles.insightDescription}>
              Posts created around this time tend to get more engagement
            </Text>
          </View>
        </View>

        {summary.total_posts > 0 && (
          <View style={styles.insightCard}>
            <View style={styles.insightIcon}>
              <Eye size={24} color={colors.success} />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Average Views per Post</Text>
              <Text style={styles.insightValue}>
                {Math.round(summary.total_views / summary.total_posts)}
              </Text>
              <Text style={styles.insightDescription}>
                On average, each post gets this many views
              </Text>
            </View>
          </View>
        )}
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
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
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
  },
  scoreMax: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoreLevel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  breakdownSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownList: {
    gap: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  breakdownValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  insightsSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  insightValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  insightDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
