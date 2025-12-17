import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo, memo } from 'react';
import { Clock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailableTimeSlotsProps {
  providerId: string;
  selectedDate: Date;
  onSelectTime: (time: string) => void;
  selectedTime?: string;
}

const TimeSlotButton = memo(({
  slot,
  isSelected,
  onPress
}: {
  slot: TimeSlot;
  isSelected: boolean;
  onPress: () => void;
}) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.slotButton,
        !slot.available && styles.slotButtonUnavailable,
        isSelected && styles.slotButtonSelected,
      ]}
      onPress={onPress}
      disabled={!slot.available}
    >
      <Clock
        size={16}
        color={
          !slot.available
            ? theme.colors.textLight
            : isSelected
            ? '#fff'
            : theme.colors.primary
        }
      />
      <Text
        style={[
          styles.slotText,
          !slot.available && styles.slotTextUnavailable,
          isSelected && styles.slotTextSelected,
        ]}
      >
        {formatTime(slot.time)}
      </Text>
    </TouchableOpacity>
  );
});

TimeSlotButton.displayName = 'TimeSlotButton';

export default function AvailableTimeSlots({
  providerId,
  selectedDate,
  onSelectTime,
  selectedTime,
}: AvailableTimeSlotsProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const dateString = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  const dayOfWeek = useMemo(() => {
    return selectedDate.getDay();
  }, [selectedDate]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [providerId, dateString, dayOfWeek]);

  const fetchAvailableSlots = async () => {
    setLoading(true);
    try {
      const [
        { data: recurringAvailability, error: recurringError },
        { data: blockedDates, error: blockedError },
        { data: exceptions, error: exceptionsError },
        { data: bookedSlots, error: bookedError },
      ] = await Promise.all([
        supabase
          .from('provider_availability')
          .select('start_time, end_time')
          .eq('provider_id', providerId)
          .eq('is_recurring', true)
          .eq('day_of_week', dayOfWeek)
          .eq('availability_type', 'Available'),
        supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', providerId)
          .eq('is_recurring', false)
          .eq('availability_type', 'Blocked')
          .lte('start_date', dateString)
          .gte('end_date', dateString),
        supabase
          .from('availability_exceptions')
          .select('*')
          .eq('provider_id', providerId)
          .eq('exception_date', dateString),
        supabase
          .from('time_slot_bookings')
          .select('start_time, end_time')
          .eq('provider_id', providerId)
          .eq('booking_date', dateString)
          .in('status', ['Reserved', 'Confirmed']),
      ]);

      if (recurringError) throw recurringError;
      if (blockedError) throw blockedError;
      if (exceptionsError) throw exceptionsError;
      if (bookedError) throw bookedError;

      if (blockedDates && blockedDates.length > 0) {
        setTimeSlots([]);
        setLoading(false);
        return;
      }

      const unavailableException = exceptions?.find((e) => e.exception_type === 'Unavailable');
      if (unavailableException) {
        setTimeSlots([]);
        setLoading(false);
        return;
      }

      const availabilityRanges = recurringAvailability || [];
      const slots: TimeSlot[] = [];

      availabilityRanges.forEach((range) => {
        const startHour = parseInt(range.start_time.split(':')[0]);
        const startMinute = parseInt(range.start_time.split(':')[1]);
        const endHour = parseInt(range.end_time.split(':')[0]);
        const endMinute = parseInt(range.end_time.split(':')[1]);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeString = `${hours.toString().padStart(2, '0')}:${mins
            .toString()
            .padStart(2, '0')}:00`;

          const slotEndMinutes = minutes + 30;
          const slotEndHours = Math.floor(slotEndMinutes / 60);
          const slotEndMins = slotEndMinutes % 60;
          const slotEndString = `${slotEndHours.toString().padStart(2, '0')}:${slotEndMins
            .toString()
            .padStart(2, '0')}:00`;

          const isBooked = bookedSlots?.some((booked) => {
            return (
              (timeString >= booked.start_time && timeString < booked.end_time) ||
              (slotEndString > booked.start_time && slotEndString <= booked.end_time) ||
              (timeString <= booked.start_time && slotEndString >= booked.end_time)
            );
          });

          slots.push({
            time: timeString,
            available: !isBooked,
          });
        }
      });

      setTimeSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading available times...</Text>
      </View>
    );
  }

  if (timeSlots.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Clock size={48} color={theme.colors.textLight} />
        <Text style={styles.emptyText}>No available time slots</Text>
        <Text style={styles.emptySubtext}>Please select a different date</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Time Slots</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slotsContainer}
      >
        {timeSlots.map((slot) => (
          <TimeSlotButton
            key={slot.time}
            slot={slot}
            isSelected={selectedTime === slot.time}
            onPress={() => onSelectTime(slot.time)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  slotsContainer: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  slotButtonUnavailable: {
    backgroundColor: '#f8f9fa',
    borderColor: theme.colors.border,
    opacity: 0.5,
  },
  slotButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  slotTextUnavailable: {
    color: theme.colors.textLight,
  },
  slotTextSelected: {
    color: '#fff',
  },
});
