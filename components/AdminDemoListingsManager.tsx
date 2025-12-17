import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Button } from './Button';

interface DemoStats {
  totalDemoListings: number;
  activeDemoListings: number;
  deactivatedDemoListings: number;
  thresholdsReached: number;
  totalThresholds: number;
}

interface ThresholdInfo {
  id: string;
  subcategory_id: string;
  listing_type: string;
  threshold_count: number;
  current_real_count: number;
  demo_deactivated: boolean;
}

interface DeactivationEvent {
  id: string;
  event_type: string;
  listing_type: string;
  subcategory_id: string;
  listing_count: number;
  created_at: string;
  details: any;
}

export function AdminDemoListingsManager() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [thresholds, setThresholds] = useState<ThresholdInfo[]>([]);
  const [recentDeactivations, setRecentDeactivations] = useState<DeactivationEvent[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-demo-thresholds');

      if (error) throw error;

      if (data) {
        setStats(data.statistics);
        setThresholds(data.thresholds || []);
        setRecentDeactivations(data.recentDeactivations || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', 'Failed to load demo listing statistics');
    } finally {
      setLoading(false);
    }
  };

  const generateAllDemoListings = async () => {
    Alert.alert(
      'Generate Demo Listings',
      'This will create 3 service and 3 job listings for each of the 69 subcategories. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const { data: session } = await supabase.auth.getSession();
              if (!session.session) throw new Error('Not authenticated');

              const response = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-demo-listings`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ generateAll: true }),
                }
              );

              const result = await response.json();

              if (!response.ok) throw new Error(result.error);

              Alert.alert(
                'Success',
                `Generated ${result.totalServices} services and ${result.totalJobs} jobs across ${result.subcategoriesProcessed} subcategories`,
                [{ text: 'OK', onPress: loadStats }]
              );
            } catch (error) {
              console.error('Error generating demo listings:', error);
              Alert.alert('Error', 'Failed to generate demo listings');
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  };

  const manualCheckThresholds = async () => {
    setLoading(true);
    try {
      await loadStats();
      Alert.alert('Success', 'Threshold check completed');
    } catch (error) {
      Alert.alert('Error', 'Failed to check thresholds');
    } finally {
      setLoading(false);
    }
  };

  const deactivateAllDemoListings = async () => {
    Alert.alert(
      'Deactivate All Demo Listings',
      'This will immediately deactivate all active demo listings. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Update all demo listings
              await supabase
                .from('demo_listings_metadata')
                .update({
                  is_active: false,
                  deactivated_at: new Date().toISOString(),
                  deactivation_reason: 'Manual deactivation by admin',
                })
                .eq('is_active', true);

              // Archive demo service listings
              await supabase
                .from('service_listings')
                .update({ status: 'Archived' })
                .eq('is_demo', true)
                .eq('status', 'Active');

              // Expire demo jobs
              await supabase
                .from('jobs')
                .update({ status: 'Expired' })
                .eq('is_demo', true)
                .eq('status', 'Open');

              Alert.alert('Success', 'All demo listings have been deactivated', [
                { text: 'OK', onPress: loadStats },
              ]);
            } catch (error) {
              console.error('Error deactivating demo listings:', error);
              Alert.alert('Error', 'Failed to deactivate demo listings');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Demo Listings Management</Text>
        <Text style={styles.subtitle}>Manage seed data for marketplace discovery</Text>
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>{stats.activeDemoListings}</Text>
            <Text style={styles.statLabel}>Active Demo Listings</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSecondary]}>
            <Text style={styles.statValue}>{stats.deactivatedDemoListings}</Text>
            <Text style={styles.statLabel}>Deactivated</Text>
          </View>

          <View style={[styles.statCard, styles.statCardSuccess]}>
            <Text style={styles.statValue}>{stats.thresholdsReached}</Text>
            <Text style={styles.statLabel}>Thresholds Reached</Text>
          </View>

          <View style={[styles.statCard, styles.statCardInfo]}>
            <Text style={styles.statValue}>{stats.totalThresholds}</Text>
            <Text style={styles.statLabel}>Total Thresholds</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <Button
          title={generating ? 'Generating...' : 'Generate All Demo Listings'}
          onPress={generateAllDemoListings}
          disabled={generating || loading}
          loading={generating}
          leftIcon={<RefreshCw size={20} color={colors.white} />}
          style={styles.actionButton}
        />

        <Button
          title="Check Thresholds Manually"
          onPress={manualCheckThresholds}
          disabled={loading}
          variant="outline"
          leftIcon={<CheckCircle size={20} color={colors.primary} />}
          style={styles.actionButton}
        />

        <Button
          title="Deactivate All Demo Listings"
          onPress={deactivateAllDemoListings}
          disabled={loading}
          variant="outline"
          leftIcon={<Trash2 size={20} color={colors.error} />}
          style={[styles.actionButton, styles.dangerButton]}
        />
      </View>

      {thresholds.length > 0 && (
        <View style={styles.thresholdsSection}>
          <Text style={styles.sectionTitle}>Threshold Status (First 10)</Text>
          {thresholds.slice(0, 10).map((threshold) => (
            <View key={threshold.id} style={styles.thresholdCard}>
              <View style={styles.thresholdHeader}>
                <Text style={styles.thresholdType}>{threshold.listing_type}</Text>
                {threshold.demo_deactivated ? (
                  <View style={styles.statusBadgeSuccess}>
                    <CheckCircle size={14} color={colors.success} />
                    <Text style={styles.statusTextSuccess}>Deactivated</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadgeWarning}>
                    <AlertCircle size={14} color={colors.warning} />
                    <Text style={styles.statusTextWarning}>Active</Text>
                  </View>
                )}
              </View>
              <View style={styles.thresholdProgress}>
                <Text style={styles.thresholdCount}>
                  {threshold.current_real_count} / {threshold.threshold_count} real listings
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          100,
                          (threshold.current_real_count / threshold.threshold_count) * 100
                        )}%`,
                        backgroundColor:
                          threshold.current_real_count >= threshold.threshold_count
                            ? colors.success
                            : colors.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {recentDeactivations.length > 0 && (
        <View style={styles.deactivationsSection}>
          <Text style={styles.sectionTitle}>Recent Deactivations</Text>
          {recentDeactivations.map((event) => (
            <View key={event.id} style={styles.deactivationCard}>
              <View style={styles.deactivationHeader}>
                <XCircle size={16} color={colors.error} />
                <Text style={styles.deactivationType}>{event.listing_type}</Text>
                <Text style={styles.deactivationDate}>
                  {new Date(event.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.deactivationDetails}>
                {event.listing_count} real listings reached threshold
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How Demo Listings Work</Text>
        <Text style={styles.infoText}>
          • Demo listings are automatically generated for each subcategory
        </Text>
        <Text style={styles.infoText}>
          • They appear in search results to enrich discovery when real listings are scarce
        </Text>
        <Text style={styles.infoText}>
          • Once a subcategory reaches 150 real listings, demo listings are automatically deactivated
        </Text>
        <Text style={styles.infoText}>
          • Deactivated demo listings are hidden from search but retained for analytics
        </Text>
        <Text style={styles.infoText}>
          • All demo listings are within a 5-mile radius of Baltimore for realistic proximity
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: colors.primaryLight,
  },
  statCardSecondary: {
    backgroundColor: colors.backgroundSecondary,
  },
  statCardSuccess: {
    backgroundColor: colors.successLight,
  },
  statCardInfo: {
    backgroundColor: colors.infoLight,
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  dangerButton: {
    borderColor: colors.error,
  },
  thresholdsSection: {
    marginBottom: spacing.xl,
  },
  thresholdCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  thresholdType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  statusTextSuccess: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  statusTextWarning: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  thresholdProgress: {
    gap: spacing.xs,
  },
  thresholdCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  deactivationsSection: {
    marginBottom: spacing.xl,
  },
  deactivationCard: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  deactivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  deactivationType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  deactivationDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  deactivationDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.lg + spacing.sm,
  },
  infoSection: {
    backgroundColor: colors.infoLight,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
});
