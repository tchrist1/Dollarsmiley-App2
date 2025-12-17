import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, Copy, Clock, Check, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

interface TimeSlot {
  id?: string;
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  day_of_week: number;
  is_enabled: boolean;
  time_slots: TimeSlot[];
}

interface WeeklyScheduleEditorProps {
  providerId: string;
  listingId?: string;
  onSaved?: () => void;
}

const DAYS_OF_WEEK = [
  { name: 'Sunday', value: 0 },
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour < 12 ? 'AM' : 'PM';
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}:00`,
    label: `${hour12}:${minute} ${period}`,
  };
});

export function WeeklyScheduleEditor({
  providerId,
  listingId,
  onSaved,
}: WeeklyScheduleEditorProps) {
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      is_enabled: false,
      time_slots: [],
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [providerId, listingId]);

  const loadSchedule = async () => {
    try {
      let query = supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_recurring', true)
        .eq('availability_type', 'Available');

      if (listingId) {
        query = query.eq('listing_id', listingId);
      } else {
        query = query.is('listing_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedSchedule = DAYS_OF_WEEK.map((day) => {
          const daySlots = data.filter((slot) => slot.day_of_week === day.value);

          return {
            day_of_week: day.value,
            is_enabled: daySlots.length > 0,
            time_slots: daySlots.map((slot) => ({
              id: slot.id,
              start_time: slot.start_time,
              end_time: slot.end_time,
            })),
          };
        });

        setSchedule(loadedSchedule);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
      Alert.alert('Error', 'Failed to load schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              is_enabled: !day.is_enabled,
              time_slots: !day.is_enabled && day.time_slots.length === 0
                ? [{ start_time: '09:00:00', end_time: '17:00:00' }]
                : day.time_slots,
            }
          : day
      )
    );
  };

  const addTimeSlot = (dayIndex: number) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              time_slots: [
                ...day.time_slots,
                { start_time: '09:00:00', end_time: '17:00:00' },
              ],
            }
          : day
      )
    );
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              time_slots: day.time_slots.filter((_, i) => i !== slotIndex),
            }
          : day
      )
    );
  };

  const updateTimeSlot = (
    dayIndex: number,
    slotIndex: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              time_slots: day.time_slots.map((slot, i) =>
                i === slotIndex ? { ...slot, [field]: value } : slot
              ),
            }
          : day
      )
    );
  };

  const copySchedule = (fromDay: number, toDay: number) => {
    const sourceDay = schedule[fromDay];
    if (!sourceDay.is_enabled || sourceDay.time_slots.length === 0) {
      Alert.alert('Cannot Copy', 'The selected day has no schedule to copy.');
      return;
    }

    setSchedule((prev) =>
      prev.map((day, index) =>
        index === toDay
          ? {
              ...day,
              is_enabled: true,
              time_slots: sourceDay.time_slots.map((slot) => ({
                start_time: slot.start_time,
                end_time: slot.end_time,
              })),
            }
          : day
      )
    );

    Alert.alert('Success', 'Schedule copied successfully!');
  };

  const saveSchedule = async () => {
    setSaving(true);

    try {
      const existingIds = schedule
        .flatMap((day) => day.time_slots)
        .filter((slot) => slot.id)
        .map((slot) => slot.id!);

      if (existingIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('provider_availability')
          .delete()
          .in('id', existingIds);

        if (deleteError) throw deleteError;
      }

      const slotsToInsert = schedule
        .filter((day) => day.is_enabled && day.time_slots.length > 0)
        .flatMap((day) =>
          day.time_slots.map((slot) => ({
            provider_id: providerId,
            listing_id: listingId || null,
            availability_type: 'Available',
            day_of_week: day.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_recurring: true,
          }))
        );

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('provider_availability')
          .insert(slotsToInsert);

        if (insertError) throw insertError;
      }

      Alert.alert('Success', 'Your schedule has been saved successfully!');
      onSaved?.();
      await loadSchedule();
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const applyToAllDays = () => {
    Alert.alert(
      'Apply to All Days',
      'Choose a day to copy to all other days:',
      DAYS_OF_WEEK.filter((_, index) => schedule[index].is_enabled).map((day, index) => ({
        text: day.name,
        onPress: () => {
          const sourceDay = schedule.find((d) => d.day_of_week === day.value);
          if (sourceDay) {
            setSchedule((prev) =>
              prev.map((d) => ({
                ...d,
                is_enabled: true,
                time_slots: sourceDay.time_slots.map((slot) => ({
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                })),
              }))
            );
            Alert.alert('Success', `${day.name}'s schedule applied to all days!`);
          }
        },
      }))
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <TouchableOpacity onPress={applyToAllDays} style={styles.copyAllButton}>
            <Copy size={16} color={colors.primary} />
            <Text style={styles.copyAllText}>Apply to All</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Set your available hours for each day of the week
        </Text>

        {DAYS_OF_WEEK.map((day, dayIndex) => {
          const daySchedule = schedule[dayIndex];

          return (
            <View key={day.value} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLeft}>
                  <Text style={styles.dayName}>{day.name}</Text>
                  {daySchedule.is_enabled && daySchedule.time_slots.length > 0 && (
                    <Text style={styles.daySlotCount}>
                      {daySchedule.time_slots.length}{' '}
                      {daySchedule.time_slots.length === 1 ? 'slot' : 'slots'}
                    </Text>
                  )}
                </View>
                <Switch
                  value={daySchedule.is_enabled}
                  onValueChange={() => toggleDay(dayIndex)}
                  trackColor={{ false: colors.border, true: colors.primary + '50' }}
                  thumbColor={daySchedule.is_enabled ? colors.primary : colors.surface}
                />
              </View>

              {daySchedule.is_enabled && (
                <View style={styles.timeSlotsContainer}>
                  {daySchedule.time_slots.map((slot, slotIndex) => (
                    <View key={slotIndex} style={styles.timeSlot}>
                      <View style={styles.timeSlotInputs}>
                        <View style={styles.timeInput}>
                          <Text style={styles.timeLabel}>Start</Text>
                          <TouchableOpacity
                            style={styles.timePicker}
                            onPress={() => {
                              Alert.alert(
                                'Select Start Time',
                                '',
                                TIME_OPTIONS.map((time) => ({
                                  text: time.label,
                                  onPress: () =>
                                    updateTimeSlot(dayIndex, slotIndex, 'start_time', time.value),
                                }))
                              );
                            }}
                          >
                            <Clock size={16} color={colors.textSecondary} />
                            <Text style={styles.timeValue}>
                              {TIME_OPTIONS.find((t) => t.value === slot.start_time)?.label ||
                                slot.start_time}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.timeInput}>
                          <Text style={styles.timeLabel}>End</Text>
                          <TouchableOpacity
                            style={styles.timePicker}
                            onPress={() => {
                              Alert.alert(
                                'Select End Time',
                                '',
                                TIME_OPTIONS.map((time) => ({
                                  text: time.label,
                                  onPress: () =>
                                    updateTimeSlot(dayIndex, slotIndex, 'end_time', time.value),
                                }))
                              );
                            }}
                          >
                            <Clock size={16} color={colors.textSecondary} />
                            <Text style={styles.timeValue}>
                              {TIME_OPTIONS.find((t) => t.value === slot.end_time)?.label ||
                                slot.end_time}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {daySchedule.time_slots.length > 1 && (
                        <TouchableOpacity
                          onPress={() => removeTimeSlot(dayIndex, slotIndex)}
                          style={styles.removeButton}
                        >
                          <Trash2 size={16} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addSlotButton}
                    onPress={() => addTimeSlot(dayIndex)}
                  >
                    <Plus size={16} color={colors.primary} />
                    <Text style={styles.addSlotText}>Add Time Slot</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={saving ? 'Saving...' : 'Save Schedule'}
          onPress={saveSchedule}
          loading={saving}
          leftIcon={<Check size={20} color={colors.white} />}
        />
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
  },
  copyAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  dayCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  daySlotCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  timeSlotsContainer: {
    marginTop: spacing.md,
  },
  timeSlot: {
    marginBottom: spacing.md,
  },
  timeSlotInputs: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  removeButton: {
    position: 'absolute',
    right: 0,
    top: 20,
    padding: spacing.sm,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  addSlotText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
});
