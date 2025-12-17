import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface EnhancedJobDatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  dateRange?: { start: Date; end?: Date };
  onDateRangeChange?: (range: { start: Date; end?: Date }) => void;
  allowDateRange?: boolean;
  showQuickOptions?: boolean;
  blockedDates?: Date[];
  highlightWeekends?: boolean;
  showAvailability?: boolean;
  availabilityData?: Record<string, 'available' | 'limited' | 'booked'>;
  helpText?: string;
}

export default function EnhancedJobDatePicker({
  label,
  value,
  onChange,
  error,
  minimumDate = new Date(),
  maximumDate,
  dateRange,
  onDateRangeChange,
  allowDateRange = false,
  showQuickOptions = true,
  blockedDates = [],
  highlightWeekends = true,
  showAvailability = false,
  availabilityData = {},
  helpText,
}: EnhancedJobDatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || minimumDate);
  const [selectedStart, setSelectedStart] = useState<Date | undefined>(
    dateRange?.start || value
  );
  const [selectedEnd, setSelectedEnd] = useState<Date | undefined>(dateRange?.end);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.some((blocked) => isSameDay(blocked, date));
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  };

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isInRange = (date: Date): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    return date >= selectedStart && date <= selectedEnd;
  };

  const handleDateSelect = (date: Date) => {
    if (isDateBlocked(date)) return;

    if (allowDateRange) {
      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(date);
        setSelectedEnd(undefined);
      } else {
        if (date < selectedStart) {
          setSelectedEnd(selectedStart);
          setSelectedStart(date);
        } else {
          setSelectedEnd(date);
        }
      }
    } else {
      setSelectedStart(date);
      onChange(date);
      setVisible(false);
    }
  };

  const handleConfirm = () => {
    if (allowDateRange && selectedStart) {
      onDateRangeChange?.({
        start: selectedStart,
        end: selectedEnd,
      });
    } else if (selectedStart) {
      onChange(selectedStart);
    }
    setVisible(false);
  };

  const handleQuickOption = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    handleDateSelect(date);
  };

  const previousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const generateCalendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const getAvailabilityStatus = (date: Date): 'available' | 'limited' | 'booked' | null => {
    if (!showAvailability) return null;
    const dateStr = date.toISOString().split('T')[0];
    return availabilityData[dateStr] || null;
  };

  const getAvailabilityColor = (status: string | null): string => {
    switch (status) {
      case 'available':
        return colors.success;
      case 'limited':
        return colors.warning;
      case 'booked':
        return colors.error;
      default:
        return 'transparent';
    }
  };

  const renderCalendarDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.dayCell} />;
    }

    const isSelected = selectedStart && isSameDay(date, selectedStart);
    const isEndSelected = selectedEnd && isSameDay(date, selectedEnd);
    const inRange = isInRange(date);
    const blocked = isDateBlocked(date);
    const isPast = date < minimumDate;
    const isFuture = maximumDate && date > maximumDate;
    const disabled = blocked || isPast || isFuture;
    const weekend = highlightWeekends && isWeekend(date);
    const availability = getAvailabilityStatus(date);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          weekend && styles.dayCellWeekend,
          inRange && styles.dayCellInRange,
          (isSelected || isEndSelected) && styles.dayCellSelected,
          disabled && styles.dayCellDisabled,
        ]}
        onPress={() => !disabled && handleDateSelect(date)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayText,
            weekend && styles.dayTextWeekend,
            (isSelected || isEndSelected) && styles.dayTextSelected,
            disabled && styles.dayTextDisabled,
          ]}
        >
          {date.getDate()}
        </Text>
        {availability && (
          <View
            style={[
              styles.availabilityDot,
              { backgroundColor: getAvailabilityColor(availability) },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderQuickOptions = () => {
    if (!showQuickOptions) return null;

    const options = [
      { label: 'Today', days: 0 },
      { label: 'Tomorrow', days: 1 },
      { label: 'In 3 days', days: 3 },
      { label: 'Next week', days: 7 },
      { label: 'In 2 weeks', days: 14 },
    ];

    return (
      <View style={styles.quickOptions}>
        <Text style={styles.quickOptionsTitle}>Quick Options</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickOptionsList}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.days}
                style={styles.quickOption}
                onPress={() => handleQuickOption(option.days)}
              >
                <Text style={styles.quickOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderListView = () => {
    const dates = [];
    const today = new Date(minimumDate);
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      if (!isDateBlocked(date)) {
        dates.push(date);
      }
    }

    return (
      <ScrollView style={styles.listView} showsVerticalScrollIndicator={false}>
        {dates.map((date, index) => {
          const isSelected = selectedStart && isSameDay(date, selectedStart);
          const availability = getAvailabilityStatus(date);

          return (
            <TouchableOpacity
              key={index}
              style={[styles.listItem, isSelected && styles.listItemSelected]}
              onPress={() => handleDateSelect(date)}
              activeOpacity={0.7}
            >
              <View style={styles.listItemContent}>
                <Text style={[styles.listItemText, isSelected && styles.listItemTextSelected]}>
                  {formatDate(date)}
                </Text>
                {availability && (
                  <View style={styles.availabilityBadge}>
                    <View
                      style={[
                        styles.availabilityIndicator,
                        { backgroundColor: getAvailabilityColor(availability) },
                      ]}
                    />
                    <Text style={styles.availabilityText}>
                      {availability.charAt(0).toUpperCase() + availability.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
              {isSelected && <CheckCircle2 size={20} color={colors.white} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.picker, error && styles.pickerError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <CalendarIcon size={20} color={colors.textSecondary} style={styles.icon} />
        <View style={styles.pickerContent}>
          {allowDateRange && selectedStart && selectedEnd ? (
            <Text style={styles.pickerText}>
              {formatDateShort(selectedStart)} - {formatDateShort(selectedEnd)}
            </Text>
          ) : selectedStart ? (
            <Text style={styles.pickerText}>{formatDate(selectedStart)}</Text>
          ) : (
            <Text style={[styles.pickerText, styles.placeholder]}>
              {allowDateRange ? 'Select date range' : 'Select execution date'}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {helpText && !error && (
        <View style={styles.helpTextContainer}>
          <AlertCircle size={14} color={colors.textSecondary} />
          <Text style={styles.helpText}>{helpText}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={14} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {allowDateRange ? 'Select Date Range' : 'Select Execution Date'}
              </Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {renderQuickOptions()}

            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'calendar' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('calendar')}
              >
                <CalendarIcon size={16} color={viewMode === 'calendar' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>
                  Calendar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Clock size={16} color={viewMode === 'list' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
                  List
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === 'calendar' ? (
              <>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                    <ChevronLeft size={24} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.monthYear}>
                    {currentMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                    <ChevronRight size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekDaysHeader}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.weekDayText}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {generateCalendarDays.map((date, index) => renderCalendarDay(date, index))}
                </View>

                {showAvailability && (
                  <View style={styles.legend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                      <Text style={styles.legendText}>Available</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                      <Text style={styles.legendText}>Limited</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                      <Text style={styles.legendText}>Booked</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              renderListView()
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.footerButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.footerButton, styles.confirmButton]}
                disabled={!selectedStart}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
  pickerContent: {
    flex: 1,
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  placeholder: {
    color: colors.textLight,
  },
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  helpText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    flex: 1,
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
    maxHeight: '85%',
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
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickOptions: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quickOptionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  quickOptionsList: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
  },
  quickOptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  viewToggle: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  viewToggleTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthYear: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCellWeekend: {
    backgroundColor: colors.surface,
  },
  dayCellInRange: {
    backgroundColor: colors.primary + '20',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  dayTextWeekend: {
    color: colors.textSecondary,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  dayTextDisabled: {
    color: colors.textLight,
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  listView: {
    maxHeight: 400,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  listItemSelected: {
    backgroundColor: colors.primary,
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listItemTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  availabilityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  confirmText: {
    fontSize: fontSize.md,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});
