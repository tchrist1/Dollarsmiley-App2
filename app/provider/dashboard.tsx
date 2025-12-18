import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BookingAcceptRejectModal } from '@/components/BookingAcceptRejectModal';
import { BookingQuickActions } from '@/components/BookingQuickActions';
import { RecurringAvailabilityStatus } from '@/components/RecurringAvailabilityStatus';
import { quickAwardXP } from '@/lib/gamification';
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Star,
  ArrowLeft,
  Filter,
  Package,
  Truck,
  RefreshCw,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

type BookingStatus = 'PendingApproval' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled';
type TimeFilter = 'today' | 'week' | 'month' | 'all';

interface DashboardStats {
  totalBookings: number;
  pendingApproval: number;
  upcomingBookings: number;
  completedToday: number;
  totalEarnings: number;
  averageRating: number;
}

interface Booking {
  id: string;
  title: string;
  customer: {
    full_name: string;
    avatar_url?: string;
  };
  scheduled_date: string;
  scheduled_time: string;
  price: number;
  status: BookingStatus;
  payment_status: string;
  location: string;
}

export default function ProviderDashboardScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingApproval: 0,
    upcomingBookings: 0,
    completedToday: 0,
    totalEarnings: 0,
    averageRating: 0,
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<TimeFilter>('today');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'accept' | 'reject'>('accept');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [pendingRescheduleCount, setPendingRescheduleCount] = useState(0);
  const [pendingProductionCount, setPendingProductionCount] = useState(0);
  const [activeShipmentsCount, setActiveShipmentsCount] = useState(0);
  const [pendingRefundsCount, setPendingRefundsCount] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchDashboardData();
      fetchPendingRescheduleCount();
      fetchProductionOrdersCounts();
    }
  }, [profile, filter, statusFilter]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      await Promise.all([fetchStats(), fetchBookings()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('status, price, created_at')
      .eq('provider_id', profile!.id);

    const { data: ratingsData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('provider_id', profile!.id);

    const today = new Date().toISOString().split('T')[0];

    const totalBookings = bookingsData?.length || 0;
    const pendingApproval = bookingsData?.filter((b) => b.status === 'PendingApproval').length || 0;
    const completedToday =
      bookingsData?.filter(
        (b) => b.status === 'Completed' && b.created_at.startsWith(today)
      ).length || 0;

    const { data: upcomingData } = await supabase
      .from('bookings')
      .select('id')
      .eq('provider_id', profile!.id)
      .in('status', ['Confirmed', 'InProgress'])
      .gte('scheduled_date', today);

    const totalEarnings =
      bookingsData
        ?.filter((b) => b.status === 'Completed')
        .reduce((sum, b) => sum + (b.price * 0.9), 0) || 0;

    const averageRating =
      ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
        : 0;

    setStats({
      totalBookings,
      pendingApproval,
      upcomingBookings: upcomingData?.length || 0,
      completedToday,
      totalEarnings,
      averageRating,
    });
  };

  const fetchBookings = async () => {
    let query = supabase
      .from('bookings')
      .select(
        `
        id,
        title,
        scheduled_date,
        scheduled_time,
        price,
        status,
        payment_status,
        location,
        customer:profiles!bookings_customer_id_fkey(full_name, avatar_url)
      `
      )
      .eq('provider_id', profile!.id)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    switch (filter) {
      case 'today':
        query = query.eq('scheduled_date', today.toISOString().split('T')[0]);
        break;
      case 'week':
        query = query.gte('scheduled_date', startOfWeek.toISOString().split('T')[0]);
        break;
      case 'month':
        query = query.gte('scheduled_date', startOfMonth.toISOString().split('T')[0]);
        break;
    }

    const { data } = await query;
    setBookings((data as any) || []);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const fetchPendingRescheduleCount = async () => {
    if (!profile) return;

    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('provider_id', profile.id);

      if (bookingsError) throw bookingsError;

      if (!bookings || bookings.length === 0) {
        setPendingRescheduleCount(0);
        return;
      }

      const bookingIds = bookings.map(b => b.id);

      const { count, error } = await supabase
        .from('reschedule_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending')
        .in('booking_id', bookingIds);

      if (error) throw error;
      setPendingRescheduleCount(count || 0);
    } catch (error) {
      console.error('Error fetching reschedule count:', error);
    }
  };

  const fetchProductionOrdersCounts = async () => {
    if (!profile) return;

    try {
      const { count: productionCount } = await supabase
        .from('production_orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', profile.id)
        .in('status', ['pending_order_received', 'order_received', 'in_production', 'pending_approval']);

      setPendingProductionCount(productionCount || 0);

      const { count: shipmentsCount } = await supabase
        .from('production_orders')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', profile.id)
        .in('status', ['ready_for_delivery', 'shipped']);

      setActiveShipmentsCount(shipmentsCount || 0);

      const { data: orders } = await supabase
        .from('production_orders')
        .select('id')
        .eq('provider_id', profile.id);

      if (orders && orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const { count: refundsCount } = await supabase
          .from('refund_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('production_order_id', orderIds);

        setPendingRefundsCount(refundsCount || 0);
      } else {
        setPendingRefundsCount(0);
      }
    } catch (error) {
      console.error('Error fetching production counts:', error);
    }
  };

  const handleAcceptBooking = (booking: Booking) => {
    setSelectedBooking({
      id: booking.id,
      title: booking.title,
      customer_name: booking.customer.full_name,
      scheduled_date: booking.scheduled_date,
      scheduled_time: booking.scheduled_time,
      price: booking.price,
      location: booking.location,
    });
    setModalType('accept');
    setModalVisible(true);
  };

  const handleRejectBooking = (booking: Booking) => {
    setSelectedBooking({
      id: booking.id,
      title: booking.title,
      customer_name: booking.customer.full_name,
      scheduled_date: booking.scheduled_date,
      scheduled_time: booking.scheduled_time,
      price: booking.price,
      location: booking.location,
    });
    setModalType('reject');
    setModalVisible(true);
  };

  const confirmAcceptBooking = async (notes?: string) => {
    if (!selectedBooking) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Confirmed',
          provider_response_deadline: null,
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      const customerId = bookings.find((b) => b.id === selectedBooking.id)?.customer.full_name;

      await supabase.from('notifications').insert({
        user_id: customerId,
        type: 'booking_confirmed',
        title: 'Booking Confirmed',
        message: `Your booking for ${selectedBooking.title} has been confirmed${
          notes ? `: ${notes}` : ''
        }`,
        data: { booking_id: selectedBooking.id },
      });

      if (profile) {
        await quickAwardXP.bookingAccepted(profile.id, selectedBooking.id);
      }

      Alert.alert('Success', 'Booking accepted! +15 XP earned');
      setModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept booking');
    } finally {
      setProcessing(false);
    }
  };

  const confirmRejectBooking = async (reason?: string) => {
    if (!selectedBooking) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'Cancelled',
          cancellation_reason: reason || 'Declined by provider',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      const booking = bookings.find((b) => b.id === selectedBooking.id);
      if (booking) {
        await supabase.from('notifications').insert({
          user_id: booking.customer.full_name,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking for ${selectedBooking.title} has been cancelled${
            reason ? `: ${reason}` : ''
          }`,
          data: { booking_id: selectedBooking.id },
        });
      }

      Alert.alert('Success', 'Booking declined');
      setModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      Alert.alert('Error', 'Failed to decline booking');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'PendingApproval':
        return colors.warning;
      case 'Confirmed':
        return colors.primary;
      case 'InProgress':
        return colors.info;
      case 'Completed':
        return colors.success;
      case 'Cancelled':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'PendingApproval':
        return <Clock size={16} color={colors.warning} />;
      case 'Confirmed':
        return <CheckCircle size={16} color={colors.primary} />;
      case 'InProgress':
        return <AlertCircle size={16} color={colors.info} />;
      case 'Completed':
        return <CheckCircle size={16} color={colors.success} />;
      case 'Cancelled':
        return <XCircle size={16} color={colors.error} />;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Dashboard</Text>
        <TouchableOpacity
          onPress={() => router.push('/provider/schedule-editor')}
          style={styles.scheduleButton}
        >
          <Calendar size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <View style={styles.statIconContainer}>
              <Calendar size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={[styles.statCard, styles.statCardWarning]}>
            <View style={styles.statIconContainer}>
              <Clock size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats.pendingApproval}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats.upcomingBookings}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <View style={styles.statIconContainer}>
              <CheckCircle size={24} color={colors.info} />
            </View>
            <Text style={styles.statValue}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <DollarSign size={28} color={colors.success} />
            <View style={styles.earningsContent}>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsValue}>${stats.totalEarnings.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            <Star size={20} color={colors.warning} fill={colors.warning} />
            <Text style={styles.ratingText}>
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.ratingLabel}>Average Rating</Text>
          </View>
        </View>

        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/schedule-editor')}
          >
            <View style={styles.quickActionIcon}>
              <Calendar size={24} color={colors.primary} />
            </View>
            <Text style={styles.quickActionTitle}>Weekly Schedule</Text>
            <Text style={styles.quickActionText}>Set your availability hours</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/blocked-dates')}
          >
            <View style={styles.quickActionIcon}>
              <XCircle size={24} color={colors.error} />
            </View>
            <Text style={styles.quickActionTitle}>Blocked Dates</Text>
            <Text style={styles.quickActionText}>Manage time off</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/reschedule-requests')}
          >
            <View style={styles.quickActionIcon}>
              <Clock size={24} color={colors.warning} />
              {pendingRescheduleCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{pendingRescheduleCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionTitle}>Reschedule Requests</Text>
            <Text style={styles.quickActionText}>
              {pendingRescheduleCount > 0
                ? `${pendingRescheduleCount} pending`
                : 'No pending requests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/production')}
          >
            <View style={styles.quickActionIcon}>
              <Package size={24} color={colors.info} />
              {pendingProductionCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{pendingProductionCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionTitle}>Custom Orders</Text>
            <Text style={styles.quickActionText}>
              {pendingProductionCount > 0
                ? `${pendingProductionCount} active`
                : 'Production orders'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/shipment')}
          >
            <View style={styles.quickActionIcon}>
              <Truck size={24} color={colors.success} />
              {activeShipmentsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{activeShipmentsCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionTitle}>Shipments</Text>
            <Text style={styles.quickActionText}>
              {activeShipmentsCount > 0
                ? `${activeShipmentsCount} active`
                : 'Track deliveries'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/provider/refunds')}
          >
            <View style={styles.quickActionIcon}>
              <RefreshCw size={24} color={colors.error} />
              {pendingRefundsCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{pendingRefundsCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickActionTitle}>Refund Requests</Text>
            <Text style={styles.quickActionText}>
              {pendingRefundsCount > 0
                ? `${pendingRefundsCount} pending`
                : 'Review requests'}
            </Text>
          </TouchableOpacity>
        </View>

        {profile && (
          <View style={styles.availabilitySection}>
            <RecurringAvailabilityStatus providerId={profile.id} compact />
          </View>
        )}

        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Bookings</Text>
          <View style={styles.filters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filter === f && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.bookingsList}>
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={64} color={colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Bookings</Text>
              <Text style={styles.emptyStateText}>
                No bookings found for the selected period
              </Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingCustomer}>
                    <View style={styles.customerAvatar}>
                      <Users size={20} color={colors.white} />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{booking.customer.full_name}</Text>
                      <Text style={styles.bookingTitle}>{booking.title}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(booking.status) + '20' },
                    ]}
                  >
                    {getStatusIcon(booking.status)}
                    <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                      {booking.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.bookingDetail}>
                    <Calendar size={16} color={colors.textSecondary} />
                    <Text style={styles.bookingDetailText}>
                      {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.bookingDetail}>
                    <Clock size={16} color={colors.textSecondary} />
                    <Text style={styles.bookingDetailText}>{booking.scheduled_time}</Text>
                  </View>
                  <View style={styles.bookingDetail}>
                    <DollarSign size={16} color={colors.success} />
                    <Text style={[styles.bookingDetailText, styles.priceText]}>
                      ${(booking.price * 0.9).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <BookingQuickActions
                  bookingId={booking.id}
                  status={booking.status}
                  onAccept={() => handleAcceptBooking(booking)}
                  onReject={() => handleRejectBooking(booking)}
                  loading={processing}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BookingAcceptRejectModal
        visible={modalVisible}
        type={modalType}
        booking={selectedBooking}
        onClose={() => setModalVisible(false)}
        onConfirm={modalType === 'accept' ? confirmAcceptBooking : confirmRejectBooking}
        loading={processing}
      />
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    letterSpacing: -0.3,
  },
  scheduleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  statCardPrimary: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  statCardWarning: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statCardSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  statCardInfo: {
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border + '40',
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.white,
  },
  notificationBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
  quickActionText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  availabilitySection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  earningsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '40',
    ...shadows.sm,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  earningsContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  earningsLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.success,
    letterSpacing: -1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border + '30',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: spacing.xs,
  },
  ratingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.2,
  },
  filters: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  bookingsList: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '40',
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  bookingCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  bookingTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceText: {
    fontWeight: '700',
    color: colors.success,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
