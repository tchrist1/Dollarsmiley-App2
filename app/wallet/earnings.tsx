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
import { Stack, router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface EarningsData {
  daily: Array<{ date: string; amount: number }>;
  monthly: Array<{ month: string; amount: number }>;
  byCategory: Array<{ category: string; amount: number; percentage: number }>;
  byType: Array<{ type: string; amount: number; color: string }>;
}

type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export default function EarningsDashboardScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>('month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsData>({
    daily: [],
    monthly: [],
    byCategory: [],
    byType: [],
  });
  const [stats, setStats] = useState({
    totalEarnings: 0,
    averageEarning: 0,
    highestEarning: 0,
    growthRate: 0,
    transactionCount: 0,
  });

  useEffect(() => {
    if (user) {
      loadEarningsData();
    }
  }, [user, period]);

  const loadEarningsData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: walletData } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!walletData) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const daysMap = { week: 7, month: 30, quarter: 90, year: 365 };
    const days = daysMap[period];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletData.id)
      .eq('transaction_type', 'Earning')
      .eq('status', 'Completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (transactionsData) {
      setTransactions(transactionsData);
      processEarningsData(transactionsData, days);
      calculateStats(transactionsData);
    }

    setLoading(false);
  };

  const processEarningsData = (data: Transaction[], days: number) => {
    const daily = calculateDailyEarnings(data, days);
    const monthly = calculateMonthlyEarnings(data);
    const byType = calculateByType(data);
    const byCategory = calculateByCategory(data);

    setEarningsData({ daily, monthly, byCategory, byType });
  };

  const calculateDailyEarnings = (data: Transaction[], days: number) => {
    const dailyMap: Record<string, number> = {};
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap[dateStr] = 0;
    }

    data.forEach((tx) => {
      const dateStr = tx.created_at.split('T')[0];
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += tx.amount;
      }
    });

    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  };

  const calculateMonthlyEarnings = (data: Transaction[]) => {
    const monthlyMap: Record<string, number> = {};

    data.forEach((tx) => {
      const date = new Date(tx.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + tx.amount;
    });

    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        amount,
      }));
  };

  const calculateByType = (data: Transaction[]) => {
    const typeMap: Record<string, { amount: number; color: string }> = {
      Service: { amount: 0, color: colors.primary },
      Product: { amount: 0, color: colors.success },
      Tip: { amount: 0, color: colors.warning },
      Other: { amount: 0, color: colors.error },
    };

    data.forEach((tx) => {
      const metadata = (tx as any).metadata || {};
      const type = metadata.category || 'Other';
      if (typeMap[type]) {
        typeMap[type].amount += tx.amount;
      } else {
        typeMap.Other.amount += tx.amount;
      }
    });

    return Object.entries(typeMap)
      .map(([type, { amount, color }]) => ({ type, amount, color }))
      .filter((item) => item.amount > 0);
  };

  const calculateByCategory = (data: Transaction[]) => {
    const total = data.reduce((sum, tx) => sum + tx.amount, 0);
    const categoryMap: Record<string, number> = {};

    data.forEach((tx) => {
      const metadata = (tx as any).metadata || {};
      const category = metadata.service_category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + tx.amount;
    });

    return Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const calculateStats = (data: Transaction[]) => {
    const total = data.reduce((sum, tx) => sum + tx.amount, 0);
    const count = data.length;
    const average = count > 0 ? total / count : 0;
    const highest = count > 0 ? Math.max(...data.map((tx) => tx.amount)) : 0;

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce((sum, tx) => sum + tx.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, tx) => sum + tx.amount, 0);

    const growthRate =
      firstHalfTotal > 0 ? ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100 : 0;

    setStats({
      totalEarnings: total,
      averageEarning: average,
      highestEarning: highest,
      growthRate,
      transactionCount: count,
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Earnings Dashboard',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Earnings Dashboard',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => {}}>
              <Download size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'quarter', 'year'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <DollarSign size={24} color={colors.primary} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalEarnings)}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={colors.success} />
            <Text style={styles.statValue}>{formatCurrency(stats.averageEarning)}</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Calendar size={24} color={colors.warning} />
            <Text style={styles.statValue}>{stats.transactionCount}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>

          <View style={styles.statCard}>
            {stats.growthRate >= 0 ? (
              <TrendingUp size={24} color={colors.success} />
            ) : (
              <TrendingDown size={24} color={colors.error} />
            )}
            <Text
              style={[
                styles.statValue,
                { color: stats.growthRate >= 0 ? colors.success : colors.error },
              ]}
            >
              {stats.growthRate.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Growth</Text>
          </View>
        </View>

        {/* Daily Earnings Chart */}
        {earningsData.daily.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Daily Earnings Trend</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={{
                  labels: earningsData.daily
                    .filter((_, i) => i % Math.ceil(earningsData.daily.length / 7) === 0)
                    .map((d) => new Date(d.date).getDate().toString()),
                  datasets: [
                    {
                      data: earningsData.daily.map((d) => d.amount),
                    },
                  ],
                }}
                width={Math.max(screenWidth - 40, earningsData.daily.length * 40)}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </ScrollView>
          </View>
        )}

        {/* Monthly Earnings Chart */}
        {earningsData.monthly.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Monthly Earnings</Text>
            <BarChart
              data={{
                labels: earningsData.monthly.map((m) => m.month),
                datasets: [
                  {
                    data: earningsData.monthly.map((m) => m.amount),
                  },
                ],
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel="$"
            />
          </View>
        )}

        {/* Earnings by Type */}
        {earningsData.byType.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Earnings by Type</Text>
            <PieChart
              data={earningsData.byType.map((item, index) => ({
                name: item.type,
                population: item.amount,
                color: item.color,
                legendFontColor: colors.text,
                legendFontSize: 14,
              }))}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Top Categories */}
        {earningsData.byCategory.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Top Earning Categories</Text>
            {earningsData.byCategory.map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <View style={styles.categoryBar}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${item.percentage}%` },
                      ]}
                    />
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                  <Text style={styles.categoryPercentage}>{item.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <DollarSign size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Earnings Yet</Text>
            <Text style={styles.emptyText}>
              Start completing jobs to see your earnings dashboard
            </Text>
          </View>
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
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  categoryLeft: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  categoryPercentage: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
