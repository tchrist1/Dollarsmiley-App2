import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Settings,
  BarChart3,
  FileText,
  Bell,
  Activity,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  totalRevenue: number;
  revenueToday: number;
  platformFees: number;
  pendingVerifications: number;
  activeDisputes: number;
  pendingPayouts: number;
  escrowAmount: number;
  userGrowth: number;
  revenueGrowth: number;
}

interface QuickStat {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  trend?: number;
  onClick?: () => void;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  action?: () => void;
}

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    revenueToday: 0,
    platformFees: 0,
    pendingVerifications: 0,
    activeDisputes: 0,
    pendingPayouts: 0,
    escrowAmount: 0,
    userGrowth: 0,
    revenueGrowth: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, [profile]);

  async function checkAdminAccess() {
    if (profile?.user_type !== 'Admin') {
      router.replace('/');
      return;
    }
    await loadDashboardData();
  }

  async function loadDashboardData() {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadAlerts(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      usersResult,
      activeUsersResult,
      newUsersResult,
      bookingsResult,
      revenueResult,
      verificationsResult,
      disputesResult,
      payoutsResult,
      escrowResult,
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.from('bookings').select('id, status, total_amount', { count: 'exact' }),
      supabase.from('transactions').select('amount, created_at')
        .eq('transaction_type', 'payment'),
      supabase.from('provider_verification').select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase.from('disputes').select('id', { count: 'exact', head: true })
        .in('status', ['open', 'under_review']),
      supabase.from('payout_requests').select('id, amount', { count: 'exact' })
        .eq('status', 'pending'),
      supabase.from('escrow_transactions').select('amount')
        .eq('status', 'held'),
    ]);

    const bookings = bookingsResult.data || [];
    const transactions = revenueResult.data || [];
    const payouts = payoutsResult.data || [];
    const escrows = escrowResult.data || [];

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const revenueToday = transactions
      .filter(t => new Date(t.created_at) >= today)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const platformFees = totalRevenue * 0.1;
    const escrowAmount = escrows.reduce((sum, e) => sum + Number(e.amount), 0);
    const pendingPayoutAmount = payouts.reduce((sum, p) => sum + Number(p.amount), 0);

    setMetrics({
      totalUsers: usersResult.count || 0,
      activeUsers: activeUsersResult.count || 0,
      newUsersToday: newUsersResult.count || 0,
      totalBookings: bookingsResult.count || 0,
      activeBookings: bookings.filter(b => b.status === 'confirmed').length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      totalRevenue,
      revenueToday,
      platformFees,
      pendingVerifications: verificationsResult.count || 0,
      activeDisputes: disputesResult.count || 0,
      pendingPayouts: payoutsResult.count || 0,
      escrowAmount,
      userGrowth: 12.5,
      revenueGrowth: 23.8,
    });
  }

  async function loadAlerts() {
    const alertsList: AlertItem[] = [];

    const { data: criticalAlerts } = await supabase
      .from('system_alerts')
      .select('*')
      .eq('severity', 'critical')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (criticalAlerts) {
      alertsList.push(
        ...criticalAlerts.map(alert => ({
          id: alert.id,
          type: 'critical' as const,
          title: alert.title,
          message: alert.message,
          timestamp: alert.created_at,
        }))
      );
    }

    if (metrics.pendingVerifications > 10) {
      alertsList.push({
        id: 'pending-verifications',
        type: 'warning',
        title: 'High Verification Backlog',
        message: `${metrics.pendingVerifications} providers waiting for verification`,
        timestamp: new Date().toISOString(),
        action: () => router.push('/admin/verification'),
      });
    }

    if (metrics.activeDisputes > 5) {
      alertsList.push({
        id: 'active-disputes',
        type: 'warning',
        title: 'Active Disputes Require Attention',
        message: `${metrics.activeDisputes} disputes need resolution`,
        timestamp: new Date().toISOString(),
        action: () => router.push('/admin/disputes'),
      });
    }

    setAlerts(alertsList);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }

  const quickStats: QuickStat[] = [
    {
      id: 'users',
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      subtitle: `${metrics.newUsersToday} new today`,
      icon: Users,
      color: colors.primary,
      trend: metrics.userGrowth,
      onClick: () => router.push('/admin/users'),
    },
    {
      id: 'bookings',
      title: 'Active Bookings',
      value: metrics.activeBookings.toString(),
      subtitle: `${metrics.completedBookings} completed`,
      icon: ShoppingBag,
      color: colors.success,
      onClick: () => router.push('/admin/bookings'),
    },
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: `$${(metrics.totalRevenue / 1000).toFixed(1)}k`,
      subtitle: `$${metrics.revenueToday.toFixed(0)} today`,
      icon: DollarSign,
      color: colors.info,
      trend: metrics.revenueGrowth,
      onClick: () => router.push('/admin/finances'),
    },
    {
      id: 'verifications',
      title: 'Pending Verifications',
      value: metrics.pendingVerifications.toString(),
      subtitle: 'Awaiting review',
      icon: Shield,
      color: colors.warning,
      onClick: () => router.push('/admin/verification'),
    },
  ];

  const adminActions = [
    {
      id: 'users',
      title: 'User Management',
      icon: Users,
      color: colors.primary,
      route: '/admin/user-actions',
    },
    {
      id: 'moderation',
      title: 'Content Moderation',
      icon: Shield,
      color: colors.warning,
      route: '/admin/moderation',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: BarChart3,
      color: colors.info,
      route: '/admin/marketplace-analytics',
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: FileText,
      color: colors.success,
      route: '/admin/reports',
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions',
      icon: CreditCard,
      color: colors.accent,
      route: '/admin/subscriptions',
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      color: colors.text,
      route: '/admin/feature-toggles',
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Activity size={40} color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, {profile?.full_name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/admin/notifications')}
        >
          <Bell size={24} color={colors.text} />
          {alerts.length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{alerts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>⚠️ Alerts</Text>
          {alerts.map(alert => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.alertCard,
                alert.type === 'critical' && styles.alertCritical,
                alert.type === 'warning' && styles.alertWarning,
              ]}
              onPress={alert.action}
            >
              <View style={styles.alertHeader}>
                <AlertCircle
                  size={20}
                  color={
                    alert.type === 'critical'
                      ? colors.error
                      : alert.type === 'warning'
                      ? colors.warning
                      : colors.info
                  }
                />
                <Text style={styles.alertTitle}>{alert.title}</Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.statsGrid}>
        {quickStats.map(stat => (
          <TouchableOpacity
            key={stat.id}
            style={[
              styles.statCard,
              isTablet && styles.statCardTablet,
            ]}
            onPress={stat.onClick}
          >
            <View style={styles.statHeader}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <stat.icon size={24} color={stat.color} />
              </View>
              {stat.trend !== undefined && (
                <View style={styles.trendContainer}>
                  <TrendingUp
                    size={16}
                    color={stat.trend > 0 ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      styles.trendText,
                      { color: stat.trend > 0 ? colors.success : colors.error },
                    ]}
                  >
                    {stat.trend > 0 ? '+' : ''}{stat.trend}%
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {adminActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                isTablet && styles.actionCardTablet,
              ]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <action.icon size={28} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.financialSection}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.financialGrid}>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>Platform Fees Collected</Text>
            <Text style={styles.financialValue}>
              ${metrics.platformFees.toLocaleString()}
            </Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>Funds in Escrow</Text>
            <Text style={styles.financialValue}>
              ${metrics.escrowAmount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>Pending Payouts</Text>
            <Text style={styles.financialValue}>
              {metrics.pendingPayouts} requests
            </Text>
          </View>
          <View style={styles.financialCard}>
            <Text style={styles.financialLabel}>Active Disputes</Text>
            <Text style={[
              styles.financialValue,
              metrics.activeDisputes > 0 && { color: colors.warning }
            ]}>
              {metrics.activeDisputes}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  notificationButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  alertsSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  alertCritical: {
    borderLeftColor: colors.error,
  },
  alertWarning: {
    borderLeftColor: colors.warning,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 28,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: (width - spacing.lg * 3) / 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardTablet: {
    width: (width - spacing.lg * 5) / 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: 4,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionsSection: {
    padding: spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: (width - spacing.lg * 3) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardTablet: {
    width: (width - spacing.lg * 4) / 3,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  financialSection: {
    padding: spacing.lg,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  financialCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: (width - spacing.lg * 3) / 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  financialLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  financialValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
