import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Download,
  X,
  FileText,
  File,
  FileJson,
  CheckCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import type { ExportFormat, ExportOptions } from '@/lib/export-transactions';
import { exportTransactions, estimateExportSize, formatExportSize } from '@/lib/export-transactions';

export interface ExportMenuProps {
  walletId: string;
  transactionCount: number;
  filters?: any;
  onExportComplete?: () => void;
}

export { ExportMenu };

export default function ExportMenu({
  walletId,
  transactionCount,
  filters,
  onExportComplete,
}: ExportMenuProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [includeStats, setIncludeStats] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [exporting, setExporting] = useState(false);

  const formats: Array<{
    value: ExportFormat;
    label: string;
    description: string;
    icon: any;
  }> = [
    {
      value: 'csv',
      label: 'CSV (Excel)',
      description: 'Spreadsheet format, opens in Excel/Numbers',
      icon: FileText,
    },
    {
      value: 'pdf',
      label: 'PDF Report',
      description: 'Formatted report with statistics',
      icon: File,
    },
    {
      value: 'json',
      label: 'JSON Data',
      description: 'Raw data format for developers',
      icon: FileJson,
    },
  ];

  const handleExport = async () => {
    if (transactionCount === 0) {
      Alert.alert('No Transactions', 'There are no transactions to export.');
      return;
    }

    try {
      setExporting(true);

      const options: ExportOptions = {
        format: selectedFormat,
        includeStats,
        includeMetadata: selectedFormat === 'json' ? includeMetadata : false,
      };

      await exportTransactions(walletId, selectedFormat, filters, options);

      setModalVisible(false);
      onExportComplete?.();

      Alert.alert(
        'Export Successful',
        `Your transactions have been exported to ${selectedFormat.toUpperCase()}.`
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const estimatedSize = estimateExportSize(transactionCount, selectedFormat);

  return (
    <>
      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => setModalVisible(true)}
        disabled={transactionCount === 0}
      >
        <Download size={18} color={transactionCount > 0 ? colors.primary : colors.textSecondary} />
        <Text
          style={[
            styles.exportButtonText,
            transactionCount === 0 && styles.exportButtonTextDisabled,
          ]}
        >
          Export
        </Text>
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
              <View>
                <Text style={styles.modalTitle}>Export Transactions</Text>
                <Text style={styles.modalSubtitle}>
                  {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Export Format</Text>
                <View style={styles.formatList}>
                  {formats.map((format) => {
                    const Icon = format.icon;
                    const isSelected = selectedFormat === format.value;

                    return (
                      <TouchableOpacity
                        key={format.value}
                        style={[styles.formatCard, isSelected && styles.formatCardSelected]}
                        onPress={() => setSelectedFormat(format.value)}
                      >
                        <View style={styles.formatCardLeft}>
                          <View
                            style={[
                              styles.formatIconContainer,
                              isSelected && styles.formatIconContainerSelected,
                            ]}
                          >
                            <Icon
                              size={20}
                              color={isSelected ? colors.primary : colors.textSecondary}
                            />
                          </View>
                          <View style={styles.formatInfo}>
                            <Text style={styles.formatLabel}>{format.label}</Text>
                            <Text style={styles.formatDescription}>{format.description}</Text>
                          </View>
                        </View>
                        {isSelected && <CheckCircle size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Export Options</Text>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setIncludeStats(!includeStats)}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.optionLabel}>Include Statistics</Text>
                    <Text style={styles.optionDescription}>
                      Add summary of earnings, payouts, and fees
                    </Text>
                  </View>
                  <View style={[styles.checkbox, includeStats && styles.checkboxChecked]}>
                    {includeStats && <CheckCircle size={16} color={colors.white} />}
                  </View>
                </TouchableOpacity>

                {selectedFormat === 'json' && (
                  <TouchableOpacity
                    style={styles.optionRow}
                    onPress={() => setIncludeMetadata(!includeMetadata)}
                  >
                    <View style={styles.optionLeft}>
                      <Text style={styles.optionLabel}>Include Metadata</Text>
                      <Text style={styles.optionDescription}>
                        Add additional transaction details
                      </Text>
                    </View>
                    <View style={[styles.checkbox, includeMetadata && styles.checkboxChecked]}>
                      {includeMetadata && <CheckCircle size={16} color={colors.white} />}
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Estimated Size</Text>
                <Text style={styles.infoValue}>{formatExportSize(estimatedSize)}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={exporting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportActionButton, exporting && styles.exportActionButtonDisabled]}
                onPress={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <ActivityIndicator color={colors.white} size="small" />
                    <Text style={styles.exportActionButtonText}>Exporting...</Text>
                  </>
                ) : (
                  <>
                    <Download size={18} color={colors.white} />
                    <Text style={styles.exportActionButtonText}>
                      Export {selectedFormat.toUpperCase()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  exportButton: {
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
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  exportButtonTextDisabled: {
    color: colors.textSecondary,
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  formatList: {
    gap: spacing.sm,
  },
  formatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  formatCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  formatCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  formatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatIconContainerSelected: {
    backgroundColor: colors.primary + '20',
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  formatDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  optionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalFooter: {
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
  exportActionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportActionButtonDisabled: {
    opacity: 0.6,
  },
  exportActionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
