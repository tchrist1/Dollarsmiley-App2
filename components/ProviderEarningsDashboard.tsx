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
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import {
  getProviderEarningsSummary,
  formatCurrency,
  type ProviderEarningsSummary,
} from '@/lib/transaction-analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ProviderEarningsDashboardProps {
  providerId: string;
}

export default function ProviderEarningsDashboard({
  providerId,
}: ProviderEarningsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<ProviderEarningsSummary | null>(null);

  useEffect(() => {
    loadEarnings();
  }, [providerId, dateRange]);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const data = await getProviderEarningsSummary(providerId, dateRange);
      setSummary(data);
    } catch (error) {
      console.error('Error loading earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTakeHomeRate = (): string => {
    if (!summary || summary.total_earnings === 0) return '0';
    const rate = (summary.net_earnings / summary.total_earnings) * 100;
    return rate.toFixed(1);
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
        <DollarSign size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No earnings data available</Text>
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

      {/* Main Earnings Card */}
      <View style={styles.mainCard}>
        <View style={styles.mainCardHeader}>
          <DollarSign size={32} color={colors.success} />
          <Text style={styles.mainCardLabel}>Total Earnings</Text>
        </View>
        <Text style={styles.mainCardValue}>
          {formatCurrency(summary.total_earnings)}
        </Text>
        <View style={styles.mainCardFooter}>
          <View style={styles.mainCardStat}>
            <Text style={styles.mainCardStatValue}>
              {formatCurrency(summary.net_earnings)}
            </Text>
            <Text style={styles.mainCardStatLabel}>Net Earnings</Text>
          </View>
          <View style={styles.mainCardDivider} />
          <View style={styles.mainCardStat}>
            <Text style={styles.mainCardStatValue}>{calculateTakeHomeRate()}%</Text>
            <Text style={styles.mainCardStatLabel}>Take-home Rate</Text>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <CheckCircle size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{summary.completed_bookings}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
            <CreditCard size={24} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{summary.total_transactions}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.secondary + '20' }]}>
            <TrendingUp size={24} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>
            {formatCurrency(summary.avg_booking_value)}
          </Text>
          <Text style={styles.statLabel}>Avg Booking</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.error + '20' }]}>
            <XCircle size={24} color={colors.error} />
          </View>
          <Text style={styles.statValue}>{formatCurrency(summary.total_refunds)}</Text>
          <Text style={styles.statLabel}>Refunds</Text>
        </View>
      </View>

      {/* Breakdown Section */}
      <View style={styles.breakdownSection}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>

        <View style={styles.breakdownList}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Gross Earnings</Text>
            <Text style={[styles.breakdownValue, { color: colors.success }]}>
              {formatCurrency(summary.total_earnings)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Platform Fees</Text>
            <Text style={[styles.breakdownValue, { color: colors.error }]}>
              - {formatCurrency(summary.platform_fees_paid)}
            </Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Net Earnings</Text>
            <Text style={[styles.breakdownValue, styles.breakdownValueBold]}>
              {formatCurrency(summary.net_earnings)}
            </Text>
          </View>
        </View>
      </View>

      {/* Issues Section */}
      {(summary.total_refunds > 0 || summary.total_disputes > 0) && (
        <View style={styles.issuesSection}>
          <Text style={styles.sectionTitle}>Issues</Text>

          <View style={styles.issuesList}>
            {summary.total_refunds > 0 && (
              <View style={styles.issueItem}>
                <View style={styles.issueIcon}>
                  <XCircle size={20} color={colors.error} />
                </View>
                <View style={styles.issueInfo}>
                  <Text style={styles.issueLabel}>Refunds Issued</Text>
                  <Text style={styles.issueValue}>
                    {formatCurrency(summary.total_refunds)}
                  </Text>
                </View>
              </View>
            )}

            {summary.total_disputes > 0 && (
              <View style={styles.issueItem}>
                <View style={styles.issueIcon}>
                  <AlertTriangle size={20} color={colors.secondary} />
                </View>
                <View style={styles.issueInfo}>
                  <Text style={styles.issueLabel}>Active Disputes</Text>
                  <Text style={styles.issueValue}>{summary.total_disputes}</Text>
                </View>
              </View>
            )}
          </View>
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
  mainCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mainCardLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  mainCardValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.md,
  },
  mainCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mainCardStat: {
    flex: 1,
    alignItems: 'center',
  },
  mainCardStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  mainCardStatLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  mainCardDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
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
    gap: spacing.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  breakdownLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  breakdownValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  breakdownValueBold: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  issuesSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  issuesList: {
    gap: spacing.md,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueInfo: {
    flex: 1,
  },
  issueLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  issueValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
