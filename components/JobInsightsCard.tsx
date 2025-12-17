import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lightbulb, TrendingUp, MessageSquare, Eye } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  JobAnalyticsSummary,
  getPerformanceInsight,
  getVisibilityInsight,
  getQuoteInsight,
} from '@/lib/job-analytics';

interface JobInsightsCardProps {
  analytics: JobAnalyticsSummary;
}

export default function JobInsightsCard({ analytics }: JobInsightsCardProps) {
  const insights = [
    {
      icon: <TrendingUp size={20} color={colors.primary} />,
      title: 'Performance',
      text: getPerformanceInsight(analytics),
    },
    {
      icon: <Eye size={20} color={colors.blue} />,
      title: 'Visibility',
      text: getVisibilityInsight(analytics.avg_views_per_job),
    },
    {
      icon: <MessageSquare size={20} color={colors.orange} />,
      title: 'Quotes',
      text: getQuoteInsight(analytics.avg_quotes_per_job, analytics.total_jobs),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb size={24} color={colors.warning} />
        <Text style={styles.title}>Insights & Recommendations</Text>
      </View>

      <View style={styles.insightsList}>
        {insights.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <View style={styles.insightIcon}>{insight.icon}</View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  insightsList: {
    gap: spacing.lg,
  },
  insightItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
  insightText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
