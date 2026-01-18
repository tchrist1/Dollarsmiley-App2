import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { perfMonitor } from '@/lib/performance-monitor';
import { colors, spacing, fontSize, borderRadius, shadows } from '@/constants/theme';

/**
 * Performance Debug Panel
 * Dev-only component for displaying performance metrics and generating reports
 */
export default function PerformanceDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [report, setReport] = useState<string>('');

  if (!__DEV__) {
    return null;
  }

  const handleGenerateReport = () => {
    const reportText = perfMonitor.generateReport();
    setReport(reportText);
  };

  const handleClearMetrics = () => {
    perfMonitor.clear();
    setReport('Metrics cleared');
  };

  const handlePrintToConsole = () => {
    perfMonitor.printReport();
  };

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonText}>⚡</Text>
      </TouchableOpacity>

      {/* Debug Panel Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.panel}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Performance Metrics</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleGenerateReport}>
                <Text style={styles.actionButtonText}>Generate Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handlePrintToConsole}>
                <Text style={styles.actionButtonText}>Print to Console</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={handleClearMetrics}
              >
                <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear Metrics</Text>
              </TouchableOpacity>
            </View>

            {/* Report Display */}
            {report && (
              <ScrollView style={styles.reportContainer}>
                <Text style={styles.reportText}>{report}</Text>
              </ScrollView>
            )}

            {/* Instructions */}
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Test Scenarios:</Text>
              <Text style={styles.instructionsText}>
                1. First Load: Reload app and check metrics{'\n'}
                2. Open Filters: Tap Filters button{'\n'}
                3. Apply Filters: Select Job/Service and apply{'\n'}
                4. Clear Filters: Tap Clear All button{'\n\n'}
                Check console for detailed logs with [PERF] prefix
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: spacing.xl * 3,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.medium,
    zIndex: 999,
  },
  floatingButtonText: {
    fontSize: 28,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: colors.error,
  },
  clearButtonText: {
    color: colors.white,
  },
  reportContainer: {
    maxHeight: 300,
    backgroundColor: colors.backgroundGray,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  reportText: {
    fontSize: fontSize.xs,
    fontFamily: 'Courier',
    color: colors.text,
  },
  instructions: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundGray,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  instructionsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
});
