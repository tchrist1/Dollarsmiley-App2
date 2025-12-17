import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { type ModeratorPerformanceSummary, formatResponseTime } from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ModeratorPerformanceCardProps {
  performance: ModeratorPerformanceSummary;
  moderatorName: string;
}

export default function ModeratorPerformanceCard({
  performance,
  moderatorName,
}: ModeratorPerformanceCardProps) {
  const actionBreakdown = [
    { label: 'Dismissed', count: performance.total_dismiss, color: colors.textSecondary },
    { label: 'Warnings', count: performance.total_warn, color: colors.secondary },
    {
      label: 'Content Removed',
      count: performance.total_remove_content,
      color: colors.error,
    },
    { label: 'Suspensions', count: performance.total_suspend_user, color: '#EA580C' },
    { label: 'Bans', count: performance.total_ban_user, color: '#DC2626' },
    { label: 'Escalations', count: performance.total_escalate, color: colors.primary },
    { label: 'Restorations', count: performance.total_restore, color: colors.success },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{moderatorName}</Text>
        <Text style={styles.subtitle}>Performance Summary</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <CheckCircle size={24} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{performance.total_actions}</Text>
          <Text style={styles.statLabel}>Total Actions</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Clock size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>
            {formatResponseTime(performance.average_response_time_seconds)}
          </Text>
          <Text style={styles.statLabel}>Avg Response</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp size={24} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{performance.actions_per_day.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Actions/Day</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <AlertTriangle size={24} color={colors.textSecondary} />
          </View>
          <Text style={styles.statValue}>{performance.days_active}</Text>
          <Text style={styles.statLabel}>Days Active</Text>
        </View>
      </View>

      <View style={styles.breakdownSection}>
        <Text style={styles.breakdownTitle}>Action Breakdown</Text>
        <View style={styles.breakdownList}>
          {actionBreakdown.map((item, index) => (
            <View key={index} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View
                  style={[styles.breakdownDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.breakdownLabel}>{item.label}</Text>
              </View>
              <Text style={[styles.breakdownValue, { color: item.color }]}>
                {item.count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
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
  breakdownSection: {
    gap: spacing.md,
  },
  breakdownTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  breakdownList: {
    gap: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  breakdownValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
