import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, AlertTriangle, Info, DollarSign } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  calculateRefundEligibility,
  processAutomaticRefund,
  calculateDaysUntilBooking,
  getRefundPolicyText,
} from '@/lib/automatic-refunds';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/TextArea';

interface CancelBookingModalProps {
  visible: boolean;
  onClose: () => void;
  booking: {
    id: string;
    title: string;
    scheduled_date: string;
    scheduled_time: string;
    price: number;
    status: string;
  };
  userRole: 'Customer' | 'Provider';
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = {
  Customer: [
    { value: 'schedule_conflict', label: 'Schedule Conflict', icon: '📅' },
    { value: 'changed_mind', label: 'Changed My Mind', icon: '💭' },
    { value: 'found_alternative', label: 'Found Alternative Provider', icon: '🔄' },
    { value: 'emergency', label: 'Emergency Situation', icon: '🚨' },
    { value: 'price_concern', label: 'Price Concern', icon: '💰' },
    { value: 'quality_concern', label: 'Quality Concern', icon: '⚠️' },
    { value: 'no_longer_needed', label: 'No Longer Needed', icon: '❌' },
    { value: 'other', label: 'Other Reason', icon: '📝' },
  ],
  Provider: [
    { value: 'schedule_conflict', label: 'Schedule Conflict', icon: '📅' },
    { value: 'emergency', label: 'Emergency Situation', icon: '🚨' },
    { value: 'illness', label: 'Illness / Health Issue', icon: '🏥' },
    { value: 'equipment_issue', label: 'Equipment Issue', icon: '🔧' },
    { value: 'weather', label: 'Weather Conditions', icon: '🌧️' },
    { value: 'double_booking', label: 'Double Booking Error', icon: '📊' },
    { value: 'customer_request', label: 'Customer Request Issue', icon: '❓' },
    { value: 'other', label: 'Other Reason', icon: '📝' },
  ],
};

export function CancelBookingModal({
  visible,
  onClose,
  booking,
  userRole,
  onSuccess,
}: CancelBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCancel, setCanCancel] = useState(true);
  const [cancelCheckMessage, setCancelCheckMessage] = useState('');
  const [refundInfo, setRefundInfo] = useState<{
    eligible: boolean;
    amount: number;
    percentage: number;
    policy: string;
  }>({
    eligible: true,
    amount: booking.price,
    percentage: 100,
    policy: '',
  });

  useEffect(() => {
    if (visible) {
      checkCancellationEligibility();
      calculateRefund();
    }
  }, [visible, booking]);

  const checkCancellationEligibility = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase.rpc('can_cancel_booking', {
        booking_id_param: booking.id,
        user_id_param: userData.user.id,
      });

      if (error) throw error;

