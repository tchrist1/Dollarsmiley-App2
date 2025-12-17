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
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Server,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react-native';
import {
  getPerformanceMetricsSummary,
  getAPIPerformanceSummary,
  getSlowQueries,
  getErrorSummary,
  getPerformanceAlerts,
  acknowledgeAlert,
  resolveAlert,
  formatResponseTime,
  getSeverityColor,
  getAlertTypeLabel,
  type APIPerformanceSummary as APIPerf,
  type SlowQuery,
  type ErrorSummary,
  type PerformanceAlert,
} from '@/lib/performance-metrics';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function PerformanceMetricsDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<7 | 30>(7);
  const [summary, setSummary] = useState<any>(null);
  const [apiPerformance, setAPIPerformance] = useState<APIPerf[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [errors, setErrors] = useState<ErrorSummary[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [summaryData, api, queries, errorData, alertData] = await Promise.all([
        getPerformanceMetricsSummary(dateRange),
        getAPIPerformanceSummary(dateRange),
        getSlowQueries(dateRange),
        getErrorSummary(dateRange),
        getPerformanceAlerts(true),
      ]);

      setSummary(summaryData);
      setAPIPerformance(api);
      setSlowQueries(queries);
      setErrors(errorData);
      setAlerts(alertData);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    const success = await acknowledgeAlert(alertId);
    if (success) {
      loadMetrics();
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    Alert.alert('Resolve Alert', 'Mark this alert as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          const success = await resolveAlert(alertId);
          if (success) {
            loadMetrics();
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading performance metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Range Selector */}
      <View style={styles.dateRangeContainer}>
        {([7, 30] as const).map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.dateButton, dateRange === days && styles.dateButtonActive]}
            onPress={() => setDateRange(days)}
          >
            <Text
              style={[
                styles.dateButtonText,
                dateRange === days && styles.dateButtonTextActive,
              ]}
            >
              {days}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      {summary && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Activity size={24} color={colors.primary} />
            <Text style={styles.statValue}>{summary.totalRequests}</Text>
            <Text style={styles.statLabel}>API Requests</Text>
          </View>

          <View style={styles.statCard}>
            <Clock size={24} color={colors.success} />
            <Text style={styles.statValue}>{summary.avgResponseTime}ms</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>

          <View style={styles.statCard}>
            <XCircle size={24} color={colors.error} />
            <Text style={styles.statValue}>{summary.errorRate}%</Text>
            <Text style={styles.statLabel}>Error Rate</Text>
          </View>

          <View style={styles.statCard}>
            <Server size={24} color={colors.secondary} />
            <Text style={styles.statValue}>{summary.systemUptime}%</Text>
            <Text style={styles.statLabel}>Uptime</Text>
          </View>
        </View>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {alerts.slice(0, 5).map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View
                style={[
                  styles.alertIndicator,
                  { backgroundColor: getSeverityColor(alert.severity) },
                ]}
              />
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertType}>{getAlertTypeLabel(alert.alert_type)}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(alert.severity) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        { color: getSeverityColor(alert.severity) },
                      ]}
                    >
                      {alert.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                {alert.endpoint && (
                  <Text style={styles.alertEndpoint}>{alert.endpoint}</Text>
                )}
                <View style={styles.alertActions}>
                  {!alert.is_acknowledged && (
                    <TouchableOpacity
                      style={styles.alertButton}
                      onPress={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle size={16} color={colors.primary} />
                      <Text style={styles.alertButtonText}>Acknowledge</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.alertButton}
                    onPress={() => handleResolveAlert(alert.id)}
                  >
                    <CheckCircle size={16} color={colors.success} />
                    <Text style={styles.alertButtonText}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* API Performance */}
      {apiPerformance.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Endpoints</Text>
          {apiPerformance.slice(0, 10).map((api, index) => (
            <View key={index} style={styles.performanceItem}>
              <View style={styles.performanceHeader}>
                <Text style={styles.performanceEndpoint} numberOfLines={1}>
                  {api.endpoint}
                </Text>
                <View style={styles.performanceStats}>
                  <Text style={styles.performanceValue}>
                    {formatResponseTime(api.avg_response_time)}
                  </Text>
                  {api.error_rate > 5 ? (
                    <TrendingUp size={16} color={colors.error} />
                  ) : (
                    <TrendingDown size={16} color={colors.success} />
                  )}
                </View>
              </View>
              <View style={styles.performanceDetails}>
                <Text style={styles.performanceDetailText}>
                  {api.total_requests} requests
                </Text>
                <Text
                  style={[
                    styles.performanceDetailText,
                    { color: api.error_rate > 5 ? colors.error : colors.success },
                  ]}
                >
                  {api.error_rate.toFixed(1)}% errors
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Slow Queries */}
      {slowQueries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slow Queries</Text>
          {slowQueries.slice(0, 5).map((query, index) => (
            <View key={index} style={styles.queryItem}>
              <View style={styles.queryHeader}>
                <Text style={styles.queryName}>{query.query_name}</Text>
                <Text style={styles.queryTime}>
                  {formatResponseTime(query.avg_execution_time)}
                </Text>
              </View>
              <Text style={styles.queryTable}>{query.table_name}</Text>
              <Text style={styles.queryOccurrences}>
                {query.occurrence_count} occurrences
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Errors */}
      {errors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Errors</Text>
          {errors.slice(0, 5).map((error, index) => (
            <View key={index} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <View
                  style={[
                    styles.errorIcon,
                    { backgroundColor: getSeverityColor(error.severity) + '20' },
                  ]}
                >
                  <AlertTriangle size={16} color={getSeverityColor(error.severity)} />
                </View>
                <View style={styles.errorContent}>
                  <Text style={styles.errorType}>{error.error_type}</Text>
                  <Text style={styles.errorMessage} numberOfLines={2}>
                    {error.error_message}
                  </Text>
                  <View style={styles.errorMeta}>
                    <Text style={styles.errorCount}>{error.occurrence_count}x</Text>
                    <Text style={styles.errorTime}>
                      {new Date(error.last_occurred).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
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
  dateRangeContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dateButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  dateButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  dateButtonTextActive: {
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  alertsSection: {
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertIndicator: {
    width: 4,
  },
  alertContent: {
    flex: 1,
    padding: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  alertType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alertEndpoint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  alertActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  alertButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  performanceItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  performanceEndpoint: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  performanceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  performanceValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  performanceDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  performanceDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  queryItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  queryName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  queryTime: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  queryTable: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  queryOccurrences: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  errorItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  errorHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContent: {
    flex: 1,
  },
  errorType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorCount: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: fontWeight.bold,
  },
  errorTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
