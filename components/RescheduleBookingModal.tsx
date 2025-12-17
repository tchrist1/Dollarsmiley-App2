import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { DatePicker } from '@/components/DatePicker';
import { supabase } from '@/lib/supabase';
import { syncBookingToCalendar } from '@/lib/calendar';
import { Button } from '@/components/Button';

interface RescheduleBookingModalProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    id: string;
    title: string;
    scheduled_date: string;
    scheduled_time: string;
    location: string;
    price: number;
    calendar_event_id?: string;
    status: string;
    provider?: {
      full_name: string;
    };
    customer?: {
      full_name: string;
    };
  };
  isProvider: boolean;
  onRescheduled: () => void;
}

export function RescheduleBookingModal({
  visible,
  onClose,
  booking,
  isProvider,
  onRescheduled,
}: RescheduleBookingModalProps) {
  const [newDate, setNewDate] = useState(new Date(booking.scheduled_date));
  const [newTime, setNewTime] = useState(booking.scheduled_time);
  const [loading, setLoading] = useState(false);

  const timeSlots = [
    '8:00 AM',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
    '4:00 PM',
    '5:00 PM',
    '6:00 PM',
    '7:00 PM',
  ];

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      Alert.alert('Error', 'Please select both date and time.');
      return;
    }

    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      Alert.alert('Error', 'Please select a future date.');
      return;
    }

    setLoading(true);

    try {
      const formattedDate = selectedDate.toISOString().split('T')[0];

      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          scheduled_date: formattedDate,
          scheduled_time: newTime,
        })
        .eq('id', booking.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (booking.calendar_event_id && updatedBooking) {
        const providerName = isProvider
          ? booking.customer?.full_name || 'Customer'
          : booking.provider?.full_name || 'Provider';

        const syncResult = await syncBookingToCalendar(
          {
            ...booking,
            scheduled_date: formattedDate,
            scheduled_time: newTime,
          },
          providerName
        );

        if (syncResult.success && syncResult.action === 'updated') {
          Alert.alert(
            'Booking Rescheduled',
            'The booking and calendar event have been updated successfully.',
            [{ text: 'OK', onPress: () => onRescheduled() }]
          );
        } else if (syncResult.action === 'none') {
          Alert.alert(
            'Booking Rescheduled',
            'The booking has been rescheduled successfully.',
            [{ text: 'OK', onPress: () => onRescheduled() }]
          );
        } else {
          Alert.alert(
            'Partially Updated',
            'The booking was rescheduled, but the calendar event could not be updated. Please update it manually.',
            [{ text: 'OK', onPress: () => onRescheduled() }]
          );
        }
      } else {
        Alert.alert(
          'Booking Rescheduled',
          'The booking has been rescheduled successfully.',
          [{ text: 'OK', onPress: () => onRescheduled() }]
        );
      }

      onClose();
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      Alert.alert('Error', 'Failed to reschedule booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Reschedule Booking</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.currentInfo}>
              <Text style={styles.sectionTitle}>Current Schedule</Text>
              <View style={styles.infoRow}>
                <CalendarIcon size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{booking.scheduled_time}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select New Date</Text>
              <DatePicker
                value={newDate}
                onChange={setNewDate}
                minimumDate={new Date()}
                placeholder="Select date"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select New Time</Text>
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeSlot, newTime === time && styles.timeSlotSelected]}
                    onPress={() => setNewTime(time)}
                  >
                    <Text
                      style={[styles.timeSlotText, newTime === time && styles.timeSlotTextSelected]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {booking.calendar_event_id && (
              <View style={styles.calendarNotice}>
                <CalendarIcon size={16} color={colors.primary} />
                <Text style={styles.calendarNoticeText}>
                  Your calendar event will be automatically updated
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.button}
              disabled={loading}
            />
            <Button
              title={loading ? 'Rescheduling...' : 'Reschedule'}
              onPress={handleReschedule}
              style={styles.button}
              loading={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  currentInfo: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  timeSlotSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  timeSlotText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  timeSlotTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  calendarNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  calendarNoticeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    marginBottom: 0,
  },
});