      setCanCancel(data.can_cancel);
      if (!data.can_cancel) {
        setCancelCheckMessage(data.reason);
      }
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
    }
  };

  const calculateRefund = async () => {
    try {
      const eligibility = await calculateRefundEligibility(booking.id, userRole);

      setRefundInfo({
        eligible: eligibility.eligible,
        amount: eligibility.refund_amount,
        percentage: eligibility.refund_percentage,
        policy: eligibility.policy,
      });
    } catch (error) {
      console.error('Error calculating refund:', error);

      // Fallback calculation
      const daysUntil = calculateDaysUntilBooking(booking.scheduled_date);
      const policy = getRefundPolicyText(daysUntil, userRole);

      let percentage = 0;
      if (userRole === 'Provider') {
        percentage = 100;
      } else if (daysUntil >= 7) {
        percentage = 100;
      } else if (daysUntil >= 3) {
        percentage = 50;
      } else if (daysUntil >= 1) {
        percentage = 25;
      }

      setRefundInfo({
        eligible: percentage > 0,
        amount: (booking.price * percentage) / 100,
        percentage,
        policy,
      });
    }
  };

  const handleCancel = async () => {
    if (!selectedReason) {
      Alert.alert('Required', 'Please select a reason for cancellation');
      return;
    }

    if (selectedReason === 'other' && !details.trim()) {
      Alert.alert('Required', 'Please provide details for your cancellation reason');
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel this booking?\n\n${
        refundInfo.eligible
          ? `Refund: $${Math.round(refundInfo.amount).toLocaleString('en-US')} (${refundInfo.percentage}%)`
          : 'No refund will be issued'
      }`,
      [
        { text: 'No, Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: submitCancellation,
        },
      ]
    );
  };

  const submitCancellation = async () => {
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const reason = CANCELLATION_REASONS[userRole].find((r) => r.value === selectedReason);

      // Create cancellation record
      const { data: cancellation, error: cancelError } = await supabase
        .from('booking_cancellations')
        .insert({
          booking_id: booking.id,
          cancelled_by: userData.user.id,
          cancelled_by_role: userRole,
          cancellation_reason: reason?.label || selectedReason,
          cancellation_details: details.trim() || null,
          refund_status: refundInfo.eligible ? 'Processing' : 'None',
          refund_amount: refundInfo.eligible ? refundInfo.amount : 0,
        })
        .select()
        .single();

      if (cancelError) throw cancelError;

      // Process automatic refund if eligible
      if (refundInfo.eligible && refundInfo.amount > 0) {
        const refundResult = await processAutomaticRefund(
          booking.id,
          cancellation.id,
          refundInfo.amount,
          reason?.label
        );

        if (!refundResult.success) {
          console.error('Refund processing failed:', refundResult.error);
          // Still show success - refund will be processed later
        }
      }

      Alert.alert(
        'Booking Cancelled',
        refundInfo.eligible
          ? `Your booking has been cancelled. ${
              refundInfo.amount > 0
                ? `A refund of $${refundInfo.amount.toFixed(
                    2
                  )} is being processed and will appear in your account within 5-7 business days.`
                : 'No refund is applicable based on the cancellation policy.'
            }`
          : 'Your booking has been cancelled. No refund will be issued based on the cancellation policy.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', error.message || 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  if (!canCancel) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cannot Cancel</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.errorContainer}>
              <AlertTriangle size={64} color={colors.error} />
              <Text style={styles.errorTitle}>Cancellation Not Allowed</Text>
              <Text style={styles.errorText}>{cancelCheckMessage}</Text>
            </View>

            <Button title="Close" onPress={handleClose} variant="outline" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.bookingInfoCard}>
              <Text style={styles.bookingTitle}>{booking.title}</Text>
              <Text style={styles.bookingDetails}>
                {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at {booking.scheduled_time}
              </Text>
              <Text style={styles.bookingPrice}>${Math.round(booking.price).toLocaleString('en-US')}</Text>
            </View>

            <View style={styles.warningCard}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={styles.warningText}>
                Cancelling this booking cannot be undone. {refundInfo.eligible && 'A refund will be processed automatically.'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Cancellation Reason *</Text>
            <View style={styles.reasonsContainer}>
              {CANCELLATION_REASONS[userRole].map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonCard,
                    selectedReason === reason.value && styles.reasonCardSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reasonIcon}>{reason.icon}</Text>
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

            {(selectedReason === 'other' || selectedReason) && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>
                  Additional Details {selectedReason === 'other' && '*'}
                </Text>
                <TextArea
                  value={details}
                  onChangeText={setDetails}
                  placeholder={
                    selectedReason === 'other'
                      ? 'Please explain your reason for cancelling...'
                      : 'Add any additional information (optional)...'
                  }
                  style={styles.detailsInput}
                  maxLength={500}
                />
                <Text style={styles.charCount}>{details.length}/500</Text>
              </View>
            )}

            <View style={styles.refundCard}>
              <View style={styles.refundHeader}>
                <DollarSign size={20} color={refundInfo.eligible ? colors.success : colors.error} />
                <Text style={styles.refundTitle}>Automatic Refund</Text>
              </View>
              <View style={styles.refundRow}>
                <Text style={styles.refundLabel}>Original Amount:</Text>
                <Text style={styles.refundValue}>${Math.round(booking.price).toLocaleString('en-US')}</Text>
              </View>
              <View style={styles.refundRow}>
                <Text style={styles.refundLabel}>Refund Amount:</Text>
                <Text
                  style={[
                    styles.refundValue,
                    styles.refundAmount,
                    { color: refundInfo.eligible ? colors.success : colors.error },
                  ]}
                >
                  ${Math.round(refundInfo.amount).toLocaleString('en-US')}
                </Text>
              </View>
              <View style={styles.policyInfo}>
                <Info size={16} color={colors.info} />
                <Text style={styles.policyText}>
                  {refundInfo.policy}
                  {refundInfo.eligible && '\n\nRefund will be processed automatically to your original payment method within 5-7 business days.'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Keep Booking"
              onPress={handleClose}
              variant="outline"
              style={styles.footerButton}
            />
            <Button
              title={loading ? 'Cancelling...' : 'Cancel Booking'}
              onPress={handleCancel}
              loading={loading}
              disabled={!selectedReason || loading}
              style={styles.footerButton}
            />
          </View>
        </View>
      </View>
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
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  bookingInfoCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bookingPrice: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  warningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: fontSize.sm * 1.5,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  reasonCardSelected: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
  },
  reasonIcon: {
    fontSize: fontSize.lg,
  },
  reasonLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  reasonLabelSelected: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  detailsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailsInput: {
    minHeight: 100,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  refundCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  refundTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  refundLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  refundValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  refundAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  policyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.sm,
  },
  policyText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.info,
    lineHeight: fontSize.xs * 1.5,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    marginBottom: 0,
  },
});
