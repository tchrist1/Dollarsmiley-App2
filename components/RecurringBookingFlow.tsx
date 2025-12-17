import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Calendar,
  Clock,
  Repeat,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  X,
} from 'lucide-react-native';
import DatePicker from './DatePicker';
import Button from './Button';
import {
  type RecurrencePattern,
  type RecurrenceFrequency,
  type RecurrenceEndType,
  generateRecurringBookingPreview,
  createRecurringBooking,
  getFrequencyLabel,
  formatRecurrencePattern,
  getDayName,
  getShortDayName,
} from '@/lib/recurring-bookings';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RecurringBookingFlowProps {
  customerId: string;
  providerId: string;
  listingId: string;
  serviceTitle: string;
  servicePrice: number;
  durationMinutes: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

type Step = 'frequency' | 'schedule' | 'duration' | 'preview';

export default function RecurringBookingFlow({
  customerId,
  providerId,
  listingId,
  serviceTitle,
  servicePrice,
  durationMinutes,
  onComplete,
  onCancel,
}: RecurringBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>('frequency');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('weekly');
  const [interval, setInterval] = useState(1);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [endType, setEndType] = useState<RecurrenceEndType>('occurrences');
  const [endDate, setEndDate] = useState('');
  const [occurrences, setOccurrences] = useState(10);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Set default start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setStartDate(tomorrow.toISOString().split('T')[0]);

    // Set default end date to 3 months from now
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    setEndDate(threeMonths.toISOString().split('T')[0]);

    // Set default day based on start date
    setDayOfMonth(tomorrow.getDate());
    setSelectedDays([tomorrow.getDay()]);
  }, []);

  const buildPattern = (): RecurrencePattern => {
    return {
      frequency,
      interval,
      days_of_week: frequency === 'weekly' || frequency === 'biweekly' ? selectedDays : undefined,
      day_of_month: frequency === 'monthly' ? dayOfMonth : undefined,
      end_type: endType,
      end_date: endType === 'date' ? endDate : undefined,
      occurrences: endType === 'occurrences' ? occurrences : undefined,
    };
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const pattern = buildPattern();
      const previewData = await generateRecurringBookingPreview(
        startDate,
        startTime,
        pattern,
        providerId,
        durationMinutes,
        servicePrice
      );
      setPreview(previewData);
    } catch (error) {
      console.error('Error loading preview:', error);
      Alert.alert('Error', 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 'frequency') {
      setCurrentStep('schedule');
    } else if (currentStep === 'schedule') {
      setCurrentStep('duration');
    } else if (currentStep === 'duration') {
      await loadPreview();
      setCurrentStep('preview');
    }
  };

  const handleBack = () => {
    if (currentStep === 'schedule') {
      setCurrentStep('frequency');
    } else if (currentStep === 'duration') {
      setCurrentStep('schedule');
    } else if (currentStep === 'preview') {
      setCurrentStep('duration');
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const pattern = buildPattern();
      const result = await createRecurringBooking(customerId, {
        provider_id: providerId,
        listing_id: listingId,
        service_title: serviceTitle,
        service_price: servicePrice,
        start_date: startDate,
        start_time: startTime,
        duration_minutes: durationMinutes,
        recurrence_pattern: pattern,
      });

      if (result) {
        Alert.alert(
          'Success',
          'Recurring booking created successfully! Future bookings will be automatically created.',
          [{ text: 'OK', onPress: onComplete }]
        );
      } else {
        Alert.alert('Error', 'Failed to create recurring booking');
      }
    } catch (error) {
      console.error('Error creating recurring booking:', error);
      Alert.alert('Error', 'Failed to create recurring booking');
    } finally {
      setCreating(false);
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const renderFrequencyStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How often?</Text>
      <Text style={styles.stepDescription}>Choose how frequently this booking should repeat</Text>

      <View style={styles.optionsGrid}>
        {(['daily', 'weekly', 'biweekly', 'monthly'] as RecurrenceFrequency[]).map(freq => (
          <TouchableOpacity
            key={freq}
            style={[
              styles.optionCard,
              frequency === freq && styles.optionCardActive,
            ]}
            onPress={() => setFrequency(freq)}
          >
            <Repeat
              size={24}
              color={frequency === freq ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionLabel,
                frequency === freq && styles.optionLabelActive,
              ]}
            >
              {getFrequencyLabel(freq)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {frequency !== 'daily' && (
        <View style={styles.intervalSection}>
          <Text style={styles.sectionLabel}>Repeat every:</Text>
          <View style={styles.intervalControls}>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setInterval(Math.max(1, interval - 1))}
            >
              <Text style={styles.intervalButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.intervalValue}>{interval}</Text>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setInterval(Math.min(12, interval + 1))}
            >
              <Text style={styles.intervalButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.intervalLabel}>
              {frequency === 'weekly' ? 'week(s)' : frequency === 'biweekly' ? 'two-week period(s)' : 'month(s)'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderScheduleStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When does it start?</Text>
      <Text style={styles.stepDescription}>Set the start date and time</Text>

      <View style={styles.dateTimeSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Date</Text>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            minimumDate={new Date().toISOString().split('T')[0]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Start Time</Text>
          <View style={styles.timeInput}>
            <Clock size={18} color={colors.textSecondary} />
            <Text style={styles.timeText}>{startTime}</Text>
          </View>
        </View>
      </View>

      {(frequency === 'weekly' || frequency === 'biweekly') && (
        <View style={styles.daysSection}>
          <Text style={styles.sectionLabel}>Repeat on:</Text>
          <View style={styles.daysGrid}>
            {[0, 1, 2, 3, 4, 5, 6].map(day => (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day) && styles.dayButtonActive,
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDays.includes(day) && styles.dayButtonTextActive,
                  ]}
                >
                  {getShortDayName(day)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {frequency === 'monthly' && (
        <View style={styles.dayOfMonthSection}>
          <Text style={styles.sectionLabel}>Day of month:</Text>
          <View style={styles.intervalControls}>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setDayOfMonth(Math.max(1, dayOfMonth - 1))}
            >
              <Text style={styles.intervalButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.intervalValue}>{dayOfMonth}</Text>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setDayOfMonth(Math.min(31, dayOfMonth + 1))}
            >
              <Text style={styles.intervalButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderDurationStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>How long should it continue?</Text>
      <Text style={styles.stepDescription}>Choose when the recurring booking should end</Text>

      <View style={styles.endTypeSection}>
        <TouchableOpacity
          style={[
            styles.endTypeCard,
            endType === 'occurrences' && styles.endTypeCardActive,
          ]}
          onPress={() => setEndType('occurrences')}
        >
          <Text
            style={[
              styles.endTypeLabel,
              endType === 'occurrences' && styles.endTypeLabelActive,
            ]}
          >
            After number of bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.endTypeCard,
            endType === 'date' && styles.endTypeCardActive,
          ]}
          onPress={() => setEndType('date')}
        >
          <Text
            style={[
              styles.endTypeLabel,
              endType === 'date' && styles.endTypeLabelActive,
            ]}
          >
            On specific date
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.endTypeCard,
            endType === 'never' && styles.endTypeCardActive,
          ]}
          onPress={() => setEndType('never')}
        >
          <Text
            style={[
              styles.endTypeLabel,
              endType === 'never' && styles.endTypeLabelActive,
            ]}
          >
            Continue indefinitely
          </Text>
        </TouchableOpacity>
      </View>

      {endType === 'occurrences' && (
        <View style={styles.occurrencesSection}>
          <Text style={styles.sectionLabel}>Number of bookings:</Text>
          <View style={styles.intervalControls}>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setOccurrences(Math.max(1, occurrences - 1))}
            >
              <Text style={styles.intervalButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.intervalValue}>{occurrences}</Text>
            <TouchableOpacity
              style={styles.intervalButton}
              onPress={() => setOccurrences(Math.min(100, occurrences + 1))}
            >
              <Text style={styles.intervalButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {endType === 'date' && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>End Date</Text>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            minimumDate={startDate}
          />
        </View>
      )}
    </View>
  );

  const renderPreviewStep = () => {
    if (loadingPreview) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Generating preview...</Text>
        </View>
      );
    }

    if (!preview) return null;

    const conflictCount = preview.occurrences.filter((o: any) => o.hasConflict).length;

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Review & Confirm</Text>
        <Text style={styles.stepDescription}>Preview of your recurring bookings</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{serviceTitle}</Text>
          <Text style={styles.summaryPattern}>{formatRecurrencePattern(buildPattern())}</Text>

          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{preview.totalOccurrences}</Text>
              <Text style={styles.summaryStatLabel}>Bookings</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: colors.success }]}>
                ${preview.estimatedCost.toFixed(2)}
              </Text>
              <Text style={styles.summaryStatLabel}>Total Cost</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, { color: conflictCount > 0 ? colors.error : colors.success }]}>
                {conflictCount}
              </Text>
              <Text style={styles.summaryStatLabel}>Conflicts</Text>
            </View>
          </View>
        </View>

        {conflictCount > 0 && (
          <View style={styles.warningCard}>
            <AlertCircle size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              {conflictCount} booking{conflictCount > 1 ? 's have' : ' has'} conflicts. These will need
              to be rescheduled.
            </Text>
          </View>
        )}

        <View style={styles.occurrencesList}>
          <Text style={styles.occurrencesTitle}>Upcoming Bookings</Text>
          <ScrollView style={styles.occurrencesScroll} showsVerticalScrollIndicator={false}>
            {preview.occurrences.slice(0, 10).map((occurrence: any, index: number) => (
              <View
                key={index}
                style={[
                  styles.occurrenceItem,
                  occurrence.hasConflict && styles.occurrenceItemConflict,
                ]}
              >
                <View style={styles.occurrenceInfo}>
                  <Text style={styles.occurrenceDate}>
                    {new Date(occurrence.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.occurrenceTime}>{occurrence.time}</Text>
                </View>
                {occurrence.hasConflict ? (
                  <View style={styles.conflictBadge}>
                    <X size={14} color={colors.error} />
                    <Text style={styles.conflictText}>{occurrence.conflictReason}</Text>
                  </View>
                ) : (
                  <CheckCircle size={20} color={colors.success} />
                )}
              </View>
            ))}
          </ScrollView>
          {preview.occurrences.length > 10 && (
            <Text style={styles.moreOccurrences}>
              + {preview.occurrences.length - 10} more bookings
            </Text>
          )}
        </View>
      </View>
    );
  };

  const canProceed = () => {
    if (currentStep === 'frequency') {
      return true;
    }
    if (currentStep === 'schedule') {
      if (frequency === 'weekly' || frequency === 'biweekly') {
        return selectedDays.length > 0;
      }
      return startDate !== '' && startTime !== '';
    }
    if (currentStep === 'duration') {
      if (endType === 'date') {
        return endDate !== '';
      }
      if (endType === 'occurrences') {
        return occurrences > 0;
      }
      return true;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.stepIndicator}>
          {['frequency', 'schedule', 'duration', 'preview'].map((step, index) => (
            <View key={step} style={styles.stepIndicatorItem}>
              <View
                style={[
                  styles.stepDot,
                  currentStep === step && styles.stepDotActive,
                  ['frequency', 'schedule', 'duration', 'preview'].indexOf(currentStep) > index &&
                    styles.stepDotCompleted,
                ]}
              />
              {index < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    ['frequency', 'schedule', 'duration', 'preview'].indexOf(currentStep) > index &&
                      styles.stepLineCompleted,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 'frequency' && renderFrequencyStep()}
        {currentStep === 'schedule' && renderScheduleStep()}
        {currentStep === 'duration' && renderDurationStep()}
        {currentStep === 'preview' && renderPreviewStep()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep !== 'frequency' && (
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            style={styles.footerButton}
          />
        )}

        {currentStep !== 'preview' ? (
          <Button
            title="Next"
            onPress={handleNext}
            disabled={!canProceed()}
            style={styles.footerButton}
          />
        ) : (
          <Button
            title="Create Recurring Booking"
            onPress={handleCreate}
            loading={creating}
            disabled={creating}
            style={styles.footerButton}
          />
        )}
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  optionCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  optionLabelActive: {
    color: colors.primary,
  },
  intervalSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  intervalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  intervalButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalButtonText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  intervalValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  intervalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  dateTimeSection: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  timeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'monospace',
  },
  daysSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: colors.white,
  },
  dayOfMonthSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  endTypeSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  endTypeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  endTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  endTypeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  endTypeLabelActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  occurrencesSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryPattern: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  summaryStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  occurrencesList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  occurrencesTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  occurrencesScroll: {
    maxHeight: 300,
  },
  occurrenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  occurrenceItemConflict: {
    backgroundColor: colors.error + '10',
  },
  occurrenceInfo: {
    flex: 1,
  },
  occurrenceDate: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  occurrenceTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  conflictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  conflictText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  moreOccurrences: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
