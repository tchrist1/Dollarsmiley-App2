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
import { AlertTriangle, Shield, FileText, Calendar } from 'lucide-react-native';
import {
  getUserStrikes,
  getUserActiveStrikes,
  submitStrikeAppeal,
  type ContentStrike,
} from '@/lib/content-reports';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UserStrikesViewProps {
  userId: string;
}

export default function UserStrikesView({ userId }: UserStrikesViewProps) {
  const [strikes, setStrikes] = useState<ContentStrike[]>([]);
  const [activeStrikeCount, setActiveStrikeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appealingStrike, setAppealingStrike] = useState<string | null>(null);

  useEffect(() => {
    loadStrikes();
  }, [userId]);

  const loadStrikes = async () => {
    setLoading(true);
    try {
      const [strikesData, activeCount] = await Promise.all([
        getUserStrikes(userId),
        getUserActiveStrikes(userId),
      ]);

      setStrikes(strikesData);
      setActiveStrikeCount(activeCount);
    } catch (error) {
      console.error('Error loading strikes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppeal = (strikeId: string) => {
    Alert.prompt(
      'Appeal Strike',
      'Please explain why you believe this strike should be removed:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (appealReason) => {
            if (!appealReason || appealReason.trim().length < 10) {
              Alert.alert('Error', 'Please provide a detailed explanation (min 10 characters)');
              return;
            }

            setAppealingStrike(strikeId);
            try {
              const success = await submitStrikeAppeal(strikeId, appealReason.trim());

              if (success) {
                Alert.alert(
                  'Appeal Submitted',
                  'Your appeal has been submitted and will be reviewed by our team.'
                );
                loadStrikes();
              } else {
                throw new Error('Failed to submit appeal');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to submit appeal. Please try again.');
            } finally {
              setAppealingStrike(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return colors.error;
      case 'severe':
        return '#FF6B6B';
      case 'moderate':
        return colors.secondary;
      default:
        return colors.textSecondary;
    }
  };

  const getAppealStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.secondary;
    }
  };

  const isStrikeActive = (strike: ContentStrike) => {
    if (strike.appeal_status === 'approved') return false;
    if (!strike.expires_at) return true;
    return new Date(strike.expires_at) > new Date();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Shield size={32} color={activeStrikeCount > 0 ? colors.error : colors.success} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Account Status</Text>
          <Text style={styles.headerSubtitle}>
            {activeStrikeCount === 0 ? (
              'Good standing'
            ) : (
              <Text style={{ color: colors.error }}>
                {activeStrikeCount} active {activeStrikeCount === 1 ? 'strike' : 'strikes'}
              </Text>
            )}
          </Text>
        </View>
      </View>

      {activeStrikeCount > 0 && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={20} color={colors.error} />
          <Text style={styles.warningText}>
            {activeStrikeCount >= 3
              ? 'Your account may be suspended if you receive more strikes.'
              : 'Please review our community guidelines to avoid future violations.'}
          </Text>
        </View>
      )}

      {strikes.length === 0 ? (
        <View style={styles.emptyState}>
          <Shield size={64} color={colors.success} />
          <Text style={styles.emptyTitle}>No Violations</Text>
          <Text style={styles.emptyDescription}>
            You haven't received any strikes. Keep following our community guidelines!
          </Text>
        </View>
      ) : (
        <View style={styles.strikesList}>
          <Text style={styles.sectionTitle}>Strike History</Text>
          {strikes.map((strike) => {
            const active = isStrikeActive(strike);

            return (
              <View
                key={strike.id}
                style={[styles.strikeCard, !active && styles.strikeCardInactive]}
              >
                <View style={styles.strikeHeader}>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(strike.severity) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        { color: getSeverityColor(strike.severity) },
                      ]}
                    >
                      {strike.severity}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: active ? colors.error + '20' : colors.success + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: active ? colors.error : colors.success },
                      ]}
                    >
                      {active ? 'Active' : 'Expired'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.violationCategory}>
                  {strike.violation_category}
                </Text>
                <Text style={styles.violationDescription}>
                  {strike.violation_description}
                </Text>

                <View style={styles.strikeDetails}>
                  <View style={styles.detailRow}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {new Date(strike.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <FileText size={14} color={colors.textSecondary} />
                    <Text style={styles.detailText}>
                      {strike.strike_count} {strike.strike_count === 1 ? 'point' : 'points'}
                    </Text>
                  </View>
                </View>

                {strike.expires_at && (
                  <Text style={styles.expiryText}>
                    Expires: {new Date(strike.expires_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                )}

                {strike.appealed && strike.appeal_status && (
                  <View
                    style={[
                      styles.appealBadge,
                      { backgroundColor: getAppealStatusColor(strike.appeal_status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.appealText,
                        { color: getAppealStatusColor(strike.appeal_status) },
                      ]}
                    >
                      Appeal: {strike.appeal_status}
                    </Text>
                  </View>
                )}

                {active && !strike.appealed && (
                  <TouchableOpacity
                    style={styles.appealButton}
                    onPress={() => handleAppeal(strike.id)}
                    disabled={appealingStrike === strike.id}
                  >
                    {appealingStrike === strike.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={styles.appealButtonText}>Appeal Strike</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Community Guidelines</Text>
        <Text style={styles.footerText}>
          Strikes are issued for violations of our community guidelines. Multiple strikes may
          result in temporary or permanent account suspension. Appeals are reviewed within 3-5
          business days.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    margin: spacing.lg,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxxl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  strikesList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  strikeCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  strikeCardInactive: {
    opacity: 0.6,
  },
  strikeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  violationCategory: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  violationDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  strikeDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expiryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  appealBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  appealText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'capitalize',
  },
  appealButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  appealButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
