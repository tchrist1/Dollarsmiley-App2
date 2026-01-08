import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/TextArea';
import { Input } from '@/components/Input';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  AlertCircle,
  DollarSign,
  X,
} from 'lucide-react-native';

interface TimeExtensionRequest {
  id: string;
  requested_additional_hours: number;
  reason: string;
  requested_at: string;
  proposed_price_adjustment?: number;
  original_estimated_duration?: number;
  provider_id: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
}

interface TimeExtensionRequestCardProps {
  request: TimeExtensionRequest;
  jobTitle: string;
  providerName?: string;
  onResponseSubmitted?: () => void;
  isCustomer?: boolean;
}

export default function TimeExtensionRequestCard({
  request,
  jobTitle,
  providerName,
  onResponseSubmitted,
  isCustomer = false,
}: TimeExtensionRequestCardProps) {
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseType, setResponseType] = useState<'approve' | 'decline'>('approve');
  const [customerNotes, setCustomerNotes] = useState('');
  const [approvedHours, setApprovedHours] = useState(
    request.requested_additional_hours.toString()
  );
  const [loading, setLoading] = useState(false);

  const requestDate = new Date(request.requested_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const totalHours = request.original_estimated_duration
    ? request.original_estimated_duration + request.requested_additional_hours
    : null;

  const handleOpenResponse = (type: 'approve' | 'decline') => {
    setResponseType(type);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = async () => {
    if (responseType === 'approve' && !approvedHours.trim()) {
      Alert.alert('Error', 'Please specify the approved hours');
      return;
    }

    if (responseType === 'approve' && isNaN(Number(approvedHours))) {
      Alert.alert('Error', 'Invalid hours value');
      return;
    }

    if (responseType === 'approve' && Number(approvedHours) <= 0) {
      Alert.alert('Error', 'Approved hours must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const updateData: any = {
        status: responseType === 'approve' ? 'approved' : 'declined',
        responded_at: new Date().toISOString(),
        responded_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (customerNotes.trim()) {
        updateData.customer_response_notes = customerNotes;
      }

      if (responseType === 'approve') {
        updateData.approved_additional_hours = Number(approvedHours);
      }

      const { error } = await supabase
        .from('job_time_extension_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      const actionText = responseType === 'approve' ? 'approved' : 'declined';
      Alert.alert(
        'Success',
        `You have ${actionText} the time extension request. The provider has been notified.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResponseModal(false);
              setCustomerNotes('');
              onResponseSubmitted?.();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error responding to time extension request:', error);
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (request.status) {
      case 'approved':
        return colors.success;
      case 'declined':
        return colors.error;
      case 'cancelled':
        return colors.textLight;
      default:
        return colors.warning;
    }
  };

  const getStatusText = () => {
    switch (request.status) {
      case 'approved':
        return 'Approved';
      case 'declined':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending Response';
    }
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Clock size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Time Extension Request</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {providerName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Provider:</Text>
              <Text style={styles.infoValue}>{providerName}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Requested:</Text>
            <Text style={styles.infoValue}>{requestDate}</Text>
          </View>

          <View style={styles.timeInfo}>
            {request.original_estimated_duration !== undefined && (
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Original</Text>
                <Text style={styles.timeValue}>{request.original_estimated_duration}h</Text>
              </View>
            )}
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>Additional</Text>
              <Text style={[styles.timeValue, { color: colors.warning }]}>
                +{request.requested_additional_hours}h
              </Text>
            </View>
            {totalHours !== null && (
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>New Total</Text>
                <Text style={[styles.timeValue, { color: colors.primary }]}>
                  {totalHours}h
                </Text>
              </View>
            )}
          </View>

          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{request.reason}</Text>
          </View>

          {request.proposed_price_adjustment && request.proposed_price_adjustment > 0 && (
            <View style={styles.priceAdjustment}>
              <DollarSign size={16} color={colors.warning} />
              <Text style={styles.priceText}>
                Proposed additional cost: ${request.proposed_price_adjustment.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {isCustomer && request.status === 'pending' && (
          <View style={styles.cardFooter}>
            <Button
              title="Approve"
              onPress={() => handleOpenResponse('approve')}
              variant="primary"
              size="small"
              icon={<CheckCircle size={16} color={colors.white} />}
              style={styles.actionButton}
            />
            <Button
              title="Decline"
              onPress={() => handleOpenResponse('decline')}
              variant="outline"
              size="small"
              icon={<XCircle size={16} color={colors.error} />}
              style={styles.actionButton}
            />
          </View>
        )}

        {!isCustomer && request.status === 'pending' && (
          <View style={styles.waitingMessage}>
            <AlertCircle size={16} color={colors.info} />
            <Text style={styles.waitingText}>
              Waiting for customer response. Do not continue work until approved.
            </Text>
          </View>
        )}
      </View>

      <Modal
        visible={showResponseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResponseModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {responseType === 'approve' ? 'Approve' : 'Decline'} Extension Request
              </Text>
              <TouchableOpacity
                onPress={() => setShowResponseModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Time Requested:</Text>
                <Text style={styles.summaryValue}>
                  +{request.requested_additional_hours} hours
                </Text>
                {request.proposed_price_adjustment && request.proposed_price_adjustment > 0 && (
                  <>
                    <Text style={[styles.summaryLabel, { marginTop: spacing.sm }]}>
                      Additional Cost:
                    </Text>
                    <Text style={styles.summaryValue}>
                      ${request.proposed_price_adjustment.toFixed(2)}
                    </Text>
                  </>
                )}
              </View>

              {responseType === 'approve' && (
                <>
                  <Input
                    label="Approved Additional Hours"
                    placeholder="Hours to approve"
                    value={approvedHours}
                    onChangeText={setApprovedHours}
                    keyboardType="decimal-pad"
                    leftIcon={<Clock size={20} color={colors.textSecondary} />}
                  />
                  <Text style={styles.helperText}>
                    You can approve fewer hours than requested if needed
                  </Text>
                </>
              )}

              <TextArea
                label={`Notes to Provider ${responseType === 'approve' ? '(Optional)' : ''}`}
                placeholder={
                  responseType === 'approve'
                    ? 'Any additional instructions...'
                    : 'Reason for declining (recommended)...'
                }
                value={customerNotes}
                onChangeText={setCustomerNotes}
                numberOfLines={4}
              />

              {responseType === 'decline' && (
                <View style={styles.declineWarning}>
                  <AlertCircle size={20} color={colors.warning} />
                  <Text style={styles.declineWarningText}>
                    If the provider has legitimate reasons for additional time, consider discussing
                    via messages before declining.
                  </Text>
                </View>
              )}

              {responseType === 'approve' && request.proposed_price_adjustment && (
                <View style={styles.priceWarning}>
                  <AlertCircle size={20} color={colors.warning} />
                  <Text style={styles.priceWarningText}>
                    By approving, you agree to the additional cost of $
                    {request.proposed_price_adjustment.toFixed(2)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title={responseType === 'approve' ? 'Approve Extension' : 'Decline Extension'}
                onPress={handleSubmitResponse}
                loading={loading}
                variant={responseType === 'approve' ? 'primary' : 'outline'}
              />
              <Button
                title="Cancel"
                onPress={() => setShowResponseModal(false)}
                variant="outline"
                style={styles.cancelButton}
                disabled={loading}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  cardContent: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  timeValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reasonContainer: {
    marginTop: spacing.xs,
  },
  reasonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  priceAdjustment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningLight || '#FFF3CD',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  priceText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
  },
  waitingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoLight || '#E3F2FD',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  waitingText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalScroll: {
    padding: spacing.lg,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs / 2,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  declineWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight || '#FFF3CD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  declineWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  priceWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight || '#FFF3CD',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  priceWarningText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    lineHeight: 20,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
});
