import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import VideoConsultationsService from '@/lib/video-consultations';
import { Calendar, Clock, Video } from 'lucide-react-native';

interface ConsultationSchedulerProps {
  productionOrderId?: string;
  customerId: string;
  providerId: string;
  onScheduled: (consultationId: string) => void;
}

export default function VideoConsultationScheduler({
  productionOrderId,
  customerId,
  providerId,
  onScheduled,
}: ConsultationSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(30);
  const [availableSlots, setAvailableSlots] = useState<{ start: Date; end: Date; available: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const slots = await VideoConsultationsService.getProviderAvailableSlots(
        providerId,
        selectedDate.toISOString(),
        duration
      );
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to load available slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedTime) {
      Alert.alert('Required', 'Please select a time slot');
      return;
    }

    setLoading(true);
    try {
      const consultation = await VideoConsultationsService.createConsultation({
        productionOrderId,
        customerId,
        providerId,
        scheduledAt: selectedTime,
        durationMinutes: duration,
      });

      Alert.alert('Success', 'Video consultation scheduled successfully!');
      onScheduled(consultation.id);
    } catch (error: any) {
      console.error('Failed to schedule consultation:', error);
      Alert.alert('Error', error.message || 'Failed to schedule consultation');
    } finally {
      setLoading(false);
    }
  };

  const getNextSevenDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const durations = [
    { minutes: 15, label: '15 min' },
    { minutes: 30, label: '30 min' },
    { minutes: 45, label: '45 min' },
    { minutes: 60, label: '1 hour' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Video size={24} color={colors.primary} />
        <Text style={styles.title}>Schedule Video Consultation</Text>
      </View>

      <Text style={styles.sectionTitle}>Duration</Text>
      <View style={styles.durationRow}>
        {durations.map((d) => (
          <TouchableOpacity
            key={d.minutes}
            style={[styles.durationChip, duration === d.minutes && styles.durationChipSelected]}
            onPress={() => setDuration(d.minutes)}
          >
            <Text
              style={[
                styles.durationText,
                duration === d.minutes && styles.durationTextSelected,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Select Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow}>
        {getNextSevenDays().map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dateCard, isSameDate(date, selectedDate) && styles.dateCardSelected]}
            onPress={() => {
              setSelectedDate(date);
              setSelectedTime(null);
            }}
          >
            <Text
              style={[
                styles.dateDay,
                isSameDate(date, selectedDate) && styles.dateDaySelected,
              ]}
            >
              {formatDate(date)}
            </Text>
            <Text
              style={[
                styles.dateNumber,
                isSameDate(date, selectedDate) && styles.dateNumberSelected,
              ]}
            >
              {date.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Available Time Slots</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading available slots...</Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {availableSlots.map((slot, index) => {
            const slotTime = slot.start.toISOString();
            const isSelected = selectedTime === slotTime;
            const isAvailable = slot.available;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlot,
                  !isAvailable && styles.timeSlotUnavailable,
                  isSelected && styles.timeSlotSelected,
                ]}
                onPress={() => isAvailable && setSelectedTime(slotTime)}
                disabled={!isAvailable}
              >
                <Clock size={16} color={isAvailable ? (isSelected ? colors.white : colors.primary) : colors.textLight} />
                <Text
                  style={[
                    styles.timeSlotText,
                    !isAvailable && styles.timeSlotTextUnavailable,
                    isSelected && styles.timeSlotTextSelected,
                  ]}
                >
                  {formatTime(slot.start)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedTime && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Consultation Summary</Text>
          <View style={styles.summaryRow}>
            <Calendar size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Clock size={16} color={colors.textSecondary} />
            <Text style={styles.summaryText}>
              {formatTime(new Date(selectedTime))} ({duration} minutes)
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.scheduleButton, (!selectedTime || loading) && styles.scheduleButtonDisabled]}
        onPress={handleSchedule}
        disabled={!selectedTime || loading}
      >
        <Text style={styles.scheduleButtonText}>
          {loading ? 'Scheduling...' : 'Schedule Consultation'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Video consultations allow you to discuss your project requirements in detail with the
          provider. You can share designs, ask questions, and ensure everyone is aligned before
          production begins.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  durationChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  durationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  durationTextSelected: {
    color: colors.white,
  },
  dateRow: {
    marginBottom: spacing.md,
  },
  dateCard: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  dateCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateDay: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateDaySelected: {
    color: colors.white,
  },
  dateNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  dateNumberSelected: {
    color: colors.white,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '30%',
  },
  timeSlotUnavailable: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  timeSlotTextUnavailable: {
    color: colors.textLight,
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  summaryCard: {
    padding: spacing.md,
    backgroundColor: colors.primaryLighter,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  summaryTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  scheduleButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  scheduleButtonDisabled: {
    backgroundColor: colors.border,
  },
  scheduleButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  infoBox: {
    padding: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});