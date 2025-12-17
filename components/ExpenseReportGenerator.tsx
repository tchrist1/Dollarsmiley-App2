import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FileText, X, Calendar, Download, Receipt } from 'lucide-react-native';
import DatePicker from './DatePicker';
import {
  generateExpenseReport,
  getDateRanges,
  type ExpenseReportData,
} from '@/lib/expense-report';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ExpenseReportGeneratorProps {
  customerId: string;
  onGenerated?: () => void;
}

export default function ExpenseReportGenerator({
  customerId,
  onGenerated,
}: ExpenseReportGeneratorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const dateRanges = getDateRanges();

  const handleGenerate = async () => {
    let startDate: string;
    let endDate: string;

    if (selectedRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        Alert.alert('Error', 'Please select start and end dates');
        return;
      }
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      const range = dateRanges.find((r) => r.label === selectedRange);
      if (!range) {
        Alert.alert('Error', 'Please select a date range');
        return;
      }
      startDate = range.start;
      endDate = range.end;
    }

    try {
      setGenerating(true);
      await generateExpenseReport(customerId, startDate, endDate);
      setModalVisible(false);
      onGenerated?.();
      Alert.alert('Success', 'Expense report generated successfully');
    } catch (error) {
      console.error('Error generating expense report:', error);
      Alert.alert('Error', 'Failed to generate expense report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRangeSelect = (label: string) => {
    setSelectedRange(label);
    if (label !== 'custom') {
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.triggerButton} onPress={() => setModalVisible(true)}>
        <Receipt size={20} color={colors.primary} />
        <Text style={styles.triggerButtonText}>Generate Expense Report</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconContainer}>
                  <Receipt size={24} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.title}>Expense Report</Text>
                  <Text style={styles.subtitle}>Generate detailed expense report</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Predefined Ranges */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Period</Text>
                <View style={styles.rangeList}>
                  {dateRanges.map((range) => (
                    <TouchableOpacity
                      key={range.label}
                      style={[
                        styles.rangeCard,
                        selectedRange === range.label && styles.rangeCardSelected,
                      ]}
                      onPress={() => handleRangeSelect(range.label)}
                    >
                      <View style={styles.rangeCardLeft}>
                        <Calendar
                          size={18}
                          color={
                            selectedRange === range.label ? colors.primary : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.rangeLabel,
                            selectedRange === range.label && styles.rangeLabelSelected,
                          ]}
                        >
                          {range.label}
                        </Text>
                      </View>
                      {selectedRange === range.label && <View style={styles.selectedIndicator} />}
                    </TouchableOpacity>
                  ))}

                  {/* Custom Range Option */}
                  <TouchableOpacity
                    style={[
                      styles.rangeCard,
                      selectedRange === 'custom' && styles.rangeCardSelected,
                    ]}
                    onPress={() => handleRangeSelect('custom')}
                  >
                    <View style={styles.rangeCardLeft}>
                      <Calendar
                        size={18}
                        color={selectedRange === 'custom' ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.rangeLabel,
                          selectedRange === 'custom' && styles.rangeLabelSelected,
                        ]}
                      >
                        Custom Range
                      </Text>
                    </View>
                    {selectedRange === 'custom' && <View style={styles.selectedIndicator} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Custom Date Selection */}
              {selectedRange === 'custom' && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Custom Date Range</Text>

                  <View style={styles.dateInputs}>
                    <View style={styles.dateInputWrapper}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Calendar size={16} color={colors.textSecondary} />
                        <Text style={styles.dateInputText}>
                          {customStartDate
                            ? new Date(customStartDate).toLocaleDateString()
                            : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dateInputWrapper}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Calendar size={16} color={colors.textSecondary} />
                        <Text style={styles.dateInputText}>
                          {customEndDate
                            ? new Date(customEndDate).toLocaleDateString()
                            : 'Select date'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Information Card */}
              <View style={styles.infoCard}>
                <FileText size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>What's Included</Text>
                  <Text style={styles.infoText}>
                    • Detailed expense breakdown{'\n'}
                    • Tax-deductible expense tracking{'\n'}
                    • Category-wise analysis{'\n'}
                    • Monthly spending trends{'\n'}
                    • Professional PDF format
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={generating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  (!selectedRange || generating) && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={!selectedRange || generating}
              >
                {generating ? (
                  <>
                    <ActivityIndicator size="small" color={colors.white} />
                    <Text style={styles.generateButtonText}>Generating...</Text>
                  </>
                ) : (
                  <>
                    <Download size={18} color={colors.white} />
                    <Text style={styles.generateButtonText}>Generate PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DatePicker
          value={customStartDate ? new Date(customStartDate) : new Date()}
          onChange={(date) => {
            setCustomStartDate(date.toISOString().split('T')[0]);
            setShowStartDatePicker(false);
          }}
          onClose={() => setShowStartDatePicker(false)}
        />
      )}

      {showEndDatePicker && (
        <DatePicker
          value={customEndDate ? new Date(customEndDate) : new Date()}
          onChange={(date) => {
            setCustomEndDate(date.toISOString().split('T')[0]);
            setShowEndDatePicker(false);
          }}
          onClose={() => setShowEndDatePicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  triggerButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  rangeList: {
    gap: spacing.sm,
  },
  rangeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rangeCardSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  rangeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rangeLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  rangeLabelSelected: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dateInputs: {
    gap: spacing.md,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInputText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
