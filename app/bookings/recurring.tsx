import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Plus, Filter } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import RecurringBookingCard from '@/components/RecurringBookingCard';
import {
  getRecurringBookings,
  cancelRecurringBooking,
  type RecurringBooking,
} from '@/lib/recurring-bookings';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

type FilterType = 'all' | 'active' | 'inactive';

export default function RecurringBookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [bookings, setBookings] = useState<RecurringBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('active');

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      const data = await getRecurringBookings(user.id);
      setBookings(data);
    } catch (error) {
      console.error('Error loading recurring bookings:', error);
      Alert.alert('Error', 'Failed to load recurring bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_bookings')
        .update({ is_active: false })
        .eq('id', bookingId);

      if (error) {
        // Table doesn't exist - migration not applied yet
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          Alert.alert('Feature Unavailable', 'Recurring bookings feature is not enabled yet.');
          return;
        }
        throw error;
      }

      setBookings(
        bookings.map(b => (b.id === bookingId ? { ...b, is_active: false } : b))
      );

      Alert.alert('Success', 'Recurring booking paused');
    } catch (error) {
      console.error('Error pausing recurring booking:', error);
      Alert.alert('Error', 'Failed to pause recurring booking');
    }
  };

  const handleResume = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_bookings')
        .update({ is_active: true })
        .eq('id', bookingId);

      if (error) {
        // Table doesn't exist - migration not applied yet
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          Alert.alert('Feature Unavailable', 'Recurring bookings feature is not enabled yet.');
          return;
        }
        throw error;
      }

      setBookings(
        bookings.map(b => (b.id === bookingId ? { ...b, is_active: true } : b))
      );

      Alert.alert('Success', 'Recurring booking resumed');
    } catch (error) {
      console.error('Error resuming recurring booking:', error);
      Alert.alert('Error', 'Failed to resume recurring booking');
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      const success = await cancelRecurringBooking(bookingId);

      if (success) {
        setBookings(
          bookings.map(b => (b.id === bookingId ? { ...b, is_active: false } : b))
        );
        Alert.alert('Success', 'Recurring booking cancelled');
      } else {
        Alert.alert('Error', 'Failed to cancel recurring booking');
      }
    } catch (error) {
      console.error('Error cancelling recurring booking:', error);
      Alert.alert('Error', 'Failed to cancel recurring booking');
    }
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    if (filter === 'active') return bookings.filter(b => b.is_active);
    return bookings.filter(b => !b.is_active);
  };

  const filteredBookings = getFilteredBookings();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recurring Bookings',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <View style={styles.filterTabs}>
            {(['all', 'active', 'inactive'] as FilterType[]).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, filter === f && styles.filterTabActive]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === f && styles.filterTabTextActive,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
                {f !== 'all' && (
                  <View style={[styles.filterBadge, filter === f && styles.filterBadgeActive]}>
                    <Text
                      style={[
                        styles.filterBadgeText,
                        filter === f && styles.filterBadgeTextActive,
                      ]}
                    >
                      {f === 'active'
                        ? bookings.filter(b => b.is_active).length
                        : bookings.filter(b => !b.is_active).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading recurring bookings...</Text>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Filter size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {filter === 'all'
                ? 'No Recurring Bookings'
                : filter === 'active'
                  ? 'No Active Recurring Bookings'
                  : 'No Inactive Recurring Bookings'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Set up recurring bookings to automatically schedule regular appointments'
                : filter === 'active'
                  ? 'All your recurring bookings are currently paused or stopped'
                  : 'You have no paused or stopped recurring bookings'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                {filteredBookings.length} Recurring Booking
                {filteredBookings.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.summaryText}>
                {bookings.reduce((sum, b) => sum + b.created_bookings, 0)} total bookings created
              </Text>
            </View>

            {filteredBookings.map(booking => (
              <RecurringBookingCard
                key={booking.id}
                booking={booking}
                onPress={() => router.push(`/bookings/recurring/${booking.id}`)}
                onPause={() => handlePause(booking.id)}
                onResume={() => handleResume(booking.id)}
                onCancel={() => handleCancel(booking.id)}
                showActions={true}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filterContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  filterBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: colors.primary,
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  filterBadgeTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
