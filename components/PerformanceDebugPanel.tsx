/**
 * PERFORMANCE DEBUG PANEL
 *
 * Dev-only component for monitoring query performance in real-time.
 * Shows query timings, slow query alerts, and optimization recommendations.
 *
 * Usage:
 * - Only renders in __DEV__ mode
 * - Add to any screen to monitor query performance
 * - Toggle visibility with floating button
 */

import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Activity, X, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react-native';
import {
  analyzeQueryPerformance,
  printPerformanceReport,
  getOptimizationRecommendations,
  clearPerformanceHistory,
} from '@/lib/query-performance-monitor';

export function PerformanceDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  if (!__DEV__) return null;

  const handleAnalyze = () => {
    const servicesAnalysis = analyzeQueryPerformance('get_services_cursor_paginated_v2');
    const jobsAnalysis = analyzeQueryPerformance('get_jobs_cursor_paginated_v2');
    const recommendations = getOptimizationRecommendations();

    setAnalysis({
      services: servicesAnalysis,
      jobs: jobsAnalysis,
      recommendations,
    });

    printPerformanceReport();
  };

  const handleClear = () => {
    clearPerformanceHistory();
    setAnalysis(null);
  };

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Activity size={24} color="#fff" />
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
              <View style={styles.headerLeft}>
                <TrendingUp size={24} color="#3b82f6" />
                <Text style={styles.title}>Query Performance</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content}>
              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.button} onPress={handleAnalyze}>
                  <Text style={styles.buttonText}>Analyze Performance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonSecondary} onPress={handleClear}>
                  <Text style={styles.buttonSecondaryText}>Clear History</Text>
                </TouchableOpacity>
              </View>

              {/* Analysis Results */}
              {analysis && (
                <>
                  {/* Services Analysis */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Services RPC</Text>
                    <MetricRow
                      label="Total Calls"
                      value={analysis.services.totalCalls.toString()}
                    />
                    <MetricRow
                      label="Avg Duration"
                      value={`${analysis.services.avgDuration.toFixed(0)}ms`}
                      isGood={analysis.services.avgDuration < 500}
                    />
                    <MetricRow
                      label="Max Duration"
                      value={`${analysis.services.maxDuration.toFixed(0)}ms`}
                      isGood={analysis.services.maxDuration < 1000}
                    />
                    <MetricRow
                      label="Slow Queries"
                      value={analysis.services.slowQueries.length.toString()}
                      isGood={analysis.services.slowQueries.length === 0}
                    />
                  </View>

                  {/* Jobs Analysis */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Jobs RPC</Text>
                    <MetricRow
                      label="Total Calls"
                      value={analysis.jobs.totalCalls.toString()}
                    />
                    <MetricRow
                      label="Avg Duration"
                      value={`${analysis.jobs.avgDuration.toFixed(0)}ms`}
                      isGood={analysis.jobs.avgDuration < 500}
                    />
                    <MetricRow
                      label="Max Duration"
                      value={`${analysis.jobs.maxDuration.toFixed(0)}ms`}
                      isGood={analysis.jobs.maxDuration < 1000}
                    />
                    <MetricRow
                      label="Slow Queries"
                      value={analysis.jobs.slowQueries.length.toString()}
                      isGood={analysis.jobs.slowQueries.length === 0}
                    />
                  </View>

                  {/* Recommendations */}
                  {analysis.recommendations.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        {analysis.recommendations.length === 1 &&
                        analysis.recommendations[0].includes('performing well')
                          ? '✅ Status'
                          : '⚠️ Recommendations'}
                      </Text>
                      {analysis.recommendations.map((rec: string, idx: number) => (
                        <View key={idx} style={styles.recommendation}>
                          <Text style={styles.recommendationText}>{rec}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Filter Patterns */}
                  {analysis.services.filterPatterns.size > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Filter Patterns</Text>
                      {Array.from(analysis.services.filterPatterns.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([pattern, count]: [string, number]) => (
                          <View key={pattern} style={styles.patternRow}>
                            <Text style={styles.patternCount}>{count}x</Text>
                            <Text style={styles.patternText}>{pattern}</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </>
              )}

              {/* Instructions */}
              {!analysis && (
                <View style={styles.instructions}>
                  <Text style={styles.instructionsText}>
                    Tap "Analyze Performance" to view query metrics and optimization recommendations.
                  </Text>
                  <Text style={styles.instructionsText}>
                    Performance data is collected automatically as you use the app.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MetricRow({
  label,
  value,
  isGood,
}: {
  label: string;
  value: string;
  isGood?: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValue}>
        {isGood !== undefined && (
          <>
            {isGood ? (
              <CheckCircle size={16} color="#10b981" style={styles.metricIcon} />
            ) : (
              <AlertTriangle size={16} color="#f59e0b" style={styles.metricIcon} />
            )}
          </>
        )}
        <Text style={[styles.metricText, !isGood && styles.metricWarning]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  metricValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    marginRight: 4,
  },
  metricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  metricWarning: {
    color: '#f59e0b',
  },
  recommendation: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  recommendationText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  patternCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    minWidth: 30,
  },
  patternText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  instructions: {
    padding: 20,
    gap: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
