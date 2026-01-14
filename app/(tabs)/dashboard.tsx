import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Calendar, Clock, MapPin, DollarSign, Wallet, ClipboardList, Bookmark, Search, FileText, PlusCircle, Briefcase, User, TrendingUp, FileEdit, RefreshCw } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { Button } from '@/components/Button';
import ResponsiveGrid from '@/components/ResponsiveGrid';

interface Booking {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  price: number;
  status: string;
  provider?: {
    full_name: string;
  };
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchBookings();
    }
  }, [profile]);

  const fetchBookings = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('bookings')
      .select('*, provider:profiles!bookings_provider_id_fkey(full_name)')
      .eq('customer_id', profile.id)
      .order('scheduled_date', { ascending: false })
      .limit(10);

    if (data) {
      setBookings(data as any);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requested':
        return colors.warning;
      case 'PendingApproval':
        return colors.warning;
      case 'Accepted':
        return colors.success;
      case 'InProgress':
        return colors.primary;
      case 'Completed':
        return colors.success;
      case 'Cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Requested':
        return 'Pending';
      case 'PendingApproval':
        return 'Awaiting Provider';
      case 'Accepted':
        return 'Confirmed';
      case 'InProgress':
        return 'In Progress';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/booking/${item.id}` as any)}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      {item.provider && (
        <View style={styles.bookingRow}>
          <User size={16} color={colors.textSecondary} />
          <Text style={styles.bookingText}>{item.provider.full_name}</Text>
        </View>
      )}

      <View style={styles.bookingRow}>
        <Calendar size={16} color={colors.textSecondary} />
        <Text style={styles.bookingText}>
          {new Date(item.scheduled_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
        <Clock size={16} color={colors.textSecondary} style={{ marginLeft: spacing.md }} />
        <Text style={styles.bookingText}>{item.scheduled_time}</Text>
      </View>

      <View style={styles.bookingRow}>
        <MapPin size={16} color={colors.textSecondary} />
        <Text style={styles.bookingText} numberOfLines={1}>
          {item.location}
        </Text>
      </View>

      <View style={styles.bookingFooter}>
        <View style={styles.priceContainer}>
          <DollarSign size={18} color={colors.success} />
          <Text style={styles.priceText}>${item.price}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>Please sign in to view your dashboard</Text>
          <Button title="Sign In" onPress={() => router.push('/(auth)/login')} />
        </View>
      </View>
    );
  }

  const isProvider = profile.user_type === 'Provider' || profile.user_type === 'Hybrid';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {profile.full_name.split(' ')[0]}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ResponsiveGrid minColumns={2} maxColumns={3} gap={spacing.md}>
            {isProvider && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/create-listing' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIconContainer}>
                  <PlusCircle size={24} color={colors.success} />
                </View>
                <Text style={styles.actionTitle}>Create Listing</Text>
                <Text style={styles.actionDescription}>Add a new service</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/post-job' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <FileEdit size={24} color={colors.primary} />
              </View>
              <Text style={styles.actionTitle}>Post Job</Text>
              <Text style={styles.actionDescription}>Create a job post</Text>
            </TouchableOpacity>

            {isProvider && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/provider/my-listings' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIconContainer}>
                  <ClipboardList size={24} color={colors.primary} />
                </View>
                <Text style={styles.actionTitle}>My Listings</Text>
                <Text style={styles.actionDescription}>Manage services</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/my-jobs/posted' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <ClipboardList size={24} color={colors.secondary} />
              </View>
              <Text style={styles.actionTitle}>My Posted Jobs</Text>
              <Text style={styles.actionDescription}>Jobs you posted</Text>
            </TouchableOpacity>

            {isProvider && (
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/my-jobs/applied' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIconContainer}>
                  <Briefcase size={24} color={colors.info} />
                </View>
                <Text style={styles.actionTitle}>My Applied Jobs</Text>
                <Text style={styles.actionDescription}>Jobs you applied to</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/bookings' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Calendar size={24} color={colors.info} />
              </View>
              <Text style={styles.actionTitle}>My Bookings</Text>
              <Text style={styles.actionDescription}>View appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/bookings/recurring' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <RefreshCw size={24} color={colors.warning} />
              </View>
              <Text style={styles.actionTitle}>Recurring</Text>
              <Text style={styles.actionDescription}>Repeat bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/saved/jobs' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Bookmark size={24} color={colors.error} />
              </View>
              <Text style={styles.actionTitle}>Saved Jobs</Text>
              <Text style={styles.actionDescription}>Bookmarked jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/saved/searches' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconContainer}>
                <Search size={24} color={colors.success} />
              </View>
              <Text style={styles.actionTitle}>Saved Searches</Text>
              <Text style={styles.actionDescription}>Quickly rerun searches</Text>
            </TouchableOpacity>
          </ResponsiveGrid>
        </View>

        {/* Activity & Bookings Section - Consolidated */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity & Bookings</Text>
            {bookings.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/bookings')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading your activity...</Text>
            </View>
          ) : bookings.length > 0 ? (
            <FlatList
              data={bookings.slice(0, 3)}
              renderItem={renderBooking}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.bookingsList}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Calendar size={56} color={colors.primary + '40'} />
              </View>
              <Text style={styles.emptyTitle}>No Activity Yet</Text>
              <Text style={styles.emptyText}>
                Start exploring and book your first service
              </Text>
              <Button
                title="Discover Services"
                onPress={() => router.push('/' as any)}
                style={styles.discoverButton}
              />
            </View>
          )}

          {/* Navigation to other activity sections */}
          <View style={styles.activityNav}>
            <TouchableOpacity
              style={styles.activityNavCard}
              onPress={() => router.push('/my-jobs/posted')}
              activeOpacity={0.7}
            >
              <View style={styles.activityNavIcon}>
                <ClipboardList size={24} color={colors.primary} />
              </View>
              <Text style={styles.activityNavText}>Posted Jobs</Text>
            </TouchableOpacity>

            {isProvider && (
              <TouchableOpacity
                style={styles.activityNavCard}
                onPress={() => router.push('/my-jobs/applied')}
                activeOpacity={0.7}
              >
                <View style={styles.activityNavIcon}>
                  <Briefcase size={24} color={colors.primary} />
                </View>
                <Text style={styles.activityNavText}>Applied Jobs</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.activityNavCard}
              onPress={() => router.push('/bookings')}
              activeOpacity={0.7}
            >
              <View style={styles.activityNavIcon}>
                <Calendar size={24} color={colors.primary} />
              </View>
              <Text style={styles.activityNavText}>All Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial</Text>
          <View style={styles.menuList}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/wallet')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Wallet size={22} color={colors.success} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Wallet</Text>
                <Text style={styles.menuSubtitle}>View earnings & payouts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/transactions')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <FileText size={22} color={colors.info} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Transactions</Text>
                <Text style={styles.menuSubtitle}>View transaction history</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Provider Tools Section - Only for Provider and Hybrid */}
        {isProvider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Tools</Text>
            <View style={styles.menuList}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/provider/dashboard')}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <Briefcase size={22} color={colors.secondary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Provider Dashboard</Text>
                  <Text style={styles.menuSubtitle}>Manage bookings & earnings</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/provider/my-listings' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <ClipboardList size={22} color={colors.primary} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>My Listings</Text>
                  <Text style={styles.menuSubtitle}>View & manage your services</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/analytics/advanced' as any)}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <TrendingUp size={22} color={colors.warning} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Analytics</Text>
                  <Text style={styles.menuSubtitle}>View performance metrics</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '20',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  signInText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  viewAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  actionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  bookingsList: {
    gap: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  bookingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.sm,
    letterSpacing: -0.1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  bookingText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    fontWeight: '500',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: -0.2,
  },
  loadingState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '500',
    lineHeight: 20,
  },
  discoverButton: {
    marginTop: spacing.sm,
    minWidth: 180,
  },
  activityNav: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  activityNavCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
    minHeight: 100,
  },
  activityNavIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  activityNavText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.1,
    textAlign: 'center',
    lineHeight: 18,
  },
  menuList: {
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
