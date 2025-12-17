import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  Calendar,
  Clock,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/TextArea';
import { formatTimeSlot } from '@/lib/availability-conflicts';

interface RescheduleRequest {
  id: string;
  booking_id: string;
  requested_by: string;
  current_date: string;
  current_time: string;
  proposed_date: string;
  proposed_time: string;
  reason: string;
  status: string;
  response_message?: string;
  responded_at?: string;
  created_at: string;
  booking?: {
    title: string;
    customer?: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

interface RescheduleRequestCardProps {
  request: RescheduleRequest;
  isProvider: boolean;
  onUpdate?: () => void;
}

export function RescheduleRequestCard({
  request,
  isProvider,
  onUpdate,
}: RescheduleRequestCardProps) {
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responding, setResponding] = useState(false);
  const [responseType, setResponseType] = useState<'approve' | 'deny'>('approve');

  const getStatusColor = () => {
    switch (request.status) {
      case 'Approved':
        return colors.success;
      case 'Denied':
        return colors.error;
      case 'Cancelled':
        return colors.textSecondary;
      default:
        return colors.warning;
    }
  };

  const getStatusIcon = () => {
    switch (request.status) {
      case 'Approved':
        return <Check size={16} color={colors.white} />;
      case 'Denied':
        return <X size={16} color={colors.white} />;
      case 'Cancelled':
        return <X size={16} color={colors.white} />;
      default:
        return <Clock size={16} color={colors.white} />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      const endTime = new Date(`2000-01-01T${timeStr}`);
      endTime.setHours(endTime.getHours() + 1);
      return formatTimeSlot(timeStr, endTime.toTimeString().slice(0, 8));
    } catch {
      return timeStr;
    }
  };

  const handleRespond = async (approve: boolean) => {
    setResponseType(approve ? 'approve' : 'deny');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (responseType === 'deny' && !responseMessage.trim()) {
      Alert.alert('Error', 'Please provide a reason for denying this request');
      return;
    }

    setResponding(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updates: any = {
        status: responseType === 'approve' ? 'Approved' : 'Denied',
        responded_by: userData.user.id,
        responded_at: new Date().toISOString(),
      };

      if (responseMessage.trim()) {
        updates.response_message = responseMessage.trim();
      }

      const { error } = await supabase
        .from('reschedule_requests')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        responseType === 'approve'
          ? 'Reschedule request approved! The booking has been updated.'
          : 'Reschedule request denied. The customer has been notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResponseModal(false);
              setResponseMessage('');
              onUpdate?.();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error responding to reschedule request:', error);
      Alert.alert('Error', error.message || 'Failed to respond to request');
    } finally {
      setResponding(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this reschedule request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('reschedule_requests')
                .update({ status: 'Cancelled' })
                .eq('id', request.id);

              if (error) throw error;

              Alert.alert('Success', 'Reschedule request cancelled');
              onUpdate?.();
            } catch (error: any) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {request.booking?.customer && (
              <Text style={styles.customerName}>{request.booking.customer.full_name}</Text>
            )}
            {request.booking?.title && (
              <Text style={styles.bookingTitle}>{request.booking.title}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            {getStatusIcon()}
            <Text style={styles.statusText}>{request.status}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.timeComparisonRow}>
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Current Time</Text>
              <View style={styles.timeInfo}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.timeText}>{formatDate(request.current_date)}</Text>
              </View>
              <View style={styles.timeInfo}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.timeText}>{formatTime(request.current_time)}</Text>
              </View>
            </View>

            <ArrowRight size={24} color={colors.primary} style={styles.arrow} />

            <View style={[styles.timeSection, styles.proposedSection]}>
              <Text style={styles.timeLabel}>Proposed Time</Text>
              <View style={styles.timeInfo}>
                <Calendar size={16} color={colors.primary} />
                <Text style={[styles.timeText, styles.proposedText]}>
                  {formatDate(request.proposed_date)}
                </Text>
              </View>
              <View style={styles.timeInfo}>
                <Clock size={16} color={colors.primary} />
                <Text style={[styles.timeText, styles.proposedText]}>
                  {formatTime(request.proposed_time)}
                </Text>
              </View>
            </View>
          </View>

          {request.reason && (
            <View style={styles.reasonSection}>
              <View style={styles.reasonHeader}>
                <MessageSquare size={16} color={colors.textSecondary} />
                <Text style={styles.reasonLabel}>Reason</Text>
              </View>
              <Text style={styles.reasonText}>{request.reason}</Text>
            </View>
          )}

          {request.response_message && (
            <View style={styles.responseSection}>
              <View style={styles.responseHeader}>
                <AlertCircle size={16} color={getStatusColor()} />
                <Text style={[styles.responseLabel, { color: getStatusColor() }]}>
                  {request.status === 'Approved' ? 'Approval Note' : 'Denial Reason'}
                </Text>
              </View>
              <Text style={styles.responseText}>{request.response_message}</Text>
            </View>
          )}
        </View>

        {isProvider && request.status === 'Pending' && (
          <View style={styles.actions}>
            <Button
              title="Deny"
              onPress={() => handleRespond(false)}
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title="Approve"
              onPress={() => handleRespond(true)}
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        )}

        {!isProvider && request.status === 'Pending' && (
          <View style={styles.actions}>
            <Button
              title="Cancel Request"
              onPress={handleCancel}
              variant="outline"
              style={styles.fullWidthButton}
            />
          </View>
        )}

        {request.responded_at && (
          <Text style={styles.timestamp}>
            {request.status === 'Approved' ? 'Approved' : 'Responded'} on{' '}
            {new Date(request.responded_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>

      <Modal visible={showResponseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {responseType === 'approve' ? 'Approve Request' : 'Deny Request'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowResponseModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                {responseType === 'approve' ? 'Message (Optional)' : 'Reason for Denial *'}
              </Text>
              <TextArea
                value={responseMessage}
                onChangeText={setResponseMessage}
                placeholder={
                  responseType === 'approve'
                    ? 'Add a note for the customer (optional)...'
                    : 'Explain why you cannot accommodate this reschedule...'
                }
                style={styles.messageInput}
                maxLength={500}
              />
              <Text style={styles.charCount}>{responseMessage.length}/500</Text>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowResponseModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={responding ? 'Submitting...' : responseType === 'approve' ? 'Approve' : 'Deny'}
                onPress={submitResponse}
                loading={responding}
                disabled={responding || (responseType === 'deny' && !responseMessage.trim())}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
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
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  customerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  content: {
    gap: spacing.md,
  },
  timeComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeSection: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  proposedSection: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  timeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  proposedText: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  arrow: {
    marginTop: spacing.md,
  },
  reasonSection: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  reasonLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
  },
  responseSection: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  responseLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  responseText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginBottom: 0,
  },
  fullWidthButton: {
    flex: 1,
    marginBottom: 0,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  messageInput: {
    minHeight: 100,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    marginBottom: 0,
  },
});
