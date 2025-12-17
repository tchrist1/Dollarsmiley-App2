import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Target,
  Eye,
  Clock,
  Award,
  ArrowUpRight,
  Lock,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAdvancedAnalytics,
  formatMetricValue,
  type AdvancedAnalyticsDashboard,
} from '@/lib/advanced-analytics';
import { getUserSubscription } from '@/lib/stripe-subscription-config';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TimePeriod = '7d' | '30d' | '90d' | '1y';

export default function AdvancedAnalyticsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [analytics, setAnalytics] = useState<AdvancedAnalyticsDashboard | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      loadAnalytics();
    }
  }, [period, hasAccess]);

  const checkAccess = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const subscription = await getUserSubscription(user.id);

      // Check if user has Pro or Enterprise plan
      const hasAdvancedAnalytics = subscription?.plan?.name === 'Pro' ||
                                   subscription?.plan?.name === 'Enterprise';

      setHasAccess(hasAdvancedAnalytics);
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!user?.id) return;

    try {
      const data = await getAdvancedAnalytics(user.id, period);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderMetricCard = (
    title: string,
    value: string,
    change?: number,
    icon?: any,
    iconColor?: string
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{title}</Text>
        {icon && (
          <View style={[styles.metricIcon, { backgroundColor: iconColor + '20' }]}>
            {icon}
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      {change !== undefined && (
        <View style={styles.metricChange}>
          {change >= 0 ? (
            <TrendingUp size={14} color={colors.success} />
          ) : (
            <TrendingDown size={14} color={colors.error} />
          )}
          <Text
            style={[
              styles.metricChangeText,
              { color: change >= 0 ? colors.success : colors.error },
            ]}
          >
            {Math.abs(change).toFixed(1)}% vs previous period
          </Text>
        </View>
      )}
    </View>
  );

  const getRevenueChartData = () => {
    if (!analytics?.revenue.dailyRevenue || analytics.revenue.dailyRevenue.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }

    const data = analytics.revenue.dailyRevenue.slice(-14);
    return {
      labels: data.map(d => new Date(d.date).getDate().toString()),
      datasets: [{ data: data.map(d => d.revenue) }],
    };
  };

  const getBookingTrendsData = () => {
    if (!analytics?.bookings.bookingTrends || analytics.bookings.bookingTrends.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }

    const data = analytics.bookings.bookingTrends.slice(-14);
    return {
      labels: data.map(d => new Date(d.date).getDate().toString()),
      datasets: [{ data: data.map(d => d.bookings) }],
    };
  };

  const getCategoryPieData = () => {
    if (!analytics?.revenue.topRevenueCategories) return [];

    return analytics.revenue.topRevenueCategories.map((cat, index) => ({
      name: cat.category,
      population: cat.revenue,
      color: [colors.primary, colors.success, colors.warning, colors.info, colors.error][index % 5],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading advanced analytics...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <>
        <Stack.Screen options={{ title: 'Advanced Analytics', headerShown: true }} />
        <View style={styles.noAccessContainer}>
          <View style={styles.lockIcon}>
            <Lock size={64} color={colors.textSecondary} />
          </View>
          <Text style={styles.noAccessTitle}>Premium Feature</Text>
          <Text style={styles.noAccessText}>
            Advanced analytics are available for Pro and Enterprise plan subscribers.
          </Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <TrendingUp size={20} color={colors.primary} />
              <Text style={styles.featureText}>Revenue insights & projections</Text>
            </View>
            <View style={styles.featureItem}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.featureText}>Customer segmentation & lifetime value</Text>
            </View>
            <View style={styles.featureItem}>
              <Target size={20} color={colors.primary} />
              <Text style={styles.featureText}>Marketing performance metrics</Text>
            </View>
            <View style={styles.featureItem}>
              <Award size={20} color={colors.primary} />
              <Text style={styles.featureText}>Performance benchmarking</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            <ArrowUpRight size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  if (!analytics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Advanced Analytics', headerShown: true }} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['7d', '30d', '90d', '1y'] as TimePeriod[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>

          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Revenue',
              formatMetricValue(analytics.revenue.totalRevenue, 'currency'),
              analytics.revenue.revenueGrowth,
              <DollarSign size={20} color={colors.success} />,
              colors.success
            )}
            {renderMetricCard(
              'Avg Order Value',
              formatMetricValue(analytics.revenue.averageOrderValue, 'currency'),
              undefined,
              <Target size={20} color={colors.primary} />,
              colors.primary
            )}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Revenue Trend</Text>
            <LineChart
              data={getRevenueChartData()}
              width={SCREEN_WIDTH - spacing.lg * 4}
              height={220}
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: colors.success,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          {analytics.revenue.topRevenueCategories.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Revenue by Category</Text>
              <PieChart
                data={getCategoryPieData()}
                width={SCREEN_WIDTH - spacing.lg * 4}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}

          <View style={styles.projectionCard}>
            <Text style={styles.projectionLabel}>Projected Next Period</Text>
            <Text style={styles.projectionValue}>
              {formatMetricValue(analytics.revenue.projectedRevenue, 'currency')}
            </Text>
            <Text style={styles.projectionNote}>
              Based on {formatMetricValue(analytics.revenue.revenueGrowth, 'percentage')} growth rate
            </Text>
          </View>
        </View>

        {/* Booking Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Performance</Text>

          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Bookings',
              analytics.bookings.totalBookings.toString(),
              undefined,
              <Calendar size={20} color={colors.primary} />,
              colors.primary
            )}
            {renderMetricCard(
              'Completion Rate',
              formatMetricValue(analytics.bookings.completionRate, 'percentage'),
              undefined,
              <Award size={20} color={colors.success} />,
              colors.success
            )}
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Booking Trends</Text>
            <BarChart
              data={getBookingTrendsData()}
              width={SCREEN_WIDTH - spacing.lg * 4}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.white,
                backgroundGradientFrom: colors.white,
                backgroundGradientTo: colors.white,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={styles.chart}
            />
          </View>

          {analytics.bookings.bookingsByStatus.length > 0 && (
            <View style={styles.statusGrid}>
              {analytics.bookings.bookingsByStatus.map(status => (
                <View key={status.status} style={styles.statusCard}>
                  <Text style={styles.statusCount}>{status.count}</Text>
                  <Text style={styles.statusLabel}>{status.status}</Text>
                  <Text style={styles.statusPercentage}>
                    {formatMetricValue(status.percentage, 'percentage')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Customer Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Insights</Text>

          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Customers',
              analytics.customers.totalCustomers.toString(),
              undefined,
              <Users size={20} color={colors.info} />,
              colors.info
            )}
            {renderMetricCard(
              'Retention Rate',
              formatMetricValue(analytics.customers.retentionRate, 'percentage'),
              undefined,
              <TrendingUp size={20} color={colors.success} />,
              colors.success
            )}
            {renderMetricCard(
              'Avg Lifetime Value',
              formatMetricValue(analytics.customers.averageLifetimeValue, 'currency'),
              undefined,
              <DollarSign size={20} color={colors.warning} />,
              colors.warning
            )}
          </View>

          <View style={styles.segmentCard}>
            <Text style={styles.segmentTitle}>Customer Segments</Text>
            {analytics.customers.customersBySegment.map(segment => (
              <View key={segment.segment} style={styles.segmentRow}>
                <View style={styles.segmentInfo}>
                  <Text style={styles.segmentName}>{segment.segment}</Text>
                  <Text style={styles.segmentCount}>{segment.count} customers</Text>
                </View>
                <Text style={styles.segmentRevenue}>
                  {formatMetricValue(segment.revenue, 'currency')}
                </Text>
              </View>
            ))}
          </View>

          {analytics.customers.topCustomers.length > 0 && (
            <View style={styles.topCustomersCard}>
              <Text style={styles.topCustomersTitle}>Top Customers</Text>
              {analytics.customers.topCustomers.slice(0, 5).map((customer, index) => (
                <View key={customer.id} style={styles.customerRow}>
                  <View style={styles.customerRank}>
                    <Text style={styles.customerRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerBookings}>
                      {customer.bookingCount} bookings
                    </Text>
                  </View>
                  <Text style={styles.customerSpent}>
                    {formatMetricValue(customer.totalSpent, 'currency')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>

          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Response Time',
              formatMetricValue(analytics.performance.responseTime, 'time'),
              undefined,
              <Clock size={20} color={colors.info} />,
              colors.info
            )}
            {renderMetricCard(
              'Acceptance Rate',
              formatMetricValue(analytics.performance.acceptanceRate, 'percentage'),
              undefined,
              <Target size={20} color={colors.success} />,
              colors.success
            )}
            {renderMetricCard(
              'Customer Satisfaction',
              `${analytics.performance.customerSatisfaction.toFixed(1)}/5.0`,
              undefined,
              <Award size={20} color={colors.warning} />,
              colors.warning
            )}
          </View>
        </View>

        {/* Marketing Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing Performance</Text>

          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Total Views',
              (analytics.marketing.listingViews + analytics.marketing.profileViews).toString(),
              undefined,
              <Eye size={20} color={colors.primary} />,
              colors.primary
            )}
            {renderMetricCard(
              'Conversion Rate',
              formatMetricValue(analytics.marketing.conversionRate, 'percentage'),
              undefined,
              <Target size={20} color={colors.success} />,
              colors.success
            )}
          </View>

          {analytics.marketing.topPerformingListings.length > 0 && (
            <View style={styles.topListingsCard}>
              <Text style={styles.topListingsTitle}>Top Performing Listings</Text>
              {analytics.marketing.topPerformingListings.map((listing, index) => (
                <View key={listing.id} style={styles.listingRow}>
                  <View style={styles.listingRank}>
                    <Text style={styles.listingRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={styles.listingStats}>
                      {listing.views} views · {listing.bookings} bookings
                    </Text>
                  </View>
                  <Text style={styles.listingRevenue}>
                    {formatMetricValue(listing.revenue, 'currency')}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  lockIcon: {
    width: 120,
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  noAccessTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  noAccessText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  featureList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricChangeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.md,
  },
  projectionCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  projectionValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  projectionNote: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statusCount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusPercentage: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginTop: 2,
  },
  segmentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  segmentTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentInfo: {
    flex: 1,
  },
  segmentName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  segmentCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  segmentRevenue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  topCustomersCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  topCustomersTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerRank: {
    width: 28,
    height: 28,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  customerBookings: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customerSpent: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  topListingsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  topListingsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listingRank: {
    width: 28,
    height: 28,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listingStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listingRevenue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
});
