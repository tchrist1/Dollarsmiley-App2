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
import { Star, TrendingUp, DollarSign, Award } from 'lucide-react-native';

interface VASStats {
  totalListingsWithVAS: number;
  totalVASOfferings: number;
  vasAdoptionRate: number;
  averageVASPerListing: number;
  totalVASRevenue: number;
  averageVASPrice: number;
  vasBookingRate: number;
  topVASCategories: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  vasByCategory: Array<{
    category_name: string;
    listings_with_vas: number;
    total_listings: number;
    adoption_rate: number;
  }>;
}

export default function VASAdoptionAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VASStats>({
    totalListingsWithVAS: 0,
    totalVASOfferings: 0,
    vasAdoptionRate: 0,
    averageVASPerListing: 0,
    totalVASRevenue: 0,
    averageVASPrice: 0,
    vasBookingRate: 0,
    topVASCategories: [],
    vasByCategory: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    try {
      // Get all listings
      const { data: allListings } = await supabase
        .from('service_listings')
        .select('id, category_id, categories(name)');

      const totalListings = allListings?.length || 0;

      // Get VAS data
      const { data: vasData } = await supabase
        .from('value_added_services')
        .select(`
          *,
          listing:service_listings(
            id,
            category_id,
            categories(name)
          )
        `)
        .eq('is_active', true);

      const totalVAS = vasData?.length || 0;

      // Count unique listings with VAS
      const listingsWithVAS = new Set(vasData?.map((v) => v.listing_id) || []).size;
      const adoptionRate = totalListings > 0 ? (listingsWithVAS / totalListings) * 100 : 0;

      // Calculate average VAS per listing
      const avgVASPerListing = listingsWithVAS > 0 ? totalVAS / listingsWithVAS : 0;

      // Calculate average VAS price
      const avgVASPrice = totalVAS > 0
        ? vasData!.reduce((sum, v) => sum + v.price, 0) / totalVAS
        : 0;

      // Get booking data with VAS
      const { data: bookingVAS } = await supabase
        .from('booking_value_added_services')
        .select('vas_id, quantity, value_added_services(price, name)');

      const totalVASRevenue = bookingVAS?.reduce(
        (sum, bv) => sum + ((bv.value_added_services as any)?.price || 0) * bv.quantity,
        0
      ) || 0;

      // Count bookings with VAS
      const { data: bookingsWithVAS } = await supabase
        .from('booking_value_added_services')
        .select('booking_id', { count: 'exact' });

      const uniqueBookingsWithVAS = new Set(bookingsWithVAS?.map((b) => b.booking_id) || []).size;

      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      const vasBookingRate = totalBookings && totalBookings > 0
        ? (uniqueBookingsWithVAS / totalBookings) * 100
        : 0;

      // Group VAS by name for top categories
      const vasNameCount: Record<string, { count: number; revenue: number }> = {};

      bookingVAS?.forEach((bv) => {
        const vasName = (bv.value_added_services as any)?.name || 'Unknown';
        const price = (bv.value_added_services as any)?.price || 0;

        if (!vasNameCount[vasName]) {
          vasNameCount[vasName] = { count: 0, revenue: 0 };
        }

        vasNameCount[vasName].count += bv.quantity;
        vasNameCount[vasName].revenue += price * bv.quantity;
      });

      const topVASCategories = Object.entries(vasNameCount)
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate VAS adoption by category
      const categoryStats: Record<string, { withVAS: number; total: number }> = {};

      allListings?.forEach((listing) => {
        const categoryName = (listing.categories as any)?.name || 'Unknown';
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { withVAS: 0, total: 0 };
        }
        categoryStats[categoryName].total++;
      });

      vasData?.forEach((vas) => {
        const categoryName = ((vas.listing as any)?.categories as any)?.name || 'Unknown';
        if (categoryStats[categoryName]) {
          // Count unique listings
          const listingId = vas.listing_id;
          categoryStats[categoryName].withVAS++;
        }
      });

      // Deduplicate listings with VAS per category
      const listingVASByCategory: Record<string, Set<string>> = {};
      vasData?.forEach((vas) => {
        const categoryName = ((vas.listing as any)?.categories as any)?.name || 'Unknown';
        if (!listingVASByCategory[categoryName]) {
          listingVASByCategory[categoryName] = new Set();
        }
        listingVASByCategory[categoryName].add(vas.listing_id);
      });

      const vasByCategory = Object.entries(categoryStats)
        .map(([category_name, data]) => {
          const uniqueListingsWithVAS = listingVASByCategory[category_name]?.size || 0;
          return {
            category_name,
            listings_with_vas: uniqueListingsWithVAS,
            total_listings: data.total,
            adoption_rate: data.total > 0 ? (uniqueListingsWithVAS / data.total) * 100 : 0,
          };
        })
        .sort((a, b) => b.adoption_rate - a.adoption_rate)
        .slice(0, 5);

      setStats({
        totalListingsWithVAS: listingsWithVAS,
        totalVASOfferings: totalVAS,
        vasAdoptionRate: adoptionRate,
        averageVASPerListing: avgVASPerListing,
        totalVASRevenue,
        averageVASPrice: avgVASPrice,
        vasBookingRate,
        topVASCategories,
        vasByCategory,
      });
    } catch (error) {
      console.error('Error loading VAS stats:', error);
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
      <Text style={styles.title}>Value-Added Services Analytics</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Star size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.totalListingsWithVAS}</Text>
          <Text style={styles.statLabel}>Listings with VAS</Text>
          <Text style={styles.statSubtext}>
            {stats.vasAdoptionRate.toFixed(1)}% adoption
          </Text>
        </View>

        <View style={[styles.statCard, styles.successCard]}>
          <Award size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.totalVASOfferings}</Text>
          <Text style={styles.statLabel}>Total VAS Offerings</Text>
          <Text style={styles.statSubtext}>
            {stats.averageVASPerListing.toFixed(1)} avg/listing
          </Text>
        </View>

        <View style={[styles.statCard, styles.infoCard]}>
          <DollarSign size={24} color={colors.white} />
          <Text style={styles.statValue}>{formatCurrency(stats.totalVASRevenue)}</Text>
          <Text style={styles.statLabel}>VAS Revenue</Text>
          <Text style={styles.statSubtext}>
            {formatCurrency(stats.averageVASPrice)} avg price
          </Text>
        </View>

        <View style={[styles.statCard, styles.warningCard]}>
          <TrendingUp size={24} color={colors.white} />
          <Text style={styles.statValue}>{stats.vasBookingRate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Booking Rate</Text>
          <Text style={styles.statSubtext}>Bookings with VAS</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Value-Added Services</Text>
        {stats.topVASCategories.map((vas, index) => (
          <View key={index} style={styles.vasRow}>
            <View style={styles.vasInfo}>
              <Text style={styles.vasName}>{vas.name}</Text>
              <Text style={styles.vasCount}>{vas.count} purchases</Text>
            </View>
            <Text style={styles.vasRevenue}>{formatCurrency(vas.revenue)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VAS Adoption by Category</Text>
        {stats.vasByCategory.map((category, index) => (
          <View key={index} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.category_name}</Text>
              <Text style={styles.categoryStats}>
                {category.listings_with_vas} of {category.total_listings} listings
              </Text>
            </View>
            <View style={styles.categoryRate}>
              <Text style={[
                styles.rateValue,
                category.adoption_rate >= 50 ? styles.highRate : styles.lowRate
              ]}>
                {category.adoption_rate.toFixed(0)}%
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
  infoCard: {
    backgroundColor: colors.info,
  },
  warningCard: {
    backgroundColor: colors.warning,
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
  statSubtext: {
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
  vasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  vasInfo: {
    flex: 1,
  },
  vasName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  vasCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  vasRevenue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  categoryStats: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryRate: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  rateValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  highRate: {
    color: colors.success,
  },
  lowRate: {
    color: colors.warning,
  },
});
