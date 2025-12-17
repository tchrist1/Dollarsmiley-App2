import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { FileText, TrendingUp, DollarSign, Calendar, Info } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import IncomeStatementGenerator from '@/components/IncomeStatementGenerator';
import {
  fetchIncomeStatementData,
  getDateRanges,
  type IncomeStatementData,
} from '@/lib/income-statement';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function IncomeStatementScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<IncomeStatementData | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadPreview();
    }
  }, [user]);

  const loadPreview = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load current month preview
      const ranges = getDateRanges();
      const currentMonth = ranges[0]; // "This Month"

      const data = await fetchIncomeStatementData(
        user.id,
        currentMonth.start,
        currentMonth.end
      );

      setPreviewData(data);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.iconWrapper}>
            <FileText size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Income Statements</Text>
            <Text style={styles.subtitle}>Generate professional financial reports</Text>
          </View>
        </View>
      </View>

      {/* Current Month Preview */}
      {previewData && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Current Month Overview</Text>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, styles.metricCardPrimary]}>
              <View style={styles.metricIcon}>
                <DollarSign size={24} color={colors.success} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>
                  {formatCurrency(previewData.revenue.total_revenue)}
                </Text>
              </View>
            </View>

            <View style={[styles.metricCard, styles.metricCardSecondary]}>
              <View style={styles.metricIcon}>
                <TrendingUp size={24} color={colors.error} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Total Expenses</Text>
                <Text style={[styles.metricValue, { color: colors.error }]}>
                  {formatCurrency(previewData.expenses.total_expenses)}
                </Text>
              </View>
            </View>

            <View style={[styles.metricCard, styles.metricCardHighlight]}>
              <View style={styles.metricIcon}>
                <DollarSign size={24} color={colors.primary} />
              </View>
              <View style={styles.metricContent}>
                <Text style={styles.metricLabel}>Net Income</Text>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color:
                        previewData.summary.net_income >= 0 ? colors.success : colors.error,
                    },
                  ]}
                >
                  {formatCurrency(previewData.summary.net_income)}
                </Text>
              </View>
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{previewData.summary.completed_bookings}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{previewData.summary.gross_margin.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Gross Margin</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatCurrency(previewData.summary.average_transaction)}
              </Text>
              <Text style={styles.statLabel}>Avg Transaction</Text>
            </View>
          </View>
        </View>
      )}

      {/* Generate Statement */}
      <View style={styles.generateSection}>
        <Text style={styles.sectionTitle}>Generate Statement</Text>
        <Text style={styles.sectionDescription}>
          Create a detailed income statement for any period. Choose from predefined ranges or select
          custom dates.
        </Text>

        <IncomeStatementGenerator providerId={user?.id || ''} onGenerated={loadPreview} />
      </View>

      {/* Features List */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What's Included</Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
              <DollarSign size={20} color={colors.success} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Revenue Analysis</Text>
              <Text style={styles.featureDescription}>
                Complete breakdown of service revenue, tips, and other income
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.error + '20' }]}>
              <TrendingUp size={20} color={colors.error} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Expense Tracking</Text>
              <Text style={styles.featureDescription}>
                Platform fees, processing costs, refunds, and other expenses
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
              <FileText size={20} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Professional Format</Text>
              <Text style={styles.featureDescription}>
                Clean, organized PDF ready for accounting and tax purposes
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.secondary + '20' }]}>
              <Calendar size={20} color={colors.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Flexible Periods</Text>
              <Text style={styles.featureDescription}>
                Monthly, quarterly, yearly, or custom date ranges
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Info size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Income statements are generated for informational purposes. Please consult with a
          qualified accountant for official financial reporting.
        </Text>
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
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.xxl * 2,
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
  header: {
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  previewSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  metricsGrid: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  metricCardSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  metricCardHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  generateSection: {
    marginBottom: spacing.xl,
  },
  featuresSection: {
    marginBottom: spacing.xl,
  },
  featuresList: {
    gap: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  featureDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
});
