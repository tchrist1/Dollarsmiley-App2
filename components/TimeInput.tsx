import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TimeInputProps {
  label?: string;
  value?: string;
  onChange: (time: string) => void;
  error?: string;
}

export default function TimeInput({ label, value, onChange, error }: TimeInputProps) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (value) {
      const match = value.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (match) {
        setHours(match[1]);
        setMinutes(match[2]);
        setPeriod(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
  }, [value]);

  const handleHoursChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '' || (parseInt(cleaned) >= 1 && parseInt(cleaned) <= 12)) {
      setHours(cleaned);
      updateTime(cleaned, minutes, period);
    }
  };

  const handleMinutesChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '' || (parseInt(cleaned) >= 0 && parseInt(cleaned) <= 59)) {
      setMinutes(cleaned.padStart(2, '0').slice(0, 2));
      updateTime(hours, cleaned.padStart(2, '0').slice(0, 2), period);
    }
  };

  const togglePeriod = () => {
    const newPeriod = period === 'AM' ? 'PM' : 'AM';
    setPeriod(newPeriod);
    updateTime(hours, minutes, newPeriod);
  };

  const updateTime = (h: string, m: string, p: 'AM' | 'PM') => {
    if (h && m) {
      onChange(`${h}:${m} ${p}`);
    } else {
      onChange('');
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.timeContainer, error && styles.timeContainerError]}>
        <TextInput
          style={styles.timeInput}
          value={hours}
          onChangeText={handleHoursChange}
          placeholder="00"
          placeholderTextColor={colors.textLight}
          keyboardType="number-pad"
          maxLength={2}
        />
        <Text style={styles.separator}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={minutes}
          onChangeText={handleMinutesChange}
          placeholder="00"
          placeholderTextColor={colors.textLight}
          keyboardType="number-pad"
          maxLength={2}
        />
        <TouchableOpacity style={styles.periodButton} onPress={togglePeriod}>
          <Text style={styles.periodText}>{period}</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
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
    marginBottom: spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeContainerError: {
    borderColor: colors.error,
  },
  timeInput: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    width: 40,
    fontWeight: fontWeight.medium,
  },
  separator: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: fontWeight.bold,
    marginHorizontal: spacing.xs,
  },
  periodButton: {
    marginLeft: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  periodText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
