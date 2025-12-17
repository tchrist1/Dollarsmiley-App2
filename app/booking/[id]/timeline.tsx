import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { BookingTimeline, TimelineEvent } from '@/components/BookingTimeline';
import { getBookingTimeline } from '@/lib/booking-timeline';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

export default function BookingTimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadTimelineData();
    }
  }, [id]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);

      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(
          `
          *,
          customer:profiles!bookings_customer_id_fkey(id, full_name),
          provider:profiles!bookings_provider_id_fkey(id, full_name)
        `
        )
        .eq('id', id)
        .single();

      if (bookingError) throw bookingError;

      setBooking(bookingData);

      // Fetch timeline events
      const timelineEvents = await getBookingTimeline(id);
      setEvents(timelineEvents);
    } catch (error: any) {
      console.error('Error loading timeline:', error);
      Alert.alert('Error', 'Failed to load booking timeline');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="outline"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title=""
          onPress={() => router.back()}
          variant="outline"
          style={styles.backButton}
          icon={<ArrowLeft size={20} color={colors.primary} />}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{booking.title}</Text>
          <Text style={styles.headerSubtitle}>
            {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            at {booking.scheduled_time}
          </Text>
        </View>
      </View>

      <BookingTimeline
        events={events}
        currentStatus={booking.status}
        compact={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    padding: 0,
    marginRight: spacing.md,
    marginBottom: 0,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
