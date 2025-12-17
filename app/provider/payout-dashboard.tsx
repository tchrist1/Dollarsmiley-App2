import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Calendar,
  CreditCard,
  ArrowLeft,
  Settings,
  AlertCircle,
  Zap,
} from 'lucide-react-native';
import PayoutScheduleDashboard from '@/components/PayoutScheduleDashboard';
import PayoutNotifications from '@/components/PayoutNotifications';

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayouts: number;
  completedPayouts: number;
  availableBalance: number;
  earlyPayoutCount: number;
}

export default function ProviderPayoutDashboardScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    availableBalance: 0,
    earlyPayoutCount: 0,
  });
  const [stripeConnected, setStripeConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule'>('overview');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadEarningsData(),
        checkStripeConnection(),
      ]);
    } catch (error) {
      console.error('Error loading payout data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEarningsData() {
    if (!user) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: completedBookings } = await supabase
      .from('bookings')
      .select('provider_payout, payment_status, created_at')
      .eq('provider_id', user.id)
      .eq('status', 'Completed')
      .eq('payment_status', 'Paid');

    let totalEarnings = 0;
    let thisMonth = 0;
    let lastMonth = 0;

    completedBookings?.forEach((booking) => {
      const amount = booking.provider_payout || 0;
      totalEarnings += amount;

      const bookingDate = new Date(booking.created_at);
      if (bookingDate >= thisMonthStart) {
        thisMonth += amount;
      } else if (bookingDate >= lastMonthStart && bookingDate <= lastMonthEnd) {
        lastMonth += amount;
      }
    });

    const { data: payoutSchedules } = await supabase
      .from('payout_schedules')
      .select('amount, status')
      .eq('provider_id', user.id);

    let pendingPayouts = 0;
    let completedPayouts = 0;
    let earlyPayoutCount = 0;

    payoutSchedules?.forEach((schedule) => {
      if (schedule.status === 'Pending') {
        pendingPayouts += schedule.amount;
      } else if (schedule.status === 'Paid') {
        completedPayouts += schedule.amount;
      }
    });

    const { data: earlyPayouts } = await supabase
      .from('payout_schedules')
      .select('id')
      .eq('provider_id', user.id)
      .eq('early_payout_requested', true);

    earlyPayoutCount = earlyPayouts?.length || 0;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('available_balance')
      .eq('user_id', user.id)
      .single();

    setEarnings({
      totalEarnings,
      thisMonth,
      lastMonth,
      pendingPayouts,
      completedPayouts,
      availableBalance: wallet?.available_balance || 0,
      earlyPayoutCount,
    });
  }

  async function checkStripeConnection() {
    if (!user) return;

    const { data: stripeAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('charges_enabled')
      .eq('user_id', user.id)
      .single();

    setStripeConnected(stripeAccount?.charges_enabled || false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function getMonthGrowth(): string {
    if (earnings.lastMonth === 0) return '+100%';
    const growth = ((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100;
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payout Dashboard',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payout information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payout Dashboard',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/wallet/stripe-connect' as any)}>
              <Settings size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {!stripeConnected && (
          <View style={styles.warningBanner}>
            <AlertCircle size={20} color={colors.warning} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Connect Stripe Account</Text>
              <Text style={styles.warningText}>
                Connect your Stripe account to receive payouts
              </Text>
            </View>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => router.push('/wallet/stripe-connect' as any)}
            >
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
              Schedule
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' ? (
          <>
            <PayoutNotifications />

            <View style={styles.earningsCard}>
              <View style={styles.earningsHeader}>
                <View>
                  <Text style={styles.earningsLabel}>Total Earnings</Text>
                  <Text style={styles.earningsAmount}>{formatCurrency(earnings.totalEarnings)}</Text>
                </View>
                <View style={styles.earningsIcon}>
                  <DollarSign size={32} color={colors.white} />
                </View>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Calendar size={24} color={colors.primary} />
                <Text style={styles.statValue}>{formatCurrency(earnings.thisMonth)}</Text>
                <Text style={styles.statLabel}>This Month</Text>
                <View style={styles.growthBadge}>
                  <TrendingUp size={12} color={colors.success} />
                  <Text style={styles.growthText}>{getMonthGrowth()}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <Clock size={24} color={colors.warning} />
                <Text style={styles.statValue}>{formatCurrency(earnings.pendingPayouts)}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>

              <View style={styles.statCard}>
                <CheckCircle size={24} color={colors.success} />
                <Text style={styles.statValue}>{formatCurrency(earnings.completedPayouts)}</Text>
                <Text style={styles.statLabel}>Paid Out</Text>
              </View>

              <View style={styles.statCard}>
                <Zap size={24} color={colors.info} />
                <Text style={styles.statValue}>{earnings.earlyPayoutCount}</Text>
                <Text style={styles.statLabel}>Early Payouts</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/wallet/payouts' as any)}
              >
                <View style={styles.actionIcon}>
                  <DollarSign size={24} color={colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Request Payout</Text>
                  <Text style={styles.actionSubtitle}>
                    Available: {formatCurrency(earnings.availableBalance)}
                  </Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/provider/income-statement' as any)}
              >
                <View style={styles.actionIcon}>
                  <TrendingUp size={24} color={colors.success} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Income Statement</Text>
                  <Text style={styles.actionSubtitle}>View detailed earnings report</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/tax-forms' as any)}
              >
                <View style={styles.actionIcon}>
                  <CreditCard size={24} color={colors.info} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Tax Forms</Text>
                  <Text style={styles.actionSubtitle}>Download 1099 forms</Text>
                </View>
                <Text style={styles.actionChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <PayoutScheduleDashboard />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '50',
  },
  warningContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  warningTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  warningText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  connectButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning,
    borderRadius: borderRadius.sm,
  },
  connectButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  earningsCard: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: fontSize.sm,
    color: colors.white + 'CC',
    marginBottom: spacing.xs,
  },
  earningsAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  earningsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  growthText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionChevron: {
    fontSize: fontSize.xxl,
    color: colors.textSecondary,
  },
});
