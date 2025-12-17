import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { DollarSign, TrendingUp, Package, Zap } from 'lucide-react-native';

interface RevenueStats {
  totalRevenue: number;
  standardServiceRevenue: number;
  customServiceRevenue: number;
  vasRevenue: number;
  shippingRevenue: number;
  platformFees: number;
  revenueGrowth: number;
  revenueByMonth: Array<{
    month: string;
    standard: number;
    custom: number;
    vas: number;
    shipping: number;
  }>;
}

export default function RevenueBreakdownDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    standardServiceRevenue: 0,
    customServiceRevenue: 0,
    vasRevenue: 0,
    shippingRevenue: 0,
    platformFees: 0,
    revenueGrowth: 0,
    revenueByMonth: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      // Get all completed bookings with listing info
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          total_price,
          platform_fee,
          shipping_cost,
          created_at,
          listing_id,
          listings:service_listings(listing_type)
        `)
        .eq('status', 'Completed')
        .eq('payment_status', 'Paid');

      let standardRevenue = 0;
      let customRevenue = 0;
      let totalRevenue = 0;
      let platformFees = 0;
      let shippingRevenue = 0;

      bookings?.forEach((booking) => {
        const revenue = booking.total_price;
        totalRevenue += revenue;
        platformFees += booking.platform_fee || 0;
        shippingRevenue += booking.shipping_cost || 0;

        const listingType = (booking.listings as any)?.listing_type;
        if (listingType === 'CustomService') {
          customRevenue += revenue;
        } else {
          standardRevenue += revenue;
        }
      });

      // Get VAS revenue
      const { data: vasBookings } = await supabase
        .from('booking_value_added_services')
        .select('quantity, value_added_services(price)');

      const vasRevenue = vasBookings?.reduce(
        (sum, bv) => sum + ((bv.value_added_services as any)?.price || 0) * bv.quantity,
        0
      ) || 0;

      // Calculate revenue by month for last 6 months
      const monthlyData: Record<string, {
        standard: number;
        custom: number;
        vas: Set<string>;
        shipping: number;
      }> = {};

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      bookings
        ?.filter((b) => new Date(b.created_at) >= sixMonthsAgo)
        .forEach((booking) => {
          const date = new Date(booking.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              standard: 0,
              custom: 0,
              vas: new Set(),
              shipping: 0,
            };
          }

          const listingType = (booking.listings as any)?.listing_type;
          if (listingType === 'CustomService') {
            monthlyData[monthKey].custom += booking.total_price;
          } else {
            monthlyData[monthKey].standard += booking.total_price;
          }

          monthlyData[monthKey].shipping += booking.shipping_cost || 0;
        });

      // Add VAS to monthly data
      const { data: vasWithDates } = await supabase
        .from('booking_value_added_services')
        .select(`
          quantity,
          booking_id,
          value_added_services(price),
          bookings!inner(created_at)
        `);

      vasWithDates
        ?.filter((v) => new Date((v.bookings as any).created_at) >= sixMonthsAgo)
        .forEach((vas) => {
          const date = new Date((vas.bookings as any).created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (monthlyData[monthKey]) {
            monthlyData[monthKey].vas.add(vas.booking_id);
          }
        });

      const revenueByMonth = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          standard: data.standard,
          custom: data.custom,
          vas: vasRevenue / 6, // Simplified distribution
          shipping: data.shipping,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Calculate growth (comparing last month to previous month)
      const growth = revenueByMonth.length >= 2
        ? ((revenueByMonth[revenueByMonth.length - 1].standard +
            revenueByMonth[revenueByMonth.length - 1].custom) -
           (revenueByMonth[revenueByMonth.length - 2].standard +
            revenueByMonth[revenueByMonth.length - 2].custom)) /
          (revenueByMonth[revenueByMonth.length - 2].standard +
           revenueByMonth[revenueByMonth.length - 2].custom) *
          100
        : 0;

      setStats({
        totalRevenue,
        standardServiceRevenue: standardRevenue,
        customServiceRevenue: customRevenue,
        vasRevenue,
        shippingRevenue,
        platformFees,
        revenueGrowth: growth,
        revenueByMonth,
      });
    } catch (error) {
      console.error('Error loading revenue stats:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  function getPercentage(part: number, total: number): number {
    return total > 0 ? (part / total) * 100 : 0;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Revenue Breakdown</Text>

      <View style={[styles.summaryCard, styles.totalCard]}>
        <DollarSign size={32} color={colors.white} />
        <Text style={styles.totalValue}>{formatCurrency(stats.totalRevenue)}</Text>
        <Text style={styles.totalLabel}>Total Revenue</Text>
        <View style={styles.growthBadge}>
          <TrendingUp size={14} color={colors.white} />
          <Text style={styles.growthText}>
            {stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% MoM
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Type</Text>

        <View style={styles.revenueGrid}>
          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Package size={20} color={colors.primary} />
              <Text style={styles.revenueType}>Standard Services</Text>
            </View>
            <Text style={styles.revenueAmount}>
              {formatCurrency(stats.standardServiceRevenue)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${getPercentage(stats.standardServiceRevenue, stats.totalRevenue)}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.revenuePercent}>
              {getPercentage(stats.standardServiceRevenue, stats.totalRevenue).toFixed(1)}% of total
            </Text>
          </View>

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Star size={20} color={colors.info} />
              <Text style={styles.revenueType}>Custom Services</Text>
            </View>
            <Text style={styles.revenueAmount}>
              {formatCurrency(stats.customServiceRevenue)}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${getPercentage(stats.customServiceRevenue, stats.totalRevenue)}%`,
                    backgroundColor: colors.info,
                  },
                ]}
              />
            </View>
            <Text style={styles.revenuePercent}>
              {getPercentage(stats.customServiceRevenue, stats.totalRevenue).toFixed(1)}% of total
            </Text>
          </View>

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Zap size={20} color={colors.warning} />
              <Text style={styles.revenueType}>VAS Add-ons</Text>
            </View>
            <Text style={styles.revenueAmount}>{formatCurrency(stats.vasRevenue)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${getPercentage(stats.vasRevenue, stats.totalRevenue)}%`,
                    backgroundColor: colors.warning,
                  },
                ]}
              />
            </View>
            <Text style={styles.revenuePercent}>
              {getPercentage(stats.vasRevenue, stats.totalRevenue).toFixed(1)}% of total
            </Text>
          </View>

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Package size={20} color={colors.success} />
              <Text style={styles.revenueType}>Shipping</Text>
            </View>
            <Text style={styles.revenueAmount}>{formatCurrency(stats.shippingRevenue)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${getPercentage(stats.shippingRevenue, stats.totalRevenue)}%`,
                    backgroundColor: colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.revenuePercent}>
              {getPercentage(stats.shippingRevenue, stats.totalRevenue).toFixed(1)}% of total
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.platformFeesCard}>
          <Text style={styles.platformFeesLabel}>Platform Fees Collected</Text>
          <Text style={styles.platformFeesValue}>{formatCurrency(stats.platformFees)}</Text>
          <Text style={styles.platformFeesPercent}>
            {getPercentage(stats.platformFees, stats.totalRevenue).toFixed(1)}% of gross revenue
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Trend (6 Months)</Text>
        {stats.revenueByMonth.map((month, index) => {
          const total = month.standard + month.custom + month.vas + month.shipping;
          return (
            <View key={index} style={styles.monthRow}>
              <Text style={styles.monthLabel}>{month.month}</Text>
              <View style={styles.monthBar}>
                <View style={[styles.monthSegment, { flex: month.standard, backgroundColor: colors.primary }]} />
                <View style={[styles.monthSegment, { flex: month.custom, backgroundColor: colors.info }]} />
                <View style={[styles.monthSegment, { flex: month.vas, backgroundColor: colors.warning }]} />
                <View style={[styles.monthSegment, { flex: month.shipping, backgroundColor: colors.success }]} />
              </View>
              <Text style={styles.monthTotal}>{formatCurrency(total)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
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
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 0,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  totalCard: {
    backgroundColor: colors.primary,
  },
  totalValue: {
    fontSize: 40,
    fontWeight: fontWeight.bold,
    color: colors.white,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.md,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: borderRadius.full,
  },
  growthText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  revenueGrid: {
    gap: spacing.md,
  },
  revenueCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  revenueType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  revenueAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
  revenuePercent: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  platformFeesCard: {
    backgroundColor: colors.successLight,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success + '50',
  },
  platformFeesLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  platformFeesValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  platformFeesPercent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    width: 60,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  monthBar: {
    flex: 1,
    height: 24,
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  monthSegment: {
    height: '100%',
  },
  monthTotal: {
    width: 80,
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
