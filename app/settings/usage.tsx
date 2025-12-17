import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import {
  TrendingUp,
  ArrowUpCircle,
  Info,
  Calendar,
  RefreshCw,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import UsageTracker from '@/components/UsageTracker';
import {
  getUsageHistory,
  getUserUsageSummary,
  getCurrentPeriod,
  getMetricLabel,
  formatUsageCount,
  type UsageMetric,
  type UsageSummary,
} from '@/lib/usage-tracking';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function UsageScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<UsageMetric>('job_posts');
  const [historyData, setHistoryData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedMetric && user?.id) {
      loadHistory(selectedMetric);
    }
  }, [selectedMetric, user]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const data = await getUserUsageSummary(user.id);
      setSummary(data);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadHistory = async (metric: UsageMetric) => {
    if (!user?.id) return;

    try {
      const history = await getUsageHistory(user.id, metric, 6);
      setHistoryData(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getChartData = () => {
    if (historyData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = historyData
      .slice(0, 6)
      .reverse()
      .map((record) => {
        const date = new Date(record.period_start);
        return date.toLocaleDateString('en-US', { month: 'short' });
      });

    const data = historyData
      .slice(0, 6)
      .reverse()
      .map((record) => record.count);

    return {
      labels,
      datasets: [{ data }],
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading usage data...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.emptyContainer}>
        <TrendingUp size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Usage Data</Text>
        <Text style={styles.emptyText}>
          Start using the platform to see your usage statistics.
        </Text>
      </View>
    );
  }

  const { periodStart, periodEnd } = getCurrentPeriod();
  const chartData = getChartData();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Usage & Limits',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Current Period */}
        <View style={styles.periodCard}>
          <View style={styles.periodHeader}>
            <Calendar size={20} color={colors.primary} />
            <Text style={styles.periodTitle}>Current Billing Period</Text>
          </View>
          <Text style={styles.periodDates}>
            {new Date(periodStart).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            -{' '}
            {new Date(periodEnd).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <View style={styles.periodInfo}>
            <Info size={16} color={colors.textSecondary} />
            <Text style={styles.periodInfoText}>
              Usage resets at the start of each billing period
            </Text>
          </View>
        </View>

        {/* Usage Tracker */}
        <UsageTracker
          userId={user!.id}
          showUpgrade={true}
          onUpgradePress={() => router.push('/subscription')}
        />

        {/* Metric Selector */}
        <View style={styles.metricSection}>
          <Text style={styles.sectionTitle}>Usage Trend</Text>
          <Text style={styles.sectionSubtitle}>Last 6 months</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.metricScroll}
          >
            {summary.usage
              .filter((u) => u.limit !== 0 || u.count > 0)
              .map((usage) => (
                <TouchableOpacity
                  key={usage.metric}
                  style={[
                    styles.metricChip,
                    selectedMetric === usage.metric && styles.metricChipActive,
                  ]}
                  onPress={() => setSelectedMetric(usage.metric)}
                >
                  <Text
                    style={[
                      styles.metricChipText,
                      selectedMetric === usage.metric && styles.metricChipTextActive,
                    ]}
                  >
                    {getMetricLabel(usage.metric)}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Chart */}
        {historyData.length > 0 ? (
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2}
              height={220}
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                style: {
                  borderRadius: borderRadius.md,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />

            <View style={styles.chartInfo}>
              <Text style={styles.chartInfoLabel}>
                {getMetricLabel(selectedMetric)} over time
              </Text>
              <View style={styles.chartStats}>
                <View style={styles.chartStat}>
                  <Text style={styles.chartStatLabel}>Current</Text>
                  <Text style={styles.chartStatValue}>
                    {historyData[0]
                      ? formatUsageCount(selectedMetric, historyData[0].count)
                      : '0'}
                  </Text>
                </View>
                <View style={styles.chartStat}>
                  <Text style={styles.chartStatLabel}>Average</Text>
                  <Text style={styles.chartStatValue}>
                    {formatUsageCount(
                      selectedMetric,
                      Math.round(
                        historyData.reduce((sum, r) => sum + r.count, 0) /
                          historyData.length
                      )
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noHistoryCard}>
            <TrendingUp size={48} color={colors.textSecondary} />
            <Text style={styles.noHistoryText}>
              No historical data available for {getMetricLabel(selectedMetric)}
            </Text>
          </View>
        )}

        {/* Plan Details */}
        <View style={styles.planCard}>
          <Text style={styles.sectionTitle}>Your Plan Limits</Text>
          <Text style={styles.planName}>{summary.plan.display_name}</Text>

          <View style={styles.limitsGrid}>
            {summary.usage
              .filter((u) => u.limit !== 0 || u.count > 0)
              .map((usage) => (
                <View key={usage.metric} style={styles.limitItem}>
                  <Text style={styles.limitLabel}>{getMetricLabel(usage.metric)}</Text>
                  <Text style={styles.limitValue}>
                    {usage.unlimited
                      ? 'Unlimited'
                      : formatUsageCount(usage.metric, usage.limit)}
                  </Text>
                </View>
              ))}
          </View>

          <TouchableOpacity
            style={styles.managePlanButton}
            onPress={() => router.push('/settings/subscription')}
          >
            <RefreshCw size={20} color={colors.primary} />
            <Text style={styles.managePlanButtonText}>Manage Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Upgrade CTA */}
        {summary.hasExceeded && (
          <View style={styles.upgradeCard}>
            <ArrowUpCircle size={48} color={colors.primary} />
            <Text style={styles.upgradeTitle}>Need More?</Text>
            <Text style={styles.upgradeText}>
              You've reached your limit on some features. Upgrade to get more.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.upgradeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips to Manage Usage</Text>

          <View style={styles.tip}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>1</Text>
            </View>
            <Text style={styles.tipText}>
              Monitor your usage regularly to avoid hitting limits
            </Text>
          </View>

          <View style={styles.tip}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>2</Text>
            </View>
            <Text style={styles.tipText}>
              Archive or delete old items to free up space
            </Text>
          </View>

          <View style={styles.tip}>
            <View style={styles.tipNumber}>
              <Text style={styles.tipNumberText}>3</Text>
            </View>
            <Text style={styles.tipText}>
              Upgrade to a higher plan for unlimited access
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  periodCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  periodTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  periodDates: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  periodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  periodInfoText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  metricSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  metricScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  metricChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  metricChipActive: {
    backgroundColor: colors.primary,
  },
  metricChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  metricChipTextActive: {
    color: colors.white,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chart: {
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  chartInfo: {
    marginTop: spacing.md,
  },
  chartInfoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chartStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  chartStat: {
    flex: 1,
  },
  chartStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  chartStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  noHistoryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  noHistoryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  planName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  limitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  limitItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  limitLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  limitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  managePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  managePlanButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  upgradeCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  upgradeTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  upgradeButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  tipsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  tipsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tipNumber: {
    width: 24,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
