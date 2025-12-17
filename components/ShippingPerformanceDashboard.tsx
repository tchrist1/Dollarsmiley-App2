import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Truck, Package, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react-native';

interface ShippingStats {
  totalShipments: number;
  platformShipments: number;
  externalShipments: number;
  inTransit: number;
  delivered: number;
  delayed: number;
  averageDeliveryDays: number;
  platformAverageDeliveryDays: number;
  externalAverageDeliveryDays: number;
  onTimeDeliveryRate: number;
  totalShippingRevenue: number;
  carrierBreakdown: Array<{
    carrier: string;
    count: number;
    onTimeRate: number;
  }>;
}

export default function ShippingPerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ShippingStats>({
    totalShipments: 0,
    platformShipments: 0,
    externalShipments: 0,
    inTransit: 0,
    delivered: 0,
    delayed: 0,
    averageDeliveryDays: 0,
    platformAverageDeliveryDays: 0,
    externalAverageDeliveryDays: 0,
    onTimeDeliveryRate: 0,
    totalShippingRevenue: 0,
    carrierBreakdown: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      // Get shipment data
      const { data: shipments } = await supabase
        .from('shipments')
        .select(`
          *,
          bookings!inner(
            listing_id,
            listings:service_listings(shipping_mode)
          )
        `);

      const totalShipments = shipments?.length || 0;

      // Count by shipping mode
      const platformShipments = shipments?.filter((s) => {
        const listing = (s.bookings as any)?.listings;
        return listing?.shipping_mode === 'Platform';
      }).length || 0;

      const externalShipments = totalShipments - platformShipments;

      // Count by status
      const inTransit = shipments?.filter((s) => s.status === 'InTransit').length || 0;
      const delivered = shipments?.filter((s) => s.status === 'Delivered').length || 0;
      const delayed = shipments?.filter((s) => s.status === 'Delayed').length || 0;

      // Calculate delivery times
      const deliveredShipments = shipments?.filter((s) =>
        s.status === 'Delivered' && s.shipped_at && s.delivered_at
      ) || [];

      let totalDays = 0;
      let platformDays = 0;
      let externalDays = 0;
      let platformCount = 0;
      let externalCount = 0;
      let onTimeCount = 0;

      deliveredShipments.forEach((shipment) => {
        const shippedDate = new Date(shipment.shipped_at!);
        const deliveredDate = new Date(shipment.delivered_at!);
        const days = Math.ceil((deliveredDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24));

        totalDays += days;

        const listing = (shipment.bookings as any)?.listings;
        const isPlatform = listing?.shipping_mode === 'Platform';

        if (isPlatform) {
          platformDays += days;
          platformCount++;
        } else {
          externalDays += days;
          externalCount++;
        }

        // Check if on time (assuming 7 days is expected)
        if (days <= 7) {
          onTimeCount++;
        }
      });

      const avgDeliveryDays = deliveredShipments.length > 0
        ? totalDays / deliveredShipments.length
        : 0;

      const platformAvgDays = platformCount > 0
        ? platformDays / platformCount
        : 0;

      const externalAvgDays = externalCount > 0
        ? externalDays / externalCount
        : 0;

      const onTimeRate = deliveredShipments.length > 0
        ? (onTimeCount / deliveredShipments.length) * 100
        : 0;

      // Calculate carrier breakdown
      const carrierStats: Record<string, { count: number; onTime: number }> = {};

      deliveredShipments.forEach((shipment) => {
        const carrier = shipment.carrier_name || 'Unknown';
        if (!carrierStats[carrier]) {
          carrierStats[carrier] = { count: 0, onTime: 0 };
        }
        carrierStats[carrier].count++;

        const shippedDate = new Date(shipment.shipped_at!);
        const deliveredDate = new Date(shipment.delivered_at!);
        const days = Math.ceil((deliveredDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24));

        if (days <= 7) {
          carrierStats[carrier].onTime++;
        }
      });

      const carrierBreakdown = Object.entries(carrierStats)
        .map(([carrier, data]) => ({
          carrier,
          count: data.count,
          onTimeRate: (data.onTime / data.count) * 100,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate total shipping revenue
      const { data: bookingsWithShipping } = await supabase
        .from('bookings')
        .select('shipping_cost')
        .not('shipping_cost', 'is', null);

      const totalRevenue = bookingsWithShipping?.reduce(
        (sum, b) => sum + (b.shipping_cost || 0),
        0
      ) || 0;

      setStats({
        totalShipments,
        platformShipments,
        externalShipments,
        inTransit,
        delivered,
        delayed,
        averageDeliveryDays: avgDeliveryDays,
        platformAverageDeliveryDays: platformAvgDays,
        externalAverageDeliveryDays: externalAvgDays,
        onTimeDeliveryRate: onTimeRate,
        totalShippingRevenue: totalRevenue,
        carrierBreakdown,
      });
    } catch (error) {
      console.error('Error loading shipping stats:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Shipping Performance</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Truck size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.totalShipments}</Text>
          <Text style={styles.statLabel}>Total Shipments</Text>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <CheckCircle size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>

        <View style={[styles.statCard, styles.warningCard]}>
          <Clock size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.inTransit}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>

        <View style={[styles.statCard, styles.errorCard]}>
          <AlertCircle size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.delayed}</Text>
          <Text style={styles.statLabel}>Delayed</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {stats.averageDeliveryDays.toFixed(1)} days
            </Text>
            <Text style={styles.metricLabel}>Avg Delivery Time</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, styles.successText]}>
              {stats.onTimeDeliveryRate.toFixed(1)}%
            </Text>
            <Text style={styles.metricLabel}>On-Time Rate</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatCurrency(stats.totalShippingRevenue)}
            </Text>
            <Text style={styles.metricLabel}>Shipping Revenue</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shipping Mode Comparison</Text>

        <View style={styles.comparisonContainer}>
          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Package size={20} color={colors.primary} />
              <Text style={styles.comparisonTitle}>Platform Shipping</Text>
            </View>
            <Text style={styles.comparisonCount}>{stats.platformShipments} shipments</Text>
            <Text style={styles.comparisonMetric}>
              Avg: {stats.platformAverageDeliveryDays.toFixed(1)} days
            </Text>
          </View>

          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
              <Truck size={20} color={colors.info} />
              <Text style={styles.comparisonTitle}>External Shipping</Text>
            </View>
            <Text style={styles.comparisonCount}>{stats.externalShipments} shipments</Text>
            <Text style={styles.comparisonMetric}>
              Avg: {stats.externalAverageDeliveryDays.toFixed(1)} days
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Carriers</Text>
        {stats.carrierBreakdown.map((carrier, index) => (
          <View key={index} style={styles.carrierRow}>
            <View style={styles.carrierInfo}>
              <Text style={styles.carrierName}>{carrier.carrier}</Text>
              <Text style={styles.carrierCount}>{carrier.count} shipments</Text>
            </View>
            <View style={styles.carrierMetrics}>
              <Text style={[
                styles.carrierRate,
                carrier.onTimeRate >= 90 ? styles.successText : styles.warningText
              ]}>
                {carrier.onTimeRate.toFixed(0)}% on-time
              </Text>
            </View>
          </View>
        ))}
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  primaryCard: {
    backgroundColor: colors.primary,
  },
  successCard: {
    backgroundColor: colors.success,
  },
  warningCard: {
    backgroundColor: colors.warning,
  },
  errorCard: {
    backgroundColor: colors.error,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.9,
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
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successText: {
    color: colors.success,
  },
  warningText: {
    color: colors.warning,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  comparisonTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  comparisonCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  comparisonMetric: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  carrierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  carrierInfo: {
    flex: 1,
  },
  carrierName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  carrierCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  carrierMetrics: {
    alignItems: 'flex-end',
  },
  carrierRate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
