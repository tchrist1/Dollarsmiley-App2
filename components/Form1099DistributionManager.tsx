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
  Send,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react-native';
import {
  get1099DistributionsByYear,
  get1099AccessStats,
  bulkSend1099Notifications,
  create1099Distribution,
  format1099Status,
  get1099StatusColor,
  type Form1099Distribution,
} from '@/lib/1099-distribution';
import {
  calculateAll1099sForYear,
  type Tax1099Report,
} from '@/lib/1099-nec-calculation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Form1099DistributionManagerProps {
  taxYear: number;
  adminId: string;
}

export default function Form1099DistributionManager({
  taxYear,
  adminId,
}: Form1099DistributionManagerProps) {
  const [loading, setLoading] = useState(true);
  const [distributions, setDistributions] = useState<Form1099Distribution[]>([]);
  const [accessStats, setAccessStats] = useState<any>(null);
  const [report, setReport] = useState<Tax1099Report | null>(null);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [taxYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [distData, statsData, reportData] = await Promise.all([
        get1099DistributionsByYear(taxYear),
        get1099AccessStats(taxYear),
        calculateAll1099sForYear(taxYear),
      ]);

      setDistributions(distData);
      setAccessStats(statsData);
      setReport(reportData);
    } catch (error) {
      console.error('Error loading distribution data:', error);
      Alert.alert('Error', 'Failed to load distribution data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDistributions = async () => {
    if (!report) return;

    const readyProviders = report.providers.filter((p) => p.is_ready_for_filing);

    if (readyProviders.length === 0) {
      Alert.alert('No Providers Ready', 'No providers are ready for distribution');
      return;
    }

    Alert.alert(
      'Create Distributions',
      `Create 1099-NEC distributions for ${readyProviders.length} provider(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setCreating(true);
            try {
              let created = 0;
              let failed = 0;

              for (const provider of readyProviders) {
                const result = await create1099Distribution(provider, adminId);
                if (result.success) {
                  created++;
                } else {
                  failed++;
                }
              }

              Alert.alert(
                'Success',
                `Created ${created} distribution(s).${failed > 0 ? ` Failed: ${failed}` : ''}`
              );

              loadData();
            } catch (error) {
              console.error('Error creating distributions:', error);
              Alert.alert('Error', 'Failed to create distributions');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const handleSendNotifications = async () => {
    const unsent = distributions.filter((d) => !d.notification_sent && d.status === 'ready');

    if (unsent.length === 0) {
      Alert.alert('No Notifications', 'All notifications have been sent');
      return;
    }

    Alert.alert(
      'Send Notifications',
      `Send notifications to ${unsent.length} provider(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const result = await bulkSend1099Notifications(unsent);

              Alert.alert(
                'Success',
                `Sent ${result.sent} notification(s).${result.failed > 0 ? ` Failed: ${result.failed}` : ''}`
              );

              loadData();
            } catch (error) {
              console.error('Error sending notifications:', error);
              Alert.alert('Error', 'Failed to send notifications');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading distribution data...</Text>
      </View>
    );
  }

  const unsentCount = distributions.filter(
    (d) => !d.notification_sent && d.status === 'ready'
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Users size={24} color={colors.primary} />
          <Text style={styles.statValue}>{accessStats?.total_distributed || 0}</Text>
          <Text style={styles.statLabel}>Distributed</Text>
        </View>

        <View style={styles.statCard}>
          <Eye size={24} color={colors.success} />
          <Text style={styles.statValue}>{accessStats?.viewed_count || 0}</Text>
          <Text style={styles.statLabel}>Viewed</Text>
        </View>

        <View style={styles.statCard}>
          <Download size={24} color={colors.secondary} />
          <Text style={styles.statValue}>{accessStats?.downloaded_count || 0}</Text>
          <Text style={styles.statLabel}>Downloaded</Text>
        </View>

        <View style={styles.statCard}>
          <TrendingUp size={24} color={colors.warning} />
          <Text style={styles.statValue}>
            {accessStats?.access_rate?.toFixed(1) || 0}%
          </Text>
          <Text style={styles.statLabel}>Access Rate</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {distributions.length === 0 && report && report.providers_ready_for_filing > 0 && (
          <TouchableOpacity
            style={[styles.actionButton, creating && styles.actionButtonDisabled]}
            onPress={handleCreateDistributions}
            disabled={creating}
          >
            {creating ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.actionButtonText}>Creating...</Text>
              </>
            ) : (
              <>
                <CheckCircle size={18} color={colors.white} />
                <Text style={styles.actionButtonText}>
                  Create Distributions ({report.providers_ready_for_filing})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {unsentCount > 0 && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.sendButton,
              sending && styles.actionButtonDisabled,
            ]}
            onPress={handleSendNotifications}
            disabled={sending}
          >
            {sending ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={styles.actionButtonText}>Sending...</Text>
              </>
            ) : (
              <>
                <Send size={18} color={colors.white} />
                <Text style={styles.actionButtonText}>
                  Send Notifications ({unsentCount})
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Distributions List */}
      {distributions.length > 0 ? (
        <View style={styles.distributionsList}>
          <Text style={styles.sectionTitle}>Distributions</Text>
          {distributions.map((dist: any) => (
            <View
              key={dist.id}
              style={[
                styles.distributionCard,
                { borderLeftColor: get1099StatusColor(dist.status) },
              ]}
            >
              <View style={styles.distHeader}>
                <View style={styles.distHeaderLeft}>
                  <Text style={styles.distProvider}>
                    {dist.provider?.full_name || 'Unknown'}
                  </Text>
                  <Text style={styles.distEmail}>{dist.provider?.email}</Text>
                </View>
                <View
                  style={[
                    styles.distStatus,
                    { backgroundColor: get1099StatusColor(dist.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.distStatusText,
                      { color: get1099StatusColor(dist.status) },
                    ]}
                  >
                    {format1099Status(dist.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.distInfo}>
                <Text style={styles.distAmount}>
                  ${dist.nonemployee_compensation.toFixed(2)}
                </Text>

                <View style={styles.distMeta}>
                  <Text style={styles.distMetaText}>
                    Generated {new Date(dist.generated_at).toLocaleDateString()}
                  </Text>
                  {dist.notification_sent ? (
                    <View style={styles.notificationBadge}>
                      <CheckCircle size={12} color={colors.success} />
                      <Text style={styles.notificationText}>Notified</Text>
                    </View>
                  ) : (
                    <View style={styles.notificationBadge}>
                      <AlertCircle size={12} color={colors.warning} />
                      <Text style={styles.notificationText}>Not Notified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <AlertCircle size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            No distributions created yet. Click "Create Distributions" to get started.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  sendButton: {
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  distributionsList: {
    gap: spacing.sm,
  },
  distributionCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  distHeaderLeft: {
    flex: 1,
  },
  distProvider: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  distEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  distStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  distStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  distInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  distMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  distMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  notificationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
});
