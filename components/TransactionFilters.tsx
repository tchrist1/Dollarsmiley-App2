import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Filter, X, CheckCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { TransactionFilters } from '@/lib/transactions';

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  activeFilterCount: number;
}

const TRANSACTION_TYPES = [
  { value: 'Earning', label: 'Earnings' },
  { value: 'Payout', label: 'Payouts' },
  { value: 'Refund', label: 'Refunds' },
  { value: 'Fee', label: 'Fees' },
  { value: 'Adjustment', label: 'Adjustments' },
];

const TRANSACTION_STATUSES = [
  { value: 'Completed', label: 'Completed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function TransactionFilters({
  filters,
  onFiltersChange,
  activeFilterCount,
}: TransactionFiltersProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState<TransactionFilters>(filters);

  const handleApply = () => {
    onFiltersChange(tempFilters);
    setModalVisible(false);
  };

  const handleReset = () => {
    setTempFilters({});
  };

  const handleDateRangeSelect = (range: string) => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined = now.toISOString();

    switch (range) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = new Date(weekStart.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
        break;
    }

    setTempFilters({ ...tempFilters, startDate, endDate });
  };

  return (
    <>
      <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
        <Filter size={20} color={colors.primary} />
        <Text style={styles.filterButtonText}>Filters</Text>
        {activeFilterCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Transaction Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction Type</Text>
                <View style={styles.optionsGrid}>
                  {TRANSACTION_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.option,
                        tempFilters.type === type.value && styles.optionSelected,
                      ]}
                      onPress={() =>
                        setTempFilters({
                          ...tempFilters,
                          type: tempFilters.type === type.value ? undefined : type.value as any,
                        })
                      }
                    >
                      {tempFilters.type === type.value && (
                        <CheckCircle size={16} color={colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          tempFilters.type === type.value && styles.optionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.optionsGrid}>
                  {TRANSACTION_STATUSES.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.option,
                        tempFilters.status === status.value && styles.optionSelected,
                      ]}
                      onPress={() =>
                        setTempFilters({
                          ...tempFilters,
                          status:
                            tempFilters.status === status.value ? undefined : status.value as any,
                        })
                      }
                    >
                      {tempFilters.status === status.value && (
                        <CheckCircle size={16} color={colors.primary} />
                      )}
                      <Text
                        style={[
                          styles.optionText,
                          tempFilters.status === status.value && styles.optionTextSelected,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date Range</Text>
                <View style={styles.optionsColumn}>
                  {DATE_RANGES.map((range) => (
                    <TouchableOpacity
                      key={range.value}
                      style={styles.optionRow}
                      onPress={() => handleDateRangeSelect(range.value)}
                    >
                      <Text style={styles.optionRowText}>{range.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  optionsColumn: {
    gap: spacing.sm,
  },
  optionRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  optionRowText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
