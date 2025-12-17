import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import CalendarOnboardingFlow from '@/components/CalendarOnboardingFlow';
import {
  useCalendarOnboarding,
  shouldTriggerOnboarding,
  CALENDAR_ONBOARDING_TRIGGERS,
} from '@/hooks/useCalendarOnboarding';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  User,
  Star,
  CheckCircle,
  AlertCircle,
  Package,
  XCircle,
} from 'lucide-react-native';

interface Booking {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  price: number;
  status: string;
  payment_status: string;
  customer_id: string;
  provider_id: string;
  other_party: {
    full_name: string;
    rating_average: number;
    rating_count: number;
  };
}

export default function BookingsScreen() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const calendarOnboarding = useCalendarOnboarding();
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');

  useEffect(() => {
    if (profile) {
      fetchBookings();
      checkOnboardingTrigger();
    }
  }, [profile, filter, role]);

  const checkOnboardingTrigger = async () => {
    const shouldShow = await shouldTriggerOnboarding(
      CALENDAR_ONBOARDING_TRIGGERS.BOOKINGS_TAB_VISIT
    );
    if (shouldShow) {
      calendarOnboarding.showOnboarding();
    }
  };

  const fetchBookings = async () => {
    if (!profile) return;

    setLoading(true);

    let query = supabase.from('bookings').select(
      `
        *,
        customer:profiles!bookings_customer_id_fkey(full_name, rating_average, rating_count),
        provider:profiles!bookings_provider_id_fkey(full_name, rating_average, rating_count)
      `
    );

    if (role === 'customer') {
      query = query.eq('customer_id', profile.id);
    } else {
      query = query.eq('provider_id', profile.id);
    }

    if (filter === 'upcoming') {
      query = query.in('status', ['Requested', 'Accepted', 'InProgress']);
    } else if (filter === 'completed') {
      query = query.eq('status', 'Completed');
    } else if (filter === 'cancelled') {
      query = query.in('status', ['Cancelled', 'Disputed']);
    }

    query = query.order('scheduled_date', { ascending: filter === 'upcoming' });

    const { data, error } = await query;

    if (data && !error) {
      const formattedData = data.map((booking: any) => ({
        ...booking,
        other_party: role === 'customer' ? booking.provider : booking.customer,
      }));
      setBookings(formattedData);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Requested':
        return colors.warning;
      case 'Accepted':
        return colors.success;
      case 'InProgress':
        return colors.primary;
      case 'Completed':
        return colors.success;
      case 'Cancelled':
        return colors.error;
      case 'Disputed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Requested':
        return <Clock size={14} color={colors.warning} />;
      case 'Accepted':
        return <CheckCircle size={14} color={colors.success} />;
      case 'InProgress':
        return <Package size={14} color={colors.primary} />;
      case 'Completed':
        return <CheckCircle size={14} color={colors.success} />;
      case 'Cancelled':
        return <XCircle size={14} color={colors.error} />;
      case 'Disputed':
        return <AlertCircle size={14} color={colors.error} />;
      default:
        return <AlertCircle size={14} color={colors.textSecondary} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Requested':
        return 'Pending';
      case 'Accepted':
        return 'Confirmed';
      case 'InProgress':
        return 'In Progress';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      case 'Disputed':
        return 'Disputed';
      default:
        return status;
    }
  };

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/booking/${item.id}` as any)}
    >
      <View style={styles.bookingHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.bookingTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={styles.bookingMeta}>
        <View style={styles.metaRow}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {new Date(item.scheduled_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{item.scheduled_time}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MapPin size={14} color={colors.textSecondary} />
        <Text style={styles.metaText} numberOfLines={1}>
          {item.location}
        </Text>
      </View>

      <View style={styles.bookingFooter}>
        <View style={styles.priceContainer}>
          <DollarSign size={16} color={colors.primary} />
          <Text style={styles.priceText}>${item.price}</Text>
        </View>
      </View>

      <View style={styles.otherPartyInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.other_party.full_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.otherPartyDetails}>
          <Text style={styles.otherPartyLabel}>{role === 'customer' ? 'Provider' : 'Customer'}</Text>
          <Text style={styles.otherPartyName}>{item.other_party.full_name}</Text>
          {item.other_party.rating_count > 0 && (
            <View style={styles.ratingRow}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={styles.ratingText}>
                {item.other_party.rating_average.toFixed(1)} ({item.other_party.rating_count})
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Package size={64} color={colors.textLight} />
      <Text style={styles.emptyTitle}>No bookings</Text>
      <Text style={styles.emptyText}>
        {filter === 'upcoming'
          ? role === 'customer'
            ? 'Book a service to get started'
            : 'No upcoming bookings yet'
          : filter === 'completed'
          ? 'Completed bookings will appear here'
          : 'Cancelled bookings will appear here'}
      </Text>
    </View>
  );

  const canSwitchRole = profile?.user_type === 'Hybrid' || profile?.user_type === 'Provider';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>Track all your appointments</Text>
      </View>

      {canSwitchRole && (
        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
            onPress={() => setRole('customer')}
          >
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>
              As Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'provider' && styles.roleButtonActive]}
            onPress={() => setRole('provider')}
          >
            <Text style={[styles.roleText, role === 'provider' && styles.roleTextActive]}>
              As Provider
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'upcoming' && styles.filterChipActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'cancelled' && styles.filterChipActive]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.filterText, filter === 'cancelled' && styles.filterTextActive]}>
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CalendarOnboardingFlow
        visible={calendarOnboarding.shouldShow}
        onComplete={calendarOnboarding.markCompleted}
        onSkip={calendarOnboarding.markSkipped}
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
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  roleToggle: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  roleTextActive: {
    color: colors.white,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
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
  listContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  bookingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bookingMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  otherPartyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  otherPartyDetails: {
    flex: 1,
  },
  otherPartyLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  otherPartyName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
