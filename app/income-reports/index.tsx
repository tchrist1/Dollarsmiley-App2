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
} from 'react-native';
import { Calendar, Download, FileText, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import ProviderIncomeReportCard from '@/components/ProviderIncomeReportCard';
import {
  getProviderIncomeReports,
  getCurrentMonthReport,
  getCurrentQuarterReport,
  getCurrentYTDReport,
  generateMonthlyIncomeReport,
  generateQuarterlyIncomeReport,
  generateYTDIncomeReport,
  getReportLineItems,
  exportReportToCSV,
  compareReports,
  type IncomeReport,
} from '@/lib/income-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function IncomeReportsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'ytd'>('monthly');
  const [reports, setReports] = useState<IncomeReport[]>([]);
  const [currentMonth, setCurrentMonth] = useState<IncomeReport | null>(null);
  const [currentQuarter, setCurrentQuarter] = useState<IncomeReport | null>(null);
  const [currentYTD, setCurrentYTD] = useState<IncomeReport | null>(null);

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  useEffect(() => {
    if (user?.id) {
      loadReports();
    }
  }, [user, selectedYear, reportType]);

  const loadReports = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [reportsData, monthData, quarterData, ytdData] = await Promise.all([
        getProviderIncomeReports(user.id, reportType, selectedYear),
        getCurrentMonthReport(user.id),
        getCurrentQuarterReport(user.id),
        getCurrentYTDReport(user.id),
      ]);

      setReports(reportsData);
      setCurrentMonth(monthData);
      setCurrentQuarter(quarterData);
      setCurrentYTD(ytdData);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load income reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReports = async () => {
    if (!user?.id) return;

    setGenerating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const quarter = Math.ceil(month / 3);

      await Promise.all([
        generateMonthlyIncomeReport(user.id, year, month),
        generateQuarterlyIncomeReport(user.id, year, quarter),
        generateYTDIncomeReport(user.id, year),
      ]);

      await loadReports();
      Alert.alert('Success', 'Income reports generated successfully');
    } catch (error) {
      console.error('Error generating reports:', error);
      Alert.alert('Error', 'Failed to generate income reports');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report: IncomeReport) => {
    try {
      const lineItems = await getReportLineItems(report.id);
      const csvData = exportReportToCSV(report, lineItems);

      await Share.share({
        message: csvData,
        title: `Income Report - ${report.year}`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const getComparison = (report: IncomeReport, index: number): number => {
    if (index >= reports.length - 1) return 0;
    const previous = reports[index + 1];
    const comparison = compareReports(report, previous);
    return comparison.netPercentage;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading income reports...</Text>
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
        <Text style={styles.title}>Income Reports</Text>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateReports}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Download size={16} color={colors.white} />
              <Text style={styles.generateButtonText}>Generate</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Current Period Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Current Period</Text>
        <View style={styles.summaryGrid}>
          {currentMonth && (
            <View style={styles.summaryCard}>
              <FileText size={20} color={colors.primary} />
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>
                ${currentMonth.net_income.toLocaleString()}
              </Text>
            </View>
          )}
          {currentQuarter && (
            <View style={styles.summaryCard}>
              <Calendar size={20} color={colors.success} />
              <Text style={styles.summaryLabel}>This Quarter</Text>
              <Text style={styles.summaryValue}>
                ${currentQuarter.net_income.toLocaleString()}
              </Text>
            </View>
          )}
          {currentYTD && (
            <View style={styles.summaryCard}>
              <TrendingUp size={20} color={colors.secondary} />
              <Text style={styles.summaryLabel}>Year to Date</Text>
              <Text style={styles.summaryValue}>
                ${currentYTD.net_income.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Year Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.yearSelector}
        >
          {availableYears.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearButton,
                selectedYear === year && styles.yearButtonActive,
              ]}
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
        </ScrollView>

        {/* Report Type Selector */}
        <View style={styles.typeSelector}>
          {(['monthly', 'quarterly', 'ytd'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                reportType === type && styles.typeButtonActive,
              ]}
              onPress={() => setReportType(type)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  reportType === type && styles.typeButtonTextActive,
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reports List */}
      <View style={styles.reportsList}>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No reports available</Text>
            <Text style={styles.emptySubtext}>
              Generate reports to see your income history
            </Text>
          </View>
        ) : (
          reports.map((report, index) => (
            <ProviderIncomeReportCard
              key={report.id}
              report={report}
              onDownload={() => handleDownloadReport(report)}
              showComparison={index < reports.length - 1}
              comparisonChange={getComparison(report, index)}
            />
          ))
        )}
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
    paddingBottom: spacing.xxl,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  generateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  summarySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filters: {
    marginBottom: spacing.lg,
  },
  yearSelector: {
    marginBottom: spacing.md,
  },
  yearButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.xs,
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
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  reportsList: {
    gap: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
