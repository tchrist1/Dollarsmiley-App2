import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal } from 'react-native';
import { ChevronDown, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface TimeSlotPickerProps {
  label?: string;
  value?: string;
  onChange: (time: string) => void;
  error?: string;
}

// Generate time slots from 12:00 AM to 11:30 PM in 30-minute increments
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      slots.push(`${displayHour}:${displayMinute} ${period}`);
    }
  }

  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const TimeSlotItem = memo(({
  slot,
  isSelected,
  onPress
}: {
  slot: string;
  isSelected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[
      styles.timeSlotItem,
      isSelected && styles.timeSlotItemSelected,
    ]}
    onPress={onPress}
  >
    <Clock
      size={18}
      color={isSelected ? colors.primary : colors.textSecondary}
    />
    <Text
      style={[
        styles.timeSlotText,
        isSelected && styles.timeSlotTextSelected,
      ]}
    >
      {slot}
    </Text>
  </TouchableOpacity>
));

TimeSlotItem.displayName = 'TimeSlotItem';

export default function TimeSlotPicker({ label, value, onChange, error }: TimeSlotPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSelect = (time: string) => {
    onChange(time);
    setShowModal(false);
  };

  const selectedIndex = useMemo(() => {
    return TIME_SLOTS.findIndex(slot => slot === value);
  }, [value]);

  useEffect(() => {
    if (showModal && selectedIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 300);
    }
  }, [showModal, selectedIndex]);

  const renderItem = ({ item }: { item: string }) => (
    <TimeSlotItem
      slot={item}
      isSelected={value === item}
      onPress={() => handleSelect(item)}
    />
  );

  const getItemLayout = (_: any, index: number) => ({
    length: 56,
    offset: 56 * index,
    index,
  });

  const keyExtractor = (item: string) => item;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.picker, error && styles.pickerError]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Clock size={20} color={colors.textSecondary} />
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
          {value || 'Select a time slot'}
        </Text>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Slot</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.closeButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatListRef}
              data={TIME_SLOTS}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              style={styles.timeSlotsList}
              contentContainerStyle={styles.timeSlotsContent}
              showsVerticalScrollIndicator={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              onScrollToIndexFailed={() => {}}
            />
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
    gap: spacing.sm,
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
  pickerText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textLight,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  timeSlotsList: {
    flex: 1,
  },
  timeSlotsContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  timeSlotItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  timeSlotText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  timeSlotTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
