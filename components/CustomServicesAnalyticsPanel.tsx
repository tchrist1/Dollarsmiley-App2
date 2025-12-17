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
import { Package, TrendingUp, Star, DollarSign, Users, Award } from 'lucide-react-native';

interface CustomServicesStats {
  totalCustomServices: number;
  totalStandardServices: number;
  customServicePercentage: number;
  averageCustomServicePrice: number;
  averageStandardServicePrice: number;
  customServiceBookings: number;
  standardServiceBookings: number;
  customServiceRevenue: number;
  standardServiceRevenue: number;
  customServiceRating: number;
  standardServiceRating: number;
  topCustomServiceCategories: Array<{
    category_name: string;
    count: number;
  }>;
}

export default function CustomServicesAnalyticsPanel() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CustomServicesStats>({
    totalCustomServices: 0,
    totalStandardServices: 0,
    customServicePercentage: 0,
    averageCustomServicePrice: 0,
    averageStandardServicePrice: 0,
    customServiceBookings: 0,
    standardServiceBookings: 0,
    customServiceRevenue: 0,
    standardServiceRevenue: 0,
    customServiceRating: 0,
    standardServiceRating: 0,
    topCustomServiceCategories: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      // Count listings by type
      const { data: listings } = await supabase
        .from('service_listings')
        .select('listing_type, base_price, rating_average, category_id, categories(name)');

      const customServices = listings?.filter((l) => l.listing_type === 'CustomService') || [];
      const standardServices = listings?.filter((l) => l.listing_type !== 'CustomService') || [];

      const totalListings = (listings?.length || 0);
      const customServicePercentage = totalListings > 0
        ? (customServices.length / totalListings) * 100
        : 0;

      // Calculate average prices
      const avgCustomPrice = customServices.length > 0
        ? customServices.reduce((sum, l) => sum + l.base_price, 0) / customServices.length
        : 0;

      const avgStandardPrice = standardServices.length > 0
        ? standardServices.reduce((sum, l) => sum + l.base_price, 0) / standardServices.length
        : 0;

      // Calculate average ratings
      const customWithRatings = customServices.filter((l) => l.rating_average);
      const avgCustomRating = customWithRatings.length > 0
        ? customWithRatings.reduce((sum, l) => sum + (l.rating_average || 0), 0) / customWithRatings.length
        : 0;

      const standardWithRatings = standardServices.filter((l) => l.rating_average);
      const avgStandardRating = standardWithRatings.length > 0
        ? standardWithRatings.reduce((sum, l) => sum + (l.rating_average || 0), 0) / standardWithRatings.length
        : 0;

      // Get top categories for custom services
      const categoryCount: Record<string, number> = {};
      customServices.forEach((service) => {
        const categoryName = (service.categories as any)?.name || 'Unknown';
        categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCount)
        .map(([category_name, count]) => ({ category_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get booking stats
      const { data: bookings } = await supabase
        .from('bookings')
        .select('listing_id, total_price, listings:service_listings(listing_type)')
        .eq('status', 'Completed');

      let customBookings = 0;
      let standardBookings = 0;
      let customRevenue = 0;
      let standardRevenue = 0;

      bookings?.forEach((booking) => {
        const listingType = (booking.listings as any)?.listing_type;
        if (listingType === 'CustomService') {
          customBookings++;
          customRevenue += booking.total_price;
        } else {
          standardBookings++;
          standardRevenue += booking.total_price;
        }
      });

      setStats({
        totalCustomServices: customServices.length,
        totalStandardServices: standardServices.length,
        customServicePercentage,
        averageCustomServicePrice: avgCustomPrice,
        averageStandardServicePrice: avgStandardPrice,
        customServiceBookings,
        standardServiceBookings,
        customServiceRevenue,
        standardServiceRevenue,
        customServiceRating: avgCustomRating,
        standardServiceRating: avgStandardRating,
        topCustomServiceCategories: topCategories,
      });
    } catch (error) {
      console.error('Error loading custom services stats:', error);
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
      <Text style={styles.title}>Custom Services Analytics</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Package size={28} color={colors.white} />
          <Text style={styles.statValueLight}>{stats.totalCustomServices}</Text>
          <Text style={styles.statLabelLight}>Custom Services</Text>
          <Text style={styles.statSubtextLight}>
            {stats.customServicePercentage.toFixed(1)}% of total
          </Text>
        </View>

        <View style={[styles.statCard, styles.secondaryCard]}>
          <Star size={28} color={colors.white} />
          <Text style={styles.statValueLight}>{stats.totalStandardServices}</Text>
          <Text style={styles.statLabelLight}>Standard Services</Text>
          <Text style={styles.statSubtextLight}>
            {(100 - stats.customServicePercentage).toFixed(1)}% of total
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Comparison</Text>

        <View style={styles.comparisonGrid}>
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Average Price</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Custom</Text>
                <Text style={styles.comparisonValue}>
                  {formatCurrency(stats.averageCustomServicePrice)}
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Standard</Text>
                <Text style={styles.comparisonValue}>
                  {formatCurrency(stats.averageStandardServicePrice)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Total Bookings</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Custom</Text>
                <Text style={styles.comparisonValue}>{stats.customServiceBookings}</Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Standard</Text>
                <Text style={styles.comparisonValue}>{stats.standardServiceBookings}</Text>
              </View>
            </View>
          </View>

          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Total Revenue</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Custom</Text>
                <Text style={styles.comparisonValue}>
                  {formatCurrency(stats.customServiceRevenue)}
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Standard</Text>
                <Text style={styles.comparisonValue}>
                  {formatCurrency(stats.standardServiceRevenue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonLabel}>Average Rating</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Custom</Text>
                <Text style={styles.comparisonValue}>
                  {stats.customServiceRating.toFixed(1)} ⭐
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonType}>Standard</Text>
                <Text style={styles.comparisonValue}>
                  {stats.standardServiceRating.toFixed(1)} ⭐
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Custom Service Categories</Text>
        {stats.topCustomServiceCategories.map((category, index) => (
          <View key={index} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category.category_name}</Text>
            <View style={styles.categoryBar}>
              <View
                style={[
                  styles.categoryBarFill,
                  {
                    width: `${(category.count / stats.topCustomServiceCategories[0].count) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.categoryCount}>{category.count}</Text>
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
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  primaryCard: {
    backgroundColor: colors.primary,
  },
  secondaryCard: {
    backgroundColor: colors.info,
  },
  statValueLight: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  statLabelLight: {
    fontSize: fontSize.sm,
    color: colors.white,
    opacity: 0.9,
  },
  statSubtextLight: {
    fontSize: fontSize.xs,
    color: colors.white,
    opacity: 0.7,
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
  comparisonGrid: {
    gap: spacing.md,
  },
  comparisonCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  comparisonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  comparisonType: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  comparisonValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryName: {
    width: 120,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  categoryCount: {
    width: 40,
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});
