import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  Calendar,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Download,
  DollarSign,
} from 'lucide-react-native';
import {
  formatCurrency,
  formatExpensePeriodLabel,
  calculateCompletionRate,
  type CustomerExpenseReport,
} from '@/lib/customer-expense-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface CustomerExpenseReportCardProps {
  report: CustomerExpenseReport;
  onPress?: () => void;
  onDownload?: () => void;
  showComparison?: boolean;
  comparisonChange?: number;
}

export default function CustomerExpenseReportCard({
  report,
  onPress,
  onDownload,
  showComparison = false,
  comparisonChange = 0,
}: CustomerExpenseReportCardProps) {
  const completionRate = calculateCompletionRate(report);
  const isPositiveChange = comparisonChange >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Calendar size={20} color={colors.primary} />
          <Text style={styles.periodLabel}>{formatExpensePeriodLabel(report)}</Text>
        </View>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: getReportTypeColor(report.report_type) + '20' },
          ]}
        >
          <Text style={[styles.typeText, { color: getReportTypeColor(report.report_type) }]}>
            {report.report_type.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Main Amount */}
      <View style={styles.mainAmount}>
        <Text style={styles.amountLabel}>Total Spent</Text>
        <Text style={styles.amountValue}>{formatCurrency(report.total_spent)}</Text>
        {showComparison && comparisonChange !== 0 && (
          <View style={styles.comparison}>
            {isPositiveChange ? (
              <TrendingUp size={16} color={colors.error} />
            ) : (
              <TrendingDown size={16} color={colors.success} />
            )}
            <Text
              style={[
                styles.comparisonText,
                { color: isPositiveChange ? colors.error : colors.success },
              ]}
            >
              {isPositiveChange ? '+' : ''}
              {comparisonChange.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Bookings</Text>
          <Text style={styles.statValue}>{report.completed_bookings}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Avg Cost</Text>
          <Text style={styles.statValue}>{formatCurrency(report.avg_booking_cost)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Completion</Text>
          <Text style={styles.statValue}>{completionRate.toFixed(0)}%</Text>
        </View>
        {report.refunds_received > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Refunds</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(report.refunds_received)}
            </Text>
          </View>
        )}
      </View>

      {/* Payment Breakdown */}
      {(report.deposits_paid > 0 || report.balance_payments > 0) && (
        <View style={styles.breakdown}>
          {report.deposits_paid > 0 && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Deposits Paid</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(report.deposits_paid)}</Text>
            </View>
          )}
          {report.balance_payments > 0 && (
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Balance Payments</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(report.balance_payments)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      {onDownload && (
        <TouchableOpacity style={styles.downloadButton} onPress={onDownload}>
          <Download size={16} color={colors.primary} />
          <Text style={styles.downloadText}>Download Report</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function getReportTypeColor(type: string): string {
  const colors_map: Record<string, string> = {
    monthly: colors.primary,
    quarterly: colors.success,
    ytd: colors.secondary,
    annual: colors.error,
  };
  return colors_map[type] || colors.textSecondary;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  periodLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  mainAmount: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  comparisonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  breakdown: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  downloadText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
