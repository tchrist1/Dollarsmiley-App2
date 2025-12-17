import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { CheckCircle, Circle, ExternalLink, RefreshCw } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getStripeConnectAccount,
  createStripeConnectAccount,
  refreshStripeConnectOnboarding,
  getStripeConnectStatus,
  getAccountStatusColor,
  getAccountStatusIcon,
  formatRequirement,
  getOnboardingSteps,
  getCurrentStep,
  type OnboardingStatus,
  type StripeConnectAccount,
} from '@/lib/stripe-connect';

interface StripeConnectOnboardingProps {
  onComplete?: () => void;
}

export default function StripeConnectOnboarding({
  onComplete,
}: StripeConnectOnboardingProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [account, setAccount] = useState<StripeConnectAccount | null>(null);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    if (user) {
      loadAccount();
    }
  }, [user]);

  const loadAccount = async () => {
    if (!user) return;

    setLoading(true);

    const accountData = await getStripeConnectAccount(user.id);
    setAccount(accountData);

    const statusResult = await getStripeConnectStatus(user.id);
    if (statusResult.success && statusResult.status) {
      setStatus(statusResult.status);

      if (
        statusResult.status.isOnboarded &&
        statusResult.status.canAcceptPayments &&
        onComplete
      ) {
        onComplete();
      }
    }

    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user) return;

    setCreating(true);

    const result = await createStripeConnectAccount(user.id);

    if (result.success && result.onboardingUrl) {
      const supported = await Linking.canOpenURL(result.onboardingUrl);
      if (supported) {
        await Linking.openURL(result.onboardingUrl);
      } else {
        Alert.alert('Error', 'Cannot open onboarding link');
      }

      setTimeout(() => {
        loadAccount();
      }, 2000);
    } else {
      Alert.alert('Error', result.error || 'Failed to create account');
    }

    setCreating(false);
  };

  const handleRefresh = async () => {
    if (!account?.stripe_account_id) return;

    setRefreshing(true);

    const result = await refreshStripeConnectOnboarding(account.stripe_account_id);

    if (result.success && result.onboardingUrl) {
      const supported = await Linking.canOpenURL(result.onboardingUrl);
      if (supported) {
        await Linking.openURL(result.onboardingUrl);
      } else {
        Alert.alert('Error', 'Cannot open onboarding link');
      }

      setTimeout(() => {
        loadAccount();
      }, 2000);
    } else {
      Alert.alert('Error', result.error || 'Failed to refresh onboarding');
    }

    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading account status...</Text>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load account status</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAccount}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = getOnboardingSteps();
  const currentStep = getCurrentStep(status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stripe Connect</Text>
        <Text style={styles.subtitle}>
          Set up your account to receive payments from customers
        </Text>
      </View>

      {/* Status Card */}
      {account && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>
              {getAccountStatusIcon(account.account_status)}
            </Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Account Status</Text>
              <Text
                style={[
                  styles.statusValue,
                  { color: getAccountStatusColor(account.account_status) },
                ]}
              >
                {account.account_status}
              </Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Accept Payments</Text>
              <Text
                style={[
                  styles.statusBadge,
                  status.canAcceptPayments ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                {status.canAcceptPayments ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Receive Payouts</Text>
              <Text
                style={[
                  styles.statusBadge,
                  status.canReceivePayouts ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                {status.canReceivePayouts ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {status.needsAttention && status.requirements.length > 0 && (
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>⚠️ Action Required</Text>
              {status.requirements.map((req, index) => (
                <Text key={index} style={styles.requirementItem}>
                  • {formatRequirement(req)}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Onboarding Steps */}
      <View style={styles.stepsContainer}>
        <Text style={styles.stepsTitle}>Setup Steps</Text>
        {steps.map((step) => {
          const isComplete = currentStep > step.step;
          const isCurrent = currentStep === step.step;

          return (
            <View
              key={step.step}
              style={[
                styles.stepCard,
                isCurrent && styles.stepCardCurrent,
                isComplete && styles.stepCardComplete,
              ]}
            >
              <View style={styles.stepLeft}>
                <View
                  style={[
                    styles.stepIconContainer,
                    isComplete && styles.stepIconContainerComplete,
                    isCurrent && styles.stepIconContainerCurrent,
                  ]}
                >
                  {isComplete ? (
                    <CheckCircle size={20} color={colors.success} />
                  ) : (
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  )}
                </View>
              </View>

              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepTitle,
                    isComplete && styles.stepTitleComplete,
                    isCurrent && styles.stepTitleCurrent,
                  ]}
                >
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>

              {isComplete && (
                <CheckCircle size={24} color={colors.success} fill={colors.success} />
              )}
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!status.isCreated ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Start Setup</Text>
                <ExternalLink size={18} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        ) : !status.isOnboarded || status.needsAttention ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <RefreshCw size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Continue Setup</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.completeContainer}>
            <CheckCircle size={48} color={colors.success} fill={colors.success} />
            <Text style={styles.completeTitle}>Setup Complete!</Text>
            <Text style={styles.completeText}>
              You can now accept payments and receive payouts
            </Text>
          </View>
        )}

        {status.isCreated && (
          <TouchableOpacity style={styles.secondaryButton} onPress={loadAccount}>
            <RefreshCw size={16} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Refresh Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Why Stripe Connect?</Text>
        <Text style={styles.infoText}>
          • Secure payment processing{'\n'}
          • Fast payouts to your bank account{'\n'}
          • Fraud protection and dispute management{'\n'}
          • Detailed transaction reporting
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  header: {
    marginBottom: spacing.lg,
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
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    fontSize: fontSize.xxxl,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  statusValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusItem: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  statusBadgeActive: {
    color: colors.success,
  },
  statusBadgeInactive: {
    color: colors.textSecondary,
  },
  requirementsContainer: {
    padding: spacing.md,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  requirementsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  requirementItem: {
    fontSize: fontSize.sm,
    color: '#92400E',
    marginBottom: spacing.xxs,
  },
  stepsContainer: {
    marginBottom: spacing.lg,
  },
  stepsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepCardCurrent: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  stepCardComplete: {
    borderColor: colors.success + '30',
  },
  stepLeft: {
    marginRight: spacing.md,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconContainerCurrent: {
    backgroundColor: colors.primary + '20',
  },
  stepIconContainerComplete: {
    backgroundColor: colors.success + '20',
  },
  stepIcon: {
    fontSize: fontSize.xl,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  stepTitleCurrent: {
    color: colors.primary,
  },
  stepTitleComplete: {
    color: colors.success,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  completeContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
  },
  completeTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  completeText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
  },
});
