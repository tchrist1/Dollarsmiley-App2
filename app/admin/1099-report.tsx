import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Printer,
} from 'lucide-react-native';
import Provider1099SummaryCard from '@/components/Provider1099Summary';
import {
  calculateAll1099sForYear,
  getCurrentTaxYear,
  getAvailableTaxYears,
  getDaysUntilDeadline,
  getFilingDeadline,
  hasFilingDeadlinePassed,
  get1099FilingChecklist,
  export1099DataToCSV,
  formatCurrency,
  type Tax1099Report,
  type Provider1099Summary,
} from '@/lib/1099-nec-calculation';
import {
  generateAndShare1099,
  generateBulk1099s,
} from '@/lib/1099-nec-pdf-generator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function Admin1099ReportScreen() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [generatingPDFs, setGeneratingPDFs] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentTaxYear());
  const [report, setReport] = useState<Tax1099Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'needs_w9' | 'below'>('all');

  const availableYears = getAvailableTaxYears();

  useEffect(() => {
    loadReport();
  }, [selectedYear]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await calculateAll1099sForYear(selectedYear);
      setReport(data);
    } catch (error) {
      console.error('Error loading 1099 report:', error);
      Alert.alert('Error', 'Failed to load 1099 report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;

    setExporting(true);
    try {
      const csv = await export1099DataToCSV(selectedYear);
      const fileName = `1099_report_${selectedYear}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csv);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `1099-NEC Report ${selectedYear}`,
        });
        } else {
          Alert.alert('Success', 'Report saved to device');
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateBulkPDFs = async () => {
    if (!report) return;

    const readyProviders = report.providers.filter((p) => p.is_ready_for_filing);

    if (readyProviders.length === 0) {
      Alert.alert('No Providers Ready', 'No providers are ready for 1099 generation');
      return;
    }

    Alert.alert(
      'Generate 1099 Forms',
      `Generate 1099-NEC forms for ${readyProviders.length} provider(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGeneratingPDFs(true);
            try {
              const result = await generateBulk1099s(readyProviders);

              if (result.success) {
                Alert.alert(
                  'Success',
                  `Generated ${result.generated} form(s).\n${result.failed > 0 ? `Failed: ${result.failed}` : ''}`
                );
              } else {
                Alert.alert('Error', 'Failed to generate any forms');
              }
            } catch (error) {
              console.error('Error generating bulk 1099s:', error);
              Alert.alert('Error', 'Failed to generate 1099 forms');
            } finally {
              setGeneratingPDFs(false);
            }
          },
        },
      ]
    );
  };

  const handleGenerate1099 = async (provider: Provider1099Summary) => {
    try {
      await generateAndShare1099(provider);
    } catch (error) {
      console.error('Error generating 1099:', error);
      Alert.alert('Error', 'Failed to generate 1099 form');
    }
  };

  const getFilteredProviders = () => {
    if (!report) return [];

    switch (filterStatus) {
      case 'ready':
        return report.providers.filter((p) => p.is_ready_for_filing);
      case 'needs_w9':
        return report.providers.filter((p) => p.meets_threshold && !p.has_w9_on_file);
      case 'below':
        return report.providers.filter((p) => !p.meets_threshold);
      default:
        return report.providers;
    }
  };

  const daysUntilDeadline = getDaysUntilDeadline(selectedYear);
  const deadlinePassed = hasFilingDeadlinePassed(selectedYear);
  const checklist = report ? get1099FilingChecklist(report) : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Calculating 1099-NEC report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load report</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <FileText size={32} color={colors.primary} />
        <Text style={styles.title}>1099-NEC Report</Text>
        <Text style={styles.subtitle}>Tax Year {selectedYear}</Text>
      </View>

      {/* Year Selector */}
      <View style={styles.yearSelector}>
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text
              style={[
                styles.yearButtonText,
                selectedYear === year && styles.yearButtonTextActive,
              ]}
            >
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Deadline Warning */}
      {!deadlinePassed && daysUntilDeadline <= 30 && (
        <View style={styles.deadlineWarning}>
          <Clock size={20} color={colors.warning} />
          <View style={styles.deadlineContent}>
            <Text style={styles.deadlineTitle}>Filing Deadline Approaching</Text>
            <Text style={styles.deadlineText}>
              {daysUntilDeadline} days until January 31, {selectedYear + 1}
            </Text>
          </View>
        </View>
      )}

      {deadlinePassed && (
        <View style={styles.deadlineError}>
          <AlertCircle size={20} color={colors.error} />
          <View style={styles.deadlineContent}>
            <Text style={styles.deadlineTitle}>Filing Deadline Passed</Text>
            <Text style={styles.deadlineText}>
              Deadline was {getFilingDeadline(selectedYear).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Users size={24} color={colors.primary} />
          <Text style={styles.summaryValue}>{report.total_providers}</Text>
          <Text style={styles.summaryLabel}>Total Providers</Text>
        </View>

        <View style={styles.summaryCard}>
          <CheckCircle size={24} color={colors.success} />
          <Text style={styles.summaryValue}>{report.providers_meeting_threshold}</Text>
          <Text style={styles.summaryLabel}>Meet $600</Text>
        </View>

        <View style={styles.summaryCard}>
          <FileText size={24} color={colors.secondary} />
          <Text style={styles.summaryValue}>{report.providers_with_w9}</Text>
          <Text style={styles.summaryLabel}>Have W-9</Text>
        </View>

        <View style={styles.summaryCard}>
          <TrendingUp size={24} color={colors.warning} />
          <Text style={styles.summaryValue}>{report.providers_ready_for_filing}</Text>
          <Text style={styles.summaryLabel}>Ready to File</Text>
        </View>
      </View>

      {/* Total Amount */}
      <View style={styles.totalCard}>
        <DollarSign size={32} color={colors.success} />
        <View style={styles.totalContent}>
          <Text style={styles.totalLabel}>Total Reportable Amount</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(report.total_reportable_amount)}
          </Text>
        </View>
      </View>

      {/* Filing Checklist */}
      <View style={styles.checklistCard}>
        <Text style={styles.checklistTitle}>Filing Checklist</Text>
        {checklist.map((item, index) => (
          <View key={index} style={styles.checklistItem}>
            {item.completed ? (
              <CheckCircle size={20} color={colors.success} />
            ) : (
              <Clock size={20} color={colors.textSecondary} />
            )}
            <View style={styles.checklistContent}>
              <Text style={styles.checklistItemText}>{item.item}</Text>
              {item.details && (
                <Text style={styles.checklistDetails}>{item.details}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.exportButton,
            exporting && styles.actionButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.actionButtonText}>Exporting...</Text>
            </>
          ) : (
            <>
              <Download size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Export CSV</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.pdfButton,
            (generatingPDFs || report?.providers_ready_for_filing === 0) &&
              styles.actionButtonDisabled,
          ]}
          onPress={handleGenerateBulkPDFs}
          disabled={generatingPDFs || report?.providers_ready_for_filing === 0}
        >
          {generatingPDFs ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.actionButtonText}>Generating...</Text>
            </>
          ) : (
            <>
              <Printer size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>
                Generate PDFs ({report?.providers_ready_for_filing || 0})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'all' && styles.filterTabTextActive,
            ]}
          >
            All ({report.providers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'ready' && styles.filterTabActive]}
          onPress={() => setFilterStatus('ready')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'ready' && styles.filterTabTextActive,
            ]}
          >
            Ready ({report.providers_ready_for_filing})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'needs_w9' && styles.filterTabActive]}
          onPress={() => setFilterStatus('needs_w9')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'needs_w9' && styles.filterTabTextActive,
            ]}
          >
            Needs W-9 (
            {report.providers.filter((p) => p.meets_threshold && !p.has_w9_on_file).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filterStatus === 'below' && styles.filterTabActive]}
          onPress={() => setFilterStatus('below')}
        >
          <Text
            style={[
              styles.filterTabText,
              filterStatus === 'below' && styles.filterTabTextActive,
            ]}
          >
            Below Threshold (
            {report.providers.filter((p) => !p.meets_threshold).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Provider List */}
      <View style={styles.providerList}>
        {getFilteredProviders().map((provider) => (
          <Provider1099SummaryCard
            key={provider.provider_id}
            summary={provider}
            onPress={
              provider.is_ready_for_filing
                ? () => handleGenerate1099(provider)
                : undefined
            }
          />
        ))}

        {getFilteredProviders().length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No providers match this filter</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <AlertCircle size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          1099-NEC forms must be filed with the IRS and furnished to recipients by January
          31. Ensure all providers meeting the $600 threshold have submitted W-9 forms.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    marginTop: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  yearSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  yearButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  yearButtonTextActive: {
    color: colors.white,
  },
  deadlineWarning: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: spacing.lg,
  },
  deadlineError: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginBottom: spacing.lg,
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  deadlineText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'center',
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    marginBottom: spacing.lg,
  },
  totalContent: {
    flex: 1,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  totalValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  checklistCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  checklistTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checklistContent: {
    flex: 1,
  },
  checklistItemText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  checklistDetails: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  exportButton: {
    backgroundColor: colors.primary,
  },
  pdfButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  exportButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  providerList: {
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
