import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  MessageSquare,
  CheckCircle,
  Target,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { JobAnalyticsSummary } from '@/lib/job-analytics';
import { formatConversionRate, getConversionRateColor } from '@/lib/job-analytics';

interface JobAnalyticsOverviewProps {
  analytics: JobAnalyticsSummary;
}

export default function JobAnalyticsOverview({ analytics }: JobAnalyticsOverviewProps) {
  const renderStatCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    subtitle?: string,
    trend?: 'up' | 'down' | 'stable'
  ) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={styles.iconContainer}>{icon}</View>
        {trend && (
          <View style={styles.trendContainer}>
            {trend === 'up' && <TrendingUp size={14} color={colors.success} />}
            {trend === 'down' && <TrendingDown size={14} color={colors.error} />}
            {trend === 'stable' && <Minus size={14} color={colors.textSecondary} />}
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const conversionRateColor = getConversionRateColor(analytics.conversion_rate);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderStatCard(
          'Total Jobs',
          analytics.total_jobs,
          <Target size={20} color={colors.primary} />,
          'Posted'
        )}
        {renderStatCard(
          'Total Views',
          analytics.total_views,
          <Eye size={20} color={colors.blue} />,
          `${analytics.avg_views_per_job.toFixed(1)} avg/job`
        )}
      </View>

      <View style={styles.row}>
        {renderStatCard(
          'Total Quotes',
          analytics.total_quotes,
          <MessageSquare size={20} color={colors.orange} />,
          `${analytics.avg_quotes_per_job.toFixed(1)} avg/job`
        )}
        {renderStatCard(
          'Conversions',
          analytics.total_conversions,
          <CheckCircle size={20} color={colors.success} />,
          formatConversionRate(analytics.conversion_rate)
        )}
      </View>

      <View style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceTitle}>Overall Performance</Text>
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: conversionRateColor + '20' },
            ]}
          >
            <Text style={[styles.scoreText, { color: conversionRateColor }]}>
              {analytics.avg_overall_score.toFixed(0)}/100
            </Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(analytics.avg_overall_score, 100)}%`,
                  backgroundColor: conversionRateColor,
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.performanceSubtitle}>
          Average performance score across all jobs
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  performanceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  performanceTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scoreBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  scoreText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  progressBarContainer: {
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  performanceSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
