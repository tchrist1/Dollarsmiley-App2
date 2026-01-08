import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { AlertCircle, CheckCircle, TrendingUp, Info } from 'lucide-react-native';
import {
  getCustomerTrustScore,
  getTrustImprovementGuidance,
  getTrustLevelColor,
  type CustomerTrustScore,
  type TrustGuidance,
} from '../lib/trust-scoring';

interface CustomerTrustStatusCardProps {
  customerId: string;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function CustomerTrustStatusCard({
  customerId,
  onViewDetails,
  compact = false,
}: CustomerTrustStatusCardProps) {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<CustomerTrustScore | null>(null);
  const [guidance, setGuidance] = useState<TrustGuidance | null>(null);

  useEffect(() => {
    loadTrustData();
  }, [customerId]);

  const loadTrustData = async () => {
    setLoading(true);
    const [scoreData, guidanceData] = await Promise.all([
      getCustomerTrustScore(customerId),
      getTrustImprovementGuidance(customerId, 'customer'),
    ]);
    setScore(scoreData);
    setGuidance(guidanceData);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#10B981" />
        <Text style={styles.loadingText}>Loading trust status...</Text>
      </View>
    );
  }

  if (!guidance) {
    return null;
  }

  const trustLevel = guidance.trust_level;
  const trustColor = getTrustLevelColor(trustLevel);

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderLeftColor: trustColor }]}
        onPress={onViewDetails}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            {trustLevel === 0 ? (
              <CheckCircle size={20} color={trustColor} />
            ) : (
              <AlertCircle size={20} color={trustColor} />
            )}
            <Text style={[styles.compactTitle, { color: trustColor }]}>
              {guidance.trust_level_label}
            </Text>
          </View>
          {trustLevel > 0 && (
            <Text style={styles.compactMessage} numberOfLines={1}>
              {guidance.improvement_tips[0]}
            </Text>
          )}
        </View>
        {onViewDetails && (
          <Info size={16} color="#9CA3AF" style={styles.compactIcon} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: `${trustColor}15` }]}>
        <View style={styles.headerContent}>
          {trustLevel === 0 ? (
            <CheckCircle size={24} color={trustColor} />
          ) : (
            <AlertCircle size={24} color={trustColor} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>Reliability Status</Text>
            <Text style={[styles.levelLabel, { color: trustColor }]}>
              {guidance.trust_level_label}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {score && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{score.completed_jobs_90d}</Text>
              <Text style={styles.statLabel}>Completed (90d)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{score.no_show_count_90d}</Text>
              <Text style={styles.statLabel}>No-Shows (90d)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {score.consecutive_completed_jobs}
              </Text>
              <Text style={styles.statLabel}>Consecutive</Text>
            </View>
          </View>
        )}

        {guidance.improvement_tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>
              {trustLevel === 0 ? 'Keep Up the Good Work' : 'How to Improve'}
            </Text>
            {guidance.improvement_tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {guidance.recovery_progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <TrendingUp size={16} color="#6B7280" />
              <Text style={styles.progressTitle}>Recovery Progress</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      (guidance.recovery_progress.completed /
                        guidance.recovery_progress.required) *
                      100
                    }%`,
                    backgroundColor: trustColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {guidance.recovery_progress.message}
            </Text>
          </View>
        )}

        {trustLevel >= 2 && (
          <View style={styles.warningBox}>
            <AlertCircle size={16} color="#F59E0B" />
            <Text style={styles.warningText}>
              A no-show fee is required for new job postings
            </Text>
          </View>
        )}

        {onViewDetails && (
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={onViewDetails}
          >
            <Text style={styles.detailsButtonText}>View Trust History</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactMessage: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactIcon: {
    marginLeft: 8,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tipsContainer: {
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
  },
  detailsButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});
