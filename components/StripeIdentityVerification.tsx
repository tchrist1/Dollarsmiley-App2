import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Camera,
  FileText,
  Award,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  createIdentityVerification,
  getLatestIdentityVerification,
  canStartVerification,
  getVerificationStatusLabel,
  getVerificationStatusColor,
  getVerificationRequirements,
  getVerificationBenefits,
  getVerificationSteps,
  formatVerificationTime,
  getExpiryWarning,
} from '@/lib/stripe-identity';

interface StripeIdentityVerificationProps {
  userId?: string;
  isVerified?: boolean;
  onVerificationComplete?: () => void;
  onVerificationStart?: () => void;
}

export function StripeIdentityVerification({
  userId,
  isVerified = false,
  onVerificationComplete,
  onVerificationStart,
}: StripeIdentityVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [latestVerification, setLatestVerification] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadLatestVerification();
  }, [userId]);

  const loadLatestVerification = async () => {
    const verification = await getLatestIdentityVerification(userId);
    setLatestVerification(verification);
  };

  const handleStartVerification = async () => {
    // Check if can start
    const check = canStartVerification(isVerified, latestVerification);
    if (!check.canStart) {
      Alert.alert('Cannot Start Verification', check.reason);
      return;
    }

    setLoading(true);
    onVerificationStart?.();

    try {
      const result = await createIdentityVerification('document');

      // Open verification URL
      if (result.verification_url) {
        const supported = await Linking.canOpenURL(result.verification_url);
        if (supported) {
          await Linking.openURL(result.verification_url);
          Alert.alert(
            'Verification Started',
            'Complete the verification process in your browser. You\'ll receive a notification when it\'s done.',
            [{ text: 'OK', onPress: loadLatestVerification }]
          );
        } else {
          Alert.alert('Error', 'Cannot open verification URL');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start verification');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeVerification = async () => {
    if (!latestVerification?.verification_url) return;

    try {
      const supported = await Linking.canOpenURL(latestVerification.verification_url);
      if (supported) {
        await Linking.openURL(latestVerification.verification_url);
      } else {
        Alert.alert('Error', 'Cannot open verification URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open verification');
    }
  };

  const requirements = getVerificationRequirements();
  const benefits = getVerificationBenefits();
  const steps = getVerificationSteps();

  const StatusIcon = () => {
    if (!latestVerification) return null;

    switch (latestVerification.status) {
      case 'verified':
        return <CheckCircle size={24} color={colors.success} />;
      case 'processing':
        return <Clock size={24} color={colors.textSecondary} />;
      case 'requires_input':
        return <AlertCircle size={24} color={colors.warning} />;
      case 'canceled':
        return <AlertCircle size={24} color={colors.error} />;
      default:
        return null;
    }
  };

  // Already verified
  if (isVerified && latestVerification?.status === 'verified') {
    return (
      <View style={styles.verifiedContainer}>
        <View style={styles.verifiedHeader}>
          <CheckCircle size={48} color={colors.success} />
          <Text style={styles.verifiedTitle}>Identity Verified</Text>
        </View>
        <Text style={styles.verifiedText}>
          Your identity was verified{' '}
          {latestVerification.verified_at &&
            formatVerificationTime(
              latestVerification.created_at,
              latestVerification.verified_at
            )}{' '}
          after submission
        </Text>
        {latestVerification.verified_at && (
          <Text style={styles.verifiedDate}>
            Verified on {new Date(latestVerification.verified_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  }

  // Verification in progress
  if (
    latestVerification &&
    (latestVerification.status === 'processing' || latestVerification.status === 'requires_input')
  ) {
    const expiryWarning = getExpiryWarning(latestVerification.expires_at);

    return (
      <View style={styles.container}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <StatusIcon />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {getVerificationStatusLabel(latestVerification.status)}
              </Text>
              {latestVerification.status === 'processing' && (
                <Text style={styles.statusText}>
                  Your verification is being processed. This usually takes a few minutes.
                </Text>
              )}
              {latestVerification.status === 'requires_input' && (
                <Text style={styles.statusText}>
                  Please complete your verification to get verified.
                </Text>
              )}
            </View>
          </View>

          {expiryWarning && (
            <View style={styles.expiryWarning}>
              <AlertCircle size={16} color={colors.warning} />
              <Text style={styles.expiryWarningText}>{expiryWarning}</Text>
            </View>
          )}

          {latestVerification.status === 'requires_input' && (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResumeVerification}
              disabled={loading}
            >
              <Text style={styles.resumeButtonText}>Resume Verification</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Not verified - show start verification
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Shield size={48} color={colors.primary} />
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Get the verified badge and build trust with your customers
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{requirements.title}</Text>
        <Text style={styles.sectionDescription}>{requirements.description}</Text>
        {requirements.items.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.listItemText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        {steps.map((step) => (
          <View key={step.step} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.step}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benefits</Text>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefit}>
            <CheckCircle size={20} color={colors.success} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <View style={styles.securityNote}>
        <Shield size={20} color={colors.textSecondary} />
        <Text style={styles.securityNoteText}>
          Your information is securely processed by Stripe and encrypted. We never store your ID
          documents.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.startButton, loading && styles.startButtonDisabled]}
        onPress={handleStartVerification}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <Shield size={20} color={colors.white} />
            <Text style={styles.startButtonText}>Verify My Identity</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: spacing.sm,
  },
  listItemText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.5,
  },
  step: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    margin: spacing.lg,
    borderRadius: borderRadius.md,
  },
  securityNoteText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: fontSize.md * 1.5,
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  expiryWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  resumeButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resumeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  verifiedContainer: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    margin: spacing.lg,
    alignItems: 'center',
  },
  verifiedHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  verifiedTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
    marginTop: spacing.sm,
  },
  verifiedText: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  verifiedDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
