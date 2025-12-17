import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface AvailabilityCalendarProps {
  label?: string;
  selectedDays: string[];
  onDaysChange: (days: string[]) => void;
  error?: string;
}

const daysOfWeek = [
  { key: 'Monday', label: 'Mon' },
  { key: 'Tuesday', label: 'Tue' },
  { key: 'Wednesday', label: 'Wed' },
  { key: 'Thursday', label: 'Thu' },
  { key: 'Friday', label: 'Fri' },
  { key: 'Saturday', label: 'Sat' },
  { key: 'Sunday', label: 'Sun' },
];

const timeSlots = [
  'Morning (8am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-9pm)',
  'Flexible',
];

export function AvailabilityCalendar({
  label,
  selectedDays,
  onDaysChange,
  error,
}: AvailabilityCalendarProps) {
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['Flexible']);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      onDaysChange(selectedDays.filter((d) => d !== day));
    } else {
      onDaysChange([...selectedDays, day]);
    }
  };

  const toggleTime = (time: string) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter((t) => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const selectAllDays = () => {
    if (selectedDays.length === daysOfWeek.length) {
      onDaysChange([]);
    } else {
      onDaysChange(daysOfWeek.map((d) => d.key));
    }
  };

  const isAllSelected = selectedDays.length === daysOfWeek.length;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Days</Text>
          <TouchableOpacity onPress={selectAllDays} activeOpacity={0.7}>
            <Text style={styles.selectAllText}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.daysGrid}>
          {daysOfWeek.map((day) => {
            const isSelected = selectedDays.includes(day.key);
            return (
              <TouchableOpacity
                key={day.key}
                style={[styles.dayButton, isSelected && styles.dayButtonSelected]}
                onPress={() => toggleDay(day.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {day.label}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Check size={12} color={colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferred Time Slots</Text>
        <View style={styles.timeSlots}>
          {timeSlots.map((time) => {
            const isSelected = selectedTimes.includes(time);
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeButton, isSelected && styles.timeButtonSelected]}
                onPress={() => toggleTime(time)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.helperText}>
        Select the days and times when you're typically available to provide this service
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  selectAllText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  dayTextSelected: {
    color: colors.white,
  },
  checkmark: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlots: {
    gap: spacing.sm,
  },
  timeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  timeTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
