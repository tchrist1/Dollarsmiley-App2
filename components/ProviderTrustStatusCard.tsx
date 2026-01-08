import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { AlertCircle, CheckCircle, TrendingUp, Info, Award } from 'lucide-react-native';
import {
  getProviderTrustScore,
  getTrustImprovementGuidance,
  getTrustLevelColor,
  type ProviderTrustScore,
  type TrustGuidance,
} from '../lib/trust-scoring';

interface ProviderTrustStatusCardProps {
  providerId: string;
  onViewDetails?: () => void;
  compact?: boolean;
}

export function ProviderTrustStatusCard({
  providerId,
  onViewDetails,
  compact = false,
}: ProviderTrustStatusCardProps) {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<ProviderTrustScore | null>(null);
  const [guidance, setGuidance] = useState<TrustGuidance | null>(null);

  useEffect(() => {
    loadTrustData();
  }, [providerId]);

  const loadTrustData = async () => {
    setLoading(true);
    const [scoreData, guidanceData] = await Promise.all([
      getProviderTrustScore(providerId),
      getTrustImprovementGuidance(providerId, 'provider'),
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
              <Award size={20} color={trustColor} />
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
            <Award size={24} color={trustColor} />
          ) : (
            <AlertCircle size={24} color={trustColor} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>Provider Reliability</Text>
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
              <Text style={styles.statValue}>
                {score.provider_no_show_count_90d}
              </Text>
              <Text style={styles.statLabel}>Incidents (90d)</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {(score.incident_rate_90d * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Incident Rate</Text>
            </View>
          </View>
        )}

        {trustLevel === 0 && score && score.completed_jobs_lifetime > 10 && (
          <View style={styles.badgeContainer}>
            <Award size={20} color="#10B981" />
            <Text style={styles.badgeText}>
              Excellent reliability with {score.completed_jobs_lifetime} completed
              jobs!
            </Text>
          </View>
        )}

        {guidance.improvement_tips.length > 0 && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>
              {trustLevel === 0 ? 'Keep Up the Excellent Work' : 'Advisory Guidance'}
            </Text>
            {guidance.improvement_tips.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {guidance.recovery_progress && trustLevel > 0 && (
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
              Additional confirmation required before accepting jobs
            </Text>
          </View>
        )}

        {trustLevel >= 3 && (
          <View style={styles.restrictionBox}>
            <AlertCircle size={16} color="#EF4444" />
            <Text style={styles.restrictionText}>
              High-urgency jobs are currently limited. Please contact support for
              assistance.
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
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    marginBottom: 16,
  },
  badgeText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
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
  restrictionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 16,
  },
  restrictionText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
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
