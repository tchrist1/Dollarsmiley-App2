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
  Dimensions,
} from 'react-native';
import { Calendar, Download, ShoppingBag, TrendingUp, PieChart as PieChartIcon } from 'lucide-react-native';
import { PieChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import CustomerExpenseReportCard from '@/components/CustomerExpenseReportCard';
import {
  getCustomerExpenseReports,
  getCurrentMonthExpenseReport,
  getCurrentQuarterExpenseReport,
  getCurrentYTDExpenseReport,
  generateMonthlyExpenseReport,
  generateQuarterlyExpenseReport,
  generateYTDExpenseReport,
  getExpenseLineItems,
  getSpendingByCategory,
  exportExpenseReportToCSV,
  compareExpenseReports,
  formatCurrency,
  type CustomerExpenseReport,
  type SpendingCategory,
} from '@/lib/customer-expense-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function ExpenseReportsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<'monthly' | 'quarterly' | 'ytd'>('monthly');
  const [reports, setReports] = useState<CustomerExpenseReport[]>([]);
  const [currentMonth, setCurrentMonth] = useState<CustomerExpenseReport | null>(null);
  const [currentQuarter, setCurrentQuarter] = useState<CustomerExpenseReport | null>(null);
  const [currentYTD, setCurrentYTD] = useState<CustomerExpenseReport | null>(null);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);

  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (user?.id) {
      loadReports();
    }
  }, [user, selectedYear, reportType]);

  const loadReports = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [reportsData, monthData, quarterData, ytdData, categoryData] = await Promise.all([
        getCustomerExpenseReports(user.id, reportType, selectedYear),
        getCurrentMonthExpenseReport(user.id),
        getCurrentQuarterExpenseReport(user.id),
        getCurrentYTDExpenseReport(user.id),
        getSpendingByCategory(user.id, selectedYear),
      ]);

      setReports(reportsData);
      setCurrentMonth(monthData);
      setCurrentQuarter(quarterData);
      setCurrentYTD(ytdData);
      setCategories(categoryData);
    } catch (error) {
      console.error('Error loading expense reports:', error);
      Alert.alert('Error', 'Failed to load expense reports');
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
        generateMonthlyExpenseReport(user.id, year, month),
        generateQuarterlyExpenseReport(user.id, year, quarter),
        generateYTDExpenseReport(user.id, year),
      ]);

      await loadReports();
      Alert.alert('Success', 'Expense reports generated successfully');
    } catch (error) {
      console.error('Error generating reports:', error);
      Alert.alert('Error', 'Failed to generate expense reports');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report: CustomerExpenseReport) => {
    try {
      const lineItems = await getExpenseLineItems(report.id);
      const csvData = exportExpenseReportToCSV(report, lineItems);

      await Share.share({
        message: csvData,
        title: `Expense Report - ${report.year}`,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report');
    }
  };

  const getComparison = (report: CustomerExpenseReport, index: number): number => {
    if (index >= reports.length - 1) return 0;
    const previous = reports[index + 1];
    const comparison = compareExpenseReports(report, previous);
    return comparison.spendingPercentage;
  };

  const getCategoryChartData = () => {
    const categoryColors = [
      colors.primary,
      colors.success,
      colors.secondary,
      colors.error,
      '#FF9500',
      '#5856D6',
    ];

    return categories.slice(0, 6).map((category, index) => ({
      name: category.category_name,
      value: category.total_spent,
      color: categoryColors[index % categoryColors.length],
      legendFontColor: colors.textSecondary,
      legendFontSize: 12,
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading expense reports...</Text>
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
        <Text style={styles.title}>Expense Reports</Text>
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
              <ShoppingBag size={20} color={colors.primary} />
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>
                ${currentMonth.total_spent.toLocaleString()}
              </Text>
            </View>
          )}
          {currentQuarter && (
            <View style={styles.summaryCard}>
              <Calendar size={20} color={colors.success} />
              <Text style={styles.summaryLabel}>This Quarter</Text>
              <Text style={styles.summaryValue}>
                ${currentQuarter.total_spent.toLocaleString()}
              </Text>
            </View>
          )}
          {currentYTD && (
            <View style={styles.summaryCard}>
              <TrendingUp size={20} color={colors.secondary} />
              <Text style={styles.summaryLabel}>Year to Date</Text>
              <Text style={styles.summaryValue}>
                ${currentYTD.total_spent.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Spending by Category */}
      {categories.length > 0 && (
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <PieChart
            data={getCategoryChartData()}
            width={screenWidth - spacing.lg * 2}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="value"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <View style={styles.categoryList}>
            {categories.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.category_name}</Text>
                <View style={styles.categoryStats}>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(category.total_spent)}
                  </Text>
                  <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

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
        </ScrollView>

        {/* Report Type Selector */}
        <View style={styles.typeSelector}>
          {(['monthly', 'quarterly', 'ytd'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, reportType === type && styles.typeButtonActive]}
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
            <ShoppingBag size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No reports available</Text>
            <Text style={styles.emptySubtext}>Generate reports to see your spending history</Text>
          </View>
        ) : (
          reports.map((report, index) => (
            <CustomerExpenseReportCard
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
  categorySection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  categoryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  categoryAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categoryPercentage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    minWidth: 50,
    textAlign: 'right',
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
