import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AlertCircle, CheckCircle, Info, DollarSign } from 'lucide-react-native';
import {
  checkRefundEligibility,
  submitRefundRequest,
  validateRefundReason,
  formatCurrency,
  getRefundPolicySummary,
  type RefundEligibility,
} from '@/lib/customer-refunds';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface RefundRequestFormProps {
  bookingId: string;
  userId: string;
  onSuccess?: (refundId: string) => void;
  onCancel?: () => void;
}

const REFUND_REASONS = [
  { value: 'Cancelled', label: 'I need to cancel this booking' },
  { value: 'ScheduleConflict', label: 'Schedule conflict' },
  { value: 'ServiceNotNeeded', label: 'Service no longer needed' },
  { value: 'FoundAlternative', label: 'Found alternative service' },
  { value: 'PriceIssue', label: 'Price concerns' },
  { value: 'Other', label: 'Other reason' },
];

export default function RefundRequestForm({
  bookingId,
  userId,
  onSuccess,
  onCancel,
}: RefundRequestFormProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  useEffect(() => {
    loadEligibility();
  }, [bookingId]);

  const loadEligibility = async () => {
    setLoading(true);
    try {
      const result = await checkRefundEligibility(bookingId);
      setEligibility(result);
    } catch (error) {
      console.error('Error loading eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!eligibility?.eligible) {
      Alert.alert('Error', 'This booking is not eligible for a refund');
      return;
    }

    const validation = validateRefundReason(selectedReason, notes);
    if (!validation.valid) {
      Alert.alert('Error', validation.error);
      return;
    }

    if (!agreedToPolicy) {
      Alert.alert('Error', 'Please agree to the refund policy to continue');
      return;
    }

    Alert.alert(
      'Confirm Refund Request',
      `You will receive ${formatCurrency(
        eligibility.refund_amount
      )} (${eligibility.refund_percentage}% of ${formatCurrency(
        eligibility.original_amount
      )}). This action will cancel your booking.\n\nDo you want to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            const result = await submitRefundRequest(
              {
                booking_id: bookingId,
                amount: eligibility.refund_amount,
                reason: selectedReason,
                notes: notes.trim() || undefined,
              },
              userId
            );
            setSubmitting(false);

            if (result.success) {
              Alert.alert(
                'Request Submitted',
                'Your refund request has been submitted and is under review. You will be notified once it has been processed.',
                [
                  {
                    text: 'OK',
                    onPress: () => onSuccess?.(result.refund_id!),
                  },
                ]
              );
            } else {
              Alert.alert('Error', result.error || 'Failed to submit refund request');
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
        <Text style={styles.loadingText}>Checking eligibility...</Text>
      </View>
    );
  }

  if (!eligibility) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={48} color={colors.error} />
        <Text style={styles.errorText}>Unable to load refund eligibility</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadEligibility}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!eligibility.eligible) {
    return (
      <View style={styles.ineligibleContainer}>
        <AlertCircle size={48} color={colors.warning} />
        <Text style={styles.ineligibleTitle}>Not Eligible for Refund</Text>
        <Text style={styles.ineligibleMessage}>{eligibility.reason}</Text>
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>Refund Policy:</Text>
          <Text style={styles.policyText}>{eligibility.policy}</Text>
        </View>
        {onCancel && (
          <TouchableOpacity style={styles.backButton} onPress={onCancel}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const policySummary = getRefundPolicySummary();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.eligibilityCard}>
        <View style={styles.eligibilityHeader}>
          <CheckCircle size={24} color={colors.success} />
          <Text style={styles.eligibilityTitle}>Eligible for Refund</Text>
        </View>

        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Original Amount</Text>
            <Text style={styles.originalAmount}>
              {formatCurrency(eligibility.original_amount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Refund Amount</Text>
            <View style={styles.refundAmountContainer}>
              <DollarSign size={20} color={colors.success} />
              <Text style={styles.refundAmount}>
                {formatCurrency(eligibility.refund_amount)}
              </Text>
              <View style={styles.percentageBadge}>
                <Text style={styles.percentageText}>
                  {eligibility.refund_percentage}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.policyInfo}>
          <Info size={16} color={colors.info} />
          <Text style={styles.policyInfoText}>{eligibility.policy}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reason for Refund *</Text>
        <View style={styles.reasonsList}>
          {REFUND_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonOption,
                selectedReason === reason.value && styles.reasonOptionSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
            >
              <View
                style={[
                  styles.radio,
                  selectedReason === reason.value && styles.radioSelected,
                ]}
              >
                {selectedReason === reason.value && (
                  <View style={styles.radioDot} />
                )}
              </View>
              <Text
                style={[
                  styles.reasonLabel,
                  selectedReason === reason.value && styles.reasonLabelSelected,
                ]}
              >
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {selectedReason === 'Other' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details *</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Please provide details about your refund request..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      {selectedReason && selectedReason !== 'Other' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add any additional information..."
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Refund Policy</Text>
        <View style={styles.policyCard}>
          {policySummary.map((policy, index) => (
            <View key={index} style={styles.policyItem}>
              <Text style={styles.policyBullet}>•</Text>
              <Text style={styles.policyItemText}>{policy}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.agreementContainer}
        onPress={() => setAgreedToPolicy(!agreedToPolicy)}
      >
        <View style={[styles.checkbox, agreedToPolicy && styles.checkboxChecked]}>
          {agreedToPolicy && <CheckCircle size={16} color={colors.white} />}
        </View>
        <Text style={styles.agreementText}>
          I understand and agree to the refund policy
        </Text>
      </TouchableOpacity>

      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedReason || !agreedToPolicy || submitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedReason || !agreedToPolicy || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
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
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  ineligibleContainer: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  ineligibleTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  ineligibleMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  eligibilityCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
  },
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eligibilityTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  amountContainer: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  originalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  refundAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  refundAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  percentageBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  percentageText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  policyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.info + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  policyInfoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.info,
    lineHeight: 20,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reasonsList: {
    gap: spacing.sm,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  reasonOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  reasonLabelSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  textArea: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  policyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  policyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  policyBullet: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  policyItemText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  agreementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreementText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
