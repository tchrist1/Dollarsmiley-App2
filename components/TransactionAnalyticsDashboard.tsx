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
import { LineChart, PieChart } from 'react-native-chart-kit';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  Activity,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import {
  getTransactionAnalyticsSummary,
  getTransactionVolumeChart,
  getPlatformFeesChart,
  getSuccessRateChart,
  getRevenueDistributionByCategory,
  getPaymentMethodDistribution,
  formatCurrency,
  formatPercentage,
  type ChartData,
  type DistributionData,
} from '@/lib/transaction-analytics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function TransactionAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<any>(null);
  const [volumeChart, setVolumeChart] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [feesChart, setFeesChart] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [successChart, setSuccessChart] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }],
  });
  const [revenueDistribution, setRevenueDistribution] = useState<DistributionData[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<DistributionData[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryData, volume, fees, success, revenue, payment] = await Promise.all([
        getTransactionAnalyticsSummary(dateRange),
        getTransactionVolumeChart(dateRange),
        getPlatformFeesChart(dateRange),
        getSuccessRateChart(dateRange),
        getRevenueDistributionByCategory(dateRange),
        getPaymentMethodDistribution(dateRange),
      ]);

      setSummary(summaryData);
      setVolumeChart(volume);
      setFeesChart(fees);
      setSuccessChart(success);
      setRevenueDistribution(revenue);
      setPaymentDistribution(payment);
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
        <Text style={styles.loadingText}>Loading transaction analytics...</Text>
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
            <DollarSign size={24} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(summary.totalVolume)}</Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>

          <View style={styles.statCard}>
            <Activity size={24} color={colors.primary} />
            <Text style={styles.statValue}>{summary.totalTransactions}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={colors.secondary} />
            <Text style={styles.statValue}>{formatCurrency(summary.totalFees)}</Text>
            <Text style={styles.statLabel}>Platform Fees</Text>
          </View>

          <View style={styles.statCard}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={styles.statValue}>{formatPercentage(summary.successRate)}</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>

          <View style={styles.statCard}>
            <CreditCard size={24} color={colors.error} />
            <Text style={styles.statValue}>{formatCurrency(summary.avgTransactionValue)}</Text>
            <Text style={styles.statLabel}>Avg Transaction</Text>
          </View>

          <View style={styles.statCard}>
            <Users size={24} color={colors.textSecondary} />
            <Text style={styles.statValue}>{summary.totalCustomers}</Text>
            <Text style={styles.statLabel}>Active Customers</Text>
          </View>
        </View>
      )}

      {/* Transaction Volume Chart */}
      {volumeChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Transaction Volume</Text>
          <LineChart
            data={{
              labels: volumeChart.labels.slice(-7),
              datasets: [
                {
                  data: volumeChart.datasets[0].data.slice(-7),
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

      {/* Success Rate Chart */}
      {successChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Success Rate (%)</Text>
          <LineChart
            data={{
              labels: successChart.labels.slice(-7),
              datasets: [
                {
                  data: successChart.datasets[0].data.slice(-7),
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

      {/* Platform Fees Chart */}
      {feesChart.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Platform Fees</Text>
          <LineChart
            data={{
              labels: feesChart.labels.slice(-7),
              datasets: [
                {
                  data: feesChart.datasets[0].data.slice(-7),
                  color: () => colors.secondary,
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Revenue by Category */}
      {revenueDistribution.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Revenue by Category</Text>
          <PieChart
            data={revenueDistribution}
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

      {/* Payment Methods */}
      {paymentDistribution.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Payment Methods</Text>
          <PieChart
            data={paymentDistribution}
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
    fontSize: fontSize.xl,
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
});
