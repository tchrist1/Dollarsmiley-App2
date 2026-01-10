import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  ArrowLeft,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Star,
  RefreshCw,
  XCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageFulfillmentDays: number;
  approvalRate: number;
  refundRate: number;
  averageOrderValue: number;
  revenueThisMonth: number;
  ordersThisMonth: number;
}

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function CustomOrderAnalyticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    totalRevenue: 0,
    averageFulfillmentDays: 0,
    approvalRate: 0,
    refundRate: 0,
    averageOrderValue: 0,
    revenueThisMonth: 0,
    ordersThisMonth: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchAnalytics();
    }
  }, [profile?.id, timePeriod]);

  const getDateFilter = () => {
    const now = new Date();
    switch (timePeriod) {
      case 'week':
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
      case 'quarter':
        return new Date(now.setMonth(now.getMonth() - 3)).toISOString();
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
      default:
        return null;
    }
  };

  const fetchAnalytics = async () => {
    if (!profile?.id) return;

    setLoading(true);

    try {
      let query = supabase
        .from('production_orders')
        .select('*')
        .eq('provider_id', profile.id);

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      if (!orders || orders.length === 0) {
        setAnalytics({
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          averageFulfillmentDays: 0,
          approvalRate: 0,
          refundRate: 0,
          averageOrderValue: 0,
          revenueThisMonth: 0,
          ordersThisMonth: 0,
        });
        setLoading(false);
        return;
      }

      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      const pendingOrders = orders.filter(o =>
        ['pending_order_received', 'order_received', 'in_production', 'pending_approval', 'ready_for_delivery', 'shipped'].includes(o.status)
      ).length;
      const cancelledOrders = orders.filter(o =>
        ['cancelled', 'refunded'].includes(o.status)
      ).length;

      const completedOrdersWithDates = orders.filter(o =>
        o.status === 'completed' && o.created_at && o.delivered_at
      );
      let averageFulfillmentDays = 0;
      if (completedOrdersWithDates.length > 0) {
        const totalDays = completedOrdersWithDates.reduce((sum, o) => {
          const created = new Date(o.created_at);
          const delivered = new Date(o.delivered_at);
          return sum + Math.ceil((delivered.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        averageFulfillmentDays = Math.round(totalDays / completedOrdersWithDates.length);
      }

      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + (o.escrow_amount || 0), 0);

      const approvalRate = totalOrders > 0
        ? Math.round((completedOrders / totalOrders) * 100)
        : 0;

      const refundRate = totalOrders > 0
        ? Math.round((cancelledOrders / totalOrders) * 100)
        : 0;

      const averageOrderValue = completedOrders > 0
        ? totalRevenue / completedOrders
        : 0;

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const ordersThisMonth = orders.filter(o =>
        new Date(o.created_at) >= thisMonth
      ).length;

      const revenueThisMonth = orders
        .filter(o => o.status === 'completed' && new Date(o.delivered_at || o.created_at) >= thisMonth)
        .reduce((sum, o) => sum + (o.escrow_amount || 0), 0);

      setAnalytics({
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        averageFulfillmentDays,
        approvalRate,
        refundRate,
        averageOrderValue,
        revenueThisMonth,
        ordersThisMonth,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }, [profile?.id, timePeriod]);

  const StatCard = ({
    icon: Icon,
    iconColor,
    label,
    value,
    subValue,
  }: {
    icon: any;
    iconColor: string;
    label: string;
    value: string | number;
    subValue?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  );

  const MetricRow = ({
    label,
    value,
    color = colors.text,
    progress,
  }: {
    label: string;
    value: string;
    color?: string;
    progress?: number;
  }) => (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueContainer}>
        {progress !== undefined && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${Math.min(progress, 100)}%`, backgroundColor: color },
              ]}
            />
          </View>
        )}
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={safeGoBack}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Order Analytics</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.periodFilters}>
        {(['week', 'month', 'quarter', 'year', 'all'] as TimePeriod[]).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodButton, timePeriod === period && styles.periodButtonActive]}
            onPress={() => setTimePeriod(period)}
          >
            <Text style={[styles.periodText, timePeriod === period && styles.periodTextActive]}>
              {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.statsGrid}>
            <StatCard
              icon={Package}
              iconColor={colors.primary}
              label="Total Orders"
              value={analytics.totalOrders}
            />
            <StatCard
              icon={CheckCircle}
              iconColor={colors.success}
              label="Completed"
              value={analytics.completedOrders}
            />
            <StatCard
              icon={Clock}
              iconColor={colors.warning}
              label="In Progress"
              value={analytics.pendingOrders}
            />
            <StatCard
              icon={XCircle}
              iconColor={colors.error}
              label="Cancelled"
              value={analytics.cancelledOrders}
            />
          </View>

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <DollarSign size={28} color={colors.success} />
              <View style={styles.revenueContent}>
                <Text style={styles.revenueLabel}>Total Revenue</Text>
                <Text style={styles.revenueValue}>{formatCurrency(analytics.totalRevenue)}</Text>
              </View>
            </View>
            <View style={styles.revenueDivider} />
            <View style={styles.revenueFooter}>
              <View style={styles.revenueFooterItem}>
                <Text style={styles.revenueFooterLabel}>This Month</Text>
                <Text style={styles.revenueFooterValue}>
                  {formatCurrency(analytics.revenueThisMonth)}
                </Text>
              </View>
              <View style={styles.revenueFooterItem}>
                <Text style={styles.revenueFooterLabel}>Avg Order</Text>
                <Text style={styles.revenueFooterValue}>
                  {formatCurrency(analytics.averageOrderValue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.metricsCard}>
            <Text style={styles.metricsTitle}>Performance Metrics</Text>

            <MetricRow
              label="Completion Rate"
              value={`${analytics.approvalRate}%`}
              color={colors.success}
              progress={analytics.approvalRate}
            />

            <MetricRow
              label="Refund/Cancel Rate"
              value={`${analytics.refundRate}%`}
              color={analytics.refundRate > 10 ? colors.error : colors.success}
              progress={analytics.refundRate}
            />

            <MetricRow
              label="Avg. Fulfillment Time"
              value={`${analytics.averageFulfillmentDays} days`}
              color={analytics.averageFulfillmentDays > 14 ? colors.warning : colors.success}
            />

            <MetricRow
              label="Orders This Month"
              value={String(analytics.ordersThisMonth)}
              color={colors.primary}
            />
          </View>

          <View style={styles.quickLinks}>
            <Text style={styles.quickLinksTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/provider/production')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: colors.info + '15' }]}>
                <Package size={20} color={colors.info} />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>Production Dashboard</Text>
                <Text style={styles.quickLinkText}>Manage your custom orders</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/provider/shipment')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: colors.success + '15' }]}>
                <TrendingUp size={20} color={colors.success} />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>Shipments</Text>
                <Text style={styles.quickLinkText}>Track active deliveries</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkButton}
              onPress={() => router.push('/provider/refunds')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: colors.error + '15' }]}>
                <RefreshCw size={20} color={colors.error} />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>Refund Requests</Text>
                <Text style={styles.quickLinkText}>Review and respond</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  periodFilters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  periodButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.md * 3) / 2,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statSubValue: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: 2,
  },
  revenueCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  revenueLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.success,
    letterSpacing: -0.5,
  },
  revenueDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  revenueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueFooterItem: {
    flex: 1,
  },
  revenueFooterLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  revenueFooterValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  metricsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  metricsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metricLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    flex: 1,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  progressBarContainer: {
    width: 60,
    height: 6,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    minWidth: 60,
    textAlign: 'right',
  },
  quickLinks: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  quickLinksTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  quickLinkText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});
