import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { Clock, X, AlertTriangle, DollarSign } from 'lucide-react-native';

interface RequestTimeExtensionModalProps {
  visible: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  currentEstimatedHours?: number;
  providerId: string;
  pricingType: 'quote_based' | 'fixed_price';
  onRequestSubmitted?: () => void;
}

const COMMON_REASONS = [
  'Unexpected complexity discovered',
  'Additional work requested by customer',
  'Weather or site conditions',
  'Material delays',
  'Equipment issues',
  'Other (specify below)',
];

export default function RequestTimeExtensionModal({
  visible,
  onClose,
  jobId,
  jobTitle,
  currentEstimatedHours,
  providerId,
  pricingType,
  onRequestSubmitted,
}: RequestTimeExtensionModalProps) {
  const [additionalHours, setAdditionalHours] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [proposedPriceAdjustment, setProposedPriceAdjustment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setAdditionalHours('');
    setSelectedReason('');
    setCustomReason('');
    setProposedPriceAdjustment('');
    setErrors({});
    onClose();
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!additionalHours.trim()) {
      newErrors.additionalHours = 'Additional time is required';
    } else if (isNaN(Number(additionalHours))) {
      newErrors.additionalHours = 'Invalid time value';
    } else if (Number(additionalHours) <= 0) {
      newErrors.additionalHours = 'Must be greater than 0';
    }

    if (!selectedReason) {
      newErrors.reason = 'Please select a reason';
    }

    if (selectedReason === 'Other (specify below)' && !customReason.trim()) {
      newErrors.customReason = 'Please provide a reason';
    }

    if (proposedPriceAdjustment) {
      if (isNaN(Number(proposedPriceAdjustment))) {
        newErrors.proposedPriceAdjustment = 'Invalid amount';
      } else if (Number(proposedPriceAdjustment) < 0) {
        newErrors.proposedPriceAdjustment = 'Amount cannot be negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const finalReason =
        selectedReason === 'Other (specify below)' ? customReason : selectedReason;

      const requestData: any = {
        job_id: jobId,
        provider_id: providerId,
        requested_additional_hours: Number(additionalHours),
        reason: finalReason,
        status: 'pending',
      };

      if (proposedPriceAdjustment && Number(proposedPriceAdjustment) > 0) {
        requestData.proposed_price_adjustment = Number(proposedPriceAdjustment);
      }

      const { error } = await supabase
        .from('job_time_extension_requests')
        .insert(requestData);

      if (error) {
        if (error.message.includes('duplicate')) {
          Alert.alert(
            'Request Already Exists',
            'You already have a pending time extension request for this job. Please wait for the customer to respond.'
          );
        } else {
          throw error;
        }
      } else {
        Alert.alert(
          'Request Submitted',
          'Your time extension request has been sent to the customer. You will be notified when they respond.\n\nPlease do not continue additional work until the request is approved.',
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                onRequestSubmitted?.();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Error submitting time extension request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalHours =
    currentEstimatedHours && additionalHours && !isNaN(Number(additionalHours))
      ? Number(currentEstimatedHours) + Number(additionalHours)
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Clock size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>Request Time Extension</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.warningBox}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                Do not continue work beyond the estimated duration until this request is approved.
              </Text>
            </View>

            <View style={styles.jobInfo}>
              <Text style={styles.label}>Job</Text>
              <Text style={styles.jobTitle}>{jobTitle}</Text>
              {currentEstimatedHours !== undefined && (
                <Text style={styles.currentDuration}>
                  Current estimate: {currentEstimatedHours} hours
                </Text>
              )}
            </View>

            <Input
              label="Additional Time Needed (hours)"
              placeholder="e.g., 2 or 3.5"
              value={additionalHours}
              onChangeText={setAdditionalHours}
              keyboardType="decimal-pad"
              leftIcon={<Clock size={20} color={colors.textSecondary} />}
              error={errors.additionalHours}
            />

            {totalHours !== null && (
              <View style={styles.calculationBox}>
                <Text style={styles.calculationLabel}>New Total Duration:</Text>
                <Text style={styles.calculationValue}>{totalHours} hours</Text>
              </View>
            )}

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Reason for Extension</Text>
              {errors.reason && <Text style={styles.errorText}>{errors.reason}</Text>}
              <View style={styles.reasonButtons}>
                {COMMON_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonButton,
                      selectedReason === reason && styles.reasonButtonActive,
                    ]}
                    onPress={() => setSelectedReason(reason)}
                  >
                    <Text
                      style={[
                        styles.reasonButtonText,
                        selectedReason === reason && styles.reasonButtonTextActive,
                      ]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {selectedReason === 'Other (specify below)' && (
              <TextArea
                label="Please Explain"
                placeholder="Describe why additional time is needed..."
                value={customReason}
                onChangeText={setCustomReason}
                error={errors.customReason}
                numberOfLines={4}
              />
            )}

            {pricingType === 'quote_based' && (
              <>
                <View style={styles.divider} />
                <Input
                  label="Proposed Price Adjustment (Optional)"
                  placeholder="Additional cost if any"
                  value={proposedPriceAdjustment}
                  onChangeText={setProposedPriceAdjustment}
                  keyboardType="decimal-pad"
                  leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                  error={errors.proposedPriceAdjustment}
                />
                <Text style={styles.helperText}>
                  If the additional work requires extra cost, specify it here. Customer must approve
                  both time and price changes.
                </Text>
              </>
            )}

            {pricingType === 'fixed_price' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  This is a fixed-price job. Time extensions do not automatically change the agreed
                  price. If additional cost is justified, discuss with the customer separately.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="Submit Request"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
            />
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.cancelButton}
              disabled={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight || '#FFF3CD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  jobInfo: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  jobTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  currentDuration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  calculationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight || '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  calculationLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  calculationValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  reasonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  reasonButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  reasonButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  reasonButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: colors.infoLight || '#E3F2FD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.info,
    marginTop: spacing.md,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
