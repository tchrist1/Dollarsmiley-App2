import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, ScrollView } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface DatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
}

export function DatePicker({ label, value, onChange, error, minimumDate }: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleConfirm = () => {
    onChange(tempDate);
    setVisible(false);
  };

  const generateDates = () => {
    const dates = [];
    const today = minimumDate || new Date();
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.picker, error && styles.pickerError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Calendar size={20} color={colors.textSecondary} style={styles.icon} />
        <Text style={[styles.pickerText, !value && styles.placeholder]}>
          {value ? formatDate(value) : 'Select a date'}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.actionButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.actionButton}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.datesList} showsVerticalScrollIndicator={false}>
              {dates.map((date, index) => {
                const isSelected =
                  tempDate.toDateString() === date.toDateString();

                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                    onPress={() => setTempDate(date)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                      {formatDate(date)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textLight,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '70%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  datesList: {
    padding: spacing.md,
  },
  dateItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  dateItemSelected: {
    backgroundColor: colors.primary,
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  dateTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
});
