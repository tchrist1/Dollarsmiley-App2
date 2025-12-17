import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Package,
  BarChart3,
  Download,
  Filter,
} from 'lucide-react-native';
import {
  getSubscriptionMetrics,
  getSubscriptionAnalytics,
  getAllUserSubscriptions,
  getRevenueTrends,
  formatCurrency,
  formatPercentage,
  getStatusBadgeColor,
  exportSubscriptionData,
  type SubscriptionMetrics,
  type SubscriptionAnalytics,
  type AdminUserSubscription,
  type AdminSubscriptionPlan,
} from '@/lib/admin-subscription-management';
import AdminSubscriptionPlansManager from '@/components/AdminSubscriptionPlansManager';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

type TabType = 'overview' | 'plans' | 'subscribers';

export default function AdminSubscriptionsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [subscribers, setSubscribers] = useState<AdminUserSubscription[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<
    Array<{ month: string; mrr: number; subscribers: number }>
  >([]);
  const [showPlanEditor, setShowPlanEditor] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AdminSubscriptionPlan | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'overview') {
        const [metricsData, analyticsData, trendsData] = await Promise.all([
          getSubscriptionMetrics(),
          getSubscriptionAnalytics(),
          getRevenueTrends(6),
        ]);
        setMetrics(metricsData);
        setAnalytics(analyticsData);
        setRevenueTrends(trendsData);
      } else if (activeTab === 'subscribers') {
        const data = await getAllUserSubscriptions();
        setSubscribers(data);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Data',
      'Choose export format',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'CSV',
          onPress: async () => {
            const result = await exportSubscriptionData('csv');
            if (result.success) {
              Alert.alert('Success', 'Data exported successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to export data');
            }
          },
        },
        {
          text: 'JSON',
          onPress: async () => {
            const result = await exportSubscriptionData('json');
            if (result.success) {
              Alert.alert('Success', 'Data exported successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to export data');
            }
          },
        },
      ]
    );
  };

  const handleEditPlan = (plan: AdminSubscriptionPlan) => {
    setEditingPlan(plan);
    setShowPlanEditor(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowPlanEditor(true);
  };

  const renderOverviewTab = () => {
    if (loading || !metrics || !analytics) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <TouchableOpacity onPress={handleExportData}>
              <Download size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { borderLeftColor: colors.primary }]}>
              <View style={styles.metricHeader}>
                <Users size={20} color={colors.primary} />
                <Text style={styles.metricLabel}>Total Subscribers</Text>
              </View>
              <Text style={styles.metricValue}>
                {metrics.total_subscribers}
              </Text>
              <Text style={styles.metricSubtext}>
                {metrics.active_subscribers} active
              </Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: colors.success }]}>
              <View style={styles.metricHeader}>
                <DollarSign size={20} color={colors.success} />
                <Text style={styles.metricLabel}>Monthly Revenue</Text>
              </View>
              <Text style={styles.metricValue}>{formatCurrency(metrics.mrr)}</Text>
              <Text style={styles.metricSubtext}>
                {formatCurrency(metrics.arr)} ARR
              </Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
              <View style={styles.metricHeader}>
                <TrendingUp size={20} color={colors.warning} />
                <Text style={styles.metricLabel}>Churn Rate</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatPercentage(metrics.churn_rate)}
              </Text>
              <Text style={styles.metricSubtext}>Last 30 days</Text>
            </View>

            <View style={[styles.metricCard, { borderLeftColor: colors.info }]}>
              <View style={styles.metricHeader}>
                <Calendar size={20} color={colors.info} />
                <Text style={styles.metricLabel}>Trial Conversion</Text>
              </View>
              <Text style={styles.metricValue}>
                {formatPercentage(analytics.trial_conversion_rate)}
              </Text>
              <Text style={styles.metricSubtext}>
                {analytics.trial_conversions} conversions
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Distribution</Text>
          <View style={styles.distributionContainer}>
            {Object.entries(metrics.plan_distribution).map(([plan, count]) => {
              const percentage =
                metrics.total_subscribers > 0
                  ? (count / metrics.total_subscribers) * 100
                  : 0;
              const revenue = metrics.revenue_by_plan[plan] || 0;

              return (
                <View key={plan} style={styles.distributionCard}>
                  <View style={styles.distributionHeader}>
                    <Text style={styles.distributionPlan}>{plan}</Text>
                    <Text style={styles.distributionCount}>{count}</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${percentage}%` },
                      ]}
                    />
                  </View>
                  <View style={styles.distributionFooter}>
                    <Text style={styles.distributionPercentage}>
                      {formatPercentage(percentage)}
                    </Text>
                    <Text style={styles.distributionRevenue}>
                      {formatCurrency(revenue)}/mo
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trends</Text>
          <View style={styles.trendsContainer}>
            {revenueTrends.map((trend, index) => (
              <View key={index} style={styles.trendItem}>
                <Text style={styles.trendMonth}>{trend.month}</Text>
                <Text style={styles.trendRevenue}>
                  {formatCurrency(trend.mrr)}
                </Text>
                <Text style={styles.trendSubscribers}>
                  {trend.subscribers} subs
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.monthlyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>New Subscriptions</Text>
              <Text style={styles.statValue}>
                {analytics.new_subscriptions_this_month}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cancellations</Text>
              <Text style={styles.statValue}>
                {analytics.cancellations_this_month}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Average Value</Text>
              <Text style={styles.statValue}>
                {formatCurrency(analytics.average_subscription_value)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lifetime Value</Text>
              <Text style={styles.statValue}>
                {formatCurrency(analytics.lifetime_value)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderPlansTab = () => {
    return (
      <AdminSubscriptionPlansManager
        onEditPlan={handleEditPlan}
        onCreatePlan={handleCreatePlan}
      />
    );
  };

  const renderSubscribersTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              All Subscribers ({subscribers.length})
            </Text>
            <TouchableOpacity onPress={handleExportData}>
              <Download size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.subscribersList}>
            {subscribers.map((sub) => (
              <View key={sub.id} style={styles.subscriberCard}>
                <View style={styles.subscriberHeader}>
                  <View style={styles.subscriberInfo}>
                    <Text style={styles.subscriberName}>
                      {sub.user?.full_name || 'Unknown User'}
                    </Text>
                    <Text style={styles.subscriberEmail}>
                      {sub.user?.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadgeColor(sub.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>{sub.status}</Text>
                  </View>
                </View>

                <View style={styles.subscriberDetails}>
                  <View style={styles.detailRow}>
                    <Package size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {sub.plan?.display_name || 'Unknown Plan'}
                    </Text>
                  </View>
                  {sub.billing_cycle && (
                    <View style={styles.detailRow}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{sub.billing_cycle}</Text>
                    </View>
                  )}
                  {sub.current_period_end && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Renews:</Text>
                      <Text style={styles.detailText}>
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {subscribers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Users size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No subscribers yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subscription Management</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <BarChart3
            size={20}
            color={activeTab === 'overview' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.activeTabText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
          onPress={() => setActiveTab('plans')}
        >
          <Package
            size={20}
            color={activeTab === 'plans' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}
          >
            Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscribers' && styles.activeTab]}
          onPress={() => setActiveTab('subscribers')}
        >
          <Users
            size={20}
            color={
              activeTab === 'subscribers' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'subscribers' && styles.activeTabText,
            ]}
          >
            Subscribers
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'plans' && renderPlansTab()}
      {activeTab === 'subscribers' && renderSubscribersTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  metricsGrid: {
    gap: spacing.md,
  },
  metricCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    gap: spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  metricSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  distributionContainer: {
    gap: spacing.md,
  },
  distributionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionPlan: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  distributionCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  distributionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distributionPercentage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  distributionRevenue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  trendsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  trendItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  trendMonth: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  trendRevenue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  trendSubscribers: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  monthlyStats: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subscribersList: {
    gap: spacing.md,
  },
  subscriberCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subscriberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subscriberInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  subscriberName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subscriberEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  subscriberDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
